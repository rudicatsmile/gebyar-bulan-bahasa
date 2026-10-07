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
  getAdminStands,
  upsertStand,
  deleteStand,
  toggleStandStatus,
  type AdminStandItem,
} from "@/app/actions/stands";
import {
  getStandSpecialRewardStatus,
  updateStandSpecialRewardConfig,
  resetStandSpecialRewardRecipients,
  type StandSpecialRewardStatus,
} from "@/app/actions/stand-rewards";
import {
  ArrowLeft,
  QrCode,
  Store,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Coins,
  Gift,
  Sparkles,
  Trophy,
  Users,
  Settings,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { QRCodeCard } from "@/components/qrcode/QRCodeGenerator";

export default function DashboardKelolaStandPage() {
  const [stands, setStands] = React.useState<AdminStandItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Special Reward states
  const [rewardStatus, setRewardStatus] = React.useState<StandSpecialRewardStatus | null>(null);
  const [rewardLoading, setRewardLoading] = React.useState(false);
  const [rewardSaving, setRewardSaving] = React.useState(false);
  const [rewardEnabled, setRewardEnabled] = React.useState(true);
  const [rewardQuota, setRewardQuota] = React.useState(50);
  const [selectedRewardId, setSelectedRewardId] = React.useState<string>("");
  const [rewardFeedback, setRewardFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [recipientsDialogOpen, setRecipientsDialogOpen] = React.useState(false);
  const [isResettingRecipients, setIsResettingRecipients] = React.useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewStand, setPreviewStand] = React.useState<AdminStandItem | null>(null);
  const [selectedStand, setSelectedStand] = React.useState<AdminStandItem | null>(null);

  // Clipboard state
  const [copiedCode, setCopiedCode] = React.useState("");

  // Feedback state
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [points, setPoints] = React.useState("10");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // Load stands from database
  const loadStands = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminStands();
      if (res.success) {
        setStands(res.stands);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal memuat data stand dari database",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Special Reward Config & Recipients
  const loadRewardStatus = React.useCallback(async () => {
    try {
      setRewardLoading(true);
      const res = await getStandSpecialRewardStatus();
      if (res.success && res.data) {
        setRewardStatus(res.data);
        setRewardEnabled(res.data.config.enabled);
        setRewardQuota(res.data.config.quota);
        setSelectedRewardId(res.data.config.rewardId || "");
      }
    } catch (err) {
      console.error("Gagal load status reward khusus:", err);
    } finally {
      setRewardLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStands();
    loadRewardStatus();
  }, [loadStands, loadRewardStatus]);

  // Handle Save Special Reward Config
  const handleSaveRewardConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rewardSaving || rewardLoading) return;
    setRewardSaving(true);
    setRewardFeedback(null);
    try {
      const selected = rewardStatus?.availableRewards.find((r) => r.id === selectedRewardId);
      const res = await updateStandSpecialRewardConfig({
        enabled: rewardEnabled,
        quota: Math.max(1, rewardQuota),
        rewardId: selectedRewardId || null,
        rewardName: selected ? selected.name : (rewardStatus?.config.rewardName || "Paket Merchandise Spesial Eksplorasi Budaya"),
      });

      if (res.success) {
        setRewardFeedback({
          type: "success",
          message: "Pengaturan kuota dinamis & reward khusus stand berhasil disimpan ke database!",
        });
        await loadRewardStatus();
      } else {
        setRewardFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan konfigurasi reward khusus.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setRewardFeedback({ type: "error", message });
    } finally {
      setRewardSaving(false);
    }
  };

  // Handle Reset Recipients
  const handleResetRecipients = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mereset daftar penerima reward khusus stand? Semua nomor antrean penerima akan dimulai kembali dari #1.")) {
      return;
    }

    try {
      setIsResettingRecipients(true);
      const res = await resetStandSpecialRewardRecipients();
      if (res.success) {
        setRewardFeedback({
          type: "success",
          message: "Daftar penerima reward khusus stand berhasil dikosongkan.",
        });
        await loadRewardStatus();
      } else {
        setRewardFeedback({
          type: "error",
          message: res.error || "Gagal mereset penerima reward.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat reset";
      setRewardFeedback({ type: "error", message });
    } finally {
      setIsResettingRecipients(false);
    }
  };

  const handleCopy = (standCode: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(standCode);
      setCopiedCode(standCode);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedStand(null);
    setName("");
    setCode("");
    setLocation("");
    setPoints("10");
    setDescription("");
    setIsActive(true);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (stand: AdminStandItem) => {
    setIsEditing(true);
    setSelectedStand(stand);
    setName(stand.name);
    setCode(stand.code);
    setLocation(stand.location);
    setPoints(String(stand.points));
    setDescription(stand.description || "");
    setIsActive(stand.isActive);
    setDialogOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (stand: AdminStandItem) => {
    setSelectedStand(stand);
    setDeleteDialogOpen(true);
  };

  // Submit Create or Edit Stand
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await upsertStand({
        id: isEditing && selectedStand ? selectedStand.id : undefined,
        name,
        code,
        location,
        points: parseInt(points) || 10,
        description,
        qrToken: isEditing && selectedStand ? selectedStand.qrToken : undefined,
        isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: isEditing
            ? `Data stand "${name}" berhasil diperbarui.`
            : `Stand "${name}" berhasil ditambahkan ke database.`,
        });
        setDialogOpen(false);
        await loadStands();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan stand.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Stand
  const handleConfirmDelete = async () => {
    if (!selectedStand) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await deleteStand(selectedStand.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Stand "${selectedStand.name}" berhasil dihapus dari database.`,
        });
        setDeleteDialogOpen(false);
        setSelectedStand(null);
        await loadStands();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghapus stand.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (stand: AdminStandItem) => {
    const newStatus = !stand.isActive;
    try {
      const res = await toggleStandStatus(stand.id, newStatus);
      if (res.success) {
        setStands((prev) =>
          prev.map((s) => (s.id === stand.id ? { ...s, isActive: newStatus } : s))
        );
      }
    } catch (err) {
      console.error("Gagal mengubah status stand:", err);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Top Navigation & Header */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Store className="h-7 w-7 text-accent" />
                <span>Kelola Stand Pameran & QR Token</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Konfigurasi kode unik stand, token QR cetak stiker, perolehan poin kunjungan, dan status operasional booth.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="text-xs gap-1.5 cursor-pointer font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Stand Baru</span>
              </Button>
            </div>
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

        {/* ================= SPECIAL REWARD STAND SECTION ================= */}
        <Card className="p-5 sm:p-6 rounded-2xl border-2 border-accent/30 bg-card/95 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-accent/15 text-accent shrink-0 border border-accent/25">
                <Gift className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    Reward Khusus: Eksplorasi Seluruh Stand
                  </h2>
                  <Badge variant={rewardEnabled ? "gold" : "default"} className="text-[10px] uppercase font-bold">
                    {rewardEnabled ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Badge variant="default" className="text-[10px] font-mono border border-accent/40 text-accent">
                    Batas Kuota: {rewardQuota} Peserta
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  Peserta yang berhasil memindai seluruh <strong>{rewardStatus?.totalActiveStands || 8} stand pameran aktif</strong> berhak memperoleh reward khusus otomatis. Sistem membatasi hanya untuk <strong>{rewardQuota} peserta pertama</strong> (kuota dinamis), dan peserta ke-{rewardQuota + 1} dan seterusnya akan menerima notifikasi bahwa kuota hadiah khusus telah habis.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecipientsDialogOpen(true)}
                className="text-xs h-9 gap-1.5 cursor-pointer font-semibold border-border hover:bg-muted"
              >
                <Users className="h-3.5 w-3.5 text-accent" />
                <span>Penerima ({rewardStatus?.recipients.length || 0})</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/60">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[11px] text-muted-foreground block">Stand Aktif Wajib</span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5 block">
                {rewardStatus?.totalActiveStands || 8} Stand
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[11px] text-muted-foreground block">Kuota Diberikan</span>
              <span className="font-mono text-base font-bold text-accent mt-0.5 block">
                {rewardStatus?.grantedCount || 0} / {rewardQuota} Peserta
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[11px] text-muted-foreground block">Sisa Kuota Tersedia</span>
              <span className="font-mono text-base font-bold text-emerald-500 mt-0.5 block">
                {rewardStatus?.remainingQuota ?? rewardQuota} Kursi
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[11px] text-muted-foreground block">Total Menyelesaikan</span>
              <span className="font-mono text-base font-bold text-foreground mt-0.5 block">
                {rewardStatus?.totalCompleters || 0} Orang
              </span>
            </div>
          </div>

          {/* Feedback Reward Alert */}
          {rewardFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border animate-in fade-in ${
                rewardFeedback.type === "success"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              <div className="flex items-center gap-2">
                {rewardFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{rewardFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setRewardFeedback(null)}
                className="font-bold text-[11px] hover:underline cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Konfigurasi Form */}
          <form onSubmit={handleSaveRewardConfig} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Toggle Aktif */}
              <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label htmlFor="reward-toggle" className="text-xs font-semibold text-foreground block cursor-pointer">
                    Status Reward Khusus
                  </label>
                  <span className="text-[11px] text-muted-foreground block">
                    {rewardEnabled ? "Reward diberikan saat scan stand lengkap" : "Sistem dinonaktifkan sementara"}
                  </span>
                </div>
                <input
                  id="reward-toggle"
                  type="checkbox"
                  checked={rewardEnabled}
                  onChange={(e) => setRewardEnabled(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 rounded cursor-pointer shrink-0"
                />
              </div>

              {/* 2. Batas Kuota Dinamis */}
              <div className="p-3.5 rounded-xl border border-border bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="quota-input" className="text-xs font-semibold text-foreground">
                    Batas Kuota Penerima *
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">Orang Pertama</span>
                </div>
                <div className="relative">
                  <Input
                    id="quota-input"
                    type="number"
                    min={1}
                    max={1000}
                    step={1}
                    value={rewardQuota}
                    onChange={(e) => setRewardQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-9 text-sm font-mono font-bold pr-16"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    Peserta
                  </span>
                </div>
              </div>

              {/* 3. Pilihan Reward dari Katalog */}
              <div className="p-3.5 rounded-xl border border-border bg-background space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="reward-select" className="text-xs font-semibold text-foreground">
                    Pilih Hadiah / Merchandise *
                  </label>
                  <Link
                    href="/dashboard/challenge/reward"
                    className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"
                    title="Kelola katalog di /dashboard/challenge/reward"
                  >
                    <span>Katalog</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <select
                  id="reward-select"
                  value={selectedRewardId}
                  onChange={(e) => setSelectedRewardId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {rewardStatus?.availableRewards && rewardStatus.availableRewards.length > 0 ? (
                    rewardStatus.availableRewards.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} (Stok: {r.quota - r.claimedCount})
                      </option>
                    ))
                  ) : (
                    <option value="">Paket Merchandise Spesial Eksplorasi Budaya</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-muted-foreground">
                * Data reward otomatis terhubung ke pencatatan antrean klaim di <strong>/dashboard/challenge/reward</strong>.
              </span>

              <Button
                type="submit"
                size="sm"
                disabled={rewardSaving}
                className="text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
              >
                {rewardSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{rewardSaving ? "Menyimpan..." : "Simpan Batas Kuota & Reward"}</span>
              </Button>
            </div>
          </form>
        </Card>

        {/* Daftar mobile (card list) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
              <span className="text-xs">Memuat data stand dari database...</span>
            </div>
          ) : stands.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <span className="text-sm font-semibold block text-foreground">Belum Ada Stand Pameran Terdaftar</span>
              <span className="text-xs block mt-1">Klik tombol &ldquo;Tambah Stand Baru&rdquo; untuk mendaftarkan stand budaya.</span>
            </div>
          ) : (
            stands.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <strong className="text-foreground text-sm block">{s.name}</strong>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">{s.description || "Stand edukasi pameran kebudayaan."}</span>
                  </div>
                  <button onClick={() => handleToggleStatus(s)} className="cursor-pointer shrink-0" title="Klik untuk ubah status">
                    <Badge variant={s.isActive ? "success" : "default"} className="text-[10px] hover:opacity-80">{s.isActive ? "AKTIF" : "NONAKTIF"}</Badge>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded bg-primary text-accent font-mono font-bold tracking-wider">{s.code}</span>
                  <span className="font-mono font-bold text-foreground">+{s.points} Pts</span>
                  <span className="text-muted-foreground">{s.visitCount} Kunjungan</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{s.location}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(s.code)} className="text-xs h-8 px-2 gap-1 cursor-pointer" title="Salin Kode Stand">
                    {copiedCode === s.code ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedCode === s.code ? "Disalin" : "Salin"}</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPreviewStand(s)} className="text-xs h-8 px-2 gap-1 border-accent/30 text-accent hover:bg-accent/10 cursor-pointer" title="Lihat & Cetak QR Code">
                    <QrCode className="h-3.5 w-3.5" /><span>QR</span>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(s)} className="text-xs h-8 px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold cursor-pointer" title="Edit Stand">
                    <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleOpenDelete(s)} className="text-xs h-8 px-2 gap-1 font-semibold cursor-pointer" title="Hapus Stand">
                    <Trash2 className="h-3.5 w-3.5" /><span>Hapus</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabel Stand Pameran (desktop) */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Stand Pameran</TableHead>
                <TableHead className="text-center">Kode Unik</TableHead>
                <TableHead>Lokasi Booth</TableHead>
                <TableHead className="text-center">Poin / Kunjungan</TableHead>
                <TableHead className="text-center">Total Kunjungan</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi & QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                    <span className="text-xs">Memuat data stand dari database...</span>
                  </TableCell>
                </TableRow>
              ) : stands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <span className="text-sm font-semibold block text-foreground">
                      Belum Ada Stand Pameran Terdaftar
                    </span>
                    <span className="text-xs block mt-1">
                      Klik tombol &ldquo;Tambah Stand Baru&rdquo; untuk mendaftarkan stand budaya.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                stands.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <strong className="text-foreground text-xs sm:text-sm block">
                        {s.name}
                      </strong>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {s.description || "Stand edukasi pameran kebudayaan."}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-accent text-sm">
                      <span className="px-2.5 py-1 rounded bg-primary text-accent tracking-wider">
                        {s.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{s.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                      +{s.points} Pts
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {s.visitCount} Kali
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className="cursor-pointer"
                        title="Klik untuk ubah status aktif/nonaktif"
                      >
                        <Badge
                          variant={s.isActive ? "success" : "default"}
                          className="text-[10px] hover:opacity-80 transition-opacity"
                        >
                          {s.isActive ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Salin Kode */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(s.code)}
                          className="text-xs h-8 px-2.5 gap-1 cursor-pointer"
                          title="Salin Kode Stand"
                        >
                          {copiedCode === s.code ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>{copiedCode === s.code ? "Disalin" : "Salin"}</span>
                        </Button>

                        {/* Tombol Lihat & Cetak QR */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewStand(s)}
                          className="text-xs h-8 px-2.5 gap-1 border-accent/30 text-accent hover:bg-accent/10 cursor-pointer"
                          title="Lihat & Cetak QR Code"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>QR</span>
                        </Button>

                        {/* Tombol EDIT */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(s)}
                          className="text-xs h-8 px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                          title="Edit Stand"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>

                        {/* Tombol DELETE */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenDelete(s)}
                          className="text-xs h-8 px-2.5 gap-1 font-semibold cursor-pointer"
                          title="Hapus Stand"
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

        {/* Modal Buat / Ubah Data Stand */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Ubah Data Stand Pameran" : "Tambah Stand Pameran Baru"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Perbarui informasi stand, lokasi booth, kode unik, dan reward poin."
                  : "Daftarkan stand pameran budaya baru untuk tantangan keliling stand peserta."}
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Nama Stand Pameran *"
              placeholder="Contoh: Stand Membaca Puisi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Kode Unik Stand (6 Karakter) *"
                placeholder="Contoh: PUISI01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />

              <Input
                label="Poin Kunjungan *"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                min={1}
              />
            </div>

            <Input
              label="Lokasi Booth / Selasar *"
              placeholder="Contoh: Selasar Barat No. 01 (Gedung C)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <Textarea
              label="Deskripsi Stand & Aktivitas Pengunjung"
              placeholder="Jelaskan aktivitas atau informasi menarik yang disajikan di stand ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Operasional Stand *
              </label>
              <select
                value={isActive ? "aktif" : "nonaktif"}
                onChange={(e) => setIsActive(e.target.value === "aktif")}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="aktif">Aktif (Dapat Dikunjungi & Diklaim Poin)</option>
                <option value="nonaktif">Nonaktif (Tutup / Ditutup Sementara)</option>
              </select>
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
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Stand"}</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Konfirmasi Hapus Stand */}
        {selectedStand && (
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-danger flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Konfirmasi Hapus Stand Pameran</span>
                </DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus stand{" "}
                  <strong className="text-foreground">&ldquo;{selectedStand.name}&rdquo;</strong> (Kode:{" "}
                  <strong className="text-accent font-mono">{selectedStand.code}</strong>)?
                  Tindakan ini permanen.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger space-y-1">
                <div className="flex justify-between">
                  <span>Lokasi:</span>
                  <strong>{selectedStand.location}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Poin per Kunjungan:</span>
                  <strong>+{selectedStand.points} Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Kunjungan Tercatat:</span>
                  <strong>{selectedStand.visitCount} Kali</strong>
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

        {/* Modal Pratinjau QR Stand Siap Cetak */}
        {previewStand && (
          <Dialog open={!!previewStand} onOpenChange={() => setPreviewStand(null)}>
            <div className="space-y-4 text-center p-4">
              <DialogHeader>
                <DialogTitle>{previewStand.name}</DialogTitle>
                <DialogDescription>
                  Kode QR token resmi untuk dicetak dan ditempel di meja stand pameran.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <QRCodeCard
                  standName={previewStand.name}
                  standCode={previewStand.code}
                  qrToken={previewStand.qrToken}
                  location={previewStand.location}
                  points={previewStand.points}
                />
              </div>
            </div>
          </Dialog>
        )}

        {/* Modal Daftar Penerima Reward Khusus */}
        <Dialog open={recipientsDialogOpen} onOpenChange={setRecipientsDialogOpen}>
          <div className="space-y-4 p-4 max-w-2xl w-full">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                <DialogTitle>Daftar Peserta Penerima Reward Khusus Stand</DialogTitle>
              </div>
              <DialogDescription>
                Urutan peserta yang berhasil memindai seluruh stand pameran budaya ({rewardStatus?.grantedCount || 0} dari {rewardQuota} kuota reward diberikan).
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {(!rewardStatus?.recipients || rewardStatus.recipients.length === 0) ? (
                <div className="py-12 text-center text-muted-foreground space-y-2 border border-dashed rounded-xl">
                  <Gift className="h-8 w-8 mx-auto opacity-40 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Belum Ada Peserta yang Menyelesaikan Semua Stand</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Reward khusus akan otomatis diberikan kepada {rewardQuota} peserta pertama yang berhasil memindai {rewardStatus?.totalActiveStands || 8} stand aktif.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">Urutan</TableHead>
                        <TableHead>Peserta & Instansi</TableHead>
                        <TableHead className="text-center">Kode Pengambilan</TableHead>
                        <TableHead className="text-center">Waktu Selesai</TableHead>
                        <TableHead className="text-center w-28">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewardStatus.recipients.map((rec) => {
                        const isGranted = rec.status === "diterima";
                        return (
                          <TableRow key={`${rec.participantId}-${rec.rank}`}>
                            <TableCell className="text-center">
                              <span
                                className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-mono font-bold ${
                                  rec.rank <= 3
                                    ? "bg-accent text-accent-foreground"
                                    : isGranted
                                    ? "bg-muted text-foreground"
                                    : "bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                #{rec.rank}
                              </span>
                            </TableCell>
                            <TableCell>
                              <strong className="text-xs sm:text-sm block text-foreground">
                                {rec.participantName}
                              </strong>
                              <span className="text-[11px] text-muted-foreground">
                                {rec.institution}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">
                              {rec.pickupCode ? (
                                <Badge variant="gold" className="font-mono text-[10px] px-2">
                                  {rec.pickupCode}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {new Date(rec.completedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={isGranted ? "success" : "default"}
                                className="text-[10px]"
                              >
                                {isGranted ? "DITERIMA" : "KUOTA HABIS"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetRecipients}
                disabled={isResettingRecipients || !rewardStatus?.recipients?.length}
                className="text-xs text-danger hover:text-danger hover:bg-danger/10 border-danger/30 cursor-pointer gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Antrean Penerima</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecipientsDialogOpen(false)}
                className="text-xs cursor-pointer"
              >
                Tutup
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
