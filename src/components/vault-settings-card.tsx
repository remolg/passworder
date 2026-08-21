import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Download,
  Globe,
  HardDrive,
  Keyboard,
  LockKeyhole,
  Pin,
  ShieldCheck,
  TimerReset,
  Upload,
} from "lucide-react";

import { ShortcutCaptureInput } from "@/components/shortcut-capture-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appWindow } from "@/lib/desktop";
import { type TranslationKey, isTranslationKey, useI18n } from "@/lib/i18n";
import { cn, isMacRuntime } from "@/lib/utils";
import { WindowAnchor } from "@/types/desktop";
import { VaultSettings } from "@/types/vault";

const WINDOW_ANCHOR_OPTIONS: Array<{
  value: WindowAnchor;
  labelKey: TranslationKey;
  className: string;
}> = [
  {
    value: "top-left",
    labelKey: "settings.windowAnchorTopLeft",
    className: "top-2 left-2",
  },
  {
    value: "top-right",
    labelKey: "settings.windowAnchorTopRight",
    className: "top-2 right-2",
  },
  {
    value: "bottom-left",
    labelKey: "settings.windowAnchorBottomLeft",
    className: "bottom-2 left-2",
  },
  {
    value: "bottom-right",
    labelKey: "settings.windowAnchorBottomRight",
    className: "bottom-2 right-2",
  },
];

const MIN_MASTER_PASSWORD_LENGTH = 3;

interface VaultSettingsCardProps {
  busy?: boolean;
  settings: VaultSettings;
  storagePath?: string;
  usedShortcuts?: string[];
  onExport?: (password: string) => void | Promise<unknown>;
  onImport?: (password?: string) => void | Promise<unknown>;
  onChangeMasterPassword?: (
    currentPassword: string,
    nextPassword: string,
  ) => Promise<boolean> | boolean;
  onChange: (settings: VaultSettings) => void;
  onShowShortcutChange?: (shortcut: string) => void;
  onShortcutSuspendChange?: (suspended: boolean) => void;
}

export function VaultSettingsCard({
  busy,
  settings,
  storagePath,
  usedShortcuts = [],
  onExport,
  onImport,
  onChangeMasterPassword,
  onChange,
  onShowShortcutChange,
  onShortcutSuspendChange,
}: VaultSettingsCardProps) {
  const { language, t } = useI18n();
  const compactTitle = language === "tr" ? "Ayarlar" : "Settings";
  const [windowAnchor, setWindowAnchor] = useState<WindowAnchor>("bottom-right");
  const [showShortcut, setShowShortcut] = useState("");
  const [showShortcutError, setShowShortcutError] = useState<TranslationKey | null>(
    null,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<TranslationKey | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [exportError, setExportError] = useState<TranslationKey | null>(null);
  const [importError, setImportError] = useState<TranslationKey | null>(null);
  const autoLockOptions = useMemo(
    () =>
      [1, 3, 5, 10, 15, 30].map((minutes) => ({
        value: minutes,
        label: t("common.minutesShort", { count: minutes }),
      })),
    [t],
  );
  const clipboardOptions = useMemo(
    () =>
      [15, 30, 45, 60, 90, 120].map((seconds) => ({
        value: seconds,
        label: t("common.secondsShort", { count: seconds }),
      })),
    [t],
  );
  const languageOptions = useMemo(
    () => [
      { value: "en" as const, label: t("common.english") },
      { value: "tr" as const, label: t("common.turkish") },
    ],
    [t],
  );
  const canPinWindow = appWindow.supportsAnchor();
  const canAssignShowShortcut = appWindow.supportsShowShortcut();

  useEffect(() => {
    if (!canPinWindow) {
      return;
    }

    let cancelled = false;

    void appWindow.getAnchor().then((anchor) => {
      if (!cancelled) {
        setWindowAnchor(anchor);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canPinWindow]);

  useEffect(() => {
    if (!canAssignShowShortcut) {
      return;
    }

    let cancelled = false;

    void appWindow.getShowShortcut().then((shortcut) => {
      if (!cancelled) {
        setShowShortcut(shortcut);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canAssignShowShortcut]);

  async function handleWindowAnchorChange(anchor: WindowAnchor) {
    setWindowAnchor(anchor);
    await appWindow.setAnchor(anchor);
  }

  async function handleShowShortcutChange(shortcut: string) {
    setShowShortcutError(null);

    if (shortcut && usedShortcuts.includes(shortcut)) {
      setShowShortcutError("errors.shortcutDuplicate");
      return;
    }

    try {
      const nextShortcut = await appWindow.setShowShortcut(shortcut);
      setShowShortcut(nextShortcut);
      onShowShortcutChange?.(nextShortcut);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorKey = message.match(/(?:errors|notice)\.[A-Za-z0-9]+/)?.[0];
      const resolvedKey =
        errorKey === "errors.showShortcutNeedsModifier" && isMacRuntime()
          ? "errors.showShortcutNeedsModifierMac"
          : errorKey;
      setShowShortcutError(
        resolvedKey && isTranslationKey(resolvedKey) ? resolvedKey : "errors.unexpected",
      );
    }
  }

  async function handleMasterPasswordSubmit() {
    setPasswordError(null);

    if (!currentPassword.trim()) {
      setPasswordError("errors.currentPasswordRequired");
      return;
    }

    if (!nextPassword.trim()) {
      setPasswordError("errors.newMasterPasswordRequired");
      return;
    }

    if (nextPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
      setPasswordError("errors.masterPasswordTooShort");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError("errors.masterPasswordMismatch");
      return;
    }

    const success = await onChangeMasterPassword?.(currentPassword, nextPassword);
    if (!success) {
      return;
    }

    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  function resetExportDialog() {
    setExportPassword("");
    setExportPasswordConfirm("");
    setExportError(null);
  }

  function resetImportDialog() {
    setImportPassword("");
    setImportError(null);
  }

  async function handleExportSubmit() {
    setExportError(null);

    if (!exportPassword.trim()) {
      setExportError("errors.exportPasswordRequired");
      return;
    }

    if (exportPassword.length < MIN_MASTER_PASSWORD_LENGTH) {
      setExportError("errors.exportPasswordTooShort");
      return;
    }

    if (exportPassword !== exportPasswordConfirm) {
      setExportError("errors.exportPasswordMismatch");
      return;
    }

    const result = await onExport?.(exportPassword);
    if (result === false) {
      return;
    }

    const failure = transferResultError(result);
    if (failure) {
      setExportError(failure);
      return;
    }

    resetExportDialog();
    setExportDialogOpen(false);
  }

  async function handleImportSubmit() {
    setImportError(null);
    const result = await onImport?.(importPassword);
    if (result === false) {
      return;
    }

    const failure = transferResultError(result);
    if (failure) {
      setImportError(failure);
      return;
    }

    resetImportDialog();
    setImportDialogOpen(false);
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-4">
        <h2 className="text-[14px] font-semibold text-foreground">
          {compactTitle}
        </h2>
      </div>

      <div className="mx-5 mt-3 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="divide-y divide-white/[0.05]">
          <SettingRow
            icon={<TimerReset className="h-4 w-4" />}
            label={t("settings.autoLockLabel")}
          >
            <SettingsSelect
              value={settings.autoLockMinutes}
              options={autoLockOptions}
              onChange={(value) =>
                onChange({
                  ...settings,
                  autoLockMinutes: value,
                })
              }
            />
          </SettingRow>

          <SettingRow
            icon={<ClipboardCheck className="h-4 w-4" />}
            label={t("settings.clipboardLabel")}
          >
            <SettingsSelect
              value={settings.clipboardClearSeconds}
              options={clipboardOptions}
              onChange={(value) =>
                onChange({
                  ...settings,
                  clipboardClearSeconds: value,
                })
              }
            />
          </SettingRow>

          <SettingRow
            icon={<Globe className="h-4 w-4" />}
            label={t("settings.languageLabel")}
          >
            <SettingsSelect
              value={settings.language}
              options={languageOptions}
              onChange={(value) =>
                onChange({
                  ...settings,
                  language: value,
                })
              }
            />
          </SettingRow>

          {canPinWindow ? (
            <SettingRow
              icon={<Pin className="h-4 w-4" />}
              label={t("settings.windowPositionLabel")}
            >
              <WindowAnchorPicker
                value={windowAnchor}
                onChange={(value) => {
                  void handleWindowAnchorChange(value);
                }}
              />
            </SettingRow>
          ) : null}

          {canAssignShowShortcut ? (
            <SettingRow
              icon={<Keyboard className="h-4 w-4" />}
              label={t("settings.showShortcutLabel")}
            >
              <div className="space-y-3">
                <ShortcutCaptureInput
                  id="settings-show-shortcut"
                  allowMouse={false}
                  value={showShortcut}
                  onChange={(value) => {
                    void handleShowShortcutChange(value);
                  }}
                  onRejected={(messageKey) => {
                    if (isTranslationKey(messageKey)) {
                      setShowShortcutError(messageKey);
                    }
                  }}
                  onFocus={() => onShortcutSuspendChange?.(true)}
                  onBlur={() => onShortcutSuspendChange?.(false)}
                  placeholder={t("settings.showShortcutPlaceholder")}
                  clearLabel={t("fields.clearShortcut")}
                />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  {t(
                    isMacRuntime()
                      ? "settings.showShortcutHintMac"
                      : "settings.showShortcutHint",
                  )}
                </p>
                {showShortcutError ? (
                  <p className="text-[12px] text-destructive">{t(showShortcutError)}</p>
                ) : null}
              </div>
            </SettingRow>
          ) : null}
        </div>

        <div className="mt-6 h-px bg-white/[0.05]" />

        <div className="pt-5">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("settings.masterPasswordLabel")}
            </p>
          </div>
          <p className="mt-3 text-[12px] leading-6 text-foreground/88">
            {t("settings.masterPasswordDescription")}
          </p>

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleMasterPasswordSubmit();
            }}
          >
            <PasswordField
              id="settings-current-password"
              label={t("settings.currentPasswordLabel")}
              value={currentPassword}
              placeholder={t("settings.currentPasswordPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setCurrentPassword(value);
                if (passwordError) {
                  setPasswordError(null);
                }
              }}
            />

            <PasswordField
              id="settings-new-password"
              label={t("settings.newPasswordLabel")}
              value={nextPassword}
              placeholder={t("settings.newPasswordPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setNextPassword(value);
                if (passwordError) {
                  setPasswordError(null);
                }
              }}
            />

            <PasswordField
              id="settings-confirm-password"
              label={t("settings.confirmNewPasswordLabel")}
              value={confirmPassword}
              placeholder={t("settings.confirmNewPasswordPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setConfirmPassword(value);
                if (passwordError) {
                  setPasswordError(null);
                }
              }}
            />

            {passwordError ? (
              <p className="text-[12px] text-destructive">{t(passwordError)}</p>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={busy || !onChangeMasterPassword}
            >
              <LockKeyhole className="h-4 w-4" />
              {t("settings.changePassword")}
            </Button>
          </form>
        </div>

        <div className="mt-6 h-px bg-white/[0.05]" />

        <div className="pt-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("settings.transferLabel")}
            </p>
          </div>

          <p className="mt-3 text-[12px] leading-6 text-foreground/88">
            {t("settings.transferDescription")}
          </p>

          <div className="mt-4 space-y-3">
            <TransferActionCard
              icon={<Download className="h-4 w-4" />}
              title={t("settings.exportEntries")}
              disabled={busy}
              onClick={() => {
                resetExportDialog();
                setExportDialogOpen(true);
              }}
            />

            <TransferActionCard
              icon={<Upload className="h-4 w-4" />}
              title={t("settings.importEntries")}
              disabled={busy}
              onClick={() => {
                resetImportDialog();
                setImportDialogOpen(true);
              }}
            />
          </div>
        </div>

        <div className="mt-6 h-px bg-white/[0.05]" />

        <div className="pt-5">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("settings.storagePathLabel")}
            </p>
          </div>
          <p className="mt-3 break-all text-[12px] leading-6 text-foreground/88">
            {storagePath ?? t("settings.storagePathFallback")}
          </p>
        </div>
      </div>

      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) {
            resetExportDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.exportDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.exportDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleExportSubmit();
            }}
          >
            <PasswordField
              id="export-backup-password"
              label={t("settings.exportPasswordLabel")}
              value={exportPassword}
              placeholder={t("settings.exportPasswordPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setExportPassword(value);
                if (exportError) {
                  setExportError(null);
                }
              }}
            />

            <PasswordField
              id="export-backup-password-confirm"
              label={t("settings.exportPasswordConfirmLabel")}
              value={exportPasswordConfirm}
              placeholder={t("settings.exportPasswordConfirmPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setExportPasswordConfirm(value);
                if (exportError) {
                  setExportError(null);
                }
              }}
            />

            {exportError ? (
              <p className="text-[12px] text-destructive" role="alert">
                {t(exportError)}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={busy || !onExport} className="w-full">
                {t("settings.exportConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            resetImportDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.importDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.importDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleImportSubmit();
            }}
          >
            <PasswordField
              id="import-backup-password"
              label={t("settings.importPasswordLabel")}
              value={importPassword}
              placeholder={t("settings.importPasswordPlaceholder")}
              disabled={busy}
              onChange={(value) => {
                setImportPassword(value);
                if (importError) {
                  setImportError(null);
                }
              }}
            />

            {importError ? (
              <p className="text-[12px] text-destructive" role="alert">
                {t(importError)}
              </p>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={busy || !onImport} className="w-full">
                {t("settings.importConfirm")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function transferResultError(result: unknown): TranslationKey | null {
  if (typeof result !== "string") {
    return null;
  }

  return isTranslationKey(result) ? result : "errors.unexpected";
}

function PasswordField({
  disabled,
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="mono-label text-[10px] text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="password"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TransferActionCard({
  disabled,
  icon,
  onClick,
  title,
}: {
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-3 text-left text-foreground/88 transition-[background-color,color] duration-150 hover:bg-white/[0.04] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center text-primary">
        {icon}
      </div>

      <p className="text-[14px] font-medium text-foreground">{title}</p>
    </button>
  );
}

function WindowAnchorPicker({
  value,
  onChange,
}: {
  value: WindowAnchor;
  onChange: (value: WindowAnchor) => void;
}) {
  const { t } = useI18n();
  const selectedLabelKey =
    WINDOW_ANCHOR_OPTIONS.find((option) => option.value === value)?.labelKey ??
    "settings.windowAnchorBottomRight";

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-[92px] w-[140px] shrink-0 rounded-[14px] border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
        role="radiogroup"
        aria-label={t("settings.windowPositionLabel")}
      >
        {WINDOW_ANCHOR_OPTIONS.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(option.labelKey)}
              title={t(option.labelKey)}
              onClick={() => onChange(option.value)}
              className={cn(
                "absolute h-6 w-6 rounded-[8px] transition-colors",
                option.className,
                active
                  ? "bg-primary shadow-[0_0_0_3px_rgba(99,102,241,0.28)]"
                  : "bg-white/[0.08] hover:bg-white/[0.16]",
              )}
            />
          );
        })}
      </div>

      <p className="text-[13px] font-medium text-foreground/88">
        {t(selectedLabelKey)}
      </p>
    </div>
  );
}

function SettingsSelect<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between rounded-[12px] border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left text-[13px] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors",
          open && "border-primary/50 bg-white/[0.05]",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate font-medium">{selectedOption?.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[12px] border border-white/[0.08] bg-[#10192d] p-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="space-y-0.5" role="listbox">
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors",
                    active
                      ? "bg-primary/12 text-foreground"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={active}
                >
                  <span className={cn("font-medium", active && "text-primary")}>
                    {option.label}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4 transition-opacity",
                      active ? "opacity-100 text-primary" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingRow({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">{icon}</div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-foreground">{label}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
