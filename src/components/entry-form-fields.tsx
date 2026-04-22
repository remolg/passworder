import { type ReactNode, useState } from "react";
import { Check, Copy, Eye, EyeOff, WandSparkles } from "lucide-react";

import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EntryFormValues } from "@/types/vault";

interface EntryFormFieldsProps {
  values: EntryFormValues;
  onChange: (field: keyof EntryFormValues, value: string) => void;
  onCopyPassword?: (value: string) => Promise<boolean>;
  onGeneratePassword?: () => void;
}

export function EntryFormFields({
  values,
  onChange,
  onCopyPassword,
  onGeneratePassword,
}: EntryFormFieldsProps) {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const copyFeedback = useCopyFeedback();
  const strength = getPasswordStrength(values.password);
  const passwordCopied = copyFeedback.isCopied("password");

  async function handleCopyPassword() {
    if (!onCopyPassword) {
      return;
    }

    const success = await onCopyPassword(values.password);
    if (success) {
      copyFeedback.markCopied("password");
    }
  }

  return (
    <div className="space-y-5">
      <FieldGroup label={t("fields.service")} htmlFor="service">
        <Input
          id="service"
          value={values.service}
          onChange={(event) => onChange("service", event.target.value)}
          placeholder={t("fields.servicePlaceholder")}
        />
      </FieldGroup>

      <FieldGroup label={t("fields.url")} htmlFor="url">
        <Input
          id="url"
          value={values.url}
          onChange={(event) => onChange("url", event.target.value)}
          placeholder={t("fields.urlPlaceholder")}
        />
      </FieldGroup>

      <FieldGroup label={t("fields.username")} htmlFor="username">
        <Input
          id="username"
          value={values.username}
          onChange={(event) => onChange("username", event.target.value)}
          placeholder={t("fields.usernamePlaceholder")}
        />
      </FieldGroup>

      <FieldGroup label={t("fields.password")} htmlFor="password">
        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="password"
            className="mono-label text-[10px] text-muted-foreground"
          >
            {t("fields.password")}
          </Label>

          {onGeneratePassword ? (
            <button
              type="button"
              onClick={onGeneratePassword}
              className="flex items-center gap-1 text-[11px] font-medium text-primary transition-colors hover:text-primary/85"
            >
              <WandSparkles className="h-3.5 w-3.5" />
              {t("fields.generate")}
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={(event) => onChange("password", event.target.value)}
            placeholder={t("fields.passwordPlaceholder")}
            className="pr-20"
          />

          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {onCopyPassword ? (
              <InlineActionButton
                label={t("fields.copyPassword")}
                active={passwordCopied}
                onClick={() => void handleCopyPassword()}
              >
                {passwordCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </InlineActionButton>
            ) : null}

            <InlineActionButton
              label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </InlineActionButton>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 4 }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-[2px] flex-1 rounded-full bg-white/[0.08]",
                  index < strength.segments && "bg-primary",
                )}
              />
            ))}
          </div>

          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t(strength.labelKey)}
          </span>
        </div>
      </FieldGroup>

      <FieldGroup label={t("fields.notes")} htmlFor="notes">
        <Textarea
          id="notes"
          value={values.notes}
          onChange={(event) => onChange("notes", event.target.value)}
          placeholder={t("fields.notesPlaceholder")}
          rows={4}
          className="min-h-[100px] resize-none"
        />
      </FieldGroup>

      <FieldGroup label={t("fields.tags")} htmlFor="tags">
        <Input
          id="tags"
          value={values.tags}
          onChange={(event) => onChange("tags", event.target.value)}
          placeholder={t("fields.tagsPlaceholder")}
        />
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="mono-label text-[10px] text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function InlineActionButton({
  active,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function getPasswordStrength(password: string) {
  if (!password) {
    return { segments: 0, labelKey: "strength.empty" as const };
  }

  let score = 0;
  if (password.length >= 8) {
    score += 1;
  }
  if (password.length >= 14) {
    score += 1;
  }
  if (/\p{Lu}/u.test(password) && /\p{Ll}/u.test(password)) {
    score += 1;
  }
  if (/\d/.test(password) || /[^\p{L}\d]/u.test(password)) {
    score += 1;
  }

  if (score >= 4) {
    return { segments: 4, labelKey: "strength.strong" as const };
  }

  if (score === 3) {
    return { segments: 3, labelKey: "strength.medium" as const };
  }

  if (score === 2) {
    return { segments: 2, labelKey: "strength.weak" as const };
  }

  return { segments: 1, labelKey: "strength.veryWeak" as const };
}
