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
import { CHALLENGES, Challenge } from "@/lib/dummy-data";
import { Sparkles, Plus, Store, CheckCircle, Coins, Gift, Trophy, Puzzle, QrCode } from "lucide-react";

export default function DashboardChallengePage() {
  const [challenges, setChallenges] = React.useState<Challenge[]>(CHALLENGES);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"scan_qr" | "kode_unik" | "unggah_bukti" | "input_panitia">("scan_qr");
  const [pointReward, setPointReward] = React.useState("25");
  const [badge, setBadge] = React.useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCh: Challenge = {
      id: `ch-${Date.now()}`,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      title,
      description,
      type,
      pointReward: parseInt(pointReward),
      badge: badge || "Peserta Aktif",
      participantsCount: 0,
      status: "aktif",
    };
    setChallenges((prev) => [newCh, ...prev]);
    setDialogOpen(false);
    setTitle("");
    setDescription("");
    setBadge("");
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-accent" />
              <span>Manajemen Challenge Peserta Non-Lomba</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Konfigurasi tantangan interaktif, perolehan reward poin, dan lencana kehormatan peserta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/challenge/puzzle">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <Puzzle className="h-3.5 w-3.5 text-primary" />
                <span>Puzzle Baju Daerah</span>
              </Button>
            </Link>
            <Link href="/dashboard/challenge/qr-huruf">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                <QrCode className="h-3.5 w-3.5 text-primary" />
                <span>Challenge QR Huruf</span>
              </Button>
            </Link>
            <Link href="/dashboard/challenge/stand">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Store className="h-3.5 w-3.5" />
                <span>8 Stand Lomba</span>
              </Button>
            </Link>
            <Link href="/dashboard/challenge/verifikasi">
              <Button size="sm" variant="accent" className="text-xs gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Verifikasi Bukti (3)</span>
              </Button>
            </Link>
            <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Tambah Challenge</span>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Challenge</TableHead>
                <TableHead>Tipe Misi</TableHead>
                <TableHead className="text-center">Hadiah Poin</TableHead>
                <TableHead className="text-center">Lencana Kehormatan</TableHead>
                <TableHead className="text-center">Jumlah Klaim</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {ch.title}
                    </strong>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{ch.description}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[10px]">
                      {ch.type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-accent text-xs">
                    +{ch.pointReward} Pts
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gold" className="text-[10px]">
                      {ch.badge}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {ch.participantsCount} Peserta
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="success" className="text-[10px]">
                      AKTIF
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Buat Challenge */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Buat Challenge Partisipasi Baru</DialogTitle>
              <DialogDescription>
                Rancang misi interaktif untuk meningkatkan keterlibatan peserta non-lomba.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Judul Challenge *"
              placeholder="Contoh: Kuis Wawasan Sastra Nusantara"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipe Mekanisme Challenge *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="scan_qr">Scan QR Code Stand</option>
                <option value="kode_unik">Input Kode Unik Manual</option>
                <option value="unggah_bukti">Unggah Bukti (Foto/Video)</option>
                <option value="input_panitia">Input Khusus Panitia</option>
              </select>
            </div>

            <Textarea
              label="Deskripsi & Petunjuk Misi *"
              placeholder="Tuliskan petunjuk langkah yang harus dilakukan peserta..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Reward Poin *"
                type="number"
                value={pointReward}
                onChange={(e) => setPointReward(e.target.value)}
                required
              />
              <Input
                label="Nama Badge / Lencana *"
                placeholder="Contoh: Duta Bahasa"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">Terbitkan Challenge</Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
