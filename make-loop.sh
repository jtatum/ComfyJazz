#!/bin/sh
# Turns an iReal Pro audio export into a background loop for ComfyJazz.
#
#   ./make-loop.sh export.wav bpm bars web/sounds/name_loop.opus
#
# Export as WAV with No Count-In. bars is the length of one chorus in 4/4. With 3 or more
# repeats the middle chorus is used, so the chorus before it rings into the loop point just
# like in the real song; either way the ends get a very short fade so the loop can't click.
# The loop is padded or trimmed to exactly `bars` bars and its loudness matched to
# jazz_loop.ogg.
set -e

input=$1 bpm=$2 bars=$3 output=$4
if [ -z "$output" ]; then
  echo "usage: $0 export.wav bpm bars output.opus" >&2
  exit 1
fi

rate=44100
target=-28.8 # integrated loudness of jazz_loop.ogg, in LUFS

chorus=$((bars * 4 * 60 * rate / bpm))
total=$(ffmpeg -v error -i "$input" -af aresample=$rate -f s16le - | wc -c)
total=$((total / 4)) # 16 bit stereo

if [ "$total" -gt $((2 * chorus)) ]; then
  start=$chorus
else
  start=0
fi
length=$((total - start < chorus ? total - start : chorus))
fadeout=$(awk "BEGIN { print $length / $rate - 0.015 }")

loop="aresample=$rate,atrim=start_sample=$start:end_sample=$((start + length)),asetpts=PTS-STARTPTS"
loop="$loop,afade=t=in:d=0.002,afade=t=out:st=$fadeout:d=0.015,apad=whole_len=$chorus"

loudness=$(ffmpeg -nostats -i "$input" -af "$loop,ebur128" -f null - 2>&1 | awk '/I:/ { i = $2 } END { print i }')
gain=$(awk "BEGIN { print $target - ($loudness) }")

echo "chorus $chorus samples, using $start-$((start + length)) of $total, loudness $loudness LUFS, gain ${gain}dB"
ffmpeg -v error -y -i "$input" -af "$loop,volume=${gain}dB,aresample=48000" \
  -map_metadata -1 -c:a libopus -b:a 96k "$output"
