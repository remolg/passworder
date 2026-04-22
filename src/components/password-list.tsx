import { type ReactNode, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  PencilLine,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";

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
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entry: VaultEntry) => void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
  onCreateNew: () => void;
}

export function PasswordList({
  entries,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onCopyUsername,
  onCopyPassword,
  onCreateNew,
}: PasswordListProps) {
  const { t } = useI18n();
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const copyFeedback = useCopyFeedback();

  function toggleReveal(id: string) {
    setRevealedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

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
      <div className="px-5 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mono-label text-[10px] text-muted-foreground">
              {t("passwords.badge")}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-[15px] font-semibold text-foreground">
                {t("passwords.title")}
              </h2>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {t("common.itemsCount", { count: entries.length })}
              </span>
            </div>
          </div>

          <Button type="button" size="sm" onClick={onCreateNew}>
            <Plus className="h-4 w-4" />
            {t("passwords.new")}
          </Button>
        </div>

        <div className="relative mt-4">
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

      <div className="mx-5 mt-4 h-px bg-white/[0.05]" />

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
              const revealed = revealedIds.includes(entry.id);
              const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
              const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

              return (
                <article key={entry.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.03] text-[12px] font-semibold text-primary">
                      {getInitials(entry.service)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-medium text-foreground">
                            {entry.service}
                          </h3>
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

                        <div className="flex shrink-0 items-center gap-2">
                          {entry.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                        }
                        className={cn(
                          "code-text mt-3 flex items-center gap-2 break-all text-left text-[11px] tracking-[0.12em] transition-colors hover:text-foreground",
                          passwordCopied
                            ? "text-primary"
                            : revealed
                              ? "text-primary"
                              : "text-muted-foreground",
                        )}
                        title={t("passwords.copyPassword")}
                      >
                        {passwordCopied ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5 shrink-0" />
                        )}
                        {revealed ? entry.password : maskValue(entry.password)}
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 self-center rounded-full bg-primary transition-all duration-200",
                            passwordCopied ? "scale-100 opacity-100" : "scale-50 opacity-0",
                          )}
                        />
                      </button>

                      {entry.url ? (
                        <p className="mt-2 truncate text-[11px] text-muted-foreground/80">
                          {entry.url}
                        </p>
                      ) : null}

                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/[0.04] pt-2">
                        <ActionIconButton
                          label={
                            revealed
                              ? t("passwords.hidePassword")
                              : t("passwords.showPassword")
                          }
                          onClick={() => toggleReveal(entry.id)}
                        >
                          {revealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </ActionIconButton>
                        <ActionIconButton
                          label={t("passwords.editEntry")}
                          onClick={() => onEdit(entry)}
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                        </ActionIconButton>
                        <ActionIconButton
                          label={t("passwords.deleteEntry")}
                          danger
                          onClick={() => onDelete(entry)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionIconButton>
                      </div>
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

function ActionIconButton({
  children,
  danger,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground",
        danger && "hover:text-destructive",
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
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
    return "••••••••";
  }

  return "•".repeat(Math.max(value.length, 8));
}
