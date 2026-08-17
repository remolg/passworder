import {
  AppStatus,
  EntryMutationInput,
  FolderMutationInput,
  ExportEntriesResult,
  ImportEntriesResult,
  MasterPasswordChangeInput,
  CopyableEntryField,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";

export interface AppUpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl: string;
  downloadUrl?: string;
  downloadName?: string;
}

export type UpdateDownloadStatus =
  | "idle"
  | "downloading"
  | "ready"
  | "installing"
  | "error";

export interface UpdateDownloadState {
  status: UpdateDownloadStatus;
  progress: number;
  latestVersion?: string;
  downloadName?: string;
  error?: string;
}

export interface EntrySecretCopiedEvent {
  entryId: string;
  field: CopyableEntryField;
}

export interface DesktopVaultApi {
  getStatus: () => Promise<AppStatus>;
  initializeVault: (masterPassword: string) => Promise<VaultPayload>;
  unlockVault: (masterPassword: string) => Promise<VaultPayload>;
  lockVault: () => Promise<void>;
  saveEntry: (input: EntryMutationInput) => Promise<VaultPayload>;
  createFolder: (input: FolderMutationInput) => Promise<VaultPayload>;
  updateFolder: (input: FolderMutationInput) => Promise<VaultPayload>;
  deleteFolder: (id: string) => Promise<VaultPayload>;
  exportEntries: (password: string) => Promise<ExportEntriesResult>;
  importEntries: (password?: string) => Promise<ImportEntriesResult>;
  reorderEntries: (entryIds: string[]) => Promise<VaultPayload>;
  reorderFolders: (folderIds: string[]) => Promise<VaultPayload>;
  deleteEntry: (id: string) => Promise<VaultPayload>;
  updateSettings: (settings: VaultSettings) => Promise<VaultPayload>;
  changeMasterPassword: (input: MasterPasswordChangeInput) => Promise<VaultPayload>;
  copyToClipboard: (value: string, clearAfterSeconds: number) => Promise<void>;
  onEntrySecretCopied?: (
    callback: (event: EntrySecretCopiedEvent) => void,
  ) => number | null;
  offEntrySecretCopied?: (subscriptionId: number) => void;
  setShortcutsSuspended?: (suspended: boolean) => Promise<void>;
  getUpdateInfo?: () => Promise<AppUpdateInfo>;
  getUpdateDownloadState?: () => Promise<UpdateDownloadState>;
  downloadUpdate?: () => Promise<UpdateDownloadState>;
  installUpdate?: () => Promise<UpdateDownloadState>;
  onUpdateDownloadProgress?: (
    callback: (state: UpdateDownloadState) => void,
  ) => number | null;
  offUpdateDownloadProgress?: (subscriptionId: number) => void;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    passworder?: DesktopVaultApi;
  }
}
