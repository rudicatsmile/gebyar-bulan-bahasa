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
  getAdminRewards,
  getRedemptionQueue,
  createReward,
  updateReward,
  deleteReward,
  handoverRedemption,
  DbRewardItem,
  RedemptionQueueItem,
} from "@/app/actions/rewards";
import { createClient } from "@/lib/supabase/client";
import {
  Gift,
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  Package,
  Layers,
  Sparkles,
  Radio,
  XCircle,
} from "lucide-react";

export default function DashboardKelolaRewardPage() {
  const [rewards, setRewards] = React.useState<DbRewardItem[]>([]);
  const [queue, setQueue] = React.useState<RedemptionQueueItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(true);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal State Tambah Reward
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "",
    description: "",
    pointsRequired: 100,
    quota: 50,
    category: "Merchandise",
  });

  // Modal State Edit Reward
  const [editingReward, setEditingReward] = React.useState<DbRewardItem | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    description: "",
    pointsRequired: 100,
    quota: 50,
    isActive: true,
  });

  // Modal State Hapus Reward
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Load Data dengan opsi silent refresh agar tidak berkedip saat update realtime
  const loadData = React.useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [rRes, qRes] = await Promise.all([getAdminRewards(), getRedemptionQueue()]);
      if (rRes.success) setRewards(rRes.rewards);
      if (qRes.success) setQueue(qRes.queue);
    } catch (err) {
      console.error("Gagal load data reward:", err);
      if (showLoading) {
        setFeedback({ type: "error", message: "Gagal memuat data reward dari database." });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Listener Realtime untuk Antrean Penyerahan Hadiah & Stok Reward
  React.useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    // 1. Channel Supabase Realtime (Broadcast dari Server Action + PostgreSQL CDC)
    const channel = supabase
      .channel("reward-redemptions-channel")
      .on("broadcast", { event: "queue_updated" }, () => {
        if (isMounted) {
          loadData(false);
        }
      })
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "reward_redemptions" },
        () => {
          if (isMounted) {
            loadData(false);
          }
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "rewards" },
        () => {
          if (isMounted) {
            loadData(false);
          }
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsRealtimeConnected(false);
        }
      });

    // 2. Polling cadangan (setiap 5 detik) saat tab browser aktif untuk ketahanan koneksi
    const pollInterval = setInterval(() => {
      if (isMounted && typeof document !== "undefined" && document.visibilityState === "visible") {
        loadData(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Handle Create Reward
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await createReward({
        name: createForm.name,
        description: createForm.description,
        pointsRequired: Number(createForm.pointsRequired),
        quota: Number(createForm.quota),
        category: createForm.category,
        isActive: true,
      });

      if (res.success) {
        setFeedback({ type: "success", message: `Merchandise "${createForm.name}" berhasil ditambahkan!` });
        setIsCreateOpen(false);
        setCreateForm({
          name: "",
          description: "",
          pointsRequired: 100,
          quota: 50,
          category: "Merchandise",
        });
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal membuat reward." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rew: DbRewardItem) => {
    setEditingReward(rew);
    setEditForm({
      name: rew.name,
      description: rew.description,
      pointsRequired: rew.pointsRequired,
      quota: rew.quota,
      isActive: rew.isActive,
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReward) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await updateReward(editingReward.id, {
        name: editForm.name,
        description: editForm.description,
        pointsRequired: Number(editForm.pointsRequired),
        quota: Number(editForm.quota),
        isActive: editForm.isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Perubahan stok & data merchandise "${editForm.name}" berhasil disimpan!`,
        });
        setEditingReward(null);
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal memperbarui reward." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Reward
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);
    try {
      const res = await deleteReward(deletingId);
      if (res.success) {
        setFeedback({ type: "success", message: "Reward berhasil dihapus dari katalog." });
        setDeletingId(null);
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal menghapus reward." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Terjadi kesalahan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Penyerahan Hadiah
  const handleHandover = async (id: string) => {
    try {
      const res = await handoverRedemption(id);
      if (res.success) {
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "diserahkan" } : q))
        );
        setFeedback({ type: "success", message: "Status klaim hadiah berhasil ditandai sebagai diserahkan!" });
        loadData(false);
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal mengubah status penyerahan." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Terjadi kesalahan." });
    }
  };

  // Quick Quota Adjustment (+5 / -5)
  const handleQuickQuota = async (rew: DbRewardItem, delta: number) => {
    const newQuota = Math.max(rew.claimedCount, rew.quota + delta);
    if (newQuota === rew.quota) return;
    try {
      const res = await updateReward(rew.id, { quota: newQuota });
      if (res.success) {
        setRewards((prev) =>
          prev.map((r) => (r.id === rew.id ? { ...r, quota: newQuota } : r))
        );
      }
    } catch (err) {
      console.error("Gagal quick update kuota:", err);
    }
  };

  const pendingQueueCount = queue.filter((q) => q.status === "menunggu").length;

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8">
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
                <Gift className="h-7 w-7 text-accent" />
                <span>Katalog Reward & Kelola Kuota Hadiah</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kelola stok merchandise secara dinamis lewat database dan proses verifikasi penyerahan hadiah fisik kepada peserta.
              </p>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-semibold gap-2 shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Hadiah Baru</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              feedback.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
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
              className="text-xs font-bold hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Antrean Penyerahan Hadiah di Meja Panitia */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              <span>Antrean Penyerahan Hadiah di Lokasi</span>
            </h2>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  isRealtimeConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  {isRealtimeConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isRealtimeConnected ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  ></span>
                </span>
                <span>{isRealtimeConnected ? "Realtime Aktif" : "Sinkronisasi Aktif"}</span>
              </div>
              <Badge variant={pendingQueueCount > 0 ? "warning" : "success"} className="text-xs font-mono">
                {pendingQueueCount} Menunggu Pengambilan
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
                <p className="text-xs">Memuat antrean penukaran...</p>
              </div>
            ) : queue.length === 0 ? (
              <div className="py-12 text-center space-y-2 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">Belum Ada Antrean Klaim Hadiah</p>
                <p className="text-xs max-w-sm mx-auto">
                  Klaim merchandise oleh peserta yang menukar poin festival akan otomatis masuk ke daftar ini.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Kode Ambil</TableHead>
                    <TableHead>Nama Peserta</TableHead>
                    <TableHead>Hadiah Ditukar</TableHead>
                    <TableHead className="text-center">Poin Terpotong</TableHead>
                    <TableHead className="text-center">Waktu Klaim</TableHead>
                    <TableHead className="text-center">Status Klaim</TableHead>
                    <TableHead className="text-right">Aksi Penyerahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {item.pickupCode}
                      </TableCell>
                      <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                        {item.participantName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.rewardName}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        -{item.pointsSpent} Pts
                      </TableCell>
                      <TableCell className="text-center text-[11px] font-mono text-muted-foreground">
                        {item.requestedAt}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            item.status === "diserahkan"
                              ? "success"
                              : item.status === "ditolak"
                              ? "default"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {item.status === "ditolak" ? "DIBATALKAN" : item.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.status === "menunggu" ? (
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={() => handleHandover(item.id)}
                            className="text-xs h-7"
                          >
                            Tandai Diserahkan
                          </Button>
                        ) : item.status === "diserahkan" ? (
                          <span className="text-[11px] text-success font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-end gap-1">
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> Dibatalkan
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Katalog Stok & Kuota Merchandise Hadiah */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-accent" />
                <span>Stok & Kuota Merchandise Hadiah (Tersimpan di Database)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Admin dapat mengontrol dan mengubah kuota/stok hadiah secara realtime.
              </p>
            </div>
            <Badge variant="default" className="text-xs font-mono">
              Total {rewards.length} Item Hadiah
            </Badge>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-xs">Memuat katalog reward...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rewards.map((rew) => {
                const remaining = Math.max(0, rew.quota - rew.claimedCount);
                const isOutOfStock = remaining === 0;

                return (
                  <Card key={rew.id} className={`p-5 space-y-3 flex flex-col justify-between ${!rew.isActive ? "opacity-60 border-dashed" : ""}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="gold" className="text-[10px]">
                            {rew.category}
                          </Badge>
                          {!rew.isActive && (
                            <Badge variant="danger" className="text-[9px]">
                              NONAKTIF
                            </Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs font-bold text-accent">
                          {rew.pointsRequired} Poin
                        </span>
                      </div>

                      <div>
                        <h4 className="font-heading text-base font-bold text-foreground">
                          {rew.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {rew.description || "Hadiah penukaran poin festival."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border">
                      {/* Indikator Stok */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">
                          Terklaim: <strong>{rew.claimedCount}</strong> unit
                        </span>
                        <span className={`font-bold ${isOutOfStock ? "text-danger" : "text-foreground"}`}>
                          Sisa: {remaining} / {rew.quota} unit
                        </span>
                      </div>

                      {/* Progress Bar Kuota */}
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isOutOfStock
                              ? "bg-danger"
                              : remaining <= 10
                              ? "bg-amber-500"
                              : "bg-accent"
                          }`}
                          style={{
                            width: `${rew.quota > 0 ? Math.min(100, ((rew.quota - rew.claimedCount) / rew.quota) * 100) : 0}%`,
                          }}
                        />
                      </div>

                      {/* Tombol Kontrol Stok & Aksi */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        {/* Quick Stock Tweaks */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickQuota(rew, -5)}
                            disabled={rew.quota <= rew.claimedCount}
                            className="h-7 px-2 text-[11px] font-mono"
                            title="Kurangi kuota total -5"
                          >
                            -5
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickQuota(rew, +5)}
                            className="h-7 px-2 text-[11px] font-mono"
                            title="Tambah kuota total +5"
                          >
                            +5
                          </Button>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(rew)}
                            className="h-7 px-2.5 text-xs gap-1"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit Stok</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletingId(rew.id)}
                            className="h-7 px-2 text-xs"
                            title="Hapus reward"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL: Tambah Reward Baru */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <div className="p-6 space-y-4 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Gift className="h-5 w-5 text-accent" />
                <span>Tambah Merchandise / Hadiah Baru</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Item hadiah baru akan langsung tersimpan di database dan dapat diklaim peserta sesuai saldo poinnya.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <Input
                label="Nama Hadiah / Merchandise *"
                placeholder="Contoh: Kaos Eksklusif Bulan Bahasa"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Poin Dibutuhkan *"
                  type="number"
                  min={1}
                  value={createForm.pointsRequired}
                  onChange={(e) => setCreateForm({ ...createForm, pointsRequired: Number(e.target.value) })}
                  required
                />
                <Input
                  label="Stok / Kuota Awal *"
                  type="number"
                  min={1}
                  value={createForm.quota}
                  onChange={(e) => setCreateForm({ ...createForm, quota: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Kategori Merchandise
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="Merchandise">Merchandise Fisik</option>
                  <option value="Voucher">Voucher / Kupon Belanja</option>
                  <option value="Akses">Akses VIP / Fasilitas</option>
                  <option value="Buku">Buku / Naskah Karya</option>
                </select>
              </div>

              <Textarea
                label="Deskripsi Hadiah"
                placeholder="Detail spesifikasi atau syarat penukaran..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={isSubmitting}
                  className="gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>Simpan ke Database</span>
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* MODAL: Edit & Kelola Stok */}
        <Dialog open={!!editingReward} onOpenChange={() => setEditingReward(null)}>
          {editingReward && (
            <div className="p-6 space-y-4 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-accent" />
                  <span>Kelola Stok & Detail Hadiah</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Perubahan kuota total dan detail akan langsung diupdate di database Supabase.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditSubmit} className="space-y-3">
                <Input
                  label="Nama Hadiah *"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Poin Dibutuhkan *"
                    type="number"
                    min={1}
                    value={editForm.pointsRequired}
                    onChange={(e) => setEditForm({ ...editForm, pointsRequired: Number(e.target.value) })}
                    required
                  />
                  <Input
                    label="Total Kuota / Stok *"
                    type="number"
                    min={editingReward.claimedCount}
                    value={editForm.quota}
                    onChange={(e) => setEditForm({ ...editForm, quota: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="text-[11px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg">
                  Telah Terklaim: <strong>{editingReward.claimedCount} unit</strong> (Sisa stok baru: {Math.max(0, editForm.quota - editingReward.claimedCount)} unit)
                </div>

                <Textarea
                  label="Deskripsi Hadiah"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveReward"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-border text-accent focus:ring-accent h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="isActiveReward" className="text-xs text-foreground font-medium cursor-pointer">
                    Aktifkan reward ini di katalog penukaran peserta
                  </label>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingReward(null)}
                    disabled={isSubmitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="accent"
                    size="sm"
                    disabled={isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    <span>Simpan Perubahan</span>
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </Dialog>

        {/* MODAL: Konfirmasi Hapus */}
        <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <div className="p-6 space-y-4 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-danger flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                <span>Hapus Item Hadiah?</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Item hadiah ini akan dihapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
