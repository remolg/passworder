import { Plus, ShieldCheck } from "lucide-react";

import { EntryFormFields } from "@/components/entry-form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntryFormValues } from "@/types/vault";

interface QuickAddFormProps {
  values: EntryFormValues;
  busy: boolean;
  onChange: (field: keyof EntryFormValues, value: string) => void;
  onSubmit: () => void;
  onGeneratePassword: () => void;
}

export function QuickAddForm({
  values,
  busy,
  onChange,
  onSubmit,
  onGeneratePassword,
}: QuickAddFormProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Hızlı Şifre Ekle</CardTitle>
            <CardDescription>
              Yeni kaydı tek panelden ekleyin. Veri doğrudan lokal kasaya yazılır.
            </CardDescription>
          </div>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <EntryFormFields
          values={values}
          onChange={onChange}
          onGeneratePassword={onGeneratePassword}
        />

        <Button
          type="button"
          className="w-full"
          onClick={onSubmit}
          disabled={busy}
        >
          <Plus className="h-4 w-4" />
          Kaydı Ekle
        </Button>
      </CardContent>
    </Card>
  );
}
