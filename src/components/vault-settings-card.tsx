import { ClipboardCheck, Clock3 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultSettings } from "@/types/vault";

interface VaultSettingsCardProps {
  settings: VaultSettings;
  storagePath?: string;
  onChange: (settings: VaultSettings) => void;
}

export function VaultSettingsCard({
  settings,
  storagePath,
  onChange,
}: VaultSettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kasa Ayarları</CardTitle>
        <CardDescription>
          Otomatik kilit ve pano temizleme gibi lokal güvenlik tercihleri.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              Otomatik kilit (dakika)
            </div>
            <Input
              type="number"
              min={1}
              max={120}
              value={settings.autoLockMinutes}
              onChange={(event) =>
                onChange({
                  ...settings,
                  autoLockMinutes: clampNumber(event.target.value, 1, 120),
                })
              }
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              Pano temizleme (saniye)
            </div>
            <Input
              type="number"
              min={5}
              max={180}
              value={settings.clipboardClearSeconds}
              onChange={(event) =>
                onChange({
                  ...settings,
                  clipboardClearSeconds: clampNumber(event.target.value, 5, 180),
                })
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/65 p-4">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Lokal veri yolu
          </Label>
          <p className="mt-2 break-all text-sm">
            {storagePath ?? "Çalışma zamanı hazır olduğunda gösterilecek."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function clampNumber(value: string, min: number, max: number) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}
