// MIDI File Piano Roll App, Supabase DB support
// Copyright 2025, Donald Tillman.  All rights reserved.

import { createClient } from '@supabase/supabase-js';

// This is a quick demo, so we don't have a secure way to encrypt the
// key right now.
const decrypt = (str) => {
    return str.split('').reverse().join('');
}    

// DB access
const dbURL = 'https://xneoczykiqeroujuucua.supabase.co';
const encryptedAuthKey = 'Elj2vONN_wW4zUS6zMhupfST3GolcMw_elbahsilbup_bs';

const supabase = createClient(dbURL, decrypt(encryptedAuthKey));

// List the available midi files on the DB
// It would be nice to present the error to the user.
const dbListMidiFiles = async () => {
    const { data, error } = await supabase
          .from('files')
          .select();
    if (error) {
        console.log('list files data', data, 'error', error);
        return [];
    }
    return data;
};

// Encode a midi file and upload it to the database.
const dbAddMidiFile = async (file) => {
    const handleLoad = async (e) => {
        const hexData = bytesToHex(new Uint8Array(e.target.result));
        const { error } = await supabase
              .from('files')
              .insert({file_name: file.name,
                       data: hexData});
        console.log('insert error: ', error);
    };

    const reader = new FileReader();
    reader.onload = handleLoad;
    reader.readAsArrayBuffer(file);
};


// Binary to hex format string.
//   bytes is a Uint8Array
// Returns a string in Postgresql bytea hex format.
const bytesToHex = bytes => {
    return '\\x' + Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};

// Hex format string to binary.
//   hexString is hex encoded Postgresql bytea binary data
// Returns a Uint8Array
const hexToBytes = hexString => {
    // Remove the '\x' prefix if present
    if (hexString.startsWith('\\x')) {
        hexString = hexString.substring(2);
    }
    const n = hexString.length / 2;
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        bytes[i] = parseInt(hexString.substring(2 * i, 2 * i + 2), 16);
    }
    return bytes;
};

// Retrieve db binary file as a Uint8Array.
const binaryFileContent = (dbFile) => {
    return hexToBytes(dbFile.data);
};

export {dbAddMidiFile, dbListMidiFiles, binaryFileContent}
