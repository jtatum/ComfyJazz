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
  cj.playNote = playNoteRandomly;

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

      //play a note 20% of the time
      if (cj.playAutoNotes && Math.random() < cj.autoNotesChance) {
        playNoteRandomly(0, 200);
      }

      //here's what will loop
      setTimeout(AutomaticPlayNote, cj.autoNotesDelay);
    };

    //start the Automatic Note Player loop
    AutomaticPlayNote();
  }

  //Play a note with possible random delay
  async function playNoteRandomly(minRandom = 0, maxRandom = 200) {
    setTimeout(async () => {
      let sound = getNextNote();
	  const instruments = cj.instrument.split( "," ).map( x => x.trim() );
	  let instrument = instruments[ getRandomInt( instruments.length ) ];
      await playSound(`${cj.baseUrl}/${instrument}/${sound.url}.ogg`, cj.volume, sound.playbackRate);
    }, minRandom + Math.random() * maxRandom);
  }

  //Play a progression of notes, with random delay spacing!
  function playNoteProgression(numNotes) {
    for (var i = 0; i < numNotes; i++) {
      playNoteRandomly(100, 200 * i);
    }
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

  //How far into the background loop are we, in seconds?
  function getLoopPosition() {
    const sound = cj.backgroundSound;
    if (!sound || loopStartTime === null) {
      return 0;
    }
    const duration = sound.duration() || song.duration;
    //the audio clock is what the loop actually plays on, so following it never drifts
    const elapsed = Howler.usingWebAudio ? Howler.ctx.currentTime - loopStartTime : sound.seek();
    return elapsed % duration;
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

    var a = n || 48,
      s = null;
    s = notes.filter((x) => x.metaData.startRange <= a && a <= x.metaData.endRange)[0];
	// NOTE: OOPS THIS MIGHT BE THE WRONG SPOT FOR SHIFTSOURCE
	// let shifted = shiftSource( s.metaData.root, s.metaData.startRange, s.metaData.endRange );
    let c = a - s.metaData.root;
    let playbackRate = semitonesToPlaybackRate(c);
    // console.log("playback", c, playbackRate);
    let playNote = s;
    playNote.playbackRate = playbackRate;

    noteCount++;
    lastNoteTime = performance.now();
    lastNoteNumber = n;
    lastRoot = e.root;
    return playNote;
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
  //and optionally an instrument, played when the URL doesn't pick one
  const songs = {
    //the original ComfyJazz loop: | Gmaj7 | D | Gmaj7 | Am7 D7 | Bm7 | Em7 | Am7 | D7 | at 70bpm
    comfy: {
      loop: "jazz_loop.ogg",
      duration: 27.428,
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

  function loadSong(name) {
    let definition = songs[name];
    if (!definition) {
      console.warn(`ComfyJazz: there's no song called "${name}", playing "${defaultOptions.song}" instead`);
      definition = songs[defaultOptions.song];
    }
    if (definition.chords) {
      return { ...definition, ...chartToProgression(definition) };
    }
    return {
      ...definition,
      progression: definition.progression.map((step) => ({ ...step, scale: scales[step.scale] })),
    };
  }

  const song = loadSong(cj.song);

  //an instrument passed in wins, then the song's own, then the default
  cj.instrument = options.instrument || song.instrument || defaultOptions.instrument;

  return cj;
};
