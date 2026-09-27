"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { ANNOUNCEMENTS, Announcement } from "@/lib/dummy-data";
import { Megaphone, Plus, Radio, Pin, Eye, Trash2 } from "lucide-react";

export default function DashboardPengumumanPage() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>(ANNOUNCEMENTS);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<"umum" | "jadwal" | "pemenang" | "penting">("umum");
  const [body, setBody] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);
  const [showOnMonitor, setShowOnMonitor] = React.useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      category,
      body,
      publishedAt: "Baru saja",
      isPinned,
      author: "Seksi Acara",
      showOnMonitor,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    setDialogOpen(false);
    setTitle("");
    setBody("");
  };

  const handleDelete = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
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
            <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Buat Pengumuman Baru</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul Pengumuman</TableHead>
                <TableHead className="w-28 text-center">Kategori</TableHead>
                <TableHead>Waktu Rilis</TableHead>
                <TableHead className="text-center">Pin Beranda</TableHead>
                <TableHead className="text-center">Layar Monitor</TableHead>
                <TableHead className="text-right w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements.map((ann) => (
                <TableRow key={ann.id}>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {ann.title}
                    </strong>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{ann.body}</span>
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
                      <Link href={`/pengumuman/${ann.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Lihat Publik">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-muted cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Buat Pengumuman */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tulis Pengumuman Resmi Baru</DialogTitle>
              <DialogDescription>
                Isi judul, kategori, dan rincian warta yang akan disiarkan kepada peserta dan pengunjung.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Judul Pengumuman *"
              placeholder="Contoh: Petunjuk Teknis Urutan Tampil Sesi Pagi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kategori Pengumuman *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
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
              rows={4}
              required
            />

            <div className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>Pin di bagian paling atas halaman Beranda & Pengumuman</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
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
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Publikasikan Pengumuman</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
