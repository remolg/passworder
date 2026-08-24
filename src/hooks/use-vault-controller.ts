import { useEffect, useState } from "react";

import { isDesktopRuntime, vaultApi } from "@/lib/desktop";
import {
  AppStatus,
  EntryMutationInput,
  FolderMutationInput,
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
  const [noticeValues, setNoticeValues] = useState<
    Record<string, string | number> | undefined
  >(undefined);
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
      setNoticeValues(undefined);
    }

    try {
      const result = await task();
      if (successMessage) {
        setNotice(successMessage);
        setNoticeValues(undefined);
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

  async function createFolder(input: FolderMutationInput) {
    const nextPayload = await runMutation(
      () => vaultApi.createFolder(input),
      "notice.folderCreated",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function updateFolder(input: FolderMutationInput) {
    const nextPayload = await runMutation(
      () => vaultApi.updateFolder(input),
      "notice.folderUpdated",
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function deleteFolder(id: string) {
    const nextPayload = await runMutation(
      () => vaultApi.deleteFolder(id),
      "notice.folderDeleted",
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

  async function reorderFolders(folderIds: string[]) {
    const nextPayload = await runMutation(
      () => vaultApi.reorderFolders(folderIds),
      undefined,
      false,
    );

    if (!nextPayload) {
      return false;
    }

    setPayload(nextPayload);
    return true;
  }

  async function exportEntries(password: string, masterPassword: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    setNoticeValues(undefined);

    try {
      const result = await vaultApi.exportEntries(password, masterPassword);
      if (result.error) {
        const message = toErrorMessage(result.error);
        setError(message);
        return message;
      }

      if (!result.completed) {
        return false;
      }

      setNotice("notice.exportCompleted");
      return true;
    } catch (caughtError) {
      const message = toErrorMessage(caughtError);
      setError(message);
      return message;
    } finally {
      setBusy(false);
    }
  }

  async function importEntries(password: string | undefined, masterPassword: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    setNoticeValues(undefined);

    try {
      const result = await vaultApi.importEntries(password, masterPassword);
      if (result.error) {
        const message = toErrorMessage(result.error);
        setError(message);
        return message;
      }

      if (!result.completed || !result.payload) {
        return false;
      }

      setPayload(result.payload);
      setNotice(
        result.unencrypted
          ? "notice.importCompletedUnencrypted"
          : "notice.importCompleted",
      );
      setNoticeValues({
        added: result.summary?.added ?? 0,
        updated: result.summary?.updated ?? 0,
      });
      return true;
    } catch (caughtError) {
      const message = toErrorMessage(caughtError);
      setError(message);
      return message;
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
      "notice.copiedToClipboard",
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
    noticeValues,
    runtimeMissing,
    clearMessages: () => {
      setError(null);
      setNotice(null);
      setNoticeValues(undefined);
    },
    initializeVault,
    unlockVault,
    lockVault,
    saveEntry,
    exportEntries,
    importEntries,
    reorderEntries,
    reorderFolders,
    deleteEntry,
    createFolder,
    updateFolder,
    deleteFolder,
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
