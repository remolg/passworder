const { contextBridge, ipcRenderer } = require("electron");

let entrySecretCopiedSubscriptionId = 0;
const entrySecretCopiedSubscriptions = new Map();
let updateDownloadSubscriptionId = 0;
const updateDownloadSubscriptions = new Map();
let windowLockSubscriptionId = 0;
const windowLockSubscriptions = new Map();
let windowAnchorSubscriptionId = 0;
const windowAnchorSubscriptions = new Map();

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
  exportEntries: (password, masterPassword) =>
    ipcRenderer.invoke("vault:export-entries", password, masterPassword),
  importEntries: (password, masterPassword) =>
    ipcRenderer.invoke("vault:import-entries", password, masterPassword),
  revealStorage: () => ipcRenderer.invoke("vault:reveal-storage"),
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
  onWindowAnchorChanged: (callback) => {
    if (typeof callback !== "function") {
      return null;
    }

    const subscriptionId = ++windowAnchorSubscriptionId;
    const listener = (_event, anchor) => {
      callback(anchor ?? null);
    };

    windowAnchorSubscriptions.set(subscriptionId, listener);
    ipcRenderer.on("window:anchor-changed", listener);
    return subscriptionId;
  },
  offWindowAnchorChanged: (subscriptionId) => {
    const listener = windowAnchorSubscriptions.get(subscriptionId);
    if (!listener) {
      return;
    }

    ipcRenderer.removeListener("window:anchor-changed", listener);
    windowAnchorSubscriptions.delete(subscriptionId);
  },
  getWindowLocked: () => ipcRenderer.invoke("window:get-locked"),
  setWindowLocked: (locked) => ipcRenderer.invoke("window:set-locked", locked),
  onWindowLockChanged: (callback) => {
    if (typeof callback !== "function") {
      return null;
    }

    const subscriptionId = ++windowLockSubscriptionId;
    const listener = (_event, locked) => {
      callback(Boolean(locked));
    };

    windowLockSubscriptions.set(subscriptionId, listener);
    ipcRenderer.on("window:lock-changed", listener);
    return subscriptionId;
  },
  offWindowLockChanged: (subscriptionId) => {
    const listener = windowLockSubscriptions.get(subscriptionId);
    if (!listener) {
      return;
    }

    ipcRenderer.removeListener("window:lock-changed", listener);
    windowLockSubscriptions.delete(subscriptionId);
  },
  getShowShortcut: () => ipcRenderer.invoke("window:get-show-shortcut"),
  setShowShortcut: (shortcut) => ipcRenderer.invoke("window:set-show-shortcut", shortcut),
  getDeveloperMode: () => ipcRenderer.invoke("window:get-developer-mode"),
  setDeveloperMode: (enabled) => ipcRenderer.invoke("window:set-developer-mode", enabled),
  isDeveloperModeAvailable: () =>
    ipcRenderer.invoke("window:developer-mode-available"),
  getGeneratorOptions: () => ipcRenderer.sendSync("app:get-generator-options-sync"),
  setGeneratorOptions: (options) =>
    ipcRenderer.sendSync("app:set-generator-options-sync", options),
});
