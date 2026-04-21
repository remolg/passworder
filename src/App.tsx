import { useEffect, useState } from "react";
import { Lock, Shield } from "lucide-react";

import { EditEntryDialog } from "@/components/edit-entry-dialog";
import { PasswordGeneratorCard } from "@/components/password-generator-card";
import { PasswordList } from "@/components/password-list";
import { QuickAddForm } from "@/components/quick-add-form";
import { UnlockScreen } from "@/components/unlock-screen";
import { VaultSettingsCard } from "@/components/vault-settings-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useVaultController } from "@/hooks/use-vault-controller";
import { generatePassword } from "@/lib/password-generator";
import {
  EntryFormValues,
  EntryMutationInput,
  PasswordGeneratorOptions,
  VaultEntry,
  VaultSettings,
} from "@/types/vault";

const DEFAULT_QUICK_ADD_VALUES: EntryFormValues = {
  service: "",
  username: "",
  password: "",
  url: "",
  notes: "",
  tags: "",
};

export default function App() {
  const controller = useVaultController();
  const [quickAddValues, setQuickAddValues] = useState<EntryFormValues>(
    DEFAULT_QUICK_ADD_VALUES,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);

  useEffect(() => {
    if (!controller.notice && !controller.error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      controller.clearMessages();
    }, 4_000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [controller.notice, controller.error]);

  const autoLock = useAutoLock({
    enabled: Boolean(controller.payload),
    minutes:
      controller.payload?.settings.autoLockMinutes ??
      controller.status.defaultAutoLockMinutes,
    onLock: () => controller.lockVault(false),
  });

  if (controller.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="panel-surface rounded-2xl px-6 py-5 text-sm text-muted-foreground">
          Kasa durumu hazırlanıyor...
        </div>
      </main>
    );
  }

  if (!controller.status.vaultExists || !controller.payload) {
    return (
      <UnlockScreen
        hasVault={controller.status.vaultExists}
        busy={controller.busy}
        error={controller.error}
        runtimeMissing={controller.runtimeMissing}
        storagePath={controller.status.storagePath}
        onCreateVault={controller.initializeVault}
        onUnlockVault={controller.unlockVault}
      />
    );
  }

  const filteredEntries = controller.payload.entries
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .filter((entry) => matchesSearch(entry, searchTerm));

  async function handleQuickAddSubmit() {
    const success = await controller.saveEntry(toMutationInput(quickAddValues));
    if (!success) {
      return;
    }

    autoLock.touch();
    setQuickAddValues(DEFAULT_QUICK_ADD_VALUES);
  }

  async function handleDelete(entry: VaultEntry) {
    const confirmed = window.confirm(
      `${entry.service} kaydını silmek istediğinize emin misiniz?`,
    );

    if (!confirmed) {
      return;
    }

    await controller.deleteEntry(entry.id);
    autoLock.touch();
  }

  async function handleSaveEdit(values: EntryFormValues) {
    const success = await controller.saveEntry(toMutationInput(values));
    if (!success) {
      return;
    }

    autoLock.touch();
    setEditingEntry(null);
  }

  async function handleSettingsChange(nextSettings: VaultSettings) {
    await controller.updateSettings(nextSettings);
    autoLock.touch();
  }

  function applyGeneratedPassword(password: string) {
    setQuickAddValues((current) => ({
      ...current,
      password,
    }));
  }

  function generateInlinePassword() {
    const password = generatePassword(defaultGeneratorOptions());
    applyGeneratedPassword(password);
  }

  async function handleCopy(value: string) {
    if (!value) {
      return;
    }

    await controller.copyToClipboard(value);
    autoLock.touch();
  }

  return (
    <>
      <main className="min-h-screen px-4 py-4 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1240px] flex-col gap-4 rounded-[28px] border border-border/60 bg-background/70 p-4 shadow-soft backdrop-blur">
          <header className="panel-surface rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">Passworder</h1>
                    <p className="text-sm text-muted-foreground">
                      Lokal kasa, offline-first masaüstü şifre yöneticisi
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge>Scrypt</Badge>
                  <Badge>AES-256-GCM</Badge>
                  <Badge variant="secondary">Lokal depolama</Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {controller.notice ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                    {controller.notice}
                  </div>
                ) : null}
                {controller.error ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {controller.error}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => controller.lockVault()}
                >
                  <Lock className="h-4 w-4" />
                  Kasayı Kilitle
                </Button>
              </div>
            </div>
          </header>

          <section className="grid flex-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="grid gap-4">
              <QuickAddForm
                values={quickAddValues}
                busy={controller.busy}
                onChange={(field, value) =>
                  setQuickAddValues((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
                onGeneratePassword={generateInlinePassword}
                onSubmit={handleQuickAddSubmit}
              />

              <PasswordGeneratorCard
                onApply={applyGeneratedPassword}
                onCopy={handleCopy}
              />

              <VaultSettingsCard
                settings={controller.payload.settings}
                storagePath={controller.status.storagePath}
                onChange={handleSettingsChange}
              />
            </div>

            <PasswordList
              entries={filteredEntries}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onEdit={setEditingEntry}
              onDelete={handleDelete}
              onCopyUsername={(entry) => handleCopy(entry.username)}
              onCopyPassword={(entry) => handleCopy(entry.password)}
            />
          </section>
        </div>
      </main>

      <EditEntryDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        busy={controller.busy}
        onClose={() => setEditingEntry(null)}
        onSave={handleSaveEdit}
        onGeneratePassword={(apply) => {
          const password = generatePassword(defaultGeneratorOptions());
          apply(password);
        }}
      />
    </>
  );
}

function toMutationInput(values: EntryFormValues): EntryMutationInput {
  return {
    id: values.id,
    service: values.service.trim(),
    username: values.username.trim(),
    password: values.password,
    url: values.url.trim(),
    notes: values.notes.trim(),
    tags: values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

function matchesSearch(entry: VaultEntry, searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!query) {
    return true;
  }

  const haystack = [
    entry.service,
    entry.username,
    entry.url,
    entry.notes,
    ...entry.tags,
  ]
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return haystack.includes(query);
}

function defaultGeneratorOptions(): PasswordGeneratorOptions {
  return {
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  };
}
