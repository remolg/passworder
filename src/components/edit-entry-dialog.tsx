import { useEffect, useState } from "react";

import { EntryFormFields } from "@/components/entry-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { EntryFormValues, VaultEntry } from "@/types/vault";

interface EditEntryDialogProps {
  entry: VaultEntry | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCopyPassword?: (value: string) => Promise<boolean>;
  onSave: (values: EntryFormValues) => void;
  onGeneratePassword: (apply: (password: string) => void) => void;
}

export function EditEntryDialog({
  entry,
  open,
  busy,
  onClose,
  onCopyPassword,
  onSave,
  onGeneratePassword,
}: EditEntryDialogProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<EntryFormValues>(emptyValues());

  useEffect(() => {
    if (!entry) {
      setValues(emptyValues());
      return;
    }

    setValues({
      id: entry.id,
      service: entry.service,
      logoId: entry.logoId ?? "",
      username: entry.username,
      password: entry.password,
      url: entry.url,
      notes: entry.notes,
      tags: entry.tags.join(", "),
    });
  }, [entry]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="px-5 py-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            {t("edit.title")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-6 text-muted-foreground">
            {t("edit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto border-t border-white/[0.05] px-5 py-5">
          <EntryFormFields
            values={values}
            onChange={(field, value) =>
              setValues((current) => ({
                ...current,
                [field]: value,
              }))
            }
            onCopyPassword={onCopyPassword}
            onGeneratePassword={() =>
              onGeneratePassword((password) =>
                setValues((current) => ({
                  ...current,
                  password,
                })),
              )
            }
          />
        </div>

        <DialogFooter className="border-t border-white/[0.05] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => onSave(values)} disabled={busy}>
            {t("edit.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(): EntryFormValues {
  return {
    service: "",
    logoId: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
  };
}
