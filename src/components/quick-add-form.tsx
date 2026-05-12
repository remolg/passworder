import { ArrowLeft, LockKeyhole } from "lucide-react";

import { EntryFormFields } from "@/components/entry-form-fields";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { EntryFormValues, ShortcutFormField, VaultFolder } from "@/types/vault";

interface QuickAddFormProps {
  values: EntryFormValues;
  folders: VaultFolder[];
  busy: boolean;
  onBack: () => void;
  onChange: (field: keyof EntryFormValues, value: string) => void;
  onCopyPassword?: (value: string) => Promise<boolean>;
  isShortcutAvailable?: (shortcut: string, field: ShortcutFormField) => boolean;
  onShortcutRejected?: (messageKey: string) => void;
  onSubmit: () => void;
  onGeneratePassword: () => void;
}

export function QuickAddForm({
  values,
  folders,
  busy,
  onBack,
  onChange,
  onCopyPassword,
  isShortcutAvailable,
  onShortcutRejected,
  onSubmit,
  onGeneratePassword,
}: QuickAddFormProps) {
  const { language, t } = useI18n();
  const compactTitle = language === "tr" ? "Yeni kayıt" : "New entry";

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
        <div className="mb-4 border-b border-white/[0.05] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                aria-label={t("quickAdd.back")}
                title={t("quickAdd.back")}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="truncate text-[14px] font-semibold text-foreground">
                {compactTitle}
              </h2>
            </div>
            <span className="mono-label text-[9px] text-muted-foreground">
              {t("quickAdd.save")}
            </span>
          </div>
        </div>

        <EntryFormFields
          values={values}
          folders={folders}
          onChange={onChange}
          onCopyPassword={onCopyPassword}
          isShortcutAvailable={isShortcutAvailable}
          onShortcutRejected={onShortcutRejected}
          onGeneratePassword={onGeneratePassword}
        />
      </div>

      <div className="border-t border-white/[0.05] px-5 py-4">
        <Button type="button" className="w-full" onClick={onSubmit} disabled={busy}>
          <LockKeyhole className="h-4 w-4" />
          {t("quickAdd.save")}
        </Button>
      </div>
    </section>
  );
}
