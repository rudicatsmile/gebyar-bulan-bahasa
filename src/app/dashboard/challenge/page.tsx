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
import {
  Sparkles,
  Plus,
  Store,
  CheckCircle,
  Coins,
  Gift,
  Puzzle,
  QrCode,
  ArrowRight,
  Gamepad2,
  MapPin,
} from "lucide-react";

interface SpecialChallengeItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  pointReward: number;
  badge: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  borderHover: string;
  btnLabel: string;
  tag: string;
}

const SPECIAL_CHALLENGES: SpecialChallengeItem[] = [
  {
    id: "sp-puzzle",
    title: "Puzzle Baju Daerah",
    subtitle: "Mencocokkan Busana Adat Nusantara",
    description:
      "Tantangan edukatif mencocokkan baju adat nusantara dengan daerah asalnya. Kelola bank soal, gambar pakaian adat, petunjuk/hint, dan pantau leaderboard skor peserta.",
    type: "Game Interaktif",
    pointReward: 100,
    badge: "Pelestari Budaya",
    href: "/dashboard/challenge/puzzle",
    icon: Puzzle,
    borderHover: "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary",
    btnLabel: "Kelola Soal & Leaderboard",
    tag: "GAME INTERAKTIF",
  },
  {
    id: "sp-qr-huruf",
    title: "Challenge QR Huruf",
    subtitle: "Jelajah Aksara & Susun Kata",
    description:
      "Tantangan berburu stiker QR code huruf yang ditempel di berbagai lokasi acara untuk disusun menjadi kalimat bermakna. Kelola kata target, cetak kartu QR, dan pantau submisi kata.",
    type: "Perburuan QR & Kata",
    pointReward: 100,
    badge: "Penjelajah Aksara",
    href: "/dashboard/challenge/qr-huruf",
    icon: QrCode,
    borderHover: "border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card hover:border-accent",
    btnLabel: "Kelola QR & Submisi",
    tag: "PERBURUAN AKSARA",
  },
  {
    id: "sp-stand",
    title: "Keliling 8 Stand Pameran",
    subtitle: "Scan QR Token Lokasi Stand",
    description:
      "Kunjungan ke seluruh stand pameran cabang lomba nusantara. Kelola kode unik 6 karakter (PUISI01 s/d MEDIA08) dan cetak stiker QR tiap stand.",
    type: "Scan QR Stand",
    pointReward: 80,
    badge: "Penjelajah Bahasa",
    href: "/dashboard/challenge/stand",
    icon: Store,
    borderHover: "border-border bg-card hover:border-foreground/30",
    btnLabel: "Kelola 8 Stand",
    tag: "STAND PAMERAN",
  },
];

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
      pointReward: parseInt(pointReward) || 25,
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
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-accent" />
              <span>Manajemen Challenge Peserta Non-Lomba</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Konfigurasi tantangan interaktif, mini game edukasi, perolehan reward poin, dan lencana kehormatan peserta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/challenge/verifikasi">
              <Button size="sm" variant="accent" className="text-xs gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Verifikasi Bukti (3)</span>
              </Button>
            </Link>
            <Link href="/dashboard/challenge/poin">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Coins className="h-3.5 w-3.5" />
                <span>Penyesuaian Poin</span>
              </Button>
            </Link>
            <Link href="/dashboard/challenge/reward">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Gift className="h-3.5 w-3.5" />
                <span>Katalog Reward</span>
              </Button>
            </Link>
            <Button
              onClick={() => setDialogOpen(true)}
              size="sm"
              className="text-xs gap-1.5 cursor-pointer font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Challenge</span>
            </Button>
          </div>
        </div>

        {/* SECTION 1: MODUL CHALLENGE KHUSUS & INTERAKTIF (Puzzle & QR Huruf) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" />
                <span>Tantangan Game & Misi Eksplorasi Khusus</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Tantangan mandiri dengan halaman manajemen soal, kartu cetak QR, dan rekap nilai otomatis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECIAL_CHALLENGES.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className={`p-5 flex flex-col justify-between space-y-4 transition-all duration-200 shadow-xs hover:shadow-md ${item.borderHover}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="gold" className="text-[10px] font-bold">
                        {item.tag}
                      </Badge>
                      <Badge variant="default" className="text-[10px] font-mono">
                        +{item.pointReward} POIN
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-background/80 border border-border shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground leading-tight">
                            {item.title}
                          </h3>
                          <span className="text-[11px] text-muted-foreground block">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Lencana:</span>
                      <Badge variant="info" className="text-[10px]">
                        {item.badge}
                      </Badge>
                    </div>

                    <Link href={item.href}>
                      <Button size="sm" className="text-xs gap-1.5 font-bold cursor-pointer">
                        <span>{item.btnLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: DAFTAR LENGKAP CHALLENGE (TABEL MASTER) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Daftar Seluruh Challenge Partisipasi</span>
            </h2>
            <span className="text-xs text-muted-foreground">
              Total {challenges.length + 2} Challenge Aktif
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Challenge</TableHead>
                  <TableHead>Tipe Misi</TableHead>
                  <TableHead className="text-center">Hadiah Poin</TableHead>
                  <TableHead className="text-center">Lencana Kehormatan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi & Akses Halaman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 1. Puzzle Baju Daerah */}
                <TableRow className="bg-primary/5 hover:bg-primary/10 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
                        <Puzzle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          Puzzle Baju Daerah: Mencocokkan Busana Adat
                        </strong>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          Mini game edukatif mencocokkan baju adat dengan nama daerah nusantara.
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[10px]">
                      GAME INTERAKTIF
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-accent text-xs">
                    +100 Pts
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gold" className="text-[10px]">
                      Pelestari Budaya
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success" className="text-[10px]">
                      AKTIF
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href="/dashboard/challenge/puzzle">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-semibold"
                      >
                        <span>Kelola Puzzle</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>

                {/* 2. Challenge QR Huruf */}
                <TableRow className="bg-accent/5 hover:bg-accent/10 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-accent/10 border border-accent/20 shrink-0">
                        <QrCode className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          Challenge QR Huruf: Jelajah Aksara & Susun Kata
                        </strong>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          Perburuan stiker QR code huruf tersembunyi untuk disusun menjadi kalimat bermakna.
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[10px]">
                      PERBURUAN QR
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-accent text-xs">
                    +100 Pts
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="gold" className="text-[10px]">
                      Penjelajah Aksara
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success" className="text-[10px]">
                      AKTIF
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href="/dashboard/challenge/qr-huruf">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 border-accent/30 text-accent hover:bg-accent/10 font-semibold"
                      >
                        <span>Kelola QR Huruf</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>

                {/* 3. Challenge Reguler lainnya */}
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
                    <TableCell className="text-center">
                      <Badge variant="success" className="text-[10px]">
                        AKTIF
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {ch.slug === "keliling-8-stand" ? (
                        <Link href="/dashboard/challenge/stand">
                          <Button size="sm" variant="outline" className="text-xs gap-1">
                            <span>Kelola Stand</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      ) : ch.type === "unggah_bukti" ? (
                        <Link href="/dashboard/challenge/verifikasi">
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground hover:text-foreground">
                            <span>Verifikasi</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono pr-2">
                          {ch.participantsCount} Peserta
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal Buat Challenge Reguler */}
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

            <Textarea
              label="Deskripsi & Instruksi Misi *"
              placeholder="Jelaskan cara peserta menyelesaikan tantangan ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipe Misi / Verifikasi *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="scan_qr">Scan QR Code Lokasi</option>
                  <option value="kode_unik">Klaim Kode Unik</option>
                  <option value="unggah_bukti">Unggah Foto/Video Bukti</option>
                  <option value="input_panitia">Input Langsung Panitia</option>
                </select>
              </div>

              <Input
                label="Reward Poin *"
                type="number"
                value={pointReward}
                onChange={(e) => setPointReward(e.target.value)}
                required
              />
            </div>

            <Input
              label="Nama Badge / Lencana *"
              placeholder="Contoh: Duta Bahasa"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              required
            />

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
