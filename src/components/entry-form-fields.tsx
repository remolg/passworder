import { type ReactNode, useState } from "react";
import { Check, ChevronDown, Copy, Eye, EyeOff, WandSparkles } from "lucide-react";

import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { ServiceLogoBadge } from "@/components/service-logo-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { getLogoOption, LOGO_OPTIONS } from "@/lib/logo-catalog";
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
  const { language, t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const copyFeedback = useCopyFeedback();
  const strength = getPasswordStrength(values.password);
  const passwordCopied = copyFeedback.isCopied("password");
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const selectedLogo = getLogoOption(values.logoId);

  async function handleCopyPassword() {
    if (!onCopyPassword) {
      return;
    }

    const success = await onCopyPassword(values.password);
    if (success) {
      copyFeedback.markCopied("password");
    }
  }

  function handleLogoSelect(nextLogoId: string) {
    if (values.logoId === nextLogoId) {
      return;
    }

    const currentLogo = getLogoOption(values.logoId);
    onChange("logoId", nextLogoId);

    const nextTags = syncTagsWithLogo(
      values.tags,
      currentLogo?.tag ?? null,
      getLogoOption(nextLogoId)?.tag ?? null,
      locale,
    );

    if (nextTags !== values.tags) {
      onChange("tags", nextTags);
    }

    setLogoPickerOpen(false);
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

      <FieldGroup label={t("fields.logo")} htmlFor="logoId">
        <div className="space-y-3">
          <button
            id="logoId"
            type="button"
            onClick={() => setLogoPickerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.03]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <ServiceLogoBadge
                service={values.service}
                logoId={values.logoId}
                className="h-10 w-10 shrink-0 rounded-[12px]"
                imageClassName="h-5 w-5"
                fallbackClassName="text-[16px]"
              />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium text-foreground">
                  {selectedLogo?.label ?? t("fields.logoFallback")}
                </span>
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                logoPickerOpen && "rotate-180",
              )}
            />
          </button>

          {logoPickerOpen ? (
            <div className="grid grid-cols-5 gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3">
              <LogoPickerButton
                active={!values.logoId}
                label={t("fields.logoFallback")}
                onClick={() => handleLogoSelect("")}
              >
                <ServiceLogoBadge
                  service={values.service}
                  className="rounded-[12px] bg-transparent"
                  imageClassName="h-6 w-6"
                  fallbackClassName="text-[18px]"
                />
              </LogoPickerButton>

              {LOGO_OPTIONS.map((logo) => (
                <LogoPickerButton
                  key={logo.id}
                  active={values.logoId === logo.id}
                  label={logo.label}
                  onClick={() => handleLogoSelect(logo.id)}
                >
                  <img
                    src={logo.src}
                    alt={logo.label}
                    className="h-6 w-6 object-contain"
                    draggable={false}
                  />
                </LogoPickerButton>
              ))}
            </div>
          ) : null}
        </div>
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

      <div className="space-y-2">
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
      </div>

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
        <p className="text-[11px] leading-5 text-muted-foreground">
          {t("fields.tagsHint")}
        </p>
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

function LogoPickerButton({
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
        "flex aspect-square items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.02] transition-colors",
        active
          ? "border-primary/45 bg-primary/10"
          : "hover:border-white/[0.14] hover:bg-white/[0.04]",
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
    </button>
  );
}

function syncTagsWithLogo(
  tagsValue: string,
  currentTag: string | null,
  nextTag: string | null,
  locale: string,
) {
  if (!currentTag && !nextTag) {
    return tagsValue;
  }

  const tags = tagsValue
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const normalizedTags = tags.map((tag) => tag.toLocaleLowerCase(locale));
  const normalizedCurrentTag = currentTag?.toLocaleLowerCase(locale) ?? null;
  const normalizedNextTag = nextTag?.toLocaleLowerCase(locale) ?? null;

  if (normalizedCurrentTag && normalizedNextTag && normalizedCurrentTag !== normalizedNextTag) {
    const currentIndex = normalizedTags.indexOf(normalizedCurrentTag);
    const nextIndex = normalizedTags.indexOf(normalizedNextTag);

    if (currentIndex !== -1) {
      if (nextIndex !== -1) {
        tags.splice(currentIndex, 1);
      } else {
        tags[currentIndex] = nextTag ?? tags[currentIndex];
      }

      return tags.join(", ");
    }
  }

  if (normalizedNextTag && !normalizedTags.includes(normalizedNextTag)) {
    tags.push(nextTag ?? "");
    return tags.filter(Boolean).join(", ");
  }

  return tagsValue;
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
