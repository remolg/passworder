import {
  AppStatus,
  EntryMutationInput,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";
import { DesktopVaultApi } from "@/types/desktop";

export function isDesktopRuntime() {
  return typeof window !== "undefined" && typeof window.passworder !== "undefined";
}

function getDesktopApi(): DesktopVaultApi {
  if (!window.passworder) {
    throw new Error(
      "Electron çalışma zamanı bulunamadı. Uygulamayı masaüstü olarak `npm run dev` ile başlatın.",
    );
  }

  return window.passworder;
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
  async deleteEntry(id: string) {
    return getDesktopApi().deleteEntry(id) as Promise<VaultPayload>;
  },
  async updateSettings(settings: VaultSettings) {
    return getDesktopApi().updateSettings(settings) as Promise<VaultPayload>;
  },
  async copyToClipboard(value: string, clearAfterSeconds: number) {
    return getDesktopApi().copyToClipboard(value, clearAfterSeconds);
  },
};
