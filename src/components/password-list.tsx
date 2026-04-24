import { type DragEvent, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  GripVertical,
  KeyRound,
  Plus,
  Search,
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
  totalEntries: number;
  availableTags: string[];
  selectedTag: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onTagSelect: (tag: string) => void;
  onClearFilters: () => void;
  onOpenDetails: (entry: VaultEntry) => void;
  dragEnabled: boolean;
  filterActive: boolean;
  onReorder: (entryIds: string[]) => Promise<void> | void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
  onCreateNew: () => void;
}

export function PasswordList({
  entries,
  totalEntries,
  availableTags,
  selectedTag,
  searchTerm,
  onSearchChange,
  onTagSelect,
  onClearFilters,
  onOpenDetails,
  dragEnabled,
  filterActive,
  onReorder,
  onCopyUsername,
  onCopyPassword,
  onCreateNew,
}: PasswordListProps) {
  const { language, t } = useI18n();
  const copyFeedback = useCopyFeedback();
  const compactTitle = language === "tr" ? "Kasa" : "Vault";
  const locale = language === "tr" ? "tr-TR" : "en-US";
  const [tagFiltersOpen, setTagFiltersOpen] = useState(Boolean(selectedTag));
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<"before" | "after" | null>(null);
  const reorderingEnabled = dragEnabled && !filterActive && entries.length > 1;
  const showingFilteredEmptyState = filterActive && totalEntries > 0 && entries.length === 0;

  useEffect(() => {
    if (selectedTag) {
      setTagFiltersOpen(true);
    }
  }, [selectedTag]);

  function isTagActive(tag: string) {
    return (
      selectedTag?.trim().toLocaleLowerCase(locale) ===
      tag.trim().toLocaleLowerCase(locale)
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

  function handleDragStart(event: DragEvent<HTMLElement>, entryId: string) {
    if (!reorderingEnabled) {
      return;
    }

    setDraggedEntryId(entryId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entryId);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, targetId: string) {
    if (!draggedEntryId || draggedEntryId === targetId) {
      return;
    }

    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextPlacement =
      event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";

    setDropTargetId(targetId);
    setDropPlacement(nextPlacement);
    event.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(event: DragEvent<HTMLElement>, targetId: string) {
    if (!draggedEntryId || !dropPlacement || draggedEntryId === targetId) {
      clearDragState();
      return;
    }

    event.preventDefault();
    const nextOrder = reorderEntryIds(
      entries.map((entry) => entry.id),
      draggedEntryId,
      targetId,
      dropPlacement,
    );

    clearDragState();

    if (nextOrder) {
      await onReorder(nextOrder);
    }
  }

  function clearDragState() {
    setDraggedEntryId(null);
    setDropTargetId(null);
    setDropPlacement(null);
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[14px] font-semibold text-foreground">
            {compactTitle}
          </h2>

          <div className="flex items-center gap-2">
            {availableTags.length > 0 || selectedTag ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setTagFiltersOpen((current) => !current)}
                className={cn(
                  "gap-1.5",
                  selectedTag && "border-primary/45 bg-primary/10 text-primary hover:bg-primary/14",
                )}
              >
                <span className="truncate">{t("passwords.tags")}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    tagFiltersOpen && "rotate-180",
                  )}
                />
              </Button>
            ) : null}

            <Button type="button" size="sm" onClick={onCreateNew}>
              <Plus className="h-4 w-4" />
              {t("passwords.new")}
            </Button>
          </div>
        </div>

        {tagFiltersOpen && (availableTags.length > 0 || selectedTag) ? (
          <div className="mt-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="mono-label text-[10px] text-muted-foreground">
                {t("passwords.filterByTag")}
              </p>

              {filterActive ? (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-[11px] font-medium text-primary transition-colors hover:text-primary/85"
                >
                  {t("passwords.clearFilters")}
                </button>
              ) : null}
            </div>

            {availableTags.length > 0 ? (
              <div className="mt-3 max-h-[120px] overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const active = isTagActive(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => onTagSelect(tag)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                          active
                            ? "border-primary/45 bg-primary/14 text-primary"
                            : "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:border-white/[0.12] hover:text-foreground",
                        )}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

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
              {showingFilteredEmptyState
                ? t("passwords.noResultsTitle")
                : t("passwords.emptyTitle")}
            </p>
            <p className="mt-2 max-w-[220px] text-[12px] leading-6 text-muted-foreground">
              {showingFilteredEmptyState
                ? t("passwords.noResultsDescription")
                : t("passwords.emptyDescription")}
            </p>
            {showingFilteredEmptyState ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-5"
                onClick={onClearFilters}
              >
                {t("passwords.clearFilters")}
              </Button>
            ) : (
              <Button type="button" size="sm" className="mt-5" onClick={onCreateNew}>
                <Plus className="h-4 w-4" />
                {t("passwords.createFirst")}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {entries.map((entry) => {
              const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
              const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

              return (
                <article
                  key={entry.id}
                  className="relative py-4"
                  draggable={reorderingEnabled}
                  onDragStart={(event) => handleDragStart(event, entry.id)}
                  onDragOver={(event) => handleDragOver(event, entry.id)}
                  onDrop={(event) => void handleDrop(event, entry.id)}
                  onDragEnd={clearDragState}
                >
                  {dropTargetId === entry.id && dropPlacement ? (
                    <div
                      className={cn(
                        "absolute left-0 right-0 z-10 h-[2px] rounded-full bg-primary",
                        dropPlacement === "before" ? "top-0" : "bottom-0",
                      )}
                    />
                  ) : null}

                  <div
                    className={cn(
                      "flex items-stretch gap-3 rounded-[16px] transition-opacity",
                      reorderingEnabled && "cursor-grab active:cursor-grabbing",
                      draggedEntryId === entry.id && "opacity-35",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenDetails(entry)}
                      className="flex aspect-square min-h-[72px] shrink-0 items-center justify-center self-stretch rounded-[14px] bg-white/[0.03] text-[20px] font-semibold text-primary transition-colors hover:bg-white/[0.06]"
                      aria-label={`${entry.service} details`}
                    >
                      {getInitials(entry.service)}
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col justify-center">
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
                              {maskUsername(entry.username) || t("passwords.noUsername")}
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

                        {reorderingEnabled ? (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/65">
                            <GripVertical className="h-4 w-4" />
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                        }
                        className={cn(
                          "mt-3 inline-flex max-w-full self-start items-center gap-1.5 text-left text-[12px] transition-colors",
                          passwordCopied
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={t("passwords.copyPassword")}
                      >
                        {passwordCopied ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="code-text truncate text-[11px] tracking-[0.12em]">
                          {maskValue(entry.password)}
                        </span>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full bg-primary transition-all duration-200",
                            passwordCopied
                              ? "scale-100 opacity-100"
                              : "scale-50 opacity-0",
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

function maskUsername(value: string) {
  if (!value) {
    return "";
  }

  const atIndex = value.indexOf("@");
  if (atIndex <= 1) {
    return value;
  }

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex);
  const visiblePrefixLength = Math.min(3, Math.max(1, Math.ceil(localPart.length / 3)));
  const visiblePrefix = localPart.slice(0, visiblePrefixLength);
  const maskedPart = "\u2022".repeat(Math.max(localPart.length - visiblePrefixLength, 2));

  return `${visiblePrefix}${maskedPart}${domainPart}`;
}

function reorderEntryIds(
  entryIds: string[],
  sourceId: string,
  targetId: string,
  placement: "before" | "after",
) {
  const sourceIndex = entryIds.indexOf(sourceId);
  const targetIndex = entryIds.indexOf(targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return null;
  }

  const nextIds = entryIds.slice();
  nextIds.splice(sourceIndex, 1);

  const adjustedTargetIndex =
    sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertIndex =
    placement === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1;

  nextIds.splice(insertIndex, 0, sourceId);
  return nextIds;
}
