const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("passworder", {
  getStatus: () => ipcRenderer.invoke("vault:get-status"),
  initializeVault: (masterPassword) =>
    ipcRenderer.invoke("vault:initialize", masterPassword),
  unlockVault: (masterPassword) => ipcRenderer.invoke("vault:unlock", masterPassword),
  lockVault: () => ipcRenderer.invoke("vault:lock"),
  saveEntry: (input) => ipcRenderer.invoke("vault:save-entry", input),
  exportEntries: () => ipcRenderer.invoke("vault:export-entries"),
  importEntries: () => ipcRenderer.invoke("vault:import-entries"),
  reorderEntries: (entryIds) => ipcRenderer.invoke("vault:reorder-entries", entryIds),
  deleteEntry: (id) => ipcRenderer.invoke("vault:delete-entry", id),
  updateSettings: (settings) => ipcRenderer.invoke("vault:update-settings", settings),
  changeMasterPassword: (input) => ipcRenderer.invoke("vault:change-master-password", input),
  copyToClipboard: (value, clearAfterSeconds) =>
    ipcRenderer.invoke("vault:copy-to-clipboard", value, clearAfterSeconds),
  getUpdateInfo: () => ipcRenderer.invoke("app:get-update-info"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  openExternalUrl: (url) => ipcRenderer.invoke("window:open-external", url),
});
