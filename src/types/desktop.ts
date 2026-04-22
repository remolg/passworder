import {
  AppStatus,
  EntryMutationInput,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";

export interface DesktopVaultApi {
  getStatus: () => Promise<AppStatus>;
  initializeVault: (masterPassword: string) => Promise<VaultPayload>;
  unlockVault: (masterPassword: string) => Promise<VaultPayload>;
  lockVault: () => Promise<void>;
  saveEntry: (input: EntryMutationInput) => Promise<VaultPayload>;
  deleteEntry: (id: string) => Promise<VaultPayload>;
  updateSettings: (settings: VaultSettings) => Promise<VaultPayload>;
  copyToClipboard: (value: string, clearAfterSeconds: number) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  openExternalUrl: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    passworder?: DesktopVaultApi;
  }
}
