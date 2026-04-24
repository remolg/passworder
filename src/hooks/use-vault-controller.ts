import { useEffect, useState } from "react";

import { isDesktopRuntime, vaultApi } from "@/lib/desktop";
import {
  AppStatus,
  EntryMutationInput,
  MasterPasswordChangeInput,
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
          setError("errors.runtimeMissing");
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
    trackBusy = true,
  ): Promise<T | null> {
    if (trackBusy) {
      setBusy(true);
    }
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
      if (trackBusy) {
        setBusy(false);
      }
    }
  }

  async function initializeVault(masterPassword: string) {
    const nextPayload = await runMutation(() => vaultApi.initializeVault(masterPassword));

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
    const nextPayload = await runMutation(() => vaultApi.unlockVault(masterPassword));

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
      showMessage ? "notice.vaultLocked" : undefined,
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
      input.id ? "notice.entryUpdated" : "notice.entryCreated",
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
      "notice.entryDeleted",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function reorderEntries(entryIds: string[]) {
    const nextPayload = await runMutation(
      () => vaultApi.reorderEntries(entryIds),
      undefined,
      false,
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function exportEntries() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await vaultApi.exportEntries();
      if (!result.completed) {
        return false;
      }

      setNotice("notice.exportCompleted");
      return true;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function importEntries() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await vaultApi.importEntries();
      if (!result.completed || !result.payload) {
        return false;
      }

      setPayload(result.payload);
      setNotice("notice.importCompleted");
      return true;
    } catch (caughtError) {
      setError(toErrorMessage(caughtError));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function updateSettings(settings: VaultSettings) {
    const nextPayload = await runMutation(
      () => vaultApi.updateSettings(settings),
      "notice.settingsSaved",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function changeMasterPassword(input: MasterPasswordChangeInput) {
    const nextPayload = await runMutation(
      () => vaultApi.changeMasterPassword(input),
      "notice.masterPasswordUpdated",
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
      undefined,
      false,
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
    exportEntries,
    importEntries,
    reorderEntries,
    deleteEntry,
    updateSettings,
    changeMasterPassword,
    copyToClipboard,
  };
}

function toErrorMessage(caughtError: unknown): string {
  if (typeof caughtError === "string") {
    return extractTranslationKey(caughtError) ?? "errors.unexpected";
  }

  if (caughtError instanceof Error) {
    return (
      extractTranslationKey(caughtError.message) ??
      toErrorMessage((caughtError as Error & { cause?: unknown }).cause)
    );
  }

  if (
    typeof caughtError === "object" &&
    caughtError !== null &&
    "message" in caughtError &&
    typeof caughtError.message === "string"
  ) {
    return extractTranslationKey(caughtError.message) ?? "errors.unexpected";
  }

  return "errors.unexpected";
}

function extractTranslationKey(value: string): string | null {
  const match = value.match(/(?:errors|notice)\.[A-Za-z0-9]+/);
  return match?.[0] ?? null;
}
