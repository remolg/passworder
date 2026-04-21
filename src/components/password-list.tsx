import { useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  PencilLine,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VaultEntry } from "@/types/vault";

interface PasswordListProps {
  entries: VaultEntry[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (entry: VaultEntry) => void;
  onCopyUsername: (entry: VaultEntry) => void;
  onCopyPassword: (entry: VaultEntry) => void;
}

export function PasswordList({
  entries,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  onCopyUsername,
  onCopyPassword,
}: PasswordListProps) {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);

  function toggleReveal(id: string) {
    setRevealedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Şifrelerim</CardTitle>
            <CardDescription>
              Servis, kullanıcı adı veya etiket üzerinden hızlı arama yapın.
            </CardDescription>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Ara: servis, kullanıcı adı, etiket"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
          Görünen şifreler sadece bu oturum boyunca bellek içinde tutulur.
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-background/50 p-8 text-center">
            <p className="text-sm font-medium">Henüz kayıt bulunmuyor.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Soldaki formdan ilk servis kaydınızı ekleyin.
            </p>
          </div>
        ) : null}

        {entries.map((entry, index) => {
          const revealed = revealedIds.includes(entry.id);

          return (
            <div key={entry.id}>
              <div className="grid gap-4 rounded-2xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-background/90">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{entry.service}</h3>
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                      <span>{entry.username || "Kullanıcı adı yok"}</span>
                    </div>

                    {entry.url ? (
                      <p className="break-all text-sm text-muted-foreground">{entry.url}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:flex">
                    <Button type="button" variant="outline" onClick={() => toggleReveal(entry.id)}>
                      {revealed ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Gizle
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Göster
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onCopyUsername(entry)}
                    >
                      <Copy className="h-4 w-4" />
                      Kullanıcı Adı
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onCopyPassword(entry)}
                    >
                      <Copy className="h-4 w-4" />
                      Şifre
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => onEdit(entry)}>
                      <PencilLine className="h-4 w-4" />
                      Düzenle
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => onDelete(entry)}>
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Şifre
                  </p>
                  <p className="mt-2 break-all font-mono text-sm tracking-wide">
                    {revealed ? entry.password : maskValue(entry.password)}
                  </p>
                </div>

                {entry.notes ? (
                  <div className="rounded-xl border border-border/70 bg-background/55 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Not
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {entry.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              {index < entries.length - 1 ? <Separator className="my-4" /> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function maskValue(value: string) {
  if (!value) {
    return "••••••••";
  }

  return "•".repeat(Math.max(value.length, 8));
}
