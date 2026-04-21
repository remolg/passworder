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
import { EntryFormValues, VaultEntry } from "@/types/vault";

interface EditEntryDialogProps {
  entry: VaultEntry | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (values: EntryFormValues) => void;
  onGeneratePassword: (apply: (password: string) => void) => void;
}

export function EditEntryDialog({
  entry,
  open,
  busy,
  onClose,
  onSave,
  onGeneratePassword,
}: EditEntryDialogProps) {
  const [values, setValues] = useState<EntryFormValues>(emptyValues());

  useEffect(() => {
    if (!entry) {
      setValues(emptyValues());
      return;
    }

    setValues({
      id: entry.id,
      service: entry.service,
      username: entry.username,
      password: entry.password,
      url: entry.url,
      notes: entry.notes,
      tags: entry.tags.join(", "),
    });
  }, [entry]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kaydı Düzenle</DialogTitle>
          <DialogDescription>
            Mevcut kaydı güncelleyin. Değişiklikler lokal kasaya yeniden şifrelenerek yazılır.
          </DialogDescription>
        </DialogHeader>

        <EntryFormFields
          values={values}
          onChange={(field, value) =>
            setValues((current) => ({
              ...current,
              [field]: value,
            }))
          }
          onGeneratePassword={() =>
            onGeneratePassword((password) =>
              setValues((current) => ({
                ...current,
                password,
              })),
            )
          }
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="button" onClick={() => onSave(values)} disabled={busy}>
            Değişiklikleri Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyValues(): EntryFormValues {
  return {
    service: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
  };
}
