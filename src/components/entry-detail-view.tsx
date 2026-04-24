import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Trash2 } from "lucide-react";

import { EntryFormFields } from "@/components/entry-form-fields";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { EntryFormValues, VaultEntry } from "@/types/vault";

interface EntryDetailViewProps {
  entry: VaultEntry;
  busy: boolean;
  onBack: () => void;
  onCopyPassword?: (value: string) => Promise<boolean>;
  onDelete: (entry: VaultEntry) => Promise<void> | void;
  onSave: (values: EntryFormValues) => Promise<void> | void;
}

export function EntryDetailView({
  entry,
  busy,
  onBack,
  onCopyPassword,
  onDelete,
  onSave,
}: EntryDetailViewProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<EntryFormValues>(() => toFormValues(entry));

  useEffect(() => {
    setValues(toFormValues(entry));
  }, [entry]);

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
        <div className="mb-4 border-b border-white/[0.05] pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              aria-label={t("quickAdd.back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="text-right">
              <h2 className="text-[14px] font-semibold text-foreground">
                {t("edit.title")}
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {entry.service}
              </p>
            </div>
          </div>
        </div>

        <EntryFormFields
          values={values}
          onChange={(field, value) =>
            setValues((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onCopyPassword={onCopyPassword}
        />
      </div>

      <div className="border-t border-white/[0.05] px-5 py-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={() => void onDelete(entry)}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
            {t("passwords.deleteEntry")}
          </Button>

          <Button
            type="button"
            className="flex-1"
            onClick={() => void onSave(values)}
            disabled={busy}
          >
            <LockKeyhole className="h-4 w-4" />
            {t("edit.save")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function toFormValues(entry: VaultEntry): EntryFormValues {
  return {
    id: entry.id,
    service: entry.service,
    logoId: entry.logoId ?? "",
    username: entry.username,
    password: entry.password,
    url: entry.url,
    notes: entry.notes,
    tags: entry.tags.join(", "),
  };
}
