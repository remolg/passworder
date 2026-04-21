import { WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EntryFormValues } from "@/types/vault";

interface EntryFormFieldsProps {
  values: EntryFormValues;
  onChange: (field: keyof EntryFormValues, value: string) => void;
  onGeneratePassword?: () => void;
}

export function EntryFormFields({
  values,
  onChange,
  onGeneratePassword,
}: EntryFormFieldsProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="service">Servis / Site</Label>
        <Input
          id="service"
          value={values.service}
          onChange={(event) => onChange("service", event.target.value)}
          placeholder="Örn. GitHub, Gmail, Figma"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="username">Kullanıcı adı / e-posta</Label>
          <Input
            id="username"
            value={values.username}
            onChange={(event) => onChange("username", event.target.value)}
            placeholder="kullanici@ornek.com"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Şifre</Label>
            {onGeneratePassword ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onGeneratePassword}
              >
                <WandSparkles className="h-4 w-4" />
                Üret
              </Button>
            ) : null}
          </div>
          <Input
            id="password"
            type="text"
            value={values.password}
            onChange={(event) => onChange("password", event.target.value)}
            placeholder="Güçlü bir şifre girin veya üretin"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            value={values.url}
            onChange={(event) => onChange("url", event.target.value)}
            placeholder="https://ornek.com"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tags">Kategori / Etiket</Label>
          <Input
            id="tags"
            value={values.tags}
            onChange={(event) => onChange("tags", event.target.value)}
            placeholder="iş, kişisel, finans"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Not</Label>
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder="İki adımlı doğrulama notu, kurtarma kodu bilgisi vb."
        />
      </div>
    </div>
  );
}
