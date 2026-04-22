import { Check, KeyRound, Plus, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { VaultEntry } from "@/types/vault";

interface PasswordListProps {
  entries: VaultEntry[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenDetails: (entry: VaultEntry) => void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
  onCreateNew: () => void;
}

export function PasswordList({
  entries,
  searchTerm,
  onSearchChange,
  onOpenDetails,
  onCopyUsername,
  onCopyPassword,
  onCreateNew,
}: PasswordListProps) {
  const { language, t } = useI18n();
  const copyFeedback = useCopyFeedback();
  const compactTitle = language === "tr" ? "Kasa" : "Vault";

  async function handleCopy(
    key: string,
    action: (entry: VaultEntry) => Promise<boolean>,
    entry: VaultEntry,
  ) {
    const success = await action(entry);
    if (success) {
      copyFeedback.markCopied(key);
    }
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[14px] font-semibold text-foreground">
            {compactTitle}
          </h2>

          <Button type="button" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4" />
            {t("passwords.new")}
          </Button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("passwords.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      <div className="mx-5 mt-3 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[15px] font-medium text-foreground">
              {t("passwords.emptyTitle")}
            </p>
            <p className="mt-2 max-w-[220px] text-[12px] leading-6 text-muted-foreground">
              {t("passwords.emptyDescription")}
            </p>
            <Button type="button" size="sm" className="mt-5" onClick={onCreateNew}>
              <Plus className="h-4 w-4" />
              {t("passwords.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {entries.map((entry) => {
              const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
              const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

              return (
                <article key={entry.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenDetails(entry)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.03] text-[12px] font-semibold text-primary transition-colors hover:bg-white/[0.06]"
                      aria-label={`${entry.service} details`}
                    >
                      {getInitials(entry.service)}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenDetails(entry)}
                            className="truncate text-left text-[14px] font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {entry.service}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(`username:${entry.id}`, onCopyUsername, entry)
                            }
                            className={cn(
                              "mt-1 flex items-center gap-1.5 text-[12px] transition-colors",
                              usernameCopied
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            title={t("passwords.copyUsername")}
                          >
                            {usernameCopied ? (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <UserRound className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="truncate">
                              {entry.username || t("passwords.noUsername")}
                            </span>
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full bg-primary transition-all duration-200",
                                usernameCopied
                                  ? "scale-100 opacity-100"
                                  : "scale-50 opacity-0",
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                        }
                        className={cn(
                          "code-text mt-3 flex items-center gap-2 break-all text-left text-[11px] tracking-[0.12em] transition-colors hover:text-foreground",
                          passwordCopied ? "text-primary" : "text-muted-foreground",
                        )}
                        title={t("passwords.copyPassword")}
                      >
                        {passwordCopied ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {maskValue(entry.password)}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 self-center rounded-full bg-primary transition-all duration-200",
                            passwordCopied ? "scale-100 opacity-100" : "scale-50 opacity-0",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function getInitials(service: string) {
  const chunks = service
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (chunks.length === 0) {
    return "?";
  }

  return chunks.map((chunk) => chunk[0]?.toUpperCase() ?? "").join("");
}

function maskValue(value: string) {
  if (!value) {
    return "\u2022".repeat(8);
  }

  return "\u2022".repeat(Math.max(value.length, 8));
}
