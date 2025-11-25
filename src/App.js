// MIDI File Piano Roll App
// Copyright 2025, Donald Tillman.  All rights reserved.

import { useEffect, useState } from 'react';
import { decodeMidi } from './midi-support';
import { dbAddMidiFile, dbListMidiFiles, binaryFileContent } from './db-support';
import { loadMusicPlayer, playPause, getCurrentTime } from './audio-support';
import './App.css';

// Top level app.
function App() {
    const [music, setMusic] = useState([]);
    const [status, setStatus] = useState(null);

    const handleDone = () => {
        setStatus('suspended');
    };

    const loadMidiFile = file => {
        const notes = decodeMidi(binaryFileContent(file));
        setMusic(notes);
        loadMusicPlayer(notes, handleDone);
    };

    const buttonLabel = ('running' === status) ? 'Pause' : 'Play';

    const handleClick = async () => {
        setStatus(await playPause(handleDone));
    };

    return <div className="app">
             <div className="header">
               <h1>MIDI Piano Roll Demo</h1>
             </div>
             <div>
               <p>
                 Select a MIDI file from the list on the server.
                 Or add a file and select it.  Hit the Play/Pause button.
                 Have fun!
               </p>
             </div>
             <div className="main">
               <Files onSelect={loadMidiFile} />
               <div className="player-panel">
                 <PianoRoll notes={music} />
                 <div className="buttons">
                   <button disabled={!music.length}
                           onClick={handleClick}>
                     {buttonLabel}
                   </button>
                 </div>
               </div>
             </div>
           </div>;
}

// Present a Midi file from the database
//   file: db file object to present
//   selected: highlight if this file is the selected file
//   onClick: called with file as argument
const File = (params) => {
    const {file, selected, onClick} = params;

    let className = 'file';
    if (file === selected) {
        className += ' selected';
    }
    const date = new Date(file.created_at).toLocaleString();

    return <div className={className}
                onClick={() => onClick(file)}>
             {file.file_name}, {date}
           </div>;
};

// Hides the regular file input element and replaces it with a prettier button.
const FileUploadButton = (params) => {
    const {onClick} = params;
    return <span class="file-button">
             <input type="file"
                    id="fileInput"
                    onChange={onClick}
                    accept=".mid"
                    style={{display: 'none'}}/>
             <button onClick={() => document.getElementById('fileInput').click()} >
               Upload
             </button>
           </span>;
};

// Present a panel of available MIDI files.
//   onSelect: called when file is clicked
const Files = params => {
    const {onSelect} = params;
    const [entries, setEntries] = useState([]);
    const [selected, setSelected] = useState(null);

    const refresh = async () => {
        const data = await dbListMidiFiles();
        setEntries(data);
    };
        
    const handleFileUpload = async (event) => {
        await dbAddMidiFile(event.target.files[0]);
        await refresh();
    };

    const select = file => {
        setSelected(file);
        onSelect(file);        
    };

    useEffect(() => {
        refresh();
    },
              []);

    return <div className="file-list-frame">
             <div className="file-list-header">
               Available MIDI Files
             </div>
             <div className="file-list"> 
               {entries.map((f, i) => <File file={f}
                                            selected={selected}
                                            onClick={select}
                                            key={i} />)}
             </div>
             <div className="file-list-footer">
               <div>
                 Upload a new MIDI file:
                 <FileUploadButton onClick={handleFileUpload} />
               </div>
             </div>
           </div>;
};

// Return the svg elements for the piano roll holes.
//   notes: array of notes
const pianoRollHoles = notes => {
    const scale = [4, 50];
    const height = 400;
    
    return notes.map(({note, start, stop, level}, i) =>
        <rect x={note * scale[0]}
              y={height - stop * scale[1]}
              width={scale[0]}
              height={(stop - start) * scale[1]}
              rx={2}
              key={i} />);
};

// SVG that scrolls the content without recalculating things.
//   content: svg content
//   timeFunction: repeated called number of seconds
const ScrollingSVGView = (params) => {
    const {content, timeFunction} = params;

    const [startTime, _setStartTime] = useState(timeFunction());
    const [deltaTime, setDeltaTime] = useState(0);
    
    // synchronize with browser repaints
    const updater = () => {
        setDeltaTime(timeFunction() - startTime);
        requestAnimationFrame(updater);
    };
        
    // initial time
    useEffect(updater, []);

    return <div className="piano-roll">
             <svg width={500}
                  height={400}
                  viewBox={[0, -50 * deltaTime, 500, 400]} >
               {content}
             </svg>
           </div>;
};

// Present the piano roll synced to midi audio.
//   notes: array of notes
const PianoRoll = (params) => {
    const {notes} = params;
    const holes = pianoRollHoles(notes);
    return <ScrollingSVGView content={holes}
                             timeFunction={getCurrentTime} />;
};

export default App;
