import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  Globe,
  HardDrive,
  LockKeyhole,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { VaultSettings } from "@/types/vault";

interface VaultSettingsCardProps {
  settings: VaultSettings;
  storagePath?: string;
  onLockNow?: () => void | Promise<void>;
  onChange: (settings: VaultSettings) => void;
}

export function VaultSettingsCard({
  settings,
  storagePath,
  onLockNow,
  onChange,
}: VaultSettingsCardProps) {
  const { language, t } = useI18n();
  const compactTitle = language === "tr" ? "Ayarlar" : "Settings";
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

      <div className="border-t border-white/[0.05] px-5 py-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start px-0 text-primary"
          onClick={() => {
            void onLockNow?.();
          }}
        >
          <LockKeyhole className="h-4 w-4" />
          {t("settings.lockNow")}
        </Button>
      </div>
    </section>
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
