const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Send a message to the main process
  send: (channel, ...args) => {
    // Whitelist channels
    const validChannels = ['toggle-visibility', 'minimize-window', 'close-window', 'toggle-settings-panel', 'electron-store-set', 'electron-store-delete'];
    if (validChannels.includes(channel)) {
      console.log(`Sending message on channel: ${channel}`);
      ipcRenderer.send(channel, ...args);
    } else {
      console.warn(`Attempted to send message on invalid channel: ${channel}`);
    }
  },
  
  // Invoke a method in the main process and get a result
  invoke: async (channel, ...args) => {
    // Whitelist channels
    const validChannels = ['electron-store-get'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
    return null;
  },
  
  // Electron Store API
  store: {
    get: async (key, defaultValue) => {
      return await ipcRenderer.invoke('electron-store-get', key, defaultValue);
    },
    set: (key, value) => {
      ipcRenderer.send('electron-store-set', key, value);
    },
    delete: (key) => {
      ipcRenderer.send('electron-store-delete', key);
    }
  }
}); 