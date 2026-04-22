import { type ReactNode } from "react";
import {
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
  const { t } = useI18n();

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-5">
        <p className="mono-label text-[10px] text-muted-foreground">
          {t("settings.badge")}
        </p>
        <h2 className="mt-2 text-[15px] font-semibold text-foreground">
          {t("settings.title")}
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      <div className="mx-5 mt-4 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div className="flex gap-3 pb-6 pt-5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[12px] font-medium text-foreground">
              {t("settings.securityTitle")}
            </p>
            <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
              {t("settings.securityDescription")}
            </p>
          </div>
        </div>

        <div className="divide-y divide-white/[0.05]">
          <SettingRow
            icon={<TimerReset className="h-4 w-4" />}
            label={t("settings.autoLockLabel")}
            description={t("settings.autoLockDescription")}
          >
            <select
              value={settings.autoLockMinutes}
              onChange={(event) =>
                onChange({
                  ...settings,
                  autoLockMinutes: Number(event.target.value),
                })
              }
              className="w-full rounded-[10px] border border-transparent bg-white/[0.04] px-3 py-2 text-[13px] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] outline-none transition-colors focus:ring-1 focus:ring-primary"
            >
              {[1, 3, 5, 10, 15, 30].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {t("common.minutesShort", { count: minutes })}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow
            icon={<ClipboardCheck className="h-4 w-4" />}
            label={t("settings.clipboardLabel")}
            description={t("settings.clipboardDescription")}
          >
            <select
              value={settings.clipboardClearSeconds}
              onChange={(event) =>
                onChange({
                  ...settings,
                  clipboardClearSeconds: Number(event.target.value),
                })
              }
              className="w-full rounded-[10px] border border-transparent bg-white/[0.04] px-3 py-2 text-[13px] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] outline-none transition-colors focus:ring-1 focus:ring-primary"
            >
              {[15, 30, 45, 60, 90, 120].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {t("common.secondsShort", { count: seconds })}
                </option>
              ))}
            </select>
          </SettingRow>

          <SettingRow
            icon={<Globe className="h-4 w-4" />}
            label={t("settings.languageLabel")}
            description={t("settings.languageDescription")}
          >
            <div className="flex gap-6 border-b border-white/[0.05]">
              <LanguageOptionButton
                code="EN"
                label={t("common.english")}
                active={settings.language === "en"}
                onClick={() =>
                  onChange({
                    ...settings,
                    language: "en",
                  })
                }
              />
              <LanguageOptionButton
                code="TR"
                label={t("common.turkish")}
                active={settings.language === "tr"}
                onClick={() =>
                  onChange({
                    ...settings,
                    language: "tr",
                  })
                }
              />
            </div>
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

function LanguageOptionButton({
  active,
  code,
  label,
  onClick,
}: {
  active: boolean;
  code: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative pb-3 pt-1 text-left"
    >
      <span
        className={cn(
          "mono-label text-[9px] tracking-[0.14em] transition-colors",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {code}
      </span>
      <span
        className={cn(
          "mt-1 block text-[13px] font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[1.5px] rounded-full transition-opacity",
          active ? "bg-primary opacity-100" : "bg-white/[0.08] opacity-0 group-hover:opacity-100",
        )}
      />
    </button>
  );
}

function SettingRow({
  children,
  description,
  icon,
  label,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="py-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-primary">{icon}</div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-foreground">{label}</p>
          <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
