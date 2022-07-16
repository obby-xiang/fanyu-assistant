// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const {
  contextBridge,
  ipcRenderer,
} = require('electron');

contextBridge.exposeInMainWorld('electron', {
  network: (name, ...args) => ipcRenderer.invoke('network', name, ...args),
  database: (name, ...args) => ipcRenderer.invoke('database', name, ...args),
  randomUUID: (options) => ipcRenderer.invoke('uuid', options ?? {}),
  onDatabasePutEvent: (listener) => ipcRenderer.on('database-put', listener),
});
