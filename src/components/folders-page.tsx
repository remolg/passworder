import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  Folder,
  GripVertical,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { PasswordEntryCard } from "@/components/password-list";
import { ServiceLogoBadge } from "@/components/service-logo-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { useI18n } from "@/lib/i18n";
import { getLogoOption, LOGO_OPTIONS } from "@/lib/logo-catalog";
import { cn } from "@/lib/utils";
import { FolderMutationInput, VaultEntry, VaultFolder } from "@/types/vault";

interface FoldersPageProps {
  folders: VaultFolder[];
  entries: VaultEntry[];
  busy: boolean;
  onCreateFolder: (input: FolderMutationInput) => Promise<boolean> | boolean;
  onUpdateFolder: (input: {
    id: string;
    name: string;
    logoId?: string;
  }) => Promise<boolean> | boolean;
  onDeleteFolder: (id: string) => Promise<boolean> | boolean;
  onOpenEntry: (entry: VaultEntry) => void;
  onCreateEntryInFolder: (folderId: string) => void;
  dragEnabled: boolean;
  folderDragEnabled: boolean;
  onReorderFolders: (folderIds: string[]) => Promise<void> | void;
  onReorderFolderEntries: (
    folderId: string,
    entryIds: string[],
  ) => Promise<void> | void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
}

interface DragOverlayState {
  height: number;
  left: number;
  offsetY: number;
  top: number;
  width: number;
}

export function FoldersPage({
  folders,
  entries,
  busy,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onOpenEntry,
  onCreateEntryInFolder,
  dragEnabled,
  folderDragEnabled,
  onReorderFolders,
  onReorderFolderEntries,
  onCopyUsername,
  onCopyPassword,
}: FoldersPageProps) {
  const { t } = useI18n();
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<VaultFolder | null>(null);

  const entryCountByFolderId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.folderId) {
        continue;
      }

      counts.set(entry.folderId, (counts.get(entry.folderId) ?? 0) + 1);
    }

    return counts;
  }, [entries]);

  const selectedFolder =
    selectedFolderId === null
      ? null
      : folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const folderEntries = selectedFolder
    ? entries.filter((entry) => entry.folderId === selectedFolder.id)
    : [];
  const filteredFolders = useMemo(() => {
    const normalizedSearchTerm = folderSearchTerm.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearchTerm) {
      return folders;
    }

    return folders.filter((folder) =>
      folder.name.toLocaleLowerCase("tr-TR").includes(normalizedSearchTerm),
    );
  }, [folderSearchTerm, folders]);
  const folderSearchActive = Boolean(folderSearchTerm.trim());

  useEffect(() => {
    if (folders.length === 0) {
      setSelectedFolderId(null);
      return;
    }

    if (selectedFolderId && !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId]);

  async function handleDeleteFolder(folder: VaultFolder) {
    if (!window.confirm(t("folders.deleteConfirm", { name: folder.name }))) {
      return false;
    }

    const success = await onDeleteFolder(folder.id);
    if (success) {
      setEditingFolder((currentFolder) =>
        currentFolder?.id === folder.id ? null : currentFolder,
      );
      setSelectedFolderId((currentFolderId) =>
        currentFolderId === folder.id ? null : currentFolderId,
      );
    }

    return success;
  }

  async function handleUpdateFolder(input: {
    id: string;
    name: string;
    logoId?: string;
  }) {
    const success = await onUpdateFolder(input);
    if (success) {
      setEditingFolder(null);
    }

    return success;
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-4">
        {selectedFolder ? (
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                aria-label={t("quickAdd.back")}
                title={t("quickAdd.back")}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <ServiceLogoBadge
                service={selectedFolder.name}
                logoId={selectedFolder.logoId}
                className="h-10 w-10 shrink-0 rounded-[12px]"
                imageClassName="h-5 w-5"
                fallbackClassName="text-[16px]"
              />

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-semibold text-foreground">
                  {selectedFolder.name}
                </h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("common.itemsCount", { count: folderEntries.length })}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingFolder(selectedFolder)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                aria-label={t("folders.editFolder")}
                title={t("folders.editFolder")}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              className="mt-4 w-full"
              onClick={() => onCreateEntryInFolder(selectedFolder.id)}
            >
              <Plus className="h-4 w-4" />
              {t("folders.addEntry")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[14px] font-semibold text-foreground">
                {t("folders.title")}
              </h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                disabled={busy}
                aria-label={t("folders.create")}
                title={t("folders.create")}
              >
                <Plus className="h-4 w-4" />
                {t("passwords.new")}
              </Button>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={folderSearchTerm}
                onChange={(event) => setFolderSearchTerm(event.target.value)}
                placeholder={t("passwords.searchPlaceholder")}
                className="pl-9"
              />
            </div>
          </>
        )}
      </div>

      <div className="mx-5 mt-3 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {selectedFolder ? (
          <div className="py-3">
            {folderEntries.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center">
                <KeyRound className="h-5 w-5 text-primary" />
                <p className="mt-3 text-[13px] font-medium text-foreground">
                  {t("folders.emptyFolderTitle")}
                </p>
                <p className="mt-2 max-w-[230px] text-[11px] leading-5 text-muted-foreground">
                  {t("folders.emptyFolderDescription")}
                </p>
              </div>
            ) : (
              <FolderEntriesList
                dragEnabled={dragEnabled}
                entries={folderEntries}
                onCopyPassword={onCopyPassword}
                onCopyUsername={onCopyUsername}
                onOpenEntry={onOpenEntry}
                onReorder={(entryIds) =>
                  onReorderFolderEntries(selectedFolder.id, entryIds)
                }
              />
            )}
          </div>
        ) : folders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-white/[0.04] text-primary">
              <Folder className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[15px] font-medium text-foreground">
              {t("folders.emptyTitle")}
            </p>
            <p className="mt-2 max-w-[230px] text-[12px] leading-6 text-muted-foreground">
              {t("folders.emptyDescription")}
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-5"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("folders.create")}
            </Button>
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[15px] font-medium text-foreground">
              {t("passwords.noResultsTitle")}
            </p>
            <p className="mt-2 max-w-[220px] text-[12px] leading-6 text-muted-foreground">
              {t("passwords.noResultsDescription")}
            </p>
            {folderSearchActive ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-5"
                onClick={() => setFolderSearchTerm("")}
              >
                {t("passwords.clearFilters")}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="py-4">
            <FolderList
              dragEnabled={folderDragEnabled && !folderSearchActive}
              entryCountByFolderId={entryCountByFolderId}
              folders={filteredFolders}
              onOpenFolder={setSelectedFolderId}
              onReorder={onReorderFolders}
            />
          </div>
        )}
      </div>

      <FolderFormDialog
        open={createDialogOpen}
        busy={busy}
        onClose={() => setCreateDialogOpen(false)}
        onSave={async (input) => {
          const success = await onCreateFolder(input);
          if (success) {
            setCreateDialogOpen(false);
          }

          return success;
        }}
      />

      <FolderEditDialog
        folder={editingFolder}
        open={Boolean(editingFolder)}
        busy={busy}
        onClose={() => setEditingFolder(null)}
        onDelete={handleDeleteFolder}
        onSave={handleUpdateFolder}
      />
    </section>
  );
}

interface FolderListProps {
  folders: VaultFolder[];
  entryCountByFolderId: Map<string, number>;
  dragEnabled: boolean;
  onReorder: (folderIds: string[]) => Promise<void> | void;
  onOpenFolder: (folderId: string) => void;
}

function FolderList({
  folders,
  entryCountByFolderId,
  dragEnabled,
  onReorder,
  onOpenFolder,
}: FolderListProps) {
  const { t } = useI18n();
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [previewFolderIds, setPreviewFolderIds] = useState<string[] | null>(null);
  const [dragOverlay, setDragOverlay] = useState<DragOverlayState | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const previousPositionsRef = useRef(new Map<string, number>());
  const activePointerIdRef = useRef<number | null>(null);
  const dragOverlayElementRef = useRef<HTMLDivElement | null>(null);
  const dragOverlayFrameRef = useRef<number | null>(null);
  const dragOverlayTopRef = useRef(0);
  const draggedFolderIdRef = useRef<string | null>(null);
  const skipNextLayoutAnimationRef = useRef(false);
  const displayFoldersRef = useRef<VaultFolder[]>(folders);
  const foldersRef = useRef(folders);
  const onReorderRef = useRef(onReorder);
  const reorderingEnabled = dragEnabled && folders.length > 1;
  const displayFolders = sortFolders(folders, previewFolderIds);
  const draggedFolder =
    draggedFolderId === null
      ? null
      : displayFolders.find((folder) => folder.id === draggedFolderId) ??
        folders.find((folder) => folder.id === draggedFolderId) ??
        null;

  draggedFolderIdRef.current = draggedFolderId;
  displayFoldersRef.current = displayFolders;
  foldersRef.current = folders;
  onReorderRef.current = onReorder;

  useEffect(() => {
    if (typeof document === "undefined" || !draggedFolderId) {
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
  }, [draggedFolderId]);

  useLayoutEffect(() => {
    const nextPositions = readItemPositions(itemRefs.current);
    const shouldAnimateLayout = draggedFolderId && !skipNextLayoutAnimationRef.current;

    if (shouldAnimateLayout) {
      for (const [folderId, nextTop] of nextPositions) {
        if (folderId === draggedFolderId) {
          continue;
        }

        const previousTop = previousPositionsRef.current.get(folderId);
        if (previousTop === undefined) {
          continue;
        }

        const deltaY = previousTop - nextTop;
        if (Math.abs(deltaY) < 1) {
          continue;
        }

        const node = itemRefs.current.get(folderId);
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
    skipNextLayoutAnimationRef.current = false;
  }, [displayFolders, draggedFolderId]);

  useEffect(() => {
    if (!draggedFolderId || !dragOverlay) {
      return;
    }

    const overlayOffsetY = dragOverlay.offsetY;
    const overlayHeight = dragOverlay.height;

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
      updatePreviewOrder(event.clientY - overlayOffsetY + overlayHeight / 2);
    }

    function finishDrag(applyReorder: boolean) {
      activePointerIdRef.current = null;
      draggedFolderIdRef.current = null;
      dragOverlayTopRef.current = 0;
      if (dragOverlayFrameRef.current !== null) {
        window.cancelAnimationFrame(dragOverlayFrameRef.current);
        dragOverlayFrameRef.current = null;
      }
      setDraggedFolderId(null);
      setDragOverlay(null);

      if (!applyReorder) {
        setPreviewFolderIds(null);
        return;
      }

      const currentOrder = foldersRef.current.map((folder) => folder.id);
      const nextOrder = displayFoldersRef.current.map((folder) => folder.id);

      if (areOrdersEqual(currentOrder, nextOrder)) {
        setPreviewFolderIds(null);
        return;
      }

      void (async () => {
        try {
          await onReorderRef.current(nextOrder);
        } finally {
          setPreviewFolderIds(null);
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
  }, [draggedFolderId, dragOverlay?.offsetY]);

  function handleDragHandlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    folderId: string,
  ) {
    if (!reorderingEnabled || event.button !== 0) {
      return;
    }

    const node = itemRefs.current.get(folderId);
    if (!node) {
      return;
    }

    event.preventDefault();

    const bounds = node.getBoundingClientRect();
    activePointerIdRef.current = event.pointerId;
    cancelItemAnimations(itemRefs.current);
    skipNextLayoutAnimationRef.current = true;
    previousPositionsRef.current = readItemPositions(itemRefs.current);
    draggedFolderIdRef.current = folderId;
    dragOverlayTopRef.current = bounds.top;
    setDraggedFolderId(folderId);
    setDragOverlay({
      height: bounds.height,
      left: bounds.left,
      offsetY: event.clientY - bounds.top,
      top: bounds.top,
      width: bounds.width,
    });
  }

  function updatePreviewOrder(draggedMidY: number) {
    const sourceId = draggedFolderIdRef.current;
    if (!sourceId) {
      return;
    }

    const currentOrder = displayFoldersRef.current.map((folder) => folder.id);
    const sourceIndex = currentOrder.indexOf(sourceId);
    if (sourceIndex === -1) {
      return;
    }

    let nextOrder: string[] | null = null;
    const previousFolderId = sourceIndex > 0 ? currentOrder[sourceIndex - 1] : null;
    const nextFolderId =
      sourceIndex < currentOrder.length - 1 ? currentOrder[sourceIndex + 1] : null;

    if (nextFolderId) {
      const nextNode = itemRefs.current.get(nextFolderId);
      const nextBounds = nextNode?.getBoundingClientRect();

      if (nextBounds && draggedMidY >= nextBounds.top + nextBounds.height / 2) {
        nextOrder = moveEntryId(currentOrder, sourceIndex, sourceIndex + 1);
      }
    }

    if (!nextOrder && previousFolderId) {
      const previousNode = itemRefs.current.get(previousFolderId);
      const previousBounds = previousNode?.getBoundingClientRect();

      if (previousBounds && draggedMidY <= previousBounds.top + previousBounds.height / 2) {
        nextOrder = moveEntryId(currentOrder, sourceIndex, sourceIndex - 1);
      }
    }

    if (!nextOrder || areOrdersEqual(currentOrder, nextOrder)) {
      return;
    }

    previousPositionsRef.current = readItemPositions(itemRefs.current);
    setPreviewFolderIds(nextOrder);
  }

  return (
    <>
      <div
        className={cn(
          "space-y-1",
          draggedFolderId && "cursor-grabbing select-none",
        )}
      >
        {displayFolders.map((folder) => {
          const entryCount = entryCountByFolderId.get(folder.id) ?? 0;

          if (draggedFolderId === folder.id && dragOverlay) {
            return (
              <FolderCard
                key={folder.id}
                ariaHidden
                className="pointer-events-none opacity-0"
                dragHandleLabel={t("folders.reorderFolder")}
                entryCount={entryCount}
                folder={folder}
                onOpen={() => onOpenFolder(folder.id)}
                reorderingEnabled={reorderingEnabled}
              />
            );
          }

          return (
            <FolderCard
              key={folder.id}
              dragHandleLabel={t("folders.reorderFolder")}
              entryCount={entryCount}
              folder={folder}
              itemRef={(node) => {
                if (node) {
                  itemRefs.current.set(folder.id, node);
                  return;
                }

                itemRefs.current.delete(folder.id);
              }}
              onDragHandlePointerDown={
                reorderingEnabled
                  ? (event) => handleDragHandlePointerDown(event, folder.id)
                  : undefined
              }
              onOpen={() => onOpenFolder(folder.id)}
              reorderingEnabled={reorderingEnabled}
            />
          );
        })}
      </div>

      {draggedFolder && dragOverlay ? (
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
          <FolderCard
            dragHandleLabel={t("folders.reorderFolder")}
            entryCount={entryCountByFolderId.get(draggedFolder.id) ?? 0}
            folder={draggedFolder}
            onOpen={() => onOpenFolder(draggedFolder.id)}
            reorderingEnabled={reorderingEnabled}
          />
        </div>
      ) : null}
    </>
  );
}

interface FolderCardProps {
  ariaHidden?: boolean;
  className?: string;
  dragHandleLabel: string;
  entryCount: number;
  folder: VaultFolder;
  itemRef?: (node: HTMLDivElement | null) => void;
  onDragHandlePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  reorderingEnabled: boolean;
}

function FolderCard({
  ariaHidden,
  className,
  dragHandleLabel,
  entryCount,
  folder,
  itemRef,
  onDragHandlePointerDown,
  onOpen,
  reorderingEnabled,
}: FolderCardProps) {
  const { t } = useI18n();

  return (
    <div
      aria-hidden={ariaHidden}
      className={cn(
        "group flex h-[76px] w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-white/[0.035] will-change-transform",
        className,
      )}
      ref={itemRef}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={t("folders.openFolder")}
      >
        <ServiceLogoBadge
          service={folder.name}
          logoId={folder.logoId}
          className="h-12 w-12 shrink-0 rounded-[14px] bg-white/[0.04]"
          imageClassName="h-6 w-6"
          fallbackClassName="text-[18px]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {folder.name}
          </span>
          <span className="mt-1.5 block text-[11px] text-muted-foreground">
            {t("common.itemsCount", { count: entryCount })}
          </span>
        </span>
      </button>

      {reorderingEnabled ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.04] bg-white/[0.025] text-muted-foreground/75 transition-colors group-hover:bg-white/[0.04] group-hover:text-muted-foreground">
          {onDragHandlePointerDown ? (
            <button
              type="button"
              onPointerDown={onDragHandlePointerDown}
              className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-[8px] transition-colors hover:bg-white/[0.06] hover:text-foreground active:cursor-grabbing"
              aria-label={dragHandleLabel}
              title={dragHandleLabel}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]">
              <GripVertical className="h-4 w-4" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface FolderEntriesListProps {
  entries: VaultEntry[];
  dragEnabled: boolean;
  onReorder: (entryIds: string[]) => Promise<void> | void;
  onOpenEntry: (entry: VaultEntry) => void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
}

function FolderEntriesList({
  entries,
  dragEnabled,
  onReorder,
  onOpenEntry,
  onCopyUsername,
  onCopyPassword,
}: FolderEntriesListProps) {
  const { t } = useI18n();
  const copyFeedback = useCopyFeedback();
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
  const skipNextLayoutAnimationRef = useRef(false);
  const displayEntriesRef = useRef<VaultEntry[]>(entries);
  const entriesRef = useRef(entries);
  const onReorderRef = useRef(onReorder);
  const reorderingEnabled = dragEnabled && entries.length > 1;
  const displayEntries = sortEntries(entries, previewEntryIds);
  const draggedEntry =
    draggedEntryId === null
      ? null
      : displayEntries.find((entry) => entry.id === draggedEntryId) ??
        entries.find((entry) => entry.id === draggedEntryId) ??
        null;

  draggedEntryIdRef.current = draggedEntryId;
  displayEntriesRef.current = displayEntries;
  entriesRef.current = entries;
  onReorderRef.current = onReorder;

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
    const shouldAnimateLayout = draggedEntryId && !skipNextLayoutAnimationRef.current;

    if (shouldAnimateLayout) {
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
    skipNextLayoutAnimationRef.current = false;
  }, [displayEntries, draggedEntryId]);

  useEffect(() => {
    if (!draggedEntryId || !dragOverlay) {
      return;
    }

    const overlayOffsetY = dragOverlay.offsetY;
    const overlayHeight = dragOverlay.height;

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
      updatePreviewOrder(event.clientY - overlayOffsetY + overlayHeight / 2);
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
        setPreviewEntryIds(null);
        return;
      }

      const currentOrder = entriesRef.current.map((entry) => entry.id);
      const nextOrder = displayEntriesRef.current.map((entry) => entry.id);

      if (areOrdersEqual(currentOrder, nextOrder)) {
        setPreviewEntryIds(null);
        return;
      }

      void (async () => {
        try {
          await onReorderRef.current(nextOrder);
        } finally {
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

    activePointerIdRef.current = event.pointerId;
    cancelItemAnimations(itemRefs.current);
    skipNextLayoutAnimationRef.current = true;
    previousPositionsRef.current = readItemPositions(itemRefs.current);
    draggedEntryIdRef.current = entryId;
    dragOverlayTopRef.current = rowBounds.top;
    setDraggedEntryId(entryId);
    setDragOverlay({
      height: rowBounds.height,
      left: rowBounds.left,
      offsetY: event.clientY - rowBounds.top,
      top: rowBounds.top,
      width: rowBounds.width,
    });
  }

  function updatePreviewOrder(draggedMidY: number) {
    const sourceId = draggedEntryIdRef.current;
    if (!sourceId) {
      return;
    }

    const currentOrder = displayEntriesRef.current.map((entry) => entry.id);
    const sourceIndex = currentOrder.indexOf(sourceId);
    if (sourceIndex === -1) {
      return;
    }

    let nextOrder: string[] | null = null;
    const previousEntryId = sourceIndex > 0 ? currentOrder[sourceIndex - 1] : null;
    const nextEntryId =
      sourceIndex < currentOrder.length - 1 ? currentOrder[sourceIndex + 1] : null;

    if (nextEntryId) {
      const nextNode = itemRefs.current.get(nextEntryId);
      const nextBounds = nextNode?.getBoundingClientRect();

      if (nextBounds && draggedMidY >= nextBounds.top + nextBounds.height / 2) {
        nextOrder = moveEntryId(currentOrder, sourceIndex, sourceIndex + 1);
      }
    }

    if (!nextOrder && previousEntryId) {
      const previousNode = itemRefs.current.get(previousEntryId);
      const previousBounds = previousNode?.getBoundingClientRect();

      if (previousBounds && draggedMidY <= previousBounds.top + previousBounds.height / 2) {
        nextOrder = moveEntryId(currentOrder, sourceIndex, sourceIndex - 1);
      }
    }

    if (!nextOrder || areOrdersEqual(currentOrder, nextOrder)) {
      return;
    }

    previousPositionsRef.current = readItemPositions(itemRefs.current);
    setPreviewEntryIds(nextOrder);
  }

  return (
    <>
      <div
        className={cn(
          "divide-y divide-white/[0.05]",
          draggedEntryId && "cursor-grabbing select-none",
        )}
      >
        {displayEntries.map((entry) => {
          const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
          const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

          if (draggedEntryId === entry.id && dragOverlay) {
            return (
              <article key={entry.id} aria-hidden="true" className="relative py-4">
                <PasswordEntryCard
                  className="pointer-events-none opacity-0"
                  entry={entry}
                  dragHandleLabel={t("folders.reorderEntry")}
                  noUsernameLabel={t("passwords.noUsername")}
                  onCopyPassword={() =>
                    void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                  }
                  onCopyUsername={() =>
                    void handleCopy(`username:${entry.id}`, onCopyUsername, entry)
                  }
                  onOpenDetails={() => onOpenEntry(entry)}
                  passwordCopied={passwordCopied}
                  reorderingEnabled={reorderingEnabled}
                  usernameCopied={usernameCopied}
                />
              </article>
            );
          }

          return (
            <article key={entry.id} className="relative py-4">
              <PasswordEntryCard
                entry={entry}
                dragHandleLabel={t("folders.reorderEntry")}
                itemRef={(node) => {
                  if (node) {
                    itemRefs.current.set(entry.id, node);
                    return;
                  }

                  itemRefs.current.delete(entry.id);
                }}
                noUsernameLabel={t("passwords.noUsername")}
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
                onOpenDetails={() => onOpenEntry(entry)}
                passwordCopied={passwordCopied}
                reorderingEnabled={reorderingEnabled}
                usernameCopied={usernameCopied}
              />
            </article>
          );
        })}
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
              dragHandleLabel={t("folders.reorderEntry")}
              noUsernameLabel={t("passwords.noUsername")}
              onCopyPassword={() =>
                void handleCopy(`password:${draggedEntry.id}`, onCopyPassword, draggedEntry)
              }
              onCopyUsername={() =>
                void handleCopy(`username:${draggedEntry.id}`, onCopyUsername, draggedEntry)
              }
              onOpenDetails={() => onOpenEntry(draggedEntry)}
              passwordCopied={copyFeedback.isCopied(`password:${draggedEntry.id}`)}
              reorderingEnabled={reorderingEnabled}
              usernameCopied={copyFeedback.isCopied(`username:${draggedEntry.id}`)}
            />
          </article>
        </div>
      ) : null}
    </>
  );
}

interface FolderEditDialogProps {
  folder: VaultFolder | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onDelete: (folder: VaultFolder) => Promise<boolean> | boolean;
  onSave: (input: { id: string; name: string; logoId?: string }) => Promise<boolean> | boolean;
}

interface FolderFormDialogProps {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (input: FolderMutationInput) => Promise<boolean> | boolean;
}

function FolderFormDialog({
  open,
  busy,
  onClose,
  onSave,
}: FolderFormDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [logoId, setLogoId] = useState("");
  const selectedLogo = getLogoOption(logoId);

  useEffect(() => {
    if (!open) {
      setName("");
      setLogoId("");
    }
  }, [open]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    await onSave({
      name: trimmedName,
      logoId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="px-5 py-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            {t("folders.create")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-6 text-muted-foreground">
            {t("folders.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto border-t border-white/[0.05] px-5 py-5">
          <FolderFormFields
            name={name}
            logoId={logoId}
            selectedLogoLabel={selectedLogo?.label ?? t("fields.logoFallback")}
            onLogoChange={setLogoId}
            onNameChange={setName}
          />
        </div>

        <DialogFooter className="border-t border-white/[0.05] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={busy || !name.trim()}>
            {t("folders.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderEditDialog({
  folder,
  open,
  busy,
  onClose,
  onDelete,
  onSave,
}: FolderEditDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [logoId, setLogoId] = useState("");
  const selectedLogo = getLogoOption(logoId);

  useEffect(() => {
    if (!folder) {
      setName("");
      setLogoId("");
      return;
    }

    setName(folder.name);
    setLogoId(folder.logoId ?? "");
  }, [folder]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!folder || !trimmedName) {
      return;
    }

    await onSave({
      id: folder.id,
      name: trimmedName,
      logoId,
    });
  }

  async function handleDelete() {
    if (!folder) {
      return;
    }

    await onDelete(folder);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="px-5 py-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            {t("folders.editTitle")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-6 text-muted-foreground">
            {t("folders.editDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[58vh] overflow-y-auto border-t border-white/[0.05] px-5 py-5">
          <FolderFormFields
            name={name}
            logoId={logoId}
            selectedLogoLabel={selectedLogo?.label ?? t("fields.logoFallback")}
            onLogoChange={setLogoId}
            onNameChange={setName}
          />
        </div>

        <DialogFooter className="border-t border-white/[0.05] px-5 py-4 sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={busy || !folder}
            className="sm:mr-auto"
          >
            <Trash2 className="h-4 w-4" />
            {t("folders.deleteFolder")}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={busy || !name.trim()}>
              {t("folders.saveEdit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FolderFormFieldsProps {
  name: string;
  logoId: string;
  selectedLogoLabel: string;
  onNameChange: (name: string) => void;
  onLogoChange: (logoId: string) => void;
}

function FolderFormFields({
  name,
  logoId,
  selectedLogoLabel,
  onNameChange,
  onLogoChange,
}: FolderFormFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="folderName"
          className="mono-label text-[10px] text-muted-foreground"
        >
          {t("folders.name")}
        </Label>
        <Input
          id="folderName"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t("folders.namePlaceholder")}
        />
      </div>

      <div className="space-y-3">
        <Label className="mono-label text-[10px] text-muted-foreground">
          {t("folders.logo")}
        </Label>
        <div className="flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3 py-3">
          <ServiceLogoBadge
            service={name}
            logoId={logoId}
            className="h-10 w-10 shrink-0 rounded-[12px]"
            imageClassName="h-5 w-5"
            fallbackClassName="text-[16px]"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-foreground">
              {selectedLogoLabel}
            </span>
          </span>
        </div>

        <div className="grid max-h-[210px] grid-cols-5 gap-2 overflow-y-auto rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3">
          <LogoPickerButton
            active={!logoId}
            label={t("fields.logoFallback")}
            onClick={() => onLogoChange("")}
          >
            <ServiceLogoBadge
              service={name}
              className="rounded-[12px] bg-transparent"
              imageClassName="h-6 w-6"
              fallbackClassName="text-[18px]"
            />
          </LogoPickerButton>

          {LOGO_OPTIONS.map((logo) => (
            <LogoPickerButton
              key={logo.id}
              active={logoId === logo.id}
              label={logo.label}
              onClick={() => onLogoChange(logo.id)}
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
      </div>
    </div>
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
        "relative flex aspect-square items-center justify-center rounded-[12px] border border-white/[0.06] bg-white/[0.02] transition-colors",
        active
          ? "border-primary/45 bg-primary/10"
          : "hover:border-white/[0.14] hover:bg-white/[0.04]",
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
      {active ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
    </button>
  );
}

function moveEntryId(entryIds: string[], sourceIndex: number, targetIndex: number) {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= entryIds.length ||
    targetIndex >= entryIds.length
  ) {
    return null;
  }

  if (sourceIndex === targetIndex) {
    return entryIds;
  }

  const nextIds = entryIds.slice();
  const [movedEntryId] = nextIds.splice(sourceIndex, 1);

  if (!movedEntryId) {
    return null;
  }

  nextIds.splice(targetIndex, 0, movedEntryId);
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

function sortFolders(folders: VaultFolder[], orderedIds: string[] | null) {
  if (!orderedIds) {
    return folders;
  }

  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const orderedFolders = orderedIds
    .map((folderId) => foldersById.get(folderId))
    .filter((folder): folder is VaultFolder => Boolean(folder));

  if (orderedFolders.length !== folders.length) {
    return folders;
  }

  return orderedFolders;
}

function readItemPositions(itemRefs: Map<string, HTMLDivElement>) {
  const positions = new Map<string, number>();

  for (const [entryId, node] of itemRefs) {
    positions.set(entryId, node.getBoundingClientRect().top);
  }

  return positions;
}

function cancelItemAnimations(itemRefs: Map<string, HTMLDivElement>) {
  for (const node of itemRefs.values()) {
    node.getAnimations().forEach((animation) => animation.cancel());
  }
}

function areOrdersEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((entryId, index) => entryId === right[index]);
}
