import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Folder, KeyRound, Plus, Trash2 } from "lucide-react";

import { ServiceLogoBadge } from "@/components/service-logo-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { VaultEntry, VaultFolder } from "@/types/vault";

interface FoldersPageProps {
  folders: VaultFolder[];
  entries: VaultEntry[];
  busy: boolean;
  onCreateFolder: (name: string) => Promise<boolean> | boolean;
  onDeleteFolder: (id: string) => Promise<boolean> | boolean;
  onOpenEntry: (entry: VaultEntry) => void;
  onCreateEntryInFolder: (folderId: string) => void;
}

export function FoldersPage({
  folders,
  entries,
  busy,
  onCreateFolder,
  onDeleteFolder,
  onOpenEntry,
  onCreateEntryInFolder,
}: FoldersPageProps) {
  const { t } = useI18n();
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    folders[0]?.id ?? null,
  );

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
    folders.find((folder) => folder.id === selectedFolderId) ?? folders[0] ?? null;
  const folderEntries = selectedFolder
    ? entries.filter((entry) => entry.folderId === selectedFolder.id)
    : [];

  useEffect(() => {
    if (folders.length === 0) {
      setSelectedFolderId(null);
      return;
    }

    if (!selectedFolderId || !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }

    const success = await onCreateFolder(name);
    if (success) {
      setNewFolderName("");
    }
  }

  async function handleDeleteFolder(folder: VaultFolder) {
    if (!window.confirm(t("folders.deleteConfirm", { name: folder.name }))) {
      return;
    }

    await onDeleteFolder(folder.id);
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[14px] font-semibold text-foreground">
            {t("folders.title")}
          </h2>
          <span className="mono-label text-[9px] text-muted-foreground">
            {t("folders.badge")}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <Input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreateFolder();
              }
            }}
            placeholder={t("folders.namePlaceholder")}
            aria-label={t("folders.name")}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleCreateFolder()}
            disabled={busy || !newFolderName.trim()}
            aria-label={t("folders.create")}
            title={t("folders.create")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mx-5 mt-4 h-px bg-white/[0.05]" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {folders.length === 0 ? (
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
          </div>
        ) : (
          <div className="py-4">
            <div className="space-y-2">
              {folders.map((folder) => {
                const active = selectedFolder?.id === folder.id;
                const entryCount = entryCountByFolderId.get(folder.id) ?? 0;

                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-primary/45 bg-primary/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-label={t("folders.openFolder")}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.04] text-primary">
                        <Folder className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {folder.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {t("common.itemsCount", { count: entryCount })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFolder(folder)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive"
                      aria-label={t("folders.deleteFolder")}
                      title={t("folders.deleteFolder")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedFolder ? (
              <div className="mt-5 border-t border-white/[0.05] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="mono-label text-[9px] text-muted-foreground">
                      {t("folders.entriesTitle")}
                    </p>
                    <h3 className="mt-1 truncate text-[13px] font-semibold text-foreground">
                      {selectedFolder.name}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onCreateEntryInFolder(selectedFolder.id)}
                  >
                    <Plus className="h-4 w-4" />
                    {t("folders.addEntry")}
                  </Button>
                </div>

                {folderEntries.length === 0 ? (
                  <div className="mt-5 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center">
                    <KeyRound className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-3 text-[13px] font-medium text-foreground">
                      {t("folders.emptyFolderTitle")}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                      {t("folders.emptyFolderDescription")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-white/[0.05]">
                    {folderEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onOpenEntry(entry)}
                        className="flex w-full items-center gap-3 py-3 text-left"
                      >
                        <ServiceLogoBadge
                          service={entry.service}
                          logoId={entry.logoId}
                          className="h-11 w-11 shrink-0 rounded-[12px]"
                          imageClassName="h-5 w-5"
                          fallbackClassName="text-[16px]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">
                            {entry.service}
                          </span>
                          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                            {entry.username || t("passwords.noUsername")}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
