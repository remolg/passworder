import { type ReactNode, useEffect, useState } from "react";
import {
  type LucideIcon,
  KeyRound,
  List,
  LockKeyhole,
  Menu,
  Minus,
  Settings2,
  Shield,
  WandSparkles,
  X,
} from "lucide-react";

import { DeleteEntryDialog } from "@/components/delete-entry-dialog";
import { EntryDetailView } from "@/components/entry-detail-view";
import { PasswordGeneratorCard } from "@/components/password-generator-card";
import { PasswordList } from "@/components/password-list";
import { QuickAddForm } from "@/components/quick-add-form";
import { UnlockScreen } from "@/components/unlock-screen";
import { VaultSettingsCard } from "@/components/vault-settings-card";
import { useAutoLock } from "@/hooks/use-auto-lock";
import { useVaultController } from "@/hooks/use-vault-controller";
import { appWindow, supportsEntryReorder } from "@/lib/desktop";
import {
  getStoredLanguage,
  I18nProvider,
  persistLanguage,
  type TranslationKey,
  useI18n,
} from "@/lib/i18n";
import { getDefaultGeneratorOptions } from "@/lib/password-generator-preferences";
import { generatePassword } from "@/lib/password-generator";
import { cn } from "@/lib/utils";
import {
  AppLanguage,
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

type SectionId = "passwords" | "quick-add" | "generator" | "settings";

const NAV_ITEMS: Array<{
  id: SectionId;
  labelKey: TranslationKey;
  icon: LucideIcon;
}> = [
  { id: "passwords", labelKey: "nav.passwords", icon: List },
  { id: "quick-add", labelKey: "nav.quickAdd", icon: KeyRound },
  { id: "generator", labelKey: "nav.generator", icon: WandSparkles },
  { id: "settings", labelKey: "nav.settings", icon: Settings2 },
];

export default function App() {
  const controller = useVaultController();
  const [language, setLanguage] = useState<AppLanguage>(() => getStoredLanguage());

  useEffect(() => {
    const payloadLanguage = controller.payload?.settings.language;
    if (payloadLanguage && payloadLanguage !== language) {
      setLanguage(payloadLanguage);
    }
  }, [controller.payload?.settings.language, language]);

  useEffect(() => {
    persistLanguage(language);
  }, [language]);

  return (
    <I18nProvider language={language}>
      <AppContent
        controller={controller}
        language={language}
        onLanguageChange={setLanguage}
      />
    </I18nProvider>
  );
}

function AppContent({
  controller,
  language,
  onLanguageChange,
}: {
  controller: ReturnType<typeof useVaultController>;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
}) {
  const { t, resolveText } = useI18n();
  const [quickAddValues, setQuickAddValues] = useState<EntryFormValues>(
    DEFAULT_QUICK_ADD_VALUES,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<VaultEntry | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("passwords");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    const nextSelected =
      controller.payload?.entries.find((entry) => entry.id === selectedEntry.id) ?? null;

    if (!nextSelected) {
      setSelectedEntry(null);
      return;
    }

    if (nextSelected !== selectedEntry) {
      setSelectedEntry(nextSelected);
    }
  }, [controller.payload?.entries, selectedEntry]);

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
  }, [controller.notice, controller.error, controller]);

  const autoLock = useAutoLock({
    enabled: Boolean(controller.payload),
    minutes:
      controller.payload?.settings.autoLockMinutes ??
      controller.status.defaultAutoLockMinutes,
    onLock: () => controller.lockVault(false),
  });
  const statusMessageKey = controller.error ?? controller.notice;
  const statusMessage = statusMessageKey
    ? resolveText(statusMessageKey)
    : undefined;
  const statusTone: "notice" | "error" = controller.error ? "error" : "notice";
  const availableTags = controller.payload
    ? collectAvailableTags(controller.payload.entries, language)
    : [];

  useEffect(() => {
    if (!selectedTag) {
      return;
    }

    const normalizedSelectedTag = normalizeFilterValue(selectedTag, language);
    const tagStillExists = availableTags.some(
      (tag) => normalizeFilterValue(tag, language) === normalizedSelectedTag,
    );

    if (!tagStillExists) {
      setSelectedTag(null);
    }
  }, [availableTags, language, selectedTag]);

  if (controller.loading) {
    return (
      <WindowShell
        footer={
          <StatusBar
            locked
            defaultAutoLockMinutes={controller.status.defaultAutoLockMinutes}
            message={statusMessage}
            tone={statusTone}
          />
        }
      >
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="w-full max-w-[250px] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <p className="mt-5 text-sm font-semibold text-foreground">
              {t("loading.title")}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {t("loading.description")}
            </p>
          </div>
        </div>
      </WindowShell>
    );
  }

  if (!controller.status.vaultExists || !controller.payload) {
    return (
      <WindowShell
        footer={
          <StatusBar
            locked
            defaultAutoLockMinutes={controller.status.defaultAutoLockMinutes}
            message={statusMessage}
            tone={statusTone}
          />
        }
      >
        <UnlockScreen
          hasVault={controller.status.vaultExists}
          busy={controller.busy}
          error={controller.error}
          runtimeMissing={controller.runtimeMissing}
          storagePath={controller.status.storagePath}
          onCreateVault={controller.initializeVault}
          onUnlockVault={controller.unlockVault}
        />
      </WindowShell>
    );
  }

  const filteredEntries = controller.payload.entries.filter((entry) =>
    matchesFilters(entry, searchTerm, selectedTag, language),
  );

  async function handleQuickAddSubmit() {
    const success = await controller.saveEntry(toMutationInput(quickAddValues));
    if (!success) {
      return;
    }

    autoLock.touch();
    setQuickAddValues(DEFAULT_QUICK_ADD_VALUES);
    setActiveSection("passwords");
  }

  function handleTagSelect(tag: string) {
    const normalizedTag = normalizeFilterValue(tag, language);
    if (!normalizedTag) {
      return;
    }

    const canonicalTag =
      availableTags.find(
        (candidate) => normalizeFilterValue(candidate, language) === normalizedTag,
      ) ?? tag.trim();

    setSelectedTag((current) =>
      normalizeFilterValue(current ?? "", language) === normalizedTag ? null : canonicalTag,
    );
    setActiveSection("passwords");
    setSelectedEntry(null);
  }

  function handleClearFilters() {
    setSearchTerm("");
    setSelectedTag(null);
  }

  function handleDeleteRequest(entry: VaultEntry) {
    setPendingDeleteEntry(entry);
  }

  async function handleDeleteConfirm(entry: VaultEntry) {
    setPendingDeleteEntry(null);
    setActiveSection("passwords");
    setSelectedEntry((current) => (current?.id === entry.id ? null : current));

    const success = await controller.deleteEntry(entry.id);
    if (!success) {
      return;
    }

    autoLock.touch();
  }

  async function handleSaveEdit(values: EntryFormValues) {
    const success = await controller.saveEntry(toMutationInput(values));
    if (!success) {
      return;
    }

    autoLock.touch();
    setActiveSection("passwords");
    setSelectedEntry(null);
  }

  async function handleReorder(entryIds: string[]) {
    const success = await controller.reorderEntries(entryIds);
    if (success) {
      autoLock.touch();
    }
  }

  async function handleSettingsChange(nextSettings: VaultSettings) {
    const previousLanguage = language;

    if (nextSettings.language !== language) {
      onLanguageChange(nextSettings.language);
    }

    const success = await controller.updateSettings(nextSettings);
    if (!success && nextSettings.language !== previousLanguage) {
      onLanguageChange(previousLanguage);
      return;
    }

    autoLock.touch();
  }

  async function handleMasterPasswordChange(
    currentPassword: string,
    nextPassword: string,
  ) {
    const success = await controller.changeMasterPassword({
      currentPassword,
      nextPassword,
    });

    if (success) {
      autoLock.touch();
    }

    return success;
  }

  function applyGeneratedPassword(password: string) {
    setQuickAddValues((current) => ({
      ...current,
      password,
    }));
    setActiveSection("quick-add");
  }

  function generateInlinePassword() {
    const password = generatePassword(defaultGeneratorOptions());
    applyGeneratedPassword(password);
  }

  async function handleCopy(value: string) {
    if (!value) {
      return false;
    }

    const success = await controller.copyToClipboard(value);
    if (success) {
      autoLock.touch();
    }

    return success;
  }

  async function handleManualLock() {
    await controller.lockVault(true);
    setActiveSection("passwords");
    setSelectedEntry(null);
  }

  return (
    <>
      <WindowShell
        leftSlot={
          <button
            type="button"
            onClick={() => setNavOpen((current) => !current)}
            className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            aria-label={t("window.openMenu")}
          >
            <Menu className="h-4 w-4" />
          </button>
        }
        topSlot={
          <button
            type="button"
            onClick={() => void handleManualLock()}
            className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            aria-label={t("window.lockVault")}
          >
            <LockKeyhole className="h-4 w-4" />
          </button>
        }
        footer={
          <StatusBar
            entryCount={controller.payload.entries.length}
            settings={controller.payload.settings}
            message={statusMessage}
            tone={statusTone}
          />
        }
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {navOpen ? (
              <button
                type="button"
                aria-label={t("window.closeMenu")}
                className="absolute inset-0 z-20 bg-slate-950/24"
                onClick={() => setNavOpen(false)}
              />
            ) : null}

            <aside
              className={cn(
                "absolute inset-y-0 left-0 z-30 flex w-[84px] flex-col bg-[#0c1528]/92 px-2 py-3 backdrop-blur-md transition-transform duration-150",
                navOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <div className="space-y-1">
                {NAV_ITEMS.map(({ id, labelKey, icon: Icon }) => {
                  const active = activeSection === id;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActiveSection(id);
                      }}
                      className={cn(
                        "group relative flex w-full flex-col items-center justify-center gap-2 rounded-[12px] px-2 py-3 text-center transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
                      )}
                    >
                      {active ? (
                        <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-primary" />
                      ) : null}
                      <Icon className="h-4 w-4" />
                      <span className="mono-label text-[8px] tracking-[0.14em]">
                        {t(labelKey)}
                      </span>
                    </button>
                  );
                })}
              </div>

            </aside>

            <div className="h-full min-h-0 overflow-hidden">
              {activeSection === "passwords" ? (
                selectedEntry ? (
                  <EntryDetailView
                    entry={selectedEntry}
                    busy={controller.busy}
                    onBack={() => setSelectedEntry(null)}
                    onCopyPassword={handleCopy}
                    onDelete={handleDeleteRequest}
                    onSave={handleSaveEdit}
                  />
                ) : (
                  <PasswordList
                    entries={filteredEntries}
                    totalEntries={controller.payload.entries.length}
                    availableTags={availableTags}
                    selectedTag={selectedTag}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onTagSelect={handleTagSelect}
                    onClearFilters={handleClearFilters}
                    onOpenDetails={setSelectedEntry}
                    dragEnabled={supportsEntryReorder()}
                    filterActive={Boolean(searchTerm.trim()) || Boolean(selectedTag)}
                    onReorder={handleReorder}
                    onCopyUsername={(entry) => handleCopy(entry.username)}
                    onCopyPassword={(entry) => handleCopy(entry.password)}
                    onCreateNew={() => {
                      setSelectedEntry(null);
                      setActiveSection("quick-add");
                    }}
                  />
                )
              ) : null}

              {activeSection === "quick-add" ? (
                <QuickAddForm
                  values={quickAddValues}
                  busy={controller.busy}
                  onBack={() => setActiveSection("passwords")}
                  onChange={(field, value) =>
                    setQuickAddValues((current) => ({
                      ...current,
                      [field]: value,
                    }))
                  }
                  onCopyPassword={handleCopy}
                  onGeneratePassword={generateInlinePassword}
                  onSubmit={handleQuickAddSubmit}
                />
              ) : null}

              {activeSection === "generator" ? (
                <PasswordGeneratorCard
                  onApply={applyGeneratedPassword}
                  onCopy={handleCopy}
                />
              ) : null}

              {activeSection === "settings" ? (
                <VaultSettingsCard
                  busy={controller.busy}
                  settings={controller.payload.settings}
                  storagePath={controller.status.storagePath}
                  onExport={controller.exportEntries}
                  onImport={controller.importEntries}
                  onLockNow={handleManualLock}
                  onChange={handleSettingsChange}
                  onChangeMasterPassword={handleMasterPasswordChange}
                />
              ) : null}
            </div>
          </div>
        </div>
      </WindowShell>
      <DeleteEntryDialog
        entry={pendingDeleteEntry}
        open={Boolean(pendingDeleteEntry)}
        busy={controller.busy}
        onClose={() => setPendingDeleteEntry(null)}
        onConfirm={handleDeleteConfirm}
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

function matchesFilters(
  entry: VaultEntry,
  searchTerm: string,
  selectedTag: string | null,
  language: AppLanguage,
) {
  if (!matchesSearch(entry, searchTerm, language)) {
    return false;
  }

  if (!selectedTag) {
    return true;
  }

  const normalizedSelectedTag = normalizeFilterValue(selectedTag, language);
  return entry.tags.some(
    (tag) => normalizeFilterValue(tag, language) === normalizedSelectedTag,
  );
}

function matchesSearch(entry: VaultEntry, searchTerm: string, language: AppLanguage) {
  const query = normalizeFilterValue(searchTerm, language);
  if (!query) {
    return true;
  }

  const haystack = [entry.service, entry.username, entry.url, entry.notes, ...entry.tags]
    .join(" ")
    .trim();

  return normalizeFilterValue(haystack, language).includes(query);
}

function collectAvailableTags(entries: VaultEntry[], language: AppLanguage) {
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const uniqueTags = new Map<string, string>();

  for (const entry of entries) {
    for (const tag of entry.tags) {
      const trimmedTag = tag.trim();
      const normalizedTag = normalizeFilterValue(trimmedTag, language);

      if (!trimmedTag || uniqueTags.has(normalizedTag)) {
        continue;
      }

      uniqueTags.set(normalizedTag, trimmedTag);
    }
  }

  return Array.from(uniqueTags.values()).sort((left, right) =>
    left.localeCompare(right, locale),
  );
}

function normalizeFilterValue(value: string, language: AppLanguage) {
  const locale = language === "tr" ? "tr-TR" : "en-US";
  return value.trim().toLocaleLowerCase(locale);
}

function defaultGeneratorOptions(): PasswordGeneratorOptions {
  return getDefaultGeneratorOptions();
}

function WindowShell({
  children,
  footer,
  leftSlot,
  topSlot,
}: {
  children: ReactNode;
  footer?: ReactNode;
  leftSlot?: ReactNode;
  topSlot?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden border border-white/[0.05] bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_58%)]" />

      <header className="titlebar-drag relative z-10 flex h-10 items-center justify-between border-b border-white/[0.05] bg-[#0f172a]/88 px-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          {leftSlot}
          <div className="titlebar-no-drag flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] text-primary">
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="mono-label truncate text-[10px] font-black text-primary">
              Passworder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {topSlot}
          <WindowControlButton
            label={t("window.minimize")}
            onClick={() => void appWindow.minimize()}
          >
            <Minus className="h-4 w-4" />
          </WindowControlButton>
          <WindowControlButton
            label={t("window.close")}
            onClick={() => void appWindow.close()}
          >
            <X className="h-4 w-4" />
          </WindowControlButton>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {footer}
    </main>
  );
}

function WindowControlButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="titlebar-no-drag flex h-7 w-7 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function StatusBar({
  defaultAutoLockMinutes,
  entryCount,
  locked,
  message,
  settings,
  tone = "notice",
}: {
  defaultAutoLockMinutes?: number;
  entryCount?: number;
  locked?: boolean;
  message?: string;
  settings?: VaultSettings;
  tone?: "notice" | "error";
}) {
  const { t } = useI18n();

  return (
    <footer className="flex h-8 items-center justify-between border-t border-white/[0.05] bg-[#0d1425]/72 px-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      <div className="flex min-w-0 items-center gap-2 truncate">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="truncate">
          {locked
            ? t("status.lockedVault")
            : t("common.itemsCount", { count: entryCount ?? 0 })}
        </span>
      </div>

      <div className="flex min-w-0 items-center justify-end">
        <div className="relative flex h-6 w-[220px] items-center justify-end overflow-hidden">
          <button
            type="button"
            onClick={() => void appWindow.openExternal("https://gitgit.me/remolg")}
            className={cn(
              "titlebar-no-drag absolute inset-0 flex items-center justify-end text-[11px] font-medium leading-none normal-case tracking-[0.04em] text-[#9fa7ff] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[#c0c1ff] motion-reduce:transition-none",
              message
                ? "pointer-events-none -translate-y-2 opacity-0"
                : "translate-y-0 opacity-100",
            )}
            style={{ fontFamily: '"Space Grotesk", Inter, "Segoe UI", sans-serif' }}
          >
            made by remolg
          </button>

          <span
            aria-live={tone === "error" ? "assertive" : "polite"}
            className={cn(
              "absolute inset-0 flex items-center justify-end text-right text-[11px] font-medium leading-none normal-case tracking-[0.04em] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              tone === "error" ? "text-destructive" : "text-[#9fa7ff]",
              message
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-3 opacity-0",
            )}
            style={{ fontFamily: '"Space Grotesk", Inter, "Segoe UI", sans-serif' }}
            title={message}
          >
            <span className="max-w-[220px] truncate">{message}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
