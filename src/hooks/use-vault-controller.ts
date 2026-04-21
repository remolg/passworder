import { useEffect, useState } from "react";

import { isDesktopRuntime, vaultApi } from "@/lib/desktop";
import {
  AppStatus,
  EntryMutationInput,
  VaultPayload,
  VaultSettings,
} from "@/types/vault";

const DEFAULT_STATUS: AppStatus = {
  vaultExists: false,
  isUnlocked: false,
  defaultAutoLockMinutes: 5,
};

export function useVaultController() {
  const [status, setStatus] = useState<AppStatus>(DEFAULT_STATUS);
  const [payload, setPayload] = useState<VaultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [runtimeMissing, setRuntimeMissing] = useState(false);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!isDesktopRuntime()) {
        if (active) {
          setRuntimeMissing(true);
          setLoading(false);
          setError(
            "Electron çalışma zamanı bulunamadı. Uygulamayı masaüstü olarak `npm run dev` ile başlatın.",
          );
        }
        return;
      }

      try {
        const nextStatus = await vaultApi.getStatus();
        if (active) {
          setStatus(nextStatus);
        }
      } catch (caughtError) {
        if (active) {
          setError(toErrorMessage(caughtError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function runMutation<T>(
    task: () => Promise<T>,
    successMessage?: string,
  ): Promise<T | null> {
    setBusy(true);
    setError(null);
    if (successMessage) {
      setNotice(null);
    }

    try {
      const result = await task();
      if (successMessage) {
        setNotice(successMessage);
      }
      return result;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function initializeVault(masterPassword: string) {
    const nextPayload = await runMutation(
      () => vaultApi.initializeVault(masterPassword),
      "Yeni kasa oluşturuldu.",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    setStatus((current) => ({
      ...current,
      vaultExists: true,
      isUnlocked: true,
    }));
    return true;
  }

  async function unlockVault(masterPassword: string) {
    const nextPayload = await runMutation(
      () => vaultApi.unlockVault(masterPassword),
      "Kasa açıldı.",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    setStatus((current) => ({
      ...current,
      vaultExists: true,
      isUnlocked: true,
    }));
    return true;
  }

  async function lockVault(showMessage = true) {
    const result = await runMutation(
      () => vaultApi.lockVault(),
      showMessage ? "Kasa kilitlendi." : undefined,
    );

    if (result === null) {
      return false;
    }

    setPayload(null);
    setStatus((current) => ({
      ...current,
      isUnlocked: false,
    }));
    return true;
  }

  async function saveEntry(input: EntryMutationInput) {
    const nextPayload = await runMutation(
      () => vaultApi.saveEntry(input),
      input.id ? "Kayıt güncellendi." : "Yeni kayıt eklendi.",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function deleteEntry(id: string) {
    const nextPayload = await runMutation(
      () => vaultApi.deleteEntry(id),
      "Kayıt silindi.",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function updateSettings(settings: VaultSettings) {
    const nextPayload = await runMutation(
      () => vaultApi.updateSettings(settings),
      "Kasa ayarları kaydedildi.",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function copyToClipboard(value: string) {
    const clearAfterSeconds = payload?.settings.clipboardClearSeconds ?? 30;
    const result = await runMutation(
      () => vaultApi.copyToClipboard(value, clearAfterSeconds),
      `Pano ${clearAfterSeconds} saniye sonra temizlenecek şekilde güncellendi.`,
    );

    return result !== null;
  }

  return {
    status,
    payload,
    loading,
    busy,
    error,
    notice,
    runtimeMissing,
    clearMessages: () => {
      setError(null);
      setNotice(null);
    },
    initializeVault,
    unlockVault,
    lockVault,
    saveEntry,
    deleteEntry,
    updateSettings,
    copyToClipboard,
  };
}

function toErrorMessage(caughtError: unknown) {
  if (typeof caughtError === "string") {
    return caughtError;
  }

  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  return "Beklenmeyen bir hata oluştu.";
}
