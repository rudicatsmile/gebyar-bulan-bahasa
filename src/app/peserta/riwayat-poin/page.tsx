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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  getParticipantPointLedger,
  type PointLedgerItem,
} from "@/app/actions/challenges";
import {
  getParticipantRedemptions,
  cancelRewardRedemption,
  type ParticipantRedemptionItem,
} from "@/app/actions/rewards";
import {
  Coins,
  ArrowLeft,
  Sparkles,
  Loader2,
  Clock,
  Gift,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Ticket,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const DEMO_LEDGER_ITEMS: PointLedgerItem[] = [
  { id: "tx-1", source: "Scan QR Stand", description: "Kunjungan Stand Membaca Puisi (PUISI01)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:15 WIB" },
  { id: "tx-2", source: "Scan QR Stand", description: "Kunjungan Stand Melukis Tas Kanvas (KANVAS04)", pointsDelta: 10, timestamp: "27 Okt 2025, 09:40 WIB" },
  { id: "tx-3", source: "Scan QR Stand", description: "Kunjungan Stand Tradisi Palang Pintu (PALANG06)", pointsDelta: 10, timestamp: "27 Okt 2025, 10:05 WIB" },
  { id: "tx-4", source: "Tantangan Twibbon", description: "Verifikasi unggahan twibbon media sosial", pointsDelta: 20, timestamp: "27 Okt 2025, 10:30 WIB" },
  { id: "tx-5", source: "Misi Video", description: "Rekam Video Dokumentasi Stand", pointsDelta: 50, timestamp: "27 Okt 2025, 11:10 WIB" },
  { id: "tx-6", source: "Kuis EYD", description: "Kuis Bahasa Indonesia 10 Soal", pointsDelta: 30, timestamp: "27 Okt 2025, 11:35 WIB" },
  { id: "tx-7", source: "Bonus Panitia", description: "Apresiasi keaktifan sesi diskusi budaya", pointsDelta: 10, timestamp: "27 Okt 2025, 11:50 WIB" },
  { id: "tx-8", source: "Penukaran Reward", description: "Penukaran reward: Tote Bag Kanvas GebyarBulanBahasa (Kode: RW-7643)", pointsDelta: -60, timestamp: "27 Okt 2025, 12:10 WIB" },
];

const DEMO_REDEMPTIONS: ParticipantRedemptionItem[] = [
  {
    id: "demo-red-1",
    rewardId: "rew-1",
    rewardName: "Tote Bag Kanvas GebyarBulanBahasa",
    pointsSpent: 60,
    pickupCode: "RW-7643",
    status: "menunggu",
    createdAt: "27 Okt 2025, 12:10 WIB",
  },
  {
    id: "demo-red-2",
    rewardId: "rew-2",
    rewardName: "Stiker Hologram Festival",
    pointsSpent: 15,
    pickupCode: "RW-1290",
    status: "diserahkan",
    createdAt: "27 Okt 2025, 09:30 WIB",
    processedAt: "27 Okt 2025, 09:40 WIB",
  },
];

export default function PesertaRiwayatPoinPage() {
  const { participant, loading: participantLoading, refetch: refetchParticipant } = useCurrentParticipant();
  const [ledgerItems, setLedgerItems] = React.useState<PointLedgerItem[]>([]);
  const [redemptions, setRedemptions] = React.useState<ParticipantRedemptionItem[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  // State untuk Dialog Pembatalan
  const [cancelingItem, setCancelingItem] = React.useState<ParticipantRedemptionItem | null>(null);
  const [isSubmittingCancel, setIsSubmittingCancel] = React.useState(false);
  const [cancelFeedback, setCancelFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter reward tab: "semua" | "menunggu" | "diserahkan"
  const [rewardFilter, setRewardFilter] = React.useState<"semua" | "menunggu" | "diserahkan">("semua");

  const isDemo = participant?.isDemoFallback;
  const currentTotal = participant?.totalPoints ?? 0;

  // Load Data Ledger & Redemptions
  const loadData = React.useCallback(async () => {
    if (participantLoading) return;

    if (isDemo) {
      setLedgerItems(DEMO_LEDGER_ITEMS);
      setRedemptions(DEMO_REDEMPTIONS);
      setLoadingData(false);
      return;
    }

    if (participant?.id) {
      setLoadingData(true);
      try {
        const [ledgerRes, redemptionsRes] = await Promise.all([
          getParticipantPointLedger(participant.id),
          getParticipantRedemptions(participant.id),
        ]);

        if (ledgerRes.success) {
          setLedgerItems(ledgerRes.transactions);
        } else {
          setLedgerItems([]);
        }

        if (redemptionsRes.success) {
          setRedemptions(redemptionsRes.redemptions);
        } else {
          setRedemptions([]);
        }
      } catch (err) {
        console.error("Gagal memuat riwayat mutasi poin:", err);
        setLedgerItems([]);
        setRedemptions([]);
      } finally {
        setLoadingData(false);
      }
    } else {
      setLedgerItems([]);
      setRedemptions([]);
      setLoadingData(false);
    }
  }, [participant?.id, isDemo, participantLoading]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Eksekusi Pembatalan
  const handleConfirmCancel = async () => {
    if (!cancelingItem) return;

    // Proteksi di sisi klien: Status HARUS menunggu
    if (cancelingItem.status !== "menunggu") {
      setCancelFeedback({
        type: "error",
        message: "Hanya penukaran reward berstatus MENUNGGU yang dapat dibatalkan.",
      });
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelFeedback(null);

      // Handle fallback mode demo
      if (isDemo) {
        setRedemptions((prev) =>
          prev.map((r) =>
            r.id === cancelingItem.id
              ? { ...r, status: "ditolak", note: "Dibatalkan oleh peserta" }
              : r
          )
        );
        const refundTx: PointLedgerItem = {
          id: `tx-refund-${Date.now()}`,
          source: "Pengembalian Poin",
          description: `Pengembalian Poin: Pembatalan penukaran ${cancelingItem.rewardName} (Kode: ${cancelingItem.pickupCode})`,
          pointsDelta: cancelingItem.pointsSpent,
          timestamp: "Baru saja",
        };
        setLedgerItems((prev) => [refundTx, ...prev]);
        setCancelFeedback({
          type: "success",
          message: `Penukaran ${cancelingItem.rewardName} berhasil dibatalkan! +${cancelingItem.pointsSpent} Poin telah dikembalikan ke saldo Anda.`,
        });
        setCancelingItem(null);
        return;
      }

      const res = await cancelRewardRedemption(cancelingItem.id, participant?.id);

      if (!res.success) {
        setCancelFeedback({
          type: "error",
          message: res.error || "Gagal membatalkan penukaran reward.",
        });
        return;
      }

      // Berhasil
      setCancelFeedback({
        type: "success",
        message: `Penukaran ${cancelingItem.rewardName} berhasil dibatalkan! +${res.refundedPoints ?? cancelingItem.pointsSpent} Poin telah dikembalikan ke saldo Anda.`,
      });

      setCancelingItem(null);

      // Refresh data peserta dan mutasi ledger secara aktual
      if (refetchParticipant) {
        await refetchParticipant();
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan klaim.";
      setCancelFeedback({ type: "error", message: msg });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Hitung ringkasan statistik
  const totalEarned = React.useMemo(() => {
    return ledgerItems
      .filter((tx) => tx.pointsDelta > 0)
      .reduce((sum, tx) => sum + tx.pointsDelta, 0);
  }, [ledgerItems]);

  const totalSpent = React.useMemo(() => {
    return Math.abs(
      ledgerItems
        .filter((tx) => tx.pointsDelta < 0)
        .reduce((sum, tx) => sum + tx.pointsDelta, 0)
    );
  }, [ledgerItems]);

  // Filter redemptions
  const filteredRedemptions = React.useMemo(() => {
    if (rewardFilter === "menunggu") {
      return redemptions.filter((r) => r.status === "menunggu");
    }
    if (rewardFilter === "diserahkan") {
      return redemptions.filter((r) => r.status === "diserahkan");
    }
    return redemptions;
  }, [redemptions, rewardFilter]);

  const countMenunggu = redemptions.filter((r) => r.status === "menunggu").length;
  const countDiserahkan = redemptions.filter((r) => r.status === "diserahkan").length;

  const isLoading = participantLoading || loadingData;

  return (
    <DashboardLayout role="peserta" participantPoints={currentTotal}>
      <div className="space-y-6">
        {/* Header Breadcrumb & Judul */}
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Coins className="h-7 w-7 text-accent" />
                <span>Buku Besar Riwayat Poin & Hadiah</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Rekapitulasi lengkap perolehan poin festival, status penyerahan merchandise, serta transparansi mutasi pengembalian poin.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-accent/40 bg-accent/10 text-right shrink-0">
              <span className="text-[10px] font-mono uppercase text-accent font-bold block">
                Total Saldo Bersih:
              </span>
              <span className="font-mono text-2xl sm:text-3xl font-black text-accent">
                {currentTotal} Poin
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Notifikasi */}
        {cancelFeedback && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 animate-in zoom-in-95 ${
              cancelFeedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {cancelFeedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-danger" />
            )}
            <div className="flex-1">
              <p className="font-medium">{cancelFeedback.message}</p>
            </div>
            <button
              onClick={() => setCancelFeedback(null)}
              className="text-xs underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 3 Kartu Statistik Ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Card className="p-4 bg-card border-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Saldo Tersedia</span>
              <div className="font-mono text-2xl font-bold text-accent">{currentTotal} Pts</div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-accent" /> Siap ditukar reward
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Total Poin Masuk</span>
              <div className="font-mono text-2xl font-bold text-success">+{totalEarned} Pts</div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-success" /> Akumulasi seluruh misi
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
          </Card>

          <Card className="p-4 bg-card border-border flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground block font-medium">Poin Terpakai (Reward)</span>
              <div className="font-mono text-2xl font-bold text-danger">-{totalSpent} Pts</div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-danger" /> Klaim merchandise festival
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5" />
            </div>
          </Card>
        </div>

        {/* BAGIAN 1: DAFTAR KLAIM & PENUKARAN REWARD */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-lg font-bold text-foreground">
                Daftar Klaim Merchandise & Hadiah
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                ({redemptions.length} penukaran)
              </span>
            </div>

            {/* Filter Status Reward */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <Button
                size="sm"
                variant={rewardFilter === "semua" ? "accent" : "outline"}
                onClick={() => setRewardFilter("semua")}
                className="text-xs h-7 px-2.5"
              >
                Semua ({redemptions.length})
              </Button>
              <Button
                size="sm"
                variant={rewardFilter === "menunggu" ? "accent" : "outline"}
                onClick={() => setRewardFilter("menunggu")}
                className="text-xs h-7 px-2.5 text-amber-500 hover:text-amber-400"
              >
                Menunggu ({countMenunggu})
              </Button>
              <Button
                size="sm"
                variant={rewardFilter === "diserahkan" ? "accent" : "outline"}
                onClick={() => setRewardFilter("diserahkan")}
                className="text-xs h-7 px-2.5 text-success hover:text-success"
              >
                Diserahkan ({countDiserahkan})
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <p className="text-xs">Memeriksa data klaim reward...</p>
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border bg-card/60 space-y-2">
              <Gift className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {rewardFilter === "menunggu"
                  ? "Tidak ada reward yang sedang menunggu pengambilan."
                  : rewardFilter === "diserahkan"
                  ? "Belum ada reward yang diserahkan."
                  : "Anda belum pernah menukarkan poin dengan reward merchandise."}
              </p>
              {rewardFilter === "semua" && (
                <Link href="/peserta/reward">
                  <Button size="sm" variant="outline" className="text-xs mt-1">
                    Buka Katalog Reward
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredRedemptions.map((item) => {
                const isPending = item.status === "menunggu";
                const isHandedOver = item.status === "diserahkan";
                const isCancelled = item.status === "ditolak";

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 transition-all space-y-3 relative overflow-hidden ${
                      isPending
                        ? "border-amber-500/40 bg-amber-500/5 shadow-xs"
                        : isHandedOver
                        ? "border-success/30 bg-success/5"
                        : "border-border/60 bg-muted/20 opacity-85"
                    }`}
                  >
                    {/* Header Card: Status & Mutasi Poin */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        {isPending && (
                          <Badge variant="warning" className="text-[10px] font-bold">
                            MENUNGGU PENGAMBILAN
                          </Badge>
                        )}
                        {isHandedOver && (
                          <Badge variant="success" className="text-[10px] font-bold">
                            SUDAH DISERAHKAN
                          </Badge>
                        )}
                        {isCancelled && (
                          <Badge variant="default" className="text-[10px] font-bold">
                            DIBATALKAN (POIN KEMBALI)
                          </Badge>
                        )}
                      </div>

                      <span className="font-mono text-xs font-bold text-destructive shrink-0">
                        -{item.pointsSpent} Pts
                      </span>
                    </div>

                    {/* Konten Utama */}
                    <div className="space-y-1">
                      <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                        {item.rewardName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Waktu Penukaran: <span className="font-mono">{item.createdAt}</span>
                      </p>
                    </div>

                    {/* Box Kode Pengambilan / Informasi Penyerahan */}
                    <div className="p-2.5 rounded-lg bg-background/80 border border-border/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-accent shrink-0" />
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground block font-mono">
                            Kode Pengambilan:
                          </span>
                          <span className="font-mono text-sm font-black text-accent tracking-wide">
                            {item.pickupCode}
                          </span>
                        </div>
                      </div>

                      {/* Penjelasan Status Spesifik */}
                      <div className="text-right">
                        {isPending && (
                          <span className="text-[10px] text-amber-500 font-medium block">
                            Stand Media Center
                          </span>
                        )}
                        {isHandedOver && (
                          <span className="text-[10px] text-success font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Selesai Diterima
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-[10px] text-muted-foreground font-medium flex items-center justify-end gap-1">
                            <RotateCcw className="h-3 w-3" /> Saldo Dikembalikan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar / Tombol Aksi */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground">
                        {isPending && (
                          <span>Tunjukkan kode di stand untuk mengambil reward</span>
                        )}
                        {isHandedOver && item.processedAt && (
                          <span>Diserahkan: {item.processedAt}</span>
                        )}
                        {isCancelled && (
                          <span className="italic">{item.note || "Klaim dibatalkan"}</span>
                        )}
                      </div>

                      {/* Tombol Batalkan Klaim HANYA untuk status MENUNGGU */}
                      {isPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelingItem(item)}
                          className="text-xs h-7 px-3 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive shrink-0 font-medium"
                        >
                          Batalkan Klaim
                        </Button>
                      ) : isHandedOver ? (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Tidak dapat dibatalkan
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BAGIAN 2: BUKU BESAR MUTASI TRANSAKSI POIN (LEDGER) */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-lg font-bold text-foreground">
                Mutasi Riwayat Poin (Ledger Transaksi)
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Total {ledgerItems.length} transaksi
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat mutasi buku besar poin...</p>
            </div>
          ) : ledgerItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed border-border bg-card space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Coins className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Belum Ada Riwayat Mutasi Poin
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentTotal > 0
                    ? `Anda saat ini memiliki saldo ${currentTotal} poin. Rincian mutasi transaksi saat ini belum tersedia di sistem.`
                    : "Anda saat ini memiliki saldo 0 poin. Kunjungi stand pameran budaya, lakukan scan QR, atau kerjakan misi tantangan untuk mulai mengumpulkan poin festival."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link href="/peserta/scan">
                  <Button size="sm" variant="outline" className="text-xs">
                    Scan QR Stand
                  </Button>
                </Link>
                <Link href="/peserta/challenge">
                  <Button size="sm" className="text-xs gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Kerjakan Challenge</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Tampilan Mobile: Card List (Tanpa Scroll Horizontal) */}
              <div className="block sm:hidden space-y-2.5">
                {ledgerItems.map((tx) => {
                  const isRefund = tx.source === "Pengembalian Poin";
                  const isSpent = tx.pointsDelta < 0;

                  return (
                    <div
                      key={tx.id}
                      className={`rounded-xl border bg-card p-3.5 space-y-2 shadow-xs transition-colors hover:border-accent/40 ${
                        isRefund
                          ? "border-sky-500/30 bg-sky-500/5"
                          : isSpent
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            isRefund
                              ? "info"
                              : isSpent
                              ? "danger"
                              : "gold"
                          }
                          className="text-[10px] shrink-0 font-medium"
                        >
                          {tx.source}
                        </Badge>
                        <span
                          className={`font-mono font-bold text-sm shrink-0 ${
                            isSpent ? "text-destructive" : isRefund ? "text-sky-500" : "text-accent"
                          }`}
                        >
                          {tx.pointsDelta >= 0 ? `+${tx.pointsDelta}` : tx.pointsDelta} Pts
                        </span>
                      </div>

                      <p className="font-medium text-foreground text-xs leading-relaxed">
                        {tx.description}
                      </p>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                        <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                        <span>{tx.timestamp}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tampilan Desktop: Tabel Lengkap */}
              <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sumber Perolehan</TableHead>
                      <TableHead>Keterangan Transaksi</TableHead>
                      <TableHead>Waktu Transaksi</TableHead>
                      <TableHead className="text-right">Mutasi Poin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerItems.map((tx) => {
                      const isRefund = tx.source === "Pengembalian Poin";
                      const isSpent = tx.pointsDelta < 0;

                      return (
                        <TableRow key={tx.id} className={isRefund ? "bg-sky-500/5" : undefined}>
                          <TableCell>
                            <Badge
                              variant={
                                isRefund
                                  ? "info"
                                  : isSpent
                                  ? "danger"
                                  : "gold"
                              }
                              className="text-[10px]"
                            >
                              {tx.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground text-xs sm:text-sm">
                            {tx.description}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {tx.timestamp}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-bold text-sm sm:text-base ${
                              isSpent
                                ? "text-destructive"
                                : isRefund
                                ? "text-sky-500"
                                : "text-accent"
                            }`}
                          >
                            {tx.pointsDelta >= 0 ? `+${tx.pointsDelta}` : tx.pointsDelta} Pts
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DIALOG KONFIRMASI PEMBATALAN REWARD */}
        {cancelingItem && (
          <Dialog open={!!cancelingItem} onOpenChange={() => !isSubmittingCancel && setCancelingItem(null)}>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>Konfirmasi Pembatalan Klaim Hadiah</span>
                </DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin membatalkan klaim untuk merchandise berikut?
                </DialogDescription>
              </DialogHeader>

              {/* Rincian Klaim & Mutasi Poin Kembali */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground">Merchandise:</span>
                  <strong className="font-semibold text-foreground text-right">
                    {cancelingItem.rewardName}
                  </strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Kode Pengambilan:</span>
                  <span className="font-mono font-bold text-accent">
                    {cancelingItem.pickupCode}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Saldo Saat Ini:</span>
                  <span className="font-mono text-foreground font-semibold">{currentTotal} Poin</span>
                </div>

                <div className="flex justify-between items-center text-success">
                  <span className="font-medium">Poin Akan Dikembalikan:</span>
                  <strong className="font-mono text-sm">+{cancelingItem.pointsSpent} Poin</strong>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-foreground">
                  <span>Estimasi Saldo Baru:</span>
                  <span className="font-mono text-base text-accent">
                    {currentTotal + cancelingItem.pointsSpent} Poin
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-500 leading-relaxed space-y-1">
                <p className="font-semibold">Perhatian:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Kode pengambilan <strong>{cancelingItem.pickupCode}</strong> akan dibatalkan otomatis di antrean panitia.</li>
                  <li>Poin akan langsung kembali ke akun Anda secara instan dan tercatat di buku besar mutasi.</li>
                  <li>Stok hadiah akan dikembalikan ke kuota umum festival.</li>
                </ul>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={isSubmittingCancel}
                  onClick={() => setCancelingItem(null)}
                  className="text-xs"
                >
                  Kembali
                </Button>
                <Button
                  disabled={isSubmittingCancel}
                  onClick={handleConfirmCancel}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold"
                >
                  {isSubmittingCancel ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Membatalkan & Mengembalikan Poin...
                    </>
                  ) : (
                    "Ya, Batalkan & Kembalikan Poin"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
