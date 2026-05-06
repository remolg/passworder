import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Folder, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

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
import { VaultEntry, VaultFolder } from "@/types/vault";

interface FoldersPageProps {
  folders: VaultFolder[];
  entries: VaultEntry[];
  busy: boolean;
  onCreateFolder: (name: string) => Promise<boolean> | boolean;
  onUpdateFolder: (input: {
    id: string;
    name: string;
    logoId?: string;
  }) => Promise<boolean> | boolean;
  onDeleteFolder: (id: string) => Promise<boolean> | boolean;
  onOpenEntry: (entry: VaultEntry) => void;
  onCreateEntryInFolder: (folderId: string) => void;
  onCopyUsername: (entry: VaultEntry) => Promise<boolean>;
  onCopyPassword: (entry: VaultEntry) => Promise<boolean>;
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
  onCopyUsername,
  onCopyPassword,
}: FoldersPageProps) {
  const { t } = useI18n();
  const copyFeedback = useCopyFeedback();
  const [newFolderName, setNewFolderName] = useState("");
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

  useEffect(() => {
    if (folders.length === 0) {
      setSelectedFolderId(null);
      return;
    }

    if (selectedFolderId && !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null);
    }
  }, [folders, selectedFolderId]);

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
        {selectedFolder ? (
          <div className="py-4">
            <div className="flex items-center justify-between gap-3">
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
                <p className="mono-label text-[9px] text-muted-foreground">
                  {t("folders.entriesTitle")}
                </p>
                <h3 className="mt-1 truncate text-[15px] font-semibold text-foreground">
                  {selectedFolder.name}
                </h3>
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
              <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center">
                <KeyRound className="h-5 w-5 text-primary" />
                <p className="mt-3 text-[13px] font-medium text-foreground">
                  {t("folders.emptyFolderTitle")}
                </p>
                <p className="mt-2 max-w-[230px] text-[11px] leading-5 text-muted-foreground">
                  {t("folders.emptyFolderDescription")}
                </p>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-white/[0.05]">
                {folderEntries.map((entry) => {
                  const usernameCopied = copyFeedback.isCopied(`username:${entry.id}`);
                  const passwordCopied = copyFeedback.isCopied(`password:${entry.id}`);

                  return (
                    <article key={entry.id} className="relative py-4">
                      <PasswordEntryCard
                        entry={entry}
                        folderName={selectedFolder.name}
                        dragHandleLabel={t("folders.openFolder")}
                        noUsernameLabel={t("passwords.noUsername")}
                        onCopyPassword={() =>
                          void handleCopy(`password:${entry.id}`, onCopyPassword, entry)
                        }
                        onCopyUsername={() =>
                          void handleCopy(`username:${entry.id}`, onCopyUsername, entry)
                        }
                        onOpenDetails={() => onOpenEntry(entry)}
                        passwordCopied={passwordCopied}
                        reorderingEnabled={false}
                        usernameCopied={usernameCopied}
                      />
                    </article>
                  );
                })}
              </div>
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
          </div>
        ) : (
          <div className="py-4">
            <div className="space-y-2">
              {folders.map((folder) => {
                const entryCount = entryCountByFolderId.get(folder.id) ?? 0;

                return (
                  <div
                    key={folder.id}
                    className="flex w-full items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.03]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      aria-label={t("folders.openFolder")}
                    >
                      <ServiceLogoBadge
                        service={folder.name}
                        logoId={folder.logoId}
                        className="h-10 w-10 shrink-0 rounded-[12px]"
                        imageClassName="h-5 w-5"
                        fallbackClassName="text-[16px]"
                      />
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
                      onClick={() => setEditingFolder(folder)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
                      aria-label={t("folders.editFolder")}
                      title={t("folders.editFolder")}
                    >
                      <Pencil className="h-4 w-4" />
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
          </div>
        )}
      </div>

      <FolderEditDialog
        folder={editingFolder}
        open={Boolean(editingFolder)}
        busy={busy}
        onClose={() => setEditingFolder(null)}
        onSave={handleUpdateFolder}
      />
    </section>
  );
}

interface FolderEditDialogProps {
  folder: VaultFolder | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (input: { id: string; name: string; logoId?: string }) => Promise<boolean> | boolean;
}

function FolderEditDialog({
  folder,
  open,
  busy,
  onClose,
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
                onChange={(event) => setName(event.target.value)}
                placeholder={t("folders.namePlaceholder")}
              />
            </div>

            <div className="space-y-3">
              <Label className="mono-label text-[10px] text-muted-foreground">
                {t("folders.logo")}
              </Label>
              <div className="flex items-center gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-3 py-3">
                <ServiceLogoBadge
                  service={(name || folder?.name) ?? ""}
                  logoId={logoId}
                  className="h-10 w-10 shrink-0 rounded-[12px]"
                  imageClassName="h-5 w-5"
                  fallbackClassName="text-[16px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-foreground">
                    {selectedLogo?.label ?? t("fields.logoFallback")}
                  </span>
                </span>
              </div>

              <div className="grid max-h-[210px] grid-cols-5 gap-2 overflow-y-auto rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3">
                <LogoPickerButton
                  active={!logoId}
                  label={t("fields.logoFallback")}
                  onClick={() => setLogoId("")}
                >
                  <ServiceLogoBadge
                    service={(name || folder?.name) ?? ""}
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
                    onClick={() => setLogoId(logo.id)}
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
        </div>

        <DialogFooter className="border-t border-white/[0.05] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={busy || !name.trim()}>
            {t("folders.saveEdit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
