import { ArrowLeft, LockKeyhole } from "lucide-react";

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
  onBack,
  onChange,
  onCopyPassword,
  onSubmit,
  onGeneratePassword,
}: QuickAddFormProps) {
  const { t } = useI18n();

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          aria-label={t("quickAdd.back")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("quickAdd.back")}
        </button>

        <p className="mono-label mt-5 text-[10px] text-muted-foreground">
          {t("quickAdd.badge")}
        </p>
        <h2 className="mt-2 text-[15px] font-semibold text-foreground">
          {t("quickAdd.title")}
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {t("quickAdd.description")}
        </p>
      </div>

      <div className="mx-5 mt-4 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
        <EntryFormFields
          values={values}
          onChange={onChange}
          onCopyPassword={onCopyPassword}
          onGeneratePassword={onGeneratePassword}
        />

        <p className="mt-6 text-[12px] leading-6 text-muted-foreground">
          {t("quickAdd.footerNote")}
        </p>
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
