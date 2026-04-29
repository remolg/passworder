import {
  AppStatus,
  EntryMutationInput,
  ExportEntriesResult,
  ImportEntriesResult,
  MasterPasswordChangeInput,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";

export interface AppUpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl: string;
}

export interface DesktopVaultApi {
  getStatus: () => Promise<AppStatus>;
  initializeVault: (masterPassword: string) => Promise<VaultPayload>;
  unlockVault: (masterPassword: string) => Promise<VaultPayload>;
  lockVault: () => Promise<void>;
  saveEntry: (input: EntryMutationInput) => Promise<VaultPayload>;
  exportEntries: () => Promise<ExportEntriesResult>;
  importEntries: () => Promise<ImportEntriesResult>;
  reorderEntries: (entryIds: string[]) => Promise<VaultPayload>;
  deleteEntry: (id: string) => Promise<VaultPayload>;
  updateSettings: (settings: VaultSettings) => Promise<VaultPayload>;
  changeMasterPassword: (input: MasterPasswordChangeInput) => Promise<VaultPayload>;
  copyToClipboard: (value: string, clearAfterSeconds: number) => Promise<void>;
  getUpdateInfo?: () => Promise<AppUpdateInfo>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    passworder?: DesktopVaultApi;
  }
}
