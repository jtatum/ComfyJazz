//dependent on Howler.js https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.0/howler.min.js

const ComfyJazz = (options = {}) => {
  //Default property values, can be passed in and overidden
  const defaultOptions = {
    baseUrl: "web/sounds",
    instrument: "piano",
    song: "comfy", //which background song to play, see songs below
    autoNotesDelay: 300, //how often should we try to play notes?
    autoNotesChance: 0.2, //what % (0-1) chance is there to play an auto note?
    playAutoNotes: true, //should we automatically play notes?
    melodyChance: undefined, //what % (0-1) of the song's melody phrases to play, if it has a melody (the song picks if not given)
    spice: undefined, //how much (0-1) to play around with the melody, 0 is just as written (the song picks if not given)
    volume: 1,
  };

  const cj = { ...defaultOptions, ...options };

  /////////////////////
  //ComfyJazz Methods

  cj.setVolume = (vol) => {
    cj.volume = vol;

    if( cj.backgroundSound ) {
      cj.backgroundSound.volume(vol);
    }
      if( cj.lastSound ) {
      //just the last note, not every note sharing its sample (most of those have faded out already)
      cj.lastSound.volume(vol, lastSoundId);
    }

  };

  cj.mute = () => cj.setVolume(0);
  cj.unmute = () => cj.setVolume(1);
  cj.isMuted = () => cj.volume <= 0;
  cj.start = () => startComfyJazz();

  cj.playNoteProgression = playNoteProgression;
  cj.playNote = () => playNoteProgression(1);

  /////////////////////

  async function startComfyJazz() {
    //the background music loops seamlessly on its own, we just follow along to know which chord we're on
    playBackgroundLoop(`${cj.baseUrl}/${song.loop}`, cj.volume);

    //this will Automatically play a note and then call itself again after a delay
    const AutomaticPlayNote = async () => {
      let currentTime = getLoopPosition();

      const scaleProgression = song.progression;
      for (let i = 0; i < scaleProgression.length; i++) {
        if (scaleProgression[i].start <= currentTime && currentTime <= scaleProgression[i].end) {
          currentScaleProgression = i;
          break;
        }
      }

      scheduleMelody();
      improvise();

      //here's what will loop
      setTimeout(AutomaticPlayNote, cj.autoNotesDelay);
    };

    //start the Automatic Note Player loop
    AutomaticPlayNote();
  }

  //Play a note with possible random delay
  async function playNoteRandomly(minRandom = 0, maxRandom = 200) {
    setTimeout(async () => {
      //while the browser is holding sound back (until someone clicks the page), Howler saves up
      //every note and plays them all at once when it lets go, so skip them instead
      if (Howler.ctx && Howler.ctx.state !== "running") {
        return;
      }
      let sound = getNextNote();
      await playSound(`${cj.baseUrl}/${pickInstrument()}/${sound.url}.ogg`, cj.volume, sound.playbackRate);
    }, minRandom + Math.random() * maxRandom);
  }

  //The improvising plays in time with the song: each swung eighth note as it comes up gets a roll
  //of the dice for a note (as often as autoNotesChance every autoNotesDelay works out to), and now
  //and then a burst of a few in a row. It sits a hair behind the beat, like a relaxed player.
  let improvDecided = -1; //the last eighth note we rolled for, counted from when the loop started
  let improvBusyUntil = 0;

  function improvise() {
    const elapsed = getElapsedTime();
    if (!cj.playAutoNotes || !song.bpm || elapsed === null) {
      //not playing to the beat (yet), so just now and then
      if (cj.playAutoNotes && Math.random() < cj.autoNotesChance) {
        playNoteRandomly(0, 200);
      }
      return;
    }
    const duration = cj.backgroundSound.duration() || song.duration;
    const lap = Math.floor(elapsed / duration);
    const position = elapsed - lap * duration;
    const eighthsPerLap = Math.round((duration * song.bpm) / 30);
    const tick = cj.autoNotesDelay / 1000;
    const noteChance = 1 - (1 - cj.autoNotesChance) ** (30 / song.bpm / tick);
    //every eighth note between now and the next tick
    for (let eighth = Math.ceil((position * song.bpm) / 30 - 1); melodyTime(eighth / 2) < position + 1.5 * tick; eighth++) {
      const time = melodyTime(eighth / 2);
      const count = lap * eighthsPerLap + eighth;
      if (time < position || eighth >= eighthsPerLap || count <= improvDecided) {
        continue;
      }
      improvDecided = count;
      const at = performance.now() + (time - position) * 1000;
      if (at < melodyPlayingUntil || at < improvBusyUntil) {
        continue;
      }
      if (Math.random() < 0.012 * (0.5 + melodySpice)) {
        improvBusyUntil = at + playNoteProgression(3 + getRandomInt(4));
      } else if (Math.random() < noteChance) {
        playImprovNote(at - performance.now());
      }
    }
  }

  //Play a note of improvising after a delay (in ms), now and then with a grace note in front
  function playImprovNote(delay, volume = 1) {
    const instrument = pickInstrument();
    const grace = Math.random() < 0.06 * (0.5 + melodySpice);
    const lead = grace ? 45 : 0; //the grace note goes just before the beat, so the note itself is on it
    setTimeout(() => {
      if (Howler.ctx && Howler.ctx.state !== "running") {
        return;
      }
      const sound = getNextNote();
      if (grace) {
        playMidiNote(sound.note - 1, instrument, 0.5 * volume);
        setTimeout(() => playSound(`${cj.baseUrl}/${instrument}/${sound.url}.ogg`, cj.volume * volume, sound.playbackRate), lead);
      } else {
        playSound(`${cj.baseUrl}/${instrument}/${sound.url}.ogg`, cj.volume * volume, sound.playbackRate);
      }
    }, Math.max(0, delay - lead) + Math.random() * 25); //a hair behind the beat
  }

  function playMidiNote(note, instrument, volume = 1) {
    if (Howler.ctx && Howler.ctx.state !== "running") {
      return;
    }
    const sound = getSample(note);
    playSound(`${cj.baseUrl}/${instrument}/${sound.url}.ogg`, cj.volume * volume, sound.playbackRate);
  }

  function pickInstrument() {
    const instruments = cj.instrument.split(",").map((x) => x.trim());
    return instruments[getRandomInt(instruments.length)];
  }

  //Every so often, play a phrase of the song's own melody right where it goes in the loop
  const melodyDecidedLap = []; //which time round the loop we last rolled the dice for each phrase
  let melodyPlayingUntil = 0;

  function scheduleMelody() {
    const elapsed = getElapsedTime();
    if (!song.phrases || !cj.playAutoNotes || elapsed === null) {
      return;
    }
    const duration = cj.backgroundSound.duration() || song.duration;
    //look a couple of ticks ahead, so a late tick can't miss the start of a phrase
    const lookahead = (2 * cj.autoNotesDelay) / 1000;
    song.phrases.forEach((phrase, i) => {
      const start = melodyTime(phrase.start);
      const wait = mod(start - elapsed, duration);
      const lap = Math.round((elapsed + wait - start) / duration);
      //decide a little early, so there's time for any notes leading into the phrase
      if (wait > lookahead + 1.2 || melodyDecidedLap[i] === lap) {
        return;
      }
      melodyDecidedLap[i] = lap;
      if (Math.random() >= melodyChance) {
        return;
      }
      const instrument = pickInstrument(); //the whole phrase on one instrument
      const { events, end } = embellishPhrase(phrase);
      for (const { time, note, volume } of events) {
        setTimeout(() => playMidiNote(note, instrument, volume), (wait + time - start) * 1000);
      }
      melodyPlayingUntil = Math.max(melodyPlayingUntil, performance.now() + (wait + end - start) * 1000);
    });
  }

  //Melody times are in beats, written straight. This swings them and turns them into seconds.
  function melodyTime(beats) {
    const swing = song.swing ?? 0.5;
    const whole = Math.floor(beats + 1e-6);
    const part = Math.max(0, beats - whole);
    return ((whole + (part < 0.5 ? part * 2 * swing : swing + (part - 0.5) * 2 * (1 - swing))) * 60) / song.bpm;
  }

  //The chord-scale note next to this one, going up (direction 1) or down (-1), at a time in the song
  function scaleNeighbor(note, time, direction) {
    const t = mod(time, song.duration);
    const step = song.progression.find((step) => step.start <= t && t < step.end) || song.progression[0];
    for (let distance = 1; distance <= 3; distance++) {
      const neighbor = note + direction * distance;
      if (step.scale[mod(neighbor - song.transpose, 12)] === 0) {
        return neighbor;
      }
    }
    return note + direction * 2;
  }

  //Play around with a phrase of the melody like a jazz player would: the first note and the one it
  //lands on stay as written, so it's still the tune, and the rest gets pushed, decorated, skipped,
  //filled in or walked around. Each time round it rolls how adventurous to be, usually a little.
  //Gives back the notes to play ({ time, note, volume }, times in seconds into the song) and when
  //the melody's done, for the improvising to pick up again.
  function embellishPhrase(phrase) {
    const heat = 3 * melodySpice * Math.random() ** 1.5;
    const chance = (p) => Math.random() < Math.min(0.85, p * heat);
    const sixteenth = 15 / song.bpm;
    const notes = phrase.notes;
    const octave = chance(0.08) ? 12 : 0;
    //the whole phrase can come in an eighth late (laid back) or early
    const shift = chance(0.12) ? (Math.random() < 0.7 ? 0.5 : -0.5) : 0;
    //or be just the bones of it: the first note, the long ones and the landing
    const sparse = chance(0.08);
    //or just the start of it, and the improvising takes it from there
    const last = notes.length > 4 && chance(0.15) ? Math.ceil(notes.length / 2) - 1 : notes.length - 1;
    const events = [];
    let lastBeat = -Infinity;
    let lastTime = -Infinity;
    let pitch = notes[0].note + octave;
    const played = [];
    for (let i = 0; i <= last; i++) {
      const { note, start, end } = notes[i];
      const middle = i > 0 && i < last;
      if (middle && (sparse ? end - start < 1 : chance(0.15))) {
        continue; //leave it out
      }
      let beat = start + shift;
      //push a note that's on the beat an eighth early (if the note before it isn't there already)
      if (middle && Math.abs(start - Math.round(start)) < 1e-6 && beat - 0.5 > lastBeat && chance(0.25)) {
        beat -= 0.5;
      }
      const time = melodyTime(beat) + (Math.random() - 0.5) * 0.03 * melodySpice; //and play a little loose
      pitch = note + octave;
      //swap a note for the one next to it, mostly where the tune repeats itself
      if (middle && chance(notes[i - 1].note === note ? 0.3 : 0.08)) {
        pitch = scaleNeighbor(pitch, time, Math.random() < 0.5 ? 1 : -1);
      }
      if (time - lastTime >= 3 * sixteenth && chance(0.1)) {
        //circle around it: the note above, a half step below, then the note
        events.push({ time: time - 2 * sixteenth, note: scaleNeighbor(pitch, time, 1), volume: 0.6 });
        events.push({ time: time - sixteenth, note: pitch - 1, volume: 0.6 });
      } else if (time - lastTime >= 2 * sixteenth && chance(0.2)) {
        //slide in from a half step below
        events.push({ time: time - sixteenth, note: pitch - 1, volume: 0.6 });
      } else if (time - lastTime >= 0.15 && chance(0.2)) {
        //a grace note, crushed right up against it
        events.push({ time: time - 0.045, note: Math.random() < 0.7 ? pitch - 1 : scaleNeighbor(pitch, time, 1), volume: 0.45 });
      }
      events.push({ time, note: pitch, volume: 1 });
      played.push(pitch);
      lastBeat = beat;
      lastTime = time;
      //fill out a long note with a passing note an eighth later
      if (middle && end - start >= 1 && chance(0.2)) {
        const passing = melodyTime(beat + 0.5);
        events.push({ time: passing, note: scaleNeighbor(pitch, passing, Math.random() < 0.5 ? 1 : -1), volume: 0.8 });
        lastBeat = beat + 0.5;
        lastTime = passing;
      }
    }
    let endBeat = notes[last].end + shift;
    if (last === notes.length - 1) {
      if (chance(0.35)) {
        //a little run off the end, into the gap before the next phrase
        const direction = Math.random() < 0.5 ? 1 : -1;
        const count = 2 + getRandomInt(2);
        for (let n = 1; n <= count; n++) {
          const time = melodyTime(endBeat + 0.5 * n);
          pitch = scaleNeighbor(pitch, time, direction);
          events.push({ time, note: pitch, volume: 0.8 });
        }
        endBeat += 0.5 * (count + 1);
      } else if (chance(0.15)) {
        //or echo the end of it back, an octave away
        const echo = played.slice(-3);
        echo.forEach((note, n) => {
          events.push({ time: melodyTime(endBeat + 0.5 * (n + 1)), note: note + (octave ? -12 : 12), volume: 0.7 });
        });
        endBeat += 0.5 * (echo.length + 1);
      }
    }
    return { events, end: melodyTime(endBeat) };
  }

  //Play a run of notes, in time with the song: swung eighth notes, or now and then quicker triplets.
  //Gives back how long it takes, in ms.
  function playNoteProgression(numNotes) {
    const elapsed = getElapsedTime();
    if (!song.bpm || elapsed === null) {
      for (var i = 0; i < numNotes; i++) {
        playNoteRandomly(100, 200 * i);
      }
      return 100 + 200 * numNotes;
    }
    const position = mod(elapsed, cj.backgroundSound.duration() || song.duration);
    const triplets = numNotes > 2 && Math.random() < 0.25;
    const step = triplets ? 1 / 3 : 1 / 2;
    const timeAt = (beat) => (triplets ? (beat * 60) / song.bpm : melodyTime(beat));
    //start on the next eighth note (or beat, for triplets) that's still to come
    let beat = Math.ceil(((position + 0.03) * song.bpm) / 60 / (triplets ? 1 : 0.5)) * (triplets ? 1 : 0.5);
    while (timeAt(beat) < position + 0.03) {
      beat += triplets ? 1 : 0.5;
    }
    for (let i = 0; i < numNotes; i++) {
      playImprovNote((timeAt(beat + i * step) - position) * 1000, i === 0 ? 1 : 0.85);
    }
    return (timeAt(beat + numNotes * step) - position) * 1000;
  }

  ////////////////////////////////
  //The fancy music playing functions
  ////////////////////////////////

  function semitonesToPlaybackRate(t) {
    var e = Math.pow(2, 1 / 12);
    return Math.pow(e, t);
  }

  function shiftSource( tone, startRange, endRange ) {
  	let a = startRange
  	  , u = endRange
  	  , c = new WeakMap;

  	// var e = c.get( tone );
  	// if( e ) return e;
  	let n = a + Math.random() * ( u - a );
  	// c.set( tone, n );
  	return n;
  }

  function playBackgroundLoop(url, volume = 1) {
    const sound = new Howl({
      src: [url],
      volume: volume,
      loop: true,
      onload: () => {
        if (Math.abs(sound.duration() - song.duration) > 0.05) {
          console.warn(`ComfyJazz: ${url} is ${sound.duration()}s long but the song's chords add up to ${song.duration}s`);
        }
      },
    });
    //Howler fires "play" again every time the loop comes around (late, on a timer), so only note the first one
    sound.once("play", () => {
      loopStartTime = Howler.usingWebAudio ? Howler.ctx.currentTime : 0;
    });
    sound.play();
    cj.backgroundSound = sound;
  }

  //How long has the background loop been playing, in seconds? (null if it hasn't started yet)
  function getElapsedTime() {
    const sound = cj.backgroundSound;
    if (!sound || loopStartTime === null) {
      return null;
    }
    //the audio clock is what the loop actually plays on, so following it never drifts
    return Howler.usingWebAudio ? Howler.ctx.currentTime - loopStartTime : sound.seek();
  }

  //How far into the background loop are we, in seconds?
  function getLoopPosition() {
    const elapsed = getElapsedTime();
    if (elapsed === null) {
      return 0;
    }
    return elapsed % (cj.backgroundSound.duration() || song.duration);
  }

  //One Howl per sample, reused for every note. Howler recycles each Howl's finished sounds, so this
  //stays small, where a new Howl per note piled up forever (and unloading them throws away the
  //decoded sample, so it has to be downloaded and decoded all over again next time)
  const noteSounds = {};

  function playSound(url, volume = 1, rate = 1) {
    return new Promise((resolve, reject) => {
      if (!noteSounds[url]) {
        noteSounds[url] = new Howl({
          src: [url],
          volume: volume,
          //forget samples that fail to load (like on a network hiccup) so the next note tries again
          onloaderror: function () {
            delete noteSounds[url];
            this.unload();
          },
        });
      }
      let a = noteSounds[url];
      let id = a.play();
      a.once("end", () => resolve(), id);
      a.rate(rate, id);
      a.fade( volume, 0.0, 1000, id );//a.duration() * 500 );
      cj.lastSound = a;
      lastSoundId = id;
    });
  }

  function getNextNote() {
    if (performance.now() - lastNoteTime > 900 || this.noteCount > this.maxnNotesPerPattern) {
      changePattern();
      noteCount = 0;
    }

    let e = song.progression[currentScaleProgression];
    scale = e.scale;
    let n = getNote(scale);
    while (n === lastNoteNumber) {
      n = getNote(scale);
    }

    // console.log(currentScaleProgression, pattern, scale);

    if (e.root !== lastRoot) {
      n = scaleifyNote(n, e.targetNotes);
    }

    let playNote = getSample(n || 48);

    noteCount++;
    lastNoteTime = performance.now();
    lastNoteNumber = n;
    lastRoot = e.root;
    return playNote;
  }

  //Which sample to play for a MIDI note number, and how fast to play it to land on that note
  function getSample(note) {
    const sample = notes.find((x) => x.metaData.startRange <= note && note <= x.metaData.endRange);
    return { url: sample.url, playbackRate: semitonesToPlaybackRate(note - sample.metaData.root), note };
  }

  function getNote(scale) {
    // scale.length || (scale = e.scalesToUse[Math.floor(Math.random() * e.scalesToUse.length)]),
    if (pattern < 0) {
      changePattern();
    }
    let t = patterns[pattern][currentStep];
    let n = t + scale[t % 12];
    let r = song.transpose + n;
    currentStep = (currentStep + 1) % patterns[pattern].length;
    return r;
  }

  function getRandomInt(number) {
    return Math.floor(number * Math.random());
  }

  function changePattern() {
    pattern = getRandomInt(patterns.length);
    currentStep = 0;
  }

  function getClosestTarget(t, e) {
    return t.reduce(function (t, n) {
      return Math.abs(n - e) < Math.abs(t - e) ? n : t;
    });
  }

  function scaleifyNote(t, e) {
    var n = mod(t - song.transpose, 12);
    if (
      void 0 ==
      e.filter(function (t) {
        return t === n;
      })[0]
    ) {
      var r = getClosestTarget(e, t),
        o = (t -= n - r);
      t = o += scale[mod(o - song.transpose, 12)];
    }
    return t;
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function getNoteFromSemitone(tone) {
    return notes.filter((x) => x.metaData.startRange <= tone && tone <= x.metaData.endRange)[0];
  }

  let currentScaleProgression = 0;
  let root = 0;
  let lastRoot = undefined;
  let pattern = -1;
  let scale = null;
  let loopStartTime = null;
  let lastSoundId = null;
  let currentStep = 0;
  let lastNoteTime = 0;
  let lastNoteNumber = 0;
  let noteCount = 0;
  const maxnNotesPerPattern = 30;

  //Background songs, picked with the ?song= URL parameter. Each one has:
  //  loop: audio file in the sounds folder, trimmed so it repeats seamlessly
  //  transpose: the melody patterns are written in C, this shifts them into the song's key (G = -5)
  //and then either
  //  bpm + chords: the chord chart, with a | between bars (see chartToProgression)
  //  duration + progression: hand-tuned chords with start/end times in seconds, like comfy below
  //    (plus bpm, for the improvising to play in time)
  //and optionally
  //  instrument: played when the URL doesn't pick one
  //  melody: the song's own tune, written bar by bar under the chords (see melodyToPhrases), with
  //  melodyChance: how often (0-1) each phrase of it gets played instead of improvising
  //  swing: how much of each beat the first of a pair of eighth notes gets. 0.5 is
  //  straight (even), 0.67 is a triplet swing, 0.75 is a dotted eighth and a sixteenth
  //  spice: how much (0-1) to play around with the melody (see embellishPhrase), 0 is as written
  const songs = {
    //the original ComfyJazz loop: | Gmaj7 | D | Gmaj7 | Am7 D7 | Bm7 | Em7 | Am7 | D7 | at 70bpm
    comfy: {
      loop: "jazz_loop.ogg",
      duration: 27.428,
      bpm: 70,
      swing: 0.67,
      transpose: -5,
      progression: [
        {
          start: 0,
          end: 3.428,
          scale: "custom",
          targetNotes: [2, 4, 7],
          root: 7,
        },
        {
          start: 3.428,
          end: 6.857,
          scale: "diatonic",
          targetNotes: [2, 4, 7],
          root: 2,
        },
        {
          start: 6.857,
          end: 10.285,
          scale: "custom",
          targetNotes: [2, 4, 7],
          root: 7,
        },
        {
          start: 10.285,
          end: 12,
          scale: "diatonic",
          targetNotes: [4, 5, 9],
          root: 9,
        },
        {
          start: 12,
          end: 13.714,
          scale: "custom2",
          targetNotes: [2, 4, 11],
          root: 2,
        },
        {
          start: 13.714,
          end: 17.142,
          scale: "custom",
          targetNotes: [4, 7, 11],
          root: 11,
        },
        {
          start: 17.142,
          end: 20.571,
          scale: "custom",
          targetNotes: [0, 2, 4],
          root: 4,
        },
        {
          start: 20.571,
          end: 24,
          scale: "diatonic",
          targetNotes: [4, 5, 9],
          root: 9,
        },
        {
          start: 24,
          end: 27.428,
          scale: "custom2",
          targetNotes: [2, 4, 11],
          root: 2,
        },
      ],
    },
    moon: {
      loop: "moon_loop.opus",
      bpm: 70,
      transpose: -5,
      instrument: "guitar",
      chords: `
        G     | Gmaj7 | Em9   | Am D7  |
        G     | Gmaj7 | Em9   | Am D7  |
        G     | Gmaj7 | Em9   | Am D7  |
        G     | Gmaj7 | Em9   | Dm7 D7 |
        Cmaj7 | C7    | Gmaj7 | Am7 D7 |
        C     | C7    | Gmaj7 | Am7 D7 |`,
      //Julie's theme. Every A section is the same, except the last ends on a slightly different
      //bar (before the bridge)
      melodyChance: 0.3,
      swing: 0.67,
      spice: 0.5,
      melody: `
        B4 B4 B4 B4 C5 -  D5 D5 | D5 G4 .  G4 .  .  .  .  | G4 G4 G4 G4 A4 -  B4 B4 | B4 A4 .  A4 .  .  .  .  |
        B4 B4 B4 B4 C5 -  D5 D5 | D5 G4 .  G4 .  .  .  .  | G4 G4 G4 G4 A4 -  B4 B4 | B4 A4 .  A4 .  .  .  .  |
        B4 B4 B4 B4 C5 -  D5 D5 | D5 G4 .  G4 .  .  .  .  | G4 G4 G4 G4 A4 -  B4 B4 | B4 A4 .  A4 .  .  .  .  |
        B4 B4 B4 B4 C5 -  D5 D5 | D5 G4 .  G4 .  .  .  .  | G4 G4 G4 G4 A4 -  B4 B4 | B4 -  A4 A4 .  .  .  .  |
        .  .  .  .  .  E4 G4 -  | Bb4 - .  A4 -  G4 E4 -  | D4 -  .  .  .  .  .  .  | .  .  G4 -  G4 G4 .  .  |
        E4 -  .  .  .  .  G4 -  | Bb4 - .  A4 -  G4 .  .  | B4 B4 B4 B4 B4 C5 B4 A4 | -  -  .  .  .  .  .  .  |`,
    },
  };

  const scales = {
    diatonic: [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0],
    dorian: [0, 1, 0, 0, -1, 0, 1, 0, 1, 0, 0, -1],
    phrygian: [0, 0, -1, 0, -1, 0, 1, 0, 0, -1, 0, -1],
    lydian: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
    mixolydian: [0, 1, 0, 1, 0, 0, -1, 0, -1, 0, 0, -1],
    aeolian: [0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, -1],
    locrian: [0, 0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1],
    harmonicMinor: [0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 1, 0],
    melodicMinor: [0, 1, 0, 0, -1, 0, 1, 0, -1, 0, 1, 0],
    majorPentatonic: [0, 1, 0, 1, 0, -1, 1, 0, 1, 0, -1, 1],
    minorPentatonic: [0, -1, 1, 0, -1, 0, 1, 0, -1, 1, 0, -1],
    doubleHarmonic: [0, 0, -1, 1, 0, 0, 1, 0, 0, -1, 1, 0],
    halfDim: [0, 1, 0, 0, -1, 0, 0, -1, 0, -1, 0, -1],
    chromatic: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    custom: [0, -1, 0, -1, 0, -1, -1, 0, -1, 0, -1, 0],
    custom2: [-1, 0, 0, -1, 0, 0, 1, 0, 0, -1, 0, 0],
  };

  const patterns = [
    [71, 72, 69, 71, 67, 69, 64, 67, 62, 64, 62, 60, 59, 60, 62, 64, 65, 67, 69, 71, 67, 64, 62, 60, 59, 60, 57, 59, 55],
    [83, 88, 86, 81, 79, 83, 81, 76, 74, 79, 76, 72, 71, 72, 69, 67],
    [74, 72, 70, 69, 70, 67, 69, 65, 67, 62, 65, 63, 67, 70, 74, 77, 74, 77, 74, 72, 70, 69, 70, 67, 69, 65],
    [69, 74, 72, 67, 64, 69, 67, 62, 60, 64, 62, 57, 55, 60, 57, 53, 55, 57, 60, 62, 64, 65, 67, 62, 65, 64, 62, 64, 62, 60, 59],
    [
      59,
      60,
      64,
      67,
      71,
      72,
      76,
      79,
      83,
      84,
      88,
      91,
      95,
      98,
      95,
      98,
      95,
      91,
      88,
      91,
      88,
      84,
      83,
      86,
      83,
      79,
      76,
      79,
      76,
      72,
      71,
      74,
      71,
      67,
      64,
      67,
      64,
      60,
      59,
      55,
    ],
    [91, 86, 88, 84, 83, 86, 83, 79, 76, 79, 76, 72, 71, 74, 71, 67, 64, 67, 64, 60, 59, 60, 64, 67, 71, 72, 74, 76, 79, 74, 76, 71, 72, 67],
    [67, 65, 64, 65, 69, 72, 76, 79, 77, 76, 74, 76, 72, 71, 74, 71, 72, 67, 64, 67, 62, 60],
    [
      65,
      67,
      65,
      64,
      65,
      67,
      69,
      71,
      72,
      74,
      76,
      77,
      79,
      81,
      83,
      84,
      86,
      88,
      89,
      91,
      93,
      91,
      88,
      86,
      88,
      86,
      84,
      83,
      84,
      79,
      81,
      76,
      79,
      74,
      76,
      72,
      71,
      71,
      72,
      67,
    ],
    [55, 59, 60, 62, 67, 71, 72, 76, 79, 83, 86, 88, 93, 91, 88, 84, 81, 79, 77, 76, 74, 72, 71],
  ];

  const notes = [
    {
      url: "note_96",
      metaData: {
        root: 96,
        startRange: 95,
        endRange: 127,
      },
    },
    {
      url: "note_93",
      metaData: {
        root: 93,
        startRange: 92,
        endRange: 94,
      },
    },
    {
      url: "note_90",
      metaData: {
        root: 90,
        startRange: 89,
        endRange: 91,
      },
    },
    {
      url: "note_87",
      metaData: {
        root: 87,
        startRange: 86,
        endRange: 88,
      },
    },
    {
      url: "note_84",
      metaData: {
        root: 84,
        startRange: 83,
        endRange: 85,
      },
    },
    {
      url: "note_81",
      metaData: {
        root: 81,
        startRange: 80,
        endRange: 82,
      },
    },
    {
      url: "note_77",
      metaData: {
        root: 78,
        startRange: 77,
        endRange: 79,
      },
    },
    {
      url: "note_74",
      metaData: {
        root: 75,
        startRange: 74,
        endRange: 76,
      },
    },
    {
      url: "note_71",
      metaData: {
        root: 72,
        startRange: 71,
        endRange: 73,
      },
    },
    {
      url: "note_69",
      metaData: {
        root: 69,
        startRange: 68,
        endRange: 70,
      },
    },
    {
      url: "note_66",
      metaData: {
        root: 66,
        startRange: 65,
        endRange: 67,
      },
    },
    {
      url: "note_63",
      metaData: {
        root: 63,
        startRange: 62,
        endRange: 64,
      },
    },
    {
      url: "note_60",
      metaData: {
        root: 60,
        startRange: 59,
        endRange: 61,
      },
    },
    {
      url: "note_57",
      metaData: {
        root: 57,
        startRange: 56,
        endRange: 58,
      },
    },
    {
      url: "note_54",
      metaData: {
        root: 54,
        startRange: 53,
        endRange: 55,
      },
    },
    {
      url: "note_51",
      metaData: {
        root: 51,
        startRange: 50,
        endRange: 52,
      },
    },
    {
      url: "note_48",
      metaData: {
        root: 48,
        startRange: 0,
        endRange: 49,
      },
    },
  ];

  ////////////////////////////////
  //Songs from chord charts
  ////////////////////////////////

  const noteNames = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  //What to play over each kind of chord, checked in order against whatever comes after the root
  //(the "m7b5" in "Bm7b5"). scale is the notes the melody may use and targets are the chord tones it
  //lands on when the chord changes, both in semitones above the root. Avoid notes, like the 4th over
  //a major chord, are left out of the scale so the melody steps around them.
  const chordTypes = [
    { match: /^(o|dim)/, scale: [0, 2, 3, 5, 6, 8, 9, 11], targets: [3, 6, 9] }, //diminished
    { match: /^(h|ø|(-|m)7?b5)/, scale: [0, 2, 3, 5, 6, 8, 10], targets: [3, 6, 10] }, //half diminished
    { match: /^(-|m(?!aj))(\^|maj|M)/, scale: [0, 2, 3, 5, 7, 9, 11], targets: [3, 7, 11] }, //minor major 7th
    { match: /^(-|m(?!aj))/, scale: [0, 2, 3, 5, 7, 9, 10], targets: [3, 7, 10] }, //minor
    { match: /^(\^|maj|M|Δ).*#11/, scale: [0, 2, 4, 6, 7, 9, 11], targets: [4, 7, 11] }, //major 7th #11
    { match: /^(\^|maj|M|Δ)/, scale: [0, 2, 4, 7, 9, 11], targets: [4, 7, 11] }, //major 7th
    { match: /^(6|69|add9|2)?$/, scale: [0, 2, 4, 7, 9, 11], targets: [4, 7, 9] }, //major triad or 6th
    { match: /^(\+|aug|7\+|7#5)/, scale: [0, 2, 4, 6, 8, 10], targets: [4, 8, 10] }, //augmented
    { match: /sus/, scale: [0, 2, 5, 7, 9, 10], targets: [5, 7, 10] }, //suspended
    { match: /alt/, scale: [0, 1, 3, 4, 6, 8, 10], targets: [4, 10, 3] }, //altered dominant
    { match: /b9|#9/, scale: [0, 1, 3, 4, 6, 7, 9, 10], targets: [4, 7, 10] }, //dominant b9 or #9
    { match: /#11|b5/, scale: [0, 2, 4, 6, 7, 9, 10], targets: [4, 7, 10] }, //dominant #11
    { match: /b13/, scale: [0, 2, 4, 7, 8, 10], targets: [4, 7, 10] }, //dominant b13
    { match: /^(7|9|11|13)/, scale: [0, 2, 4, 7, 9, 10], targets: [4, 7, 10] }, //dominant
  ];

  //Work out the melody scale and landing notes for a chord symbol like "Bbmaj7" or "F#m7b5".
  //These are in "C terms", before transposing, since that's how the melody patterns are written.
  function chordToScale(symbol, transpose) {
    const parts = /^([A-G])(b|#)?([^/]*)(\/.*)?$/.exec(symbol);
    const quality = parts ? parts[3].replace(/[()]/g, "") : "";
    const type = parts && chordTypes.find((type) => type.match.test(quality));
    if (!type) {
      throw new Error(`ComfyJazz: I don't know how to play the chord "${symbol}"`);
    }
    const root = noteNames[parts[1]] + (parts[2] === "#" ? 1 : parts[2] === "b" ? -1 : 0);
    const inScale = (note) => type.scale.includes(mod(note + transpose - root, 12));
    return {
      root: symbol, //the note picker only uses this to notice that the chord changed
      //nudge any note that isn't in the scale onto a neighbor that is
      scale: [...Array(12).keys()].map((note) => (inScale(note) ? 0 : inScale(note - 1) ? -1 : 1)),
      targetNotes: type.targets.map((interval) => mod(root + interval - transpose, 12)),
    };
  }

  //Turn a chord chart like "Cmaj7 | Am7 | Dm7 G7 | %" into timed progression steps. Each bar is
  //split evenly between its chords, and "%" repeats the bar before, like in iReal Pro.
  function chartToProgression({ chords, bpm, beatsPerBar = 4, transpose }) {
    const barLength = (beatsPerBar * 60) / bpm;
    const progression = [];
    let time = 0;
    let lastBar = [];
    for (const bar of chords.split("|").map((bar) => bar.trim()).filter((bar) => bar)) {
      const barChords = bar === "%" ? lastBar : bar.split(/\s+/);
      for (const chord of barChords) {
        const length = barLength / barChords.length;
        const last = progression[progression.length - 1];
        if (last && last.root === chord) {
          last.end += length; //same chord again, just hold it longer
        } else {
          progression.push({ start: time, end: time + length, ...chordToScale(chord, transpose) });
        }
        time += length;
      }
      lastBar = barChords;
    }
    return { progression, duration: time };
  }

  //Turn a melody like "B4 - D5 . | G4 G4 A4 B4" into phrases of timed notes. Like the chords, each
  //bar is split evenly between what's in it: a note (name, then octave, so C5 is an octave above
  //middle C), "-" to hold the note before, or "." for a rest. Empty bars are fine too. A rest of
  //at least two beats ends a phrase. Times are in beats, and the eighth notes are swung when
  //they're played (see melodyTime).
  function melodyToPhrases({ melody, beatsPerBar = 4 }) {
    const barLength = beatsPerBar;
    const notes = [];
    let time = 0;
    const bars = melody.split("|");
    if (!bars[bars.length - 1].trim()) {
      bars.pop(); //nothing after the last bar line
    }
    for (const bar of bars) {
      const steps = bar.trim().split(/\s+/).filter((step) => step);
      for (const step of steps) {
        const length = barLength / steps.length;
        const last = notes[notes.length - 1];
        if (step === "-") {
          if (last && last.end === time) {
            last.end += length;
          }
        } else if (step !== ".") {
          const parts = /^([A-G])(b|#)?(\d)$/.exec(step);
          if (!parts) {
            throw new Error(`ComfyJazz: I don't know the melody note "${step}"`);
          }
          const note = 12 * (Number(parts[3]) + 1) + noteNames[parts[1]] + (parts[2] === "#" ? 1 : parts[2] === "b" ? -1 : 0);
          notes.push({ note, start: time, end: time + length });
        }
        time += length;
      }
      if (!steps.length) {
        time += barLength;
      }
    }
    const phrases = [];
    for (const note of notes) {
      const phrase = phrases[phrases.length - 1];
      if (phrase && note.start - phrase.end < 2 - 1e-6) {
        phrase.notes.push(note);
        phrase.end = note.end;
      } else {
        phrases.push({ start: note.start, end: note.end, notes: [note] });
      }
    }
    return phrases;
  }

  function loadSong(name) {
    let definition = songs[name];
    if (!definition) {
      console.warn(`ComfyJazz: there's no song called "${name}", playing "${defaultOptions.song}" instead`);
      definition = songs[defaultOptions.song];
    }
    if (definition.chords) {
      const loaded = { ...definition, ...chartToProgression(definition) };
      if (definition.melody) {
        loaded.phrases = melodyToPhrases(definition);
      }
      return loaded;
    }
    return {
      ...definition,
      progression: definition.progression.map((step) => ({ ...step, scale: scales[step.scale] })),
    };
  }

  const song = loadSong(cj.song);

  //an instrument passed in wins, then the song's own, then the default
  cj.instrument = options.instrument || song.instrument || defaultOptions.instrument;
  const melodyChance = cj.melodyChance ?? song.melodyChance ?? 0.3;
  const melodySpice = cj.spice ?? song.spice ?? 0.5;

  return cj;
};
