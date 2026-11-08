const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("installer", {
  status: () => ipcRenderer.invoke("status"),
  install: (key, opts) => ipcRenderer.invoke("install", key, opts),
  uninstall: (key, opts) => ipcRenderer.invoke("uninstall", key, opts),
  launch: (key) => ipcRenderer.invoke("launch", key),
});
