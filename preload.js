const { ipcRenderer, shell } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    // preload minimal — contextIsolation désactivé intentionnellement
});

// Piper TTS API
window.electronAPI = {
    speakNormie:    (text, gender) => ipcRenderer.invoke('speak-normie', { text, gender }),
    checkPiper:     ()             => ipcRenderer.invoke('check-piper'),
    disconnect:     ()             => ipcRenderer.send('wallet-disconnect'),
    openExternal:   (url)          => shell.openExternal(url),
    onTtsFinished:  (cb)           => ipcRenderer.once('tts-finished', cb),
};

// RetroArch API — contextIsolation:false, exposed directly on window
window.retroAPI = {
    selectRom: ()             => ipcRenderer.invoke('select-rom'),
    launch:    (romPath, core) => ipcRenderer.invoke('launch-retroarch', { romPath, core }),
};
