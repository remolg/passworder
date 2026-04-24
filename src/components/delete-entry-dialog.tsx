import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { VaultEntry } from "@/types/vault";

interface DeleteEntryDialogProps {
  entry: VaultEntry | null;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (entry: VaultEntry) => Promise<void> | void;
}

export function DeleteEntryDialog({
  entry,
  open,
  busy,
  onClose,
  onConfirm,
}: DeleteEntryDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="px-5 py-5 pr-12">
          <DialogTitle className="text-[15px] font-semibold text-foreground">
            {t("dialog.deleteEntryTitle")}
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-6 text-muted-foreground">
            {entry ? t("dialog.deleteEntryConfirm", { service: entry.service }) : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="border-t border-white/[0.05] px-5 py-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => (entry ? onConfirm(entry) : null)}
            disabled={!entry || busy}
          >
            <Trash2 className="h-4 w-4" />
            {t("passwords.deleteEntry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
