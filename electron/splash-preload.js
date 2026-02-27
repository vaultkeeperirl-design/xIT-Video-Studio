const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  onProgress: (callback) => ipcRenderer.on('progress', (_event, value) => callback(value)),
  onStatus: (callback) => ipcRenderer.on('status', (_event, value) => callback(value))
});
