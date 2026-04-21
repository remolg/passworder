import { useState } from "react";
import { KeyRound, LockKeyhole, ShieldEllipsis } from "lucide-react";

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

interface UnlockScreenProps {
  hasVault: boolean;
  busy: boolean;
  error: string | null;
  runtimeMissing: boolean;
  storagePath?: string;
  onCreateVault: (masterPassword: string) => Promise<boolean>;
  onUnlockVault: (masterPassword: string) => Promise<boolean>;
}

export function UnlockScreen({
  hasVault,
  busy,
  error,
  runtimeMissing,
  storagePath,
  onCreateVault,
  onUnlockVault,
}: UnlockScreenProps) {
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit() {
    setLocalError(null);

    if (!masterPassword.trim()) {
      setLocalError("Master password boş bırakılamaz.");
      return;
    }

    if (!hasVault) {
      if (masterPassword.length < 12) {
        setLocalError("Master password en az 12 karakter olmalı.");
        return;
      }

      if (masterPassword !== confirmation) {
        setLocalError("Master password alanları eşleşmiyor.");
        return;
      }

      const success = await onCreateVault(masterPassword);
      if (success) {
        setMasterPassword("");
        setConfirmation("");
      }
      return;
    }

    const success = await onUnlockVault(masterPassword);
    if (success) {
      setMasterPassword("");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4 bg-primary text-primary-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/12">
              <ShieldEllipsis className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold">Passworder</CardTitle>
              <CardDescription className="max-w-xl text-primary-foreground/80">
                Tüm şifreler sadece bu cihazda tutulur. Sunucu, bulut senkronizasyonu,
                telemetri ve uzaktaki veri işleme yoktur.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 p-6">
            <FeatureRow
              title="Master password ile açılır"
              description="Master password sadece anahtar türetmek için kullanılır, düz metin olarak tutulmaz."
            />
            <FeatureRow
              title="Scrypt + AES-256-GCM"
              description="Anahtar türetme ve kasa şifreleme tarafında yerleşik, güvenilir modern kriptografi tercih edilir."
            />
            <FeatureRow
              title="Tamamen lokal saklama"
              description={`Kasa dosyası: ${storagePath ?? "Uygulama veri klasörü"}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {hasVault ? (
                <LockKeyhole className="h-5 w-5" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
            </div>
            <CardTitle>{hasVault ? "Kasayı Aç" : "Yeni Kasa Oluştur"}</CardTitle>
            <CardDescription>
              {hasVault
                ? "Kasayı açmak için master password girin."
                : "İlk kurulumda master password belirleyin."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {runtimeMissing ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                Bu ekran web ön izlemede açıldı. Güvenli kasa komutları sadece Electron
                masaüstü çalışma zamanında aktif olur.
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="masterPassword">Master password</Label>
              <Input
                id="masterPassword"
                type="password"
                value={masterPassword}
                onChange={(event) => setMasterPassword(event.target.value)}
                placeholder="Uzun ve güçlü bir parola"
              />
            </div>

            {!hasVault ? (
              <div className="grid gap-2">
                <Label htmlFor="masterPasswordConfirmation">Master password tekrar</Label>
                <Input
                  id="masterPasswordConfirmation"
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Parolayı tekrar girin"
                />
              </div>
            ) : null}

            {localError || error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {localError ?? error}
              </div>
            ) : null}

            <Button type="button" className="w-full" disabled={busy} onClick={handleSubmit}>
              {hasVault ? "Kasayı Aç" : "Kasayı Oluştur"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function FeatureRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/60 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
