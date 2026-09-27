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
import { PlaySquare, Plus, ArrowLeft, Trash2 } from "lucide-react";

interface MediaContent {
  id: string;
  title: string;
  contentType: "berita" | "poster" | "reels" | "foto";
  excerpt: string;
  publishedAt: string;
}

const INITIAL_MEDIA: MediaContent[] = [
  { id: "med-1", title: "Poster Resmi Gebyar Bulan Bahasa 2025", contentType: "poster", excerpt: "Desain visual tema Sumpah Pemuda resolusi Full HD untuk media sosial.", publishedAt: "20 Okt 2025" },
  { id: "med-2", title: "Rilis Berita Pembukaan Hari Pertama & Palang Pintu", contentType: "berita", excerpt: "Kemeriahan adu pantun Betawi dan pembukaan resmi oleh panitia pelaksana.", publishedAt: "26 Okt 2025" },
  { id: "med-3", title: "Video Teaser 8 Lomba Nusantara (Reels)", contentType: "reels", excerpt: "Kompilasi kilasan persiapan lomba puisi, film pendek, monolog, dan tari.", publishedAt: "24 Okt 2025" },
];

export default function MediaKontenPage() {
  const [contents, setContents] = React.useState<MediaContent[]>(INITIAL_MEDIA);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [contentType, setContentType] = React.useState<MediaContent["contentType"]>("berita");
  const [excerpt, setExcerpt] = React.useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newMedia: MediaContent = {
      id: `med-${Date.now()}`,
      title,
      contentType,
      excerpt,
      publishedAt: "Baru saja",
    };
    setContents((prev) => [newMedia, ...prev]);
    setDialogOpen(false);
    setTitle("");
    setExcerpt("");
  };

  const handleDelete = (id: string) => {
    setContents((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <DashboardLayout role="media_center">
      <div className="space-y-6">
        <div>
          <Link
            href="/media"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Ringkasan Media</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <PlaySquare className="h-7 w-7 text-accent" />
                <span>Kelola Konten & Publikasi Media Acara</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Unggah dan kelola aset poster resmi, video teaser, dan artikel rilis pers seputar rangkaian festival.
              </p>
            </div>

            <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Unggah Konten Baru</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul Konten Media</TableHead>
                <TableHead className="text-center">Tipe Media</TableHead>
                <TableHead>Ringkasan Isi</TableHead>
                <TableHead className="text-right">Tanggal Rilis</TableHead>
                <TableHead className="text-right w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contents.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                    {c.title}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gold" className="text-[10px]">
                      {c.contentType.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.excerpt}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {c.publishedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-muted cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tambah Konten */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Unggah Konten Media Acara</DialogTitle>
              <DialogDescription>
                Masukkan judul dan deskripsi aset materi promosi atau berita kegiatan.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Judul Konten Media *"
              placeholder="Contoh: Rilis Dokumentasi Pementasan Puisi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipe Media *
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="berita">Artikel / Berita</option>
                <option value="poster">Poster Visual</option>
                <option value="reels">Video Pendek / Reels</option>
                <option value="foto">Foto Dokumentasi</option>
              </select>
            </div>

            <Textarea
              label="Ringkasan Deskripsi Konten *"
              placeholder="Tuliskan keterangan singkat konten..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              required
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Terbitkan Konten</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
