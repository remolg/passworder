import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  ShieldEllipsis,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

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
  const { language, t, resolveText } = useI18n();
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const compactDescription = hasVault
    ? language === "tr"
      ? "Master password ile açın."
      : "Unlock with your master password."
    : language === "tr"
      ? "Master password oluşturun."
      : "Create your master password.";

  async function handleSubmit() {
    setLocalError(null);

    if (!masterPassword.trim()) {
      setLocalError("errors.masterPasswordRequired");
      return;
    }

    if (!hasVault) {
      if (masterPassword.length < 12) {
        setLocalError("errors.masterPasswordTooShort");
        return;
      }

      if (masterPassword !== confirmation) {
        setLocalError("errors.masterPasswordMismatch");
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
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-8">
      <div className="w-full max-w-[280px]">
        <form
          className="panel-surface rounded-[18px] px-5 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.03] text-primary">
              <ShieldEllipsis className="h-7 w-7" />
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#151d31] text-primary">
                <ShieldCheck className="h-3 w-3" />
              </div>
            </div>

            <h1 className="mt-4 text-[18px] font-semibold text-foreground">
              {hasVault ? t("unlock.titleLocked") : t("unlock.titleNew")}
            </h1>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              {compactDescription}
            </p>
          </div>

          <div className="mt-6 space-y-3.5">
            {runtimeMissing ? (
              <p className="text-[12px] leading-6 text-destructive">
                {t("unlock.runtimeMissing")}
              </p>
            ) : null}

            {localError || error ? (
              <p className="text-[12px] leading-6 text-destructive">
                {resolveText(localError ?? error)}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label
                htmlFor="masterPassword"
                className="mono-label text-[10px] text-muted-foreground"
              >
                {t("unlock.masterPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="masterPassword"
                  type={showPassword ? "text" : "password"}
                  value={masterPassword}
                  onChange={(event) => setMasterPassword(event.target.value)}
                  placeholder="••••••••••••"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                  aria-label={
                    showPassword
                      ? t("unlock.hidePassword")
                      : t("unlock.showPassword")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {!hasVault ? (
              <div className="space-y-2">
                <Label
                  htmlFor="masterPasswordConfirmation"
                  className="mono-label text-[10px] text-muted-foreground"
                >
                  {t("unlock.confirmLabel")}
                </Label>
                <Input
                  id="masterPasswordConfirmation"
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
            ) : null}

            <Button type="submit" className="mt-2 w-full" disabled={busy}>
              {hasVault ? (
                <LockKeyhole className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {hasVault ? t("unlock.unlockButton") : t("unlock.createButton")}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
