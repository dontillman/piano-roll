// MIDI File Piano Roll App, web audio support
// Copyright 2025, Donald Tillman.  All rights reserved.

// audio context
var actx = null;

// Shut down the audio context.
const closeAudioContext = async () => {
    if (actx) {
        await actx.close();
        actx = null;
    }
}

// Midi note to frequency.
const midiFreq = (midiNote) => {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
};

// Schedule a note to play.
//   note: note object
//   t0: piece starting time for actx
const scheduleNote = (noteObj, t0) => {
    const {start, stop, note, level} = noteObj;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    const envAttack = 0.05;
    const envRelease = 0.2;
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.type = 'triangle';
    osc.frequency.value = midiFreq(note);
    osc.start(t0 + start);
    osc.stop(t0 + stop + envRelease);
    const vol = level / 128;
    gain.gain.setValueAtTime(0, t0 + start);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + start + envAttack);
    gain.gain.setValueAtTime(0.5 * vol, t0 + stop);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + stop + envRelease);
    return osc;
};

// Schedule the music to be played.
const scheduleMusic = async (music, onDone) => {
    const handleDone = async () => {
        await closeAudioContext();
        onDone();
    }

    await closeAudioContext();
    actx = new AudioContext();

    const lastNote = music.reduce((a, b) =>
        (a.stop < b.stop) ? b : a);

    const t0 = actx.currentTime + 0.1;
    for (const note of music) {
        const osc = scheduleNote(note, t0);
        if (note === lastNote) {
            osc.onended = handleDone;
        }
    }
    // don't start playing just yet...
    actx.suspend();
}    

// Place the music notes here, saved so we can reschedule them.
var savedMusic = [];

// Load up these notes.
//   notes are [{start, stop, note, level},...]
//   onDone callback when finished.
const loadMusicPlayer = async (music, onDone) => {
    savedMusic = music;
    scheduleMusic(music, onDone);
}


// Alternately pause or resume play.
// Returns new state: 'running', 'suspended'
const playPause = async (onDone) => {
    if (!actx) {
        await scheduleMusic(savedMusic, onDone);
    }
    if ('running' === actx.state) {
        await actx.suspend();
    } else if ('suspended' === actx.state) {
        await actx.resume();
    }
    return actx.state;
}

const getCurrentTime = () => (actx) ? actx.currentTime : 0;

export { loadMusicPlayer, playPause, getCurrentTime }
