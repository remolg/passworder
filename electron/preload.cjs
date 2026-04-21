const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("passworder", {
  getStatus: () => ipcRenderer.invoke("vault:get-status"),
  initializeVault: (masterPassword) =>
    ipcRenderer.invoke("vault:initialize", masterPassword),
  unlockVault: (masterPassword) => ipcRenderer.invoke("vault:unlock", masterPassword),
  lockVault: () => ipcRenderer.invoke("vault:lock"),
  saveEntry: (input) => ipcRenderer.invoke("vault:save-entry", input),
  deleteEntry: (id) => ipcRenderer.invoke("vault:delete-entry", id),
  updateSettings: (settings) => ipcRenderer.invoke("vault:update-settings", settings),
  copyToClipboard: (value, clearAfterSeconds) =>
    ipcRenderer.invoke("vault:copy-to-clipboard", value, clearAfterSeconds),
});
