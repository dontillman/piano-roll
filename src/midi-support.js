// MIDI Support (minimal)
// Copyright 2025, Donald Tillman.  All rights reserved.

const midiParser = require('midi-parser-js');

const MIDI_metaEvent = 0xff;
const MIDI_noteOn = 0x9;
const MIDI_noteOff = 0x8;
const MIDI_tempo = 0x51;

// Convert raw MIDI file bytes into a list of notes.
//   midiBinary is a Uint8Array
//
// Returns, with times in seconds:
//   [{start, stop, note, level},...]
// 
const decodeMidi = (midiBinary) => {
    const midiData = midiParser.parse(midiBinary);

    // clocks per quarter note
    const timeDivision = midiData.timeDivision;
    // Seconds
    let tick = 0;

    const setTempo = (uSecTempo) => {
        tick = uSecTempo * 1e-6 / timeDivision;
    };

    // default value
    setTempo(500000);

    // A cache of started notes waiting to end.
    //   {note: [start, level],...}
    const noteStarts = {};
    const notes = [];
    
    for (const track of midiData.track) {
        let t = 0;

        // End a note, if it has been started.
        const endNote = (note) => {
            if (noteStarts.hasOwnProperty(note)) {
                const [start, level] = noteStarts[note];
                notes.push({start, stop: t, note, level});
                delete noteStarts[note];
            } 
        };

        for (const event of track.event) {
            const {deltaTime, type} = event;
            t += deltaTime * tick;

            // meta events
            if (type === MIDI_metaEvent) {
                const {metaType} = event;
                if (metaType === MIDI_tempo) {
                    setTempo(event.data);
                }
            }

            // note events
            else if (type === MIDI_noteOn) {
                const [note, level] = event.data;
                endNote(note);
                if (level) {
                    noteStarts[note] = [t, level];
                }
            } else if (type === MIDI_noteOff) {
                const [note, _level] = event.data;
                endNote(note);
            }
        }
        // intentinally ignoring leftover note starts
    }
    return notes;
};

export { decodeMidi }
