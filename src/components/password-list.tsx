import { type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
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

interface DragOverlayState {
  height: number;
  left: number;
  offsetY: number;
  top: number;
  width: number;
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
  const dragHandleLabel = language === "tr" ? "Kayd\u0131 ta\u015f\u0131" : "Reorder entry";
  const noUsernameLabel = t("passwords.noUsername");
  const [tagFiltersOpen, setTagFiltersOpen] = useState(Boolean(selectedTag));
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [previewEntryIds, setPreviewEntryIds] = useState<string[] | null>(null);
  const [dragOverlay, setDragOverlay] = useState<DragOverlayState | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositionsRef = useRef(new Map<string, number>());
  const activePointerIdRef = useRef<number | null>(null);
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragOverlayFrameRef = useRef<number | null>(null);
  const dragOverlayTopRef = useRef(0);
  const draggedEntryIdRef = useRef<string | null>(null);
  const previewEntryIdsRef = useRef<string[] | null>(null);
  const displayEntriesRef = useRef<VaultEntry[]>(entries);
  const entriesRef = useRef(entries);
  const onReorderRef = useRef(onReorder);
  const reorderingEnabled = dragEnabled && !filterActive && entries.length > 1;
  const showingFilteredEmptyState = filterActive && totalEntries > 0 && entries.length === 0;
  const displayEntries = sortEntries(entries, previewEntryIds);
  const draggedEntry =
    draggedEntryId === null
      ? null
      : displayEntries.find((entry) => entry.id === draggedEntryId) ??
        entries.find((entry) => entry.id === draggedEntryId) ??
        null;

  draggedEntryIdRef.current = draggedEntryId;
  previewEntryIdsRef.current = previewEntryIds;
  displayEntriesRef.current = displayEntries;
  entriesRef.current = entries;
  onReorderRef.current = onReorder;

  useEffect(() => {
    if (selectedTag) {
      setTagFiltersOpen(true);
    }
  }, [selectedTag]);

  useEffect(() => {
    if (typeof document === "undefined" || !draggedEntryId) {
      return;
    }

    const previousBodyCursor = document.body.style.cursor;
    const previousRootCursor = document.documentElement.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "grabbing";
    document.documentElement.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.body.style.cursor = previousBodyCursor;
      document.documentElement.style.cursor = previousRootCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [draggedEntryId]);

  useLayoutEffect(() => {
    const nextPositions = readItemPositions(itemRefs.current);

    if (draggedEntryId) {
      for (const [entryId, nextTop] of nextPositions) {
        if (entryId === draggedEntryId) {
          continue;
        }

        const previousTop = previousPositionsRef.current.get(entryId);
        if (previousTop === undefined) {
          continue;
        }

        const deltaY = previousTop - nextTop;
        if (Math.abs(deltaY) < 1) {
          continue;
        }

        const node = itemRefs.current.get(entryId);
        if (!node) {
          continue;
        }

        node.getAnimations().forEach((animation) => animation.cancel());
        node.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 160,
            easing: "cubic-bezier(0.22,1,0.36,1)",
          },
        );
      }
    }

    previousPositionsRef.current = nextPositions;
  }, [displayEntries, draggedEntryId]);

  useEffect(() => {
    if (!draggedEntryId || !dragOverlay) {
      return;
    }

    const overlayOffsetY = dragOverlay.offsetY;

    function updateOverlayTop(nextTop: number) {
      dragOverlayTopRef.current = nextTop;

      if (dragOverlayFrameRef.current !== null) {
        return;
      }

      dragOverlayFrameRef.current = window.requestAnimationFrame(() => {
        dragOverlayFrameRef.current = null;

        if (!dragOverlayElementRef.current) {
          return;
        }

        dragOverlayElementRef.current.style.transform = `translateY(${dragOverlayTopRef.current}px)`;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      updateOverlayTop(event.clientY - overlayOffsetY);

      const nextTarget = resolveDropTarget(
        displayEntriesRef.current,
        itemRefs.current,
        draggedEntryIdRef.current,
        event.clientY,
      );

      if (!nextTarget) {
        return;
      }

      updatePreviewOrder(nextTarget.targetId, nextTarget.placement);
    }

    function finishDrag(applyReorder: boolean) {
      activePointerIdRef.current = null;
      draggedEntryIdRef.current = null;
      dragOverlayTopRef.current = 0;
      if (dragOverlayFrameRef.current !== null) {
        window.cancelAnimationFrame(dragOverlayFrameRef.current);
        dragOverlayFrameRef.current = null;
      }
      setDraggedEntryId(null);
      setDragOverlay(null);

      if (!applyReorder) {
        previewEntryIdsRef.current = null;
        setPreviewEntryIds(null);
        return;
      }

      const currentOrder = entriesRef.current.map((entry) => entry.id);
      const nextOrder = previewEntryIdsRef.current ?? currentOrder;

      if (!nextOrder || areOrdersEqual(currentOrder, nextOrder)) {
        previewEntryIdsRef.current = null;
        setPreviewEntryIds(null);
        return;
      }

      void (async () => {
        try {
          await onReorderRef.current(nextOrder);
        } finally {
          previewEntryIdsRef.current = null;
          setPreviewEntryIds(null);
        }
      })();
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      finishDrag(true);
    }

    function handlePointerCancel(event: PointerEvent) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return;
      }

      finishDrag(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      if (dragOverlayFrameRef.current !== null) {
        window.cancelAnimationFrame(dragOverlayFrameRef.current);
        dragOverlayFrameRef.current = null;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [draggedEntryId, dragOverlay?.offsetY]);

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

  function handleDragHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    entryId: string,
  ) {
    if (!reorderingEnabled || event.button !== 0) {
      return;
    }

    const node = itemRefs.current.get(entryId);
    if (!node) {
      return;
    }

    event.preventDefault();

    const bounds = node.getBoundingClientRect();
    const articleNode = event.currentTarget.closest("article");
    const rowBounds = articleNode?.getBoundingClientRect() ?? bounds;
    const currentOrder = entries.map((entry) => entry.id);

    activePointerIdRef.current = event.pointerId;
    previousPositionsRef.current = readItemPositions(itemRefs.current);
    draggedEntryIdRef.current = entryId;
    previewEntryIdsRef.current = currentOrder;
    dragOverlayTopRef.current = rowBounds.top;
    setDraggedEntryId(entryId);
    setPreviewEntryIds(currentOrder);
    setDragOverlay({
      height: rowBounds.height,
      left: rowBounds.left,
      offsetY: event.clientY - rowBounds.top,
      top: rowBounds.top,
      width: rowBounds.width,
    });
  }

  function updatePreviewOrder(targetId: string, placement: "before" | "after") {
    const sourceId = draggedEntryIdRef.current;
    if (!sourceId || sourceId === targetId) {
      return;
    }

    const currentOrder = previewEntryIdsRef.current ?? entriesRef.current.map((entry) => entry.id);
    const nextOrder = reorderEntryIds(currentOrder, sourceId, targetId, placement);

    if (!nextOrder || areOrdersEqual(currentOrder, nextOrder)) {
      return;
    }

    previousPositionsRef.current = readItemPositions(itemRefs.current);
    previewEntryIdsRef.current = nextOrder;
    setPreviewEntryIds(nextOrder);
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

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-5 pb-5",
          draggedEntryId && "cursor-grabbing select-none",
        )}
      >
        {displayEntries.length === 0 ? (
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
            {displayEntries.map((entry) => {
              const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
              const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

              if (draggedEntryId === entry.id && dragOverlay) {
                return (
                  <article
                    key={entry.id}
                    aria-hidden="true"
                    className="relative"
                    style={{ height: dragOverlay.height }}
                  />
                );
              }

              return (
                <article key={entry.id} className="relative py-4">
                  <PasswordEntryCard
                    entry={entry}
                    dragHandleLabel={dragHandleLabel}
                    itemRef={(node) => {
                      if (node) {
                        itemRefs.current.set(entry.id, node);
                        return;
                      }

                      itemRefs.current.delete(entry.id);
                    }}
                    noUsernameLabel={noUsernameLabel}
                    onCopyPassword={() =>
                      void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                    }
                    onCopyUsername={() =>
                      void handleCopy(`username:${entry.id}`, onCopyUsername, entry)
                    }
                    onDragHandlePointerDown={
                      reorderingEnabled
                        ? (event) => handleDragHandlePointerDown(event, entry.id)
                        : undefined
                    }
                    onOpenDetails={() => onOpenDetails(entry)}
                    passwordCopied={passwordCopied}
                    reorderingEnabled={reorderingEnabled}
                    usernameCopied={usernameCopied}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>

      {draggedEntry && dragOverlay ? (
        <div
          className="pointer-events-none fixed z-50"
          ref={dragOverlayElementRef}
          style={{
            height: dragOverlay.height,
            left: dragOverlay.left,
            top: 0,
            transform: `translateY(${dragOverlay.top}px)`,
            width: dragOverlay.width,
          }}
        >
          <article className="py-4">
            <PasswordEntryCard
              entry={draggedEntry}
              dragHandleLabel={dragHandleLabel}
              noUsernameLabel={noUsernameLabel}
              onCopyPassword={() =>
                void handleCopy(`password:${draggedEntry.id}`, onCopyPassword, draggedEntry)
              }
              onCopyUsername={() =>
                void handleCopy(`username:${draggedEntry.id}`, onCopyUsername, draggedEntry)
              }
              onOpenDetails={() => onOpenDetails(draggedEntry)}
              passwordCopied={copyFeedback.isCopied(`password:${draggedEntry.id}`)}
              reorderingEnabled={reorderingEnabled}
              usernameCopied={copyFeedback.isCopied(`username:${draggedEntry.id}`)}
            />
          </article>
        </div>
      ) : null}
    </section>
  );
}

interface PasswordEntryCardProps {
  className?: string;
  dragHandleLabel: string;
  entry: VaultEntry;
  itemRef?: (node: HTMLDivElement | null) => void;
  noUsernameLabel: string;
  onCopyPassword: () => void;
  onCopyUsername: () => void;
  onDragHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenDetails: () => void;
  passwordCopied: boolean;
  reorderingEnabled: boolean;
  usernameCopied: boolean;
}

function PasswordEntryCard({
  className,
  dragHandleLabel,
  entry,
  itemRef,
  noUsernameLabel,
  onCopyPassword,
  onCopyUsername,
  onDragHandlePointerDown,
  onOpenDetails,
  passwordCopied,
  reorderingEnabled,
  usernameCopied,
}: PasswordEntryCardProps) {
  return (
    <div
      className={cn(
        "flex items-stretch gap-3 rounded-[16px] transition-opacity duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
        className,
      )}
      ref={itemRef}
    >
      <button
        type="button"
        onClick={onOpenDetails}
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
              onClick={onOpenDetails}
              className="truncate text-left text-[14px] font-medium text-foreground transition-colors hover:text-primary"
            >
              {entry.service}
            </button>

            <button
              type="button"
              onClick={onCopyUsername}
              className={cn(
                "mt-1 flex items-center gap-1.5 text-[12px] transition-colors",
                usernameCopied
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {usernameCopied ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <UserRound className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">
                {maskUsername(entry.username) || noUsernameLabel}
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
            onDragHandlePointerDown ? (
              <button
                type="button"
                onPointerDown={onDragHandlePointerDown}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/65 transition-colors hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
                aria-label={dragHandleLabel}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/65">
                <GripVertical className="h-4 w-4" />
              </div>
            )
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCopyPassword}
          className={cn(
            "mt-3 inline-flex max-w-full self-start items-center gap-1.5 text-left text-[12px] transition-colors",
            passwordCopied
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
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

function resolveDropTarget(
  entries: VaultEntry[],
  itemRefs: Map<string, HTMLDivElement>,
  draggedEntryId: string | null,
  clientY: number,
) {
  const edgeRatio = 0.34;

  if (!draggedEntryId) {
    return null;
  }

  const targetEntries = entries.filter((entry) => entry.id !== draggedEntryId);

  if (targetEntries.length === 0) {
    return null;
  }

  const firstNode = itemRefs.get(targetEntries[0].id);
  if (!firstNode) {
    return null;
  }

  const firstBounds = firstNode.getBoundingClientRect();
  if (clientY <= firstBounds.top + firstBounds.height * edgeRatio) {
    return {
      targetId: targetEntries[0].id,
      placement: "before" as const,
    };
  }

  for (const entry of targetEntries) {
    const node = itemRefs.get(entry.id);
    if (!node) {
      continue;
    }

    const bounds = node.getBoundingClientRect();
    const beforeBoundary = bounds.top + bounds.height * edgeRatio;
    const afterBoundary = bounds.bottom - bounds.height * edgeRatio;

    if (clientY < beforeBoundary) {
      return {
        targetId: entry.id,
        placement: "before" as const,
      };
    }

    if (clientY <= afterBoundary) {
      return null;
    }
  }

  return {
    targetId: targetEntries[targetEntries.length - 1].id,
    placement: "after" as const,
  };
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

function sortEntries(entries: VaultEntry[], orderedIds: string[] | null) {
  if (!orderedIds) {
    return entries;
  }

  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const orderedEntries = orderedIds
    .map((entryId) => entriesById.get(entryId))
    .filter((entry): entry is VaultEntry => Boolean(entry));

  if (orderedEntries.length !== entries.length) {
    return entries;
  }

  return orderedEntries;
}

function readItemPositions(itemRefs: Map<string, HTMLDivElement>) {
  const positions = new Map<string, number>();

  for (const [entryId, node] of itemRefs) {
    positions.set(entryId, node.getBoundingClientRect().top);
  }

  return positions;
}

function areOrdersEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entryId, index) => entryId === right[index]);
}
