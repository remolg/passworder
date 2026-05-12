const { contextBridge, ipcRenderer } = require("electron");

let entrySecretCopiedSubscriptionId = 0;
const entrySecretCopiedSubscriptions = new Map();

contextBridge.exposeInMainWorld("passworder", {
  getStatus: () => ipcRenderer.invoke("vault:get-status"),
  initializeVault: (masterPassword) =>
    ipcRenderer.invoke("vault:initialize", masterPassword),
  unlockVault: (masterPassword) => ipcRenderer.invoke("vault:unlock", masterPassword),
  lockVault: () => ipcRenderer.invoke("vault:lock"),
  saveEntry: (input) => ipcRenderer.invoke("vault:save-entry", input),
  createFolder: (input) => ipcRenderer.invoke("vault:create-folder", input),
  updateFolder: (input) => ipcRenderer.invoke("vault:update-folder", input),
  deleteFolder: (id) => ipcRenderer.invoke("vault:delete-folder", id),
  exportEntries: () => ipcRenderer.invoke("vault:export-entries"),
  importEntries: () => ipcRenderer.invoke("vault:import-entries"),
  reorderEntries: (entryIds) => ipcRenderer.invoke("vault:reorder-entries", entryIds),
  reorderFolders: (folderIds) => ipcRenderer.invoke("vault:reorder-folders", folderIds),
  deleteEntry: (id) => ipcRenderer.invoke("vault:delete-entry", id),
  updateSettings: (settings) => ipcRenderer.invoke("vault:update-settings", settings),
  changeMasterPassword: (input) => ipcRenderer.invoke("vault:change-master-password", input),
  copyToClipboard: (value, clearAfterSeconds) =>
    ipcRenderer.invoke("vault:copy-to-clipboard", value, clearAfterSeconds),
  onEntrySecretCopied: (callback) => {
    if (typeof callback !== "function") {
      return null;
    }

    const subscriptionId = ++entrySecretCopiedSubscriptionId;
    const listener = (_event, payload) => {
      callback(payload);
    };

    entrySecretCopiedSubscriptions.set(subscriptionId, listener);
    ipcRenderer.on("vault:entry-secret-copied", listener);
    return subscriptionId;
  },
  offEntrySecretCopied: (subscriptionId) => {
    const listener = entrySecretCopiedSubscriptions.get(subscriptionId);
    if (!listener) {
      return;
    }

    ipcRenderer.removeListener("vault:entry-secret-copied", listener);
    entrySecretCopiedSubscriptions.delete(subscriptionId);
  },
  setShortcutsSuspended: (suspended) =>
    ipcRenderer.invoke("shortcuts:set-suspended", Boolean(suspended)),
  getUpdateInfo: () => ipcRenderer.invoke("app:get-update-info"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  openExternalUrl: (url) => ipcRenderer.invoke("window:open-external", url),
});
