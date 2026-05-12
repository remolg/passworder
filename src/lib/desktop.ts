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
import { AppUpdateInfo, DesktopVaultApi, EntrySecretCopiedEvent } from "@/types/desktop";

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
  async exportEntries() {
    return getDesktopApi().exportEntries() as Promise<ExportEntriesResult>;
  },
  async importEntries() {
    return getDesktopApi().importEntries() as Promise<ImportEntriesResult>;
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
};

export const appUpdates = {
  async getInfo() {
    const getUpdateInfo = window.passworder?.getUpdateInfo;
    if (!getUpdateInfo) {
      return null;
    }

    return getUpdateInfo() as Promise<AppUpdateInfo>;
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
