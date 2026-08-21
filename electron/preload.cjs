const { contextBridge, ipcRenderer } = require("electron");

let entrySecretCopiedSubscriptionId = 0;
const entrySecretCopiedSubscriptions = new Map();
let updateDownloadSubscriptionId = 0;
const updateDownloadSubscriptions = new Map();

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
  exportEntries: (password) => ipcRenderer.invoke("vault:export-entries", password),
  importEntries: (password) => ipcRenderer.invoke("vault:import-entries", password),
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
  setShortcutsSuspended: (suspended) => {
    ipcRenderer.sendSync("shortcuts:set-suspended-sync", Boolean(suspended));
    return Promise.resolve();
  },
  getUpdateInfo: () => ipcRenderer.invoke("app:get-update-info"),
  getUpdateDownloadState: () =>
    ipcRenderer.invoke("app:get-update-download-state"),
  downloadUpdate: () => ipcRenderer.invoke("app:download-update"),
  installUpdate: () => ipcRenderer.invoke("app:install-update"),
  onUpdateDownloadProgress: (callback) => {
    if (typeof callback !== "function") {
      return null;
    }

    const subscriptionId = ++updateDownloadSubscriptionId;
    const listener = (_event, payload) => {
      callback(payload);
    };

    updateDownloadSubscriptions.set(subscriptionId, listener);
    ipcRenderer.on("app:update-download-progress", listener);
    return subscriptionId;
  },
  offUpdateDownloadProgress: (subscriptionId) => {
    const listener = updateDownloadSubscriptions.get(subscriptionId);
    if (!listener) {
      return;
    }

    ipcRenderer.removeListener("app:update-download-progress", listener);
    updateDownloadSubscriptions.delete(subscriptionId);
  },
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  openExternalUrl: (url) => ipcRenderer.invoke("window:open-external", url),
  getWindowAnchor: () => ipcRenderer.invoke("window:get-anchor"),
  setWindowAnchor: (anchor) => ipcRenderer.invoke("window:set-anchor", anchor),
  getShowShortcut: () => ipcRenderer.invoke("window:get-show-shortcut"),
  setShowShortcut: (shortcut) => ipcRenderer.invoke("window:set-show-shortcut", shortcut),
  getGeneratorOptions: () => ipcRenderer.sendSync("app:get-generator-options-sync"),
  setGeneratorOptions: (options) =>
    ipcRenderer.sendSync("app:set-generator-options-sync", options),
});
