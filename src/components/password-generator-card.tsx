import { useEffect, useState } from "react";
import { Copy, RefreshCcw, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { generatePassword } from "@/lib/password-generator";
import { PasswordGeneratorOptions } from "@/types/vault";

interface PasswordGeneratorCardProps {
  onApply: (value: string) => void;
  onCopy: (value: string) => void;
}

const DEFAULT_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

export function PasswordGeneratorCard({
  onApply,
  onCopy,
}: PasswordGeneratorCardProps) {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh(nextOptions = options) {
    try {
      const value = generatePassword(nextOptions);
      setGenerated(value);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Şifre üretilemedi.");
    }
  }

  function updateOption<Key extends keyof PasswordGeneratorOptions>(
    key: Key,
    value: PasswordGeneratorOptions[Key],
  ) {
    const nextOptions = {
      ...options,
      [key]: value,
    };
    setOptions(nextOptions);
    refresh(nextOptions);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifre Üretici</CardTitle>
        <CardDescription>
          Web Crypto tabanlı güçlü rastgele üretim. Sonuç hızlıca forma aktarılabilir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Uzunluk</Label>
            <span className="text-sm text-muted-foreground">{options.length}</span>
          </div>
          <Slider
            min={8}
            max={48}
            step={1}
            value={[options.length]}
            onValueChange={(value) => updateOption("length", value[0] ?? 20)}
          />
        </div>

        <div className="grid gap-3">
          <GeneratorToggle
            label="Büyük harf"
            checked={options.uppercase}
            onCheckedChange={(value) => updateOption("uppercase", value)}
          />
          <GeneratorToggle
            label="Küçük harf"
            checked={options.lowercase}
            onCheckedChange={(value) => updateOption("lowercase", value)}
          />
          <GeneratorToggle
            label="Rakam"
            checked={options.numbers}
            onCheckedChange={(value) => updateOption("numbers", value)}
          />
          <GeneratorToggle
            label="Sembol"
            checked={options.symbols}
            onCheckedChange={(value) => updateOption("symbols", value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="generated-password">Üretilen şifre</Label>
          <Input
            id="generated-password"
            value={generated}
            onChange={(event) => setGenerated(event.target.value)}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Benzer karakterler çıkarıldı: `I`, `l`, `O`, `0`.
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" variant="secondary" onClick={() => refresh()}>
            <RefreshCcw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(generated)}
            disabled={!generated}
          >
            <Copy className="h-4 w-4" />
            Kopyala
          </Button>
          <Button type="button" onClick={() => onApply(generated)} disabled={!generated}>
            <WandSparkles className="h-4 w-4" />
            Forma Aktar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GeneratorToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
