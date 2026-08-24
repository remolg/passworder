import {
  AppStatus,
  EntryMutationInput,
  FolderMutationInput,
  ExportEntriesResult,
  EntryCopyFeedback,
  ImportEntriesResult,
  MasterPasswordChangeInput,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";
import {
  AppUpdateInfo,
  DesktopVaultApi,
  EntrySecretCopiedEvent,
  UpdateDownloadState,
  WindowAnchor,
} from "@/types/desktop";

const DEFAULT_WINDOW_ANCHOR: WindowAnchor = "bottom-right";
const WINDOW_ANCHORS: WindowAnchor[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function isWindowAnchor(value: unknown): value is WindowAnchor {
  return typeof value === "string" && WINDOW_ANCHORS.includes(value as WindowAnchor);
}

export function isDesktopRuntime() {
  return typeof window !== "undefined" && typeof window.passworder !== "undefined";
}

function getDesktopApi(): DesktopVaultApi {
  if (!window.passworder) {
    throw new Error("errors.runtimeMissing");
  }

  return window.passworder;
}

export function supportsEntryReorder() {
  return (
    typeof window !== "undefined" &&
    typeof window.passworder?.reorderEntries === "function"
  );
}

export function supportsFolderReorder() {
  return (
    typeof window !== "undefined" &&
    typeof window.passworder?.reorderFolders === "function"
  );
}

export const vaultApi = {
  async getStatus() {
    return getDesktopApi().getStatus() as Promise<AppStatus>;
  },
  async initializeVault(masterPassword: string) {
    return getDesktopApi().initializeVault(masterPassword) as Promise<VaultPayload>;
  },
  async unlockVault(masterPassword: string) {
    return getDesktopApi().unlockVault(masterPassword) as Promise<VaultPayload>;
  },
  async lockVault() {
    return getDesktopApi().lockVault();
  },
  async saveEntry(input: EntryMutationInput) {
    return getDesktopApi().saveEntry(input) as Promise<VaultPayload>;
  },
  async createFolder(input: FolderMutationInput) {
    return getDesktopApi().createFolder(input) as Promise<VaultPayload>;
  },
  async updateFolder(input: FolderMutationInput) {
    const api = getDesktopApi() as Partial<DesktopVaultApi>;
    if (typeof api.updateFolder !== "function") {
      throw new Error("errors.desktopRestartRequired");
    }

    return api.updateFolder(input) as Promise<VaultPayload>;
  },
  async deleteFolder(id: string) {
    return getDesktopApi().deleteFolder(id) as Promise<VaultPayload>;
  },
  async exportEntries(password: string, masterPassword: string) {
    return getDesktopApi().exportEntries(
      password,
      masterPassword,
    ) as Promise<ExportEntriesResult>;
  },
  async importEntries(password: string | undefined, masterPassword: string) {
    return getDesktopApi().importEntries(
      password,
      masterPassword,
    ) as Promise<ImportEntriesResult>;
  },
  async reorderEntries(entryIds: string[]) {
    const api = getDesktopApi() as Partial<DesktopVaultApi>;
    if (typeof api.reorderEntries !== "function") {
      throw new Error("errors.desktopRestartRequired");
    }

    return api.reorderEntries(entryIds) as Promise<VaultPayload>;
  },
  async reorderFolders(folderIds: string[]) {
    const api = getDesktopApi() as Partial<DesktopVaultApi>;
    if (typeof api.reorderFolders !== "function") {
      throw new Error("errors.desktopRestartRequired");
    }

    return api.reorderFolders(folderIds) as Promise<VaultPayload>;
  },
  async deleteEntry(id: string) {
    return getDesktopApi().deleteEntry(id) as Promise<VaultPayload>;
  },
  async updateSettings(settings: VaultSettings) {
    return getDesktopApi().updateSettings(settings) as Promise<VaultPayload>;
  },
  async changeMasterPassword(input: MasterPasswordChangeInput) {
    return getDesktopApi().changeMasterPassword(input) as Promise<VaultPayload>;
  },
  async copyToClipboard(value: string, clearAfterSeconds: number) {
    return getDesktopApi().copyToClipboard(value, clearAfterSeconds);
  },
};

export const appWindow = {
  async minimize() {
    if (!window.passworder) {
      return;
    }

    await getDesktopApi().minimizeWindow();
  },
  async close() {
    if (!window.passworder) {
      return;
    }

    await getDesktopApi().closeWindow();
  },
  async openExternal(url: string) {
    if (!window.passworder) {
      return;
    }

    await getDesktopApi().openExternalUrl(url);
  },
  async revealStorage() {
    const revealStorage = window.passworder?.revealStorage;
    if (!revealStorage) {
      throw new Error("errors.desktopRestartRequired");
    }

    await revealStorage();
  },
  supportsAnchor() {
    return typeof window.passworder?.getWindowAnchor === "function";
  },
  async getAnchor() {
    const getWindowAnchor = window.passworder?.getWindowAnchor;
    if (!getWindowAnchor) {
      return DEFAULT_WINDOW_ANCHOR;
    }

    const anchor = await getWindowAnchor();
    return isWindowAnchor(anchor) ? anchor : null;
  },
  async setAnchor(anchor: WindowAnchor) {
    const setWindowAnchor = window.passworder?.setWindowAnchor;
    if (!setWindowAnchor) {
      throw new Error("errors.desktopRestartRequired");
    }

    const nextAnchor = await setWindowAnchor(anchor);
    return isWindowAnchor(nextAnchor) ? nextAnchor : null;
  },
  subscribeAnchor(callback: (anchor: WindowAnchor | null) => void) {
    const subscribe = window.passworder?.onWindowAnchorChanged;
    if (!subscribe) {
      return () => {};
    }

    const subscriptionId = subscribe((anchor) => {
      callback(isWindowAnchor(anchor) ? anchor : null);
    });

    return () => {
      if (typeof subscriptionId === "number") {
        window.passworder?.offWindowAnchorChanged?.(subscriptionId);
      }
    };
  },
  supportsWindowLock() {
    return typeof window.passworder?.getWindowLocked === "function";
  },
  async getWindowLocked() {
    const getWindowLocked = window.passworder?.getWindowLocked;
    if (!getWindowLocked) {
      return false;
    }

    return Boolean(await getWindowLocked());
  },
  async setWindowLocked(locked: boolean) {
    const setWindowLocked = window.passworder?.setWindowLocked;
    if (!setWindowLocked) {
      throw new Error("errors.desktopRestartRequired");
    }

    return Boolean(await setWindowLocked(locked));
  },
  subscribeWindowLock(callback: (locked: boolean) => void) {
    const subscribe = window.passworder?.onWindowLockChanged;
    if (!subscribe) {
      return () => {};
    }

    const subscriptionId = subscribe(callback);
    return () => {
      if (typeof subscriptionId === "number") {
        window.passworder?.offWindowLockChanged?.(subscriptionId);
      }
    };
  },
  supportsShowShortcut() {
    return typeof window.passworder?.getShowShortcut === "function";
  },
  async getShowShortcut() {
    const getShowShortcut = window.passworder?.getShowShortcut;
    if (!getShowShortcut) {
      return "";
    }

    const shortcut = await getShowShortcut();
    return typeof shortcut === "string" ? shortcut : "";
  },
  async setShowShortcut(shortcut: string) {
    const setShowShortcut = window.passworder?.setShowShortcut;
    if (!setShowShortcut) {
      throw new Error("errors.desktopRestartRequired");
    }

    const nextShortcut = await setShowShortcut(shortcut);
    return typeof nextShortcut === "string" ? nextShortcut : "";
  },
  supportsDeveloperMode() {
    return typeof window.passworder?.isDeveloperModeAvailable === "function";
  },
  async isDeveloperModeAvailable() {
    const isDeveloperModeAvailable = window.passworder?.isDeveloperModeAvailable;
    if (!isDeveloperModeAvailable) {
      return false;
    }

    return Boolean(await isDeveloperModeAvailable());
  },
  async getDeveloperMode() {
    const getDeveloperMode = window.passworder?.getDeveloperMode;
    if (!getDeveloperMode) {
      return false;
    }

    return Boolean(await getDeveloperMode());
  },
  async setDeveloperMode(enabled: boolean) {
    const setDeveloperMode = window.passworder?.setDeveloperMode;
    if (!setDeveloperMode) {
      throw new Error("errors.desktopRestartRequired");
    }

    return Boolean(await setDeveloperMode(enabled));
  },
};

export const appUpdates = {
  async getInfo() {
    const getUpdateInfo = window.passworder?.getUpdateInfo;
    if (!getUpdateInfo) {
      return null;
    }

    return getUpdateInfo() as Promise<AppUpdateInfo>;
  },
  async getDownloadState() {
    const getUpdateDownloadState = window.passworder?.getUpdateDownloadState;
    if (!getUpdateDownloadState) {
      return null;
    }

    return getUpdateDownloadState() as Promise<UpdateDownloadState>;
  },
  async download() {
    const downloadUpdate = window.passworder?.downloadUpdate;
    if (!downloadUpdate) {
      throw new Error("errors.desktopRestartRequired");
    }

    return downloadUpdate() as Promise<UpdateDownloadState>;
  },
  async install() {
    const installUpdate = window.passworder?.installUpdate;
    if (!installUpdate) {
      throw new Error("errors.desktopRestartRequired");
    }

    return installUpdate() as Promise<UpdateDownloadState>;
  },
  subscribeDownload(callback: (state: UpdateDownloadState) => void) {
    const subscribe = window.passworder?.onUpdateDownloadProgress;
    if (!subscribe) {
      return () => {};
    }

    const subscriptionId = subscribe(callback);
    return () => {
      if (typeof subscriptionId === "number") {
        window.passworder?.offUpdateDownloadProgress?.(subscriptionId);
      }
    };
  },
};

export const entryCopyEvents = {
  subscribe(callback: (event: EntrySecretCopiedEvent) => void) {
    const subscribe = window.passworder?.onEntrySecretCopied;
    if (!subscribe) {
      return () => {};
    }

    const subscriptionId = subscribe(callback);
    return () => {
      if (typeof subscriptionId === "number") {
        window.passworder?.offEntrySecretCopied?.(subscriptionId);
      }
    };
  },
  toFeedback(event: EntrySecretCopiedEvent, sequence: number): EntryCopyFeedback {
    return {
      entryId: event.entryId,
      field: event.field,
      sequence,
    };
  },
};

export const shortcutRuntime = {
  async setSuspended(suspended: boolean) {
    await window.passworder?.setShortcutsSuspended?.(suspended);
  },
};
