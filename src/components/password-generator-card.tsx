import { type ReactNode, useEffect, useState } from "react";
import { Check, Copy, Info, RefreshCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { generatePassword } from "@/lib/password-generator";
import { PasswordGeneratorOptions } from "@/types/vault";

interface PasswordGeneratorCardProps {
  onApply: (value: string) => void;
  onCopy: (value: string) => Promise<boolean>;
}

const DEFAULT_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

const CHARACTER_WEIGHTS = {
  uppercase: 24,
  lowercase: 25,
  numbers: 8,
  symbols: 22,
};

export function PasswordGeneratorCard({
  onApply,
  onCopy,
}: PasswordGeneratorCardProps) {
  const { t, resolveText } = useI18n();
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copyFeedback = useCopyFeedback();
  const copied = copyFeedback.isCopied("generated");

  useEffect(() => {
    refresh();
  }, []);

  function refresh(nextOptions = options) {
    try {
      const value = generatePassword(nextOptions);
      setGenerated(value);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "errors.unexpected",
      );
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

  const strength = getStrengthSummary(options);

  async function handleCopy() {
    if (!generated) {
      return;
    }

    const success = await onCopy(generated);
    if (success) {
      copyFeedback.markCopied("generated");
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("generator.badge")}
            </p>
            <h2 className="mt-2 text-[15px] font-semibold text-foreground">
              {t("generator.title")}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <GeneratorIconButton label={t("generator.refresh")} onClick={() => refresh()}>
              <RefreshCcw className="h-4 w-4" />
            </GeneratorIconButton>
            <GeneratorIconButton
              active={copied}
              label={t("generator.copyPassword")}
              onClick={() => void handleCopy()}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </GeneratorIconButton>
          </div>
        </div>

        <div className="mt-8">
          <p className="code-text break-all text-[28px] font-medium leading-[1.28] text-primary">
            {generated || t("generator.loading")}
          </p>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="mono-label text-primary">{t(strength.labelKey)}</span>
            <span className="text-muted-foreground">{strength.entropy} bit</span>
          </div>
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-[4px] flex-1 rounded-full bg-white/[0.06]",
                  index < strength.segments && "bg-primary",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-5 mt-6 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <section className="pt-6">
          <div className="flex items-center justify-between">
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("generator.length")}
            </p>
            <span className="code-text text-[15px] font-medium text-foreground">
              {options.length}
            </span>
          </div>

          <div className="mt-5">
            <Slider
              min={8}
              max={48}
              step={1}
              value={[options.length]}
              onValueChange={(value) => updateOption("length", value[0] ?? 20)}
            />
          </div>

          <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
            <span>8</span>
            <span>48</span>
          </div>
        </section>

        <div className="mt-6 h-px bg-white/[0.05]" />

        <section className="divide-y divide-white/[0.05]">
          <ToggleRow
            label={t("generator.uppercase")}
            hint="A-Z"
            active={options.uppercase}
            onClick={() => updateOption("uppercase", !options.uppercase)}
          />
          <ToggleRow
            label={t("generator.lowercase")}
            hint="a-z"
            active={options.lowercase}
            onClick={() => updateOption("lowercase", !options.lowercase)}
          />
          <ToggleRow
            label={t("generator.numbers")}
            hint="0-9"
            active={options.numbers}
            onClick={() => updateOption("numbers", !options.numbers)}
          />
          <ToggleRow
            label={t("generator.symbols")}
            hint="!@#$%"
            active={options.symbols}
            onClick={() => updateOption("symbols", !options.symbols)}
          />
        </section>

        <div className="mt-6 h-px bg-white/[0.05]" />

        {error ? (
          <p className="pt-5 text-[12px] leading-6 text-destructive">
            {resolveText(error)}
          </p>
        ) : (
          <div className="flex gap-3 pb-1 pt-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[12px] font-medium text-foreground">
                {t("generator.localTitle")}
              </p>
              <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
                {t("generator.localDescription")}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.05] px-5 py-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className={cn("px-2", copied && "text-primary hover:text-primary")}
            onClick={() => void handleCopy()}
            disabled={!generated}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {t("generator.copy")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => onApply(generated)}
            disabled={!generated}
          >
            <Sparkles className="h-4 w-4" />
            {t("generator.apply")}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({
  active,
  hint,
  label,
  onClick,
}: {
  active: boolean;
  hint: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-foreground"
    >
      <div>
        <p className="text-[15px] font-medium text-foreground">{label}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
      </div>

      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          active ? "bg-primary" : "bg-white/[0.08]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            active ? "translate-x-[22px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}

function GeneratorIconButton({
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
        "flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors",
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

function getStrengthSummary(options: PasswordGeneratorOptions) {
  const poolSize =
    (options.uppercase ? CHARACTER_WEIGHTS.uppercase : 0) +
    (options.lowercase ? CHARACTER_WEIGHTS.lowercase : 0) +
    (options.numbers ? CHARACTER_WEIGHTS.numbers : 0) +
    (options.symbols ? CHARACTER_WEIGHTS.symbols : 0);

  const entropy =
    poolSize > 0 ? Math.round(options.length * Math.log2(poolSize)) : 0;

  if (entropy >= 110) {
    return { entropy, labelKey: "strength.veryStrong" as const, segments: 5 };
  }

  if (entropy >= 85) {
    return { entropy, labelKey: "strength.strong" as const, segments: 4 };
  }

  if (entropy >= 60) {
    return { entropy, labelKey: "strength.medium" as const, segments: 3 };
  }

  if (entropy >= 40) {
    return { entropy, labelKey: "strength.weak" as const, segments: 2 };
  }

  return { entropy, labelKey: "strength.veryWeak" as const, segments: 1 };
}
