"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  getAdminChallenges,
  upsertChallenge,
  deleteChallenge,
  toggleChallengeStatus,
  type AdminChallengeItem,
} from "@/app/actions/challenges";
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
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
    borderHover:
      "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary",
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
    borderHover:
      "border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card hover:border-accent",
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
  const [challenges, setChallenges] = React.useState<AdminChallengeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedChallenge, setSelectedChallenge] = React.useState<AdminChallengeItem | null>(null);

  // Feedback states
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"scan_qr" | "kode_unik" | "unggah_bukti" | "input_panitia">("scan_qr");
  const [pointReward, setPointReward] = React.useState("25");
  const [badge, setBadge] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // Load challenges from database
  const loadChallenges = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminChallenges();
      if (res.success) {
        setChallenges(res.challenges);
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal memuat data challenge" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedChallenge(null);
    setTitle("");
    setDescription("");
    setType("scan_qr");
    setPointReward("25");
    setBadge("Peserta Aktif");
    setIsActive(true);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (ch: AdminChallengeItem) => {
    setIsEditing(true);
    setSelectedChallenge(ch);
    setTitle(ch.title);
    setDescription(ch.description);
    setType(ch.type);
    setPointReward(String(ch.pointReward));
    setBadge(ch.badge);
    setIsActive(ch.isActive);
    setDialogOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (ch: AdminChallengeItem) => {
    setSelectedChallenge(ch);
    setDeleteDialogOpen(true);
  };

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await upsertChallenge({
        id: isEditing && selectedChallenge ? selectedChallenge.id : undefined,
        title,
        description,
        type,
        pointReward: parseInt(pointReward) || 25,
        badge: badge || "Peserta Aktif",
        isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: isEditing
            ? `Challenge "${title}" berhasil diperbarui.`
            : `Challenge "${title}" berhasil ditambahkan ke database.`,
        });
        setDialogOpen(false);
        await loadChallenges();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan challenge.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedChallenge) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await deleteChallenge(selectedChallenge.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Challenge "${selectedChallenge.title}" berhasil dihapus.`,
        });
        setDeleteDialogOpen(false);
        setSelectedChallenge(null);
        await loadChallenges();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghapus challenge.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status directly
  const handleToggleStatus = async (ch: AdminChallengeItem) => {
    const newStatus = !ch.isActive;
    try {
      const res = await toggleChallengeStatus(ch.id, newStatus);
      if (res.success) {
        setChallenges((prev) =>
          prev.map((item) =>
            item.id === ch.id
              ? { ...item, isActive: newStatus, status: newStatus ? "aktif" : "selesai" }
              : item
          )
        );
      }
    } catch (err) {
      console.error("Gagal mengubah status challenge:", err);
    }
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
                <span>Verifikasi Bukti</span>
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
              onClick={handleOpenCreate}
              size="sm"
              className="text-xs gap-1.5 cursor-pointer font-bold"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Challenge</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs hover:underline cursor-pointer font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* SECTION 1: MODUL CHALLENGE KHUSUS & INTERAKTIF */}
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

        {/* SECTION 2: DAFTAR LENGKAP CHALLENGE DARI DATABASE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Daftar Seluruh Challenge Partisipasi (Tabel Database)</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              Total {challenges.length} Challenge Terdaftar
            </span>
          </div>

          {/* Daftar mobile (card list) */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                <span className="text-xs">Memuat data challenge dari database...</span>
              </div>
            ) : challenges.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <span className="text-sm font-semibold block text-foreground">Belum Ada Challenge Terdaftar di Database</span>
                <span className="text-xs block mt-1">Klik tombol &ldquo;Tambah Challenge&rdquo; di atas untuk membuat misi challenge baru.</span>
              </div>
            ) : (
              challenges.map((ch) => (
                <div key={ch.id} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="text-foreground text-sm block">{ch.title}</strong>
                      <span className="text-[11px] text-muted-foreground line-clamp-2">{ch.description}</span>
                    </div>
                    <button onClick={() => handleToggleStatus(ch)} className="cursor-pointer shrink-0" title="Klik untuk ubah status">
                      <Badge variant={ch.isActive ? "success" : "default"} className="text-[10px] hover:opacity-80">{ch.isActive ? "AKTIF" : "NONAKTIF"}</Badge>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <Badge variant="default" className="text-[10px]">{ch.type.replace(/_/g, " ").toUpperCase()}</Badge>
                    <span className="font-mono font-bold text-accent">+{ch.pointReward} Pts</span>
                    <Badge variant="gold" className="text-[10px]">{ch.badge}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    {ch.slug === "keliling-8-stand" && (
                      <Link href="/dashboard/challenge/stand">
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"><Store className="h-3.5 w-3.5" /><span>Stand</span></Button>
                      </Link>
                    )}
                    {ch.type === "unggah_bukti" && (
                      <Link href="/dashboard/challenge/verifikasi">
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"><CheckCircle className="h-3.5 w-3.5" /><span>Verifikasi</span></Button>
                      </Link>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(ch)} className="h-8 px-2.5 text-xs gap-1 border-accent/40 text-accent hover:bg-accent/10 font-semibold cursor-pointer" title="Edit Challenge">
                      <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleOpenDelete(ch)} className="h-8 px-2.5 text-xs gap-1 font-semibold cursor-pointer" title="Hapus Challenge">
                      <Trash2 className="h-3.5 w-3.5" /><span>Hapus</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Daftar challenge (desktop) */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Challenge</TableHead>
                  <TableHead>Tipe Misi</TableHead>
                  <TableHead className="text-center">Hadiah Poin</TableHead>
                  <TableHead className="text-center">Lencana Kehormatan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                      <span className="text-xs">Memuat data challenge dari database...</span>
                    </TableCell>
                  </TableRow>
                ) : challenges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <span className="text-sm font-semibold block text-foreground">
                        Belum Ada Challenge Terdaftar di Database
                      </span>
                      <span className="text-xs block mt-1">
                        Klik tombol &ldquo;Tambah Challenge&rdquo; di atas untuk membuat misi challenge baru.
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  challenges.map((ch) => (
                    <TableRow key={ch.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {ch.title}
                        </strong>
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {ch.description}
                        </span>
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
                        <button
                          onClick={() => handleToggleStatus(ch)}
                          className="cursor-pointer"
                          title="Klik untuk ubah status"
                        >
                          <Badge
                            variant={ch.isActive ? "success" : "default"}
                            className="text-[10px] hover:opacity-80 transition-opacity"
                          >
                            {ch.isActive ? "AKTIF" : "NONAKTIF"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ch.slug === "keliling-8-stand" && (
                            <Link href="/dashboard/challenge/stand">
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                                <Store className="h-3.5 w-3.5" />
                                <span>Stand</span>
                              </Button>
                            </Link>
                          )}
                          {ch.type === "unggah_bukti" && (
                            <Link href="/dashboard/challenge/verifikasi">
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Verifikasi</span>
                              </Button>
                            </Link>
                          )}

                          {/* Tombol EDIT */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(ch)}
                            className="h-8 px-2.5 text-xs gap-1 border-accent/40 text-accent hover:bg-accent/10 font-semibold cursor-pointer"
                            title="Edit Challenge"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>

                          {/* Tombol DELETE */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOpenDelete(ch)}
                            className="h-8 px-2.5 text-xs gap-1 font-semibold cursor-pointer"
                            title="Hapus Challenge"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modal Buat / Ubah Challenge */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Ubah Data Challenge Partisipasi" : "Buat Challenge Partisipasi Baru"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Sesuaikan rincian misi, perolehan poin reward, dan lencana kehormatan."
                  : "Rancang misi interaktif untuk meningkatkan keterlibatan peserta non-lomba."}
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
                min={1}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nama Badge / Lencana *"
                placeholder="Contoh: Duta Bahasa"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Publikasi *
                </label>
                <select
                  value={isActive ? "aktif" : "nonaktif"}
                  onChange={(e) => setIsActive(e.target.value === "aktif")}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="aktif">Aktif (Dapat Dikerjakan Peserta)</option>
                  <option value="nonaktif">Nonaktif (Disembunyikan)</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="font-bold gap-1.5">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? "Simpan Perubahan" : "Terbitkan Challenge"}</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Konfirmasi Hapus Challenge */}
        {selectedChallenge && (
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-danger flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Konfirmasi Hapus Challenge</span>
                </DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus challenge{" "}
                  <strong className="text-foreground">&ldquo;{selectedChallenge.title}&rdquo;</strong>?
                  Tindakan ini permanen dan akan menghapus misi ini dari daftar peserta.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger space-y-1">
                <div className="flex justify-between">
                  <span>Tipe Misi:</span>
                  <strong className="uppercase">{selectedChallenge.type.replace(/_/g, " ")}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Poin Reward:</span>
                  <strong>+{selectedChallenge.pointReward} Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Lencana:</span>
                  <strong>{selectedChallenge.badge}</strong>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="font-bold gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Hapus Permanen</span>
                </Button>
              </DialogFooter>
            </div>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
