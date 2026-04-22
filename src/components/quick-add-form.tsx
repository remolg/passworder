import { LockKeyhole } from "lucide-react";

import { EntryFormFields } from "@/components/entry-form-fields";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { EntryFormValues } from "@/types/vault";

interface QuickAddFormProps {
  values: EntryFormValues;
  busy: boolean;
  onBack: () => void;
  onChange: (field: keyof EntryFormValues, value: string) => void;
  onCopyPassword?: (value: string) => Promise<boolean>;
  onSubmit: () => void;
  onGeneratePassword: () => void;
}

export function QuickAddForm({
  values,
  busy,
  onChange,
  onCopyPassword,
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
            <h2 className="text-[14px] font-semibold text-foreground">
              {compactTitle}
            </h2>
            <span className="mono-label text-[9px] text-muted-foreground">
              {t("quickAdd.save")}
            </span>
          </div>
        </div>

        <EntryFormFields
          values={values}
          onChange={onChange}
          onCopyPassword={onCopyPassword}
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
