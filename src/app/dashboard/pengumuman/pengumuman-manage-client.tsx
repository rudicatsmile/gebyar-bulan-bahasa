"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Megaphone,
  Plus,
  Radio,
  Pin,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { upsertAnnouncement, deleteAnnouncement } from "@/app/actions/announcements";
import type { Announcement } from "@/lib/dummy-data";

interface PengumumanManageClientProps {
  initialAnnouncements: Announcement[];
}

export function PengumumanManageClient({
  initialAnnouncements,
}: PengumumanManageClientProps) {
  const router = useRouter();
  const [announcements, setAnnouncements] =
    React.useState<Announcement[]>(initialAnnouncements);

  // Dialog & Mode states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form states
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<
    "umum" | "jadwal" | "pemenang" | "penting"
  >("umum");
  const [body, setBody] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);
  const [showOnMonitor, setShowOnMonitor] = React.useState(true);

  // Feedback states
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Sync when server data changes
  React.useEffect(() => {
    setAnnouncements(initialAnnouncements);
  }, [initialAnnouncements]);

  // Auto-dismiss success message after 4s
  React.useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setCategory("umum");
    setBody("");
    setIsPinned(false);
    setShowOnMonitor(true);
    setErrorMessage(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setCategory(ann.category);
    setBody(ann.body);
    setIsPinned(Boolean(ann.isPinned));
    setShowOnMonitor(Boolean(ann.showOnMonitor));
    setErrorMessage(null);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await upsertAnnouncement({
        id: editingId || undefined,
        title,
        category,
        body,
        isPinned,
        showOnMonitor,
        isPublished: true,
      });

      if (!res.success) {
        setErrorMessage(
          res.error ||
            (dialogMode === "edit"
              ? "Gagal memperbarui pengumuman."
              : "Gagal mempublikasikan pengumuman.")
        );
        return;
      }

      // Optimistic update
      if (dialogMode === "edit" && editingId) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  title,
                  category,
                  body,
                  isPinned,
                  showOnMonitor,
                }
              : a
          )
        );
        setSuccessMessage(`Pengumuman "${title}" berhasil diperbarui.`);
      } else {
        setSuccessMessage(`Pengumuman baru "${title}" berhasil diterbitkan.`);
      }

      setDialogOpen(false);
      router.refresh();
    });
  };

  const handleDelete = async (id: string, titleStr: string) => {
    if (!confirm(`Hapus pengumuman "${titleStr}"?`)) return;

    // Optimistic delete
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    startTransition(async () => {
      const res = await deleteAnnouncement(id);
      if (!res.success) {
        alert(res.error || "Gagal menghapus pengumuman.");
        router.refresh();
      } else {
        setSuccessMessage(`Pengumuman "${titleStr}" berhasil dihapus.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-accent" />
            <span>Kelola Pengumuman & Siaran Informasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Publikasikan warta resmi acara ke halaman publik serta integrasi tayangan otomatis ke monitor lapangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/broadcast">
            <Button size="sm" variant="destructive" className="text-xs gap-1.5">
              <Radio className="h-3.5 w-3.5" />
              <span>Panel Siaran Darurat</span>
            </Button>
          </Link>
          <Button
            onClick={openCreate}
            size="sm"
            className="text-xs gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Pengumuman Baru</span>
          </Button>
        </div>
      </div>

      {/* Alert Feedback Sukses */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs sm:text-sm flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs underline hover:no-underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabel Pengumuman */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul Pengumuman</TableHead>
              <TableHead className="w-28 text-center">Kategori</TableHead>
              <TableHead>Waktu Rilis</TableHead>
              <TableHead className="text-center">Pin Beranda</TableHead>
              <TableHead className="text-center">Layar Monitor</TableHead>
              <TableHead className="text-right w-28">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground text-sm"
                >
                  Belum ada pengumuman resmi yang diterbitkan.
                </TableCell>
              </TableRow>
            ) : (
              announcements.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {ann.title}
                    </strong>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {ann.body}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={ann.category === "penting" ? "danger" : "default"}
                      className="text-[10px]"
                    >
                      {ann.category.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {ann.publishedAt}
                  </TableCell>
                  <TableCell className="text-center">
                    {ann.isPinned ? (
                      <span className="text-accent font-bold text-xs flex items-center justify-center gap-1">
                        <Pin className="h-3.5 w-3.5" /> Ya
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {ann.showOnMonitor ? (
                      <Badge variant="success" className="text-[10px]">
                        TAYANG
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Lihat Halaman Publik */}
                      <Link href={`/pengumuman/${ann.slug}`} target="_blank">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Lihat Tampilan Publik"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>

                      {/* Edit Pengumuman */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(ann)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-accent cursor-pointer transition-colors"
                        title="Edit Pengumuman"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Hapus Pengumuman */}
                      <button
                        onClick={() => handleDelete(ann.id, ann.title)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-muted cursor-pointer transition-colors disabled:opacity-50"
                        title="Hapus Pengumuman"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah & Edit Pengumuman */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Edit Pengumuman Resmi"
                : "Tulis Pengumuman Resmi Baru"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Perbarui judul, kategori, isi warta, atau pengaturan tampilan pengumuman ini."
                : "Isi judul, kategori, dan rincian warta yang akan disiarkan kepada peserta dan pengunjung."}
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Input
            label="Judul Pengumuman *"
            placeholder="Contoh: Petunjuk Teknis Urutan Tampil Sesi Pagi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kategori Pengumuman *
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as "umum" | "jadwal" | "pemenang" | "penting"
                )
              }
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
            >
              <option value="umum">Umum</option>
              <option value="jadwal">Jadwal Acara</option>
              <option value="pemenang">Pemenang</option>
              <option value="penting">Penting / Mendesak</option>
            </select>
          </div>

          <Textarea
            label="Isi Warta Lengkap *"
            placeholder="Tuliskan isi pengumuman secara mendetail..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            required
            minLength={10}
          />

          <div className="flex flex-col gap-2.5 pt-2 border-t border-border text-xs text-foreground">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span>Pin di bagian paling atas halaman Beranda & Pengumuman</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnMonitor}
                onChange={(e) => setShowOnMonitor(e.target.checked)}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span>Tayangkan otomatis pada modul Layar Monitor Lapangan venue</span>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {dialogMode === "edit"
                  ? "Simpan Perubahan"
                  : "Publikasikan Pengumuman"}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
