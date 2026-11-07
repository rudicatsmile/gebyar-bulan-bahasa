"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Sparkles,
  Gift,
  Tv,
  ExternalLink,
  Users,
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Filter,
  Plus,
  Radio,
  Award,
} from "lucide-react";
import {
  getDoorprizePrizes,
  saveDoorprizePrize,
  getDoorprizeEligibleParticipants,
  getDoorprizeHistory,
  spinDoorprize,
  cancelDoorprizeWinner,
  resetDoorprizeHistory,
  type DoorprizeItem,
  type DoorprizeWinnerRecord,
  type DoorprizeFilter,
  type EligibleParticipantItem,
} from "@/app/actions/doorprize";
import { LuckyWheel } from "@/components/doorprize/LuckyWheel";
import { ConfettiCanvas } from "@/components/doorprize/ConfettiCanvas";

export default function DashboardDoorprizePage() {
  // Data states
  const [prizes, setPrizes] = React.useState<DoorprizeItem[]>([]);
  const [selectedPrizeName, setSelectedPrizeName] = React.useState("");
  const [selectedPrizeId, setSelectedPrizeId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<DoorprizeWinnerRecord[]>([]);
  const [eligibleCount, setEligibleCount] = React.useState<number>(0);
  const [sampleParticipants, setSampleParticipants] = React.useState<EligibleParticipantItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Spin states
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [targetSegment, setTargetSegment] = React.useState(0);
  const [currentWinner, setCurrentWinner] = React.useState<EligibleParticipantItem | null>(null);
  const [showWinnerModal, setShowWinnerModal] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [shufflingName, setShufflingName] = React.useState<string>("");

  // Filters state
  const [filters, setFilters] = React.useState<DoorprizeFilter>({
    verificationStatus: "all",
    excludePreviousWinners: true,
    minPoints: 0,
    participantType: "all",
    institutionKeyword: "",
  });

  // Dialog states
  const [prizeDialogOpen, setPrizeDialogOpen] = React.useState(false);
  const [newPrizeName, setNewPrizeName] = React.useState("");
  const [newPrizeDesc, setNewPrizeDesc] = React.useState("");
  const [newPrizeQty, setNewPrizeQty] = React.useState("1");
  const [newPrizeSponsor, setNewPrizeSponsor] = React.useState("");
  const [savingPrize, setSavingPrize] = React.useState(false);

  // Feedback states
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load initial data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [prizesRes, historyRes, poolRes] = await Promise.all([
        getDoorprizePrizes(),
        getDoorprizeHistory(),
        getDoorprizeEligibleParticipants(filters),
      ]);

      if (prizesRes.success && prizesRes.prizes) {
        setPrizes(prizesRes.prizes);
        if (!selectedPrizeName && prizesRes.prizes.length > 0) {
          const firstActive = prizesRes.prizes.find((p) => p.isActive && p.remainingQuantity > 0) || prizesRes.prizes[0];
          setSelectedPrizeName(firstActive.name);
          setSelectedPrizeId(firstActive.id);
        }
      }

      if (historyRes.success && historyRes.winners) {
        setHistory(historyRes.winners);
      }

      if (poolRes.success) {
        setEligibleCount(poolRes.count);
        setSampleParticipants(poolRes.participants);
      }
    } catch (err) {
      console.error("Gagal load data doorprize:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedPrizeName]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Shuffling names animation while spinning
  React.useEffect(() => {
    if (!isSpinning || sampleParticipants.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * sampleParticipants.length);
      const p = sampleParticipants[randomIdx];
      setShufflingName(`${p.fullName} • ${p.institution}`);
    }, 85);

    return () => clearInterval(interval);
  }, [isSpinning, sampleParticipants]);

  // Handle Action: Spin Doorprize
  const handleSpin = async () => {
    if (isSpinning) return;
    if (!selectedPrizeName.trim()) {
      setFeedback({ type: "error", message: "Silakan pilih hadiah doorprize terlebih dahulu." });
      return;
    }
    if (eligibleCount === 0) {
      setFeedback({ type: "error", message: "Tidak ada peserta yang memenuhi kriteria undian." });
      return;
    }

    setFeedback(null);
    setShowWinnerModal(false);
    setShowConfetti(false);

    try {
      // 1. Eksekusi randomisasi aman di server
      const res = await spinDoorprize({
        prizeName: selectedPrizeName,
        prizeId: selectedPrizeId,
        filters,
      });

      if (!res.success || !res.winner) {
        setFeedback({ type: "error", message: res.error || "Gagal mengundi pemenang." });
        return;
      }

      // 2. Set parameter putaran roda
      setTargetSegment(res.targetSegmentIndex ?? 0);
      setCurrentWinner(res.winner);
      setIsSpinning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memutar undian.";
      setFeedback({ type: "error", message });
    }
  };

  // Callback saat animasi roda selesai berputar
  const handleSpinComplete = React.useCallback(() => {
    setIsSpinning(false);
    setShowConfetti(true);
    setShowWinnerModal(true);
    loadData();
  }, [loadData]);

  // Handle Cancel Winner
  const handleCancelWinner = async (winnerId: string, name: string) => {
    const confirmCancel = confirm(`Batalkan pemenang "${name}"? Peserta akan diizinkan ikut undian berikutnya.`);
    if (!confirmCancel) return;

    try {
      const res = await cancelDoorprizeWinner(winnerId, "Peserta tidak hadir saat dipanggil 3 kali");
      if (res.success) {
        setFeedback({ type: "success", message: `Pemenang ${name} berhasil dibatalkan.` });
        loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal membatalkan pemenang." });
      }
    } catch (err) {
      console.error("Gagal batal pemenang:", err);
    }
  };

  // Handle Reset History
  const handleResetHistory = async () => {
    const confirmReset = confirm("Reset seluruh riwayat pemenang doorprize? Tindakan ini biasanya untuk simulasi / uji coba.");
    if (!confirmReset) return;

    try {
      const res = await resetDoorprizeHistory();
      if (res.success) {
        setFeedback({ type: "success", message: "Riwayat undian doorprize telah dibersihkan." });
        loadData();
      }
    } catch (err) {
      console.error("Gagal reset:", err);
    }
  };

  // Handle Create New Prize
  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeName.trim()) return;
    setSavingPrize(true);

    try {
      const res = await saveDoorprizePrize({
        name: newPrizeName.trim(),
        description: newPrizeDesc.trim(),
        totalQuantity: parseInt(newPrizeQty) || 1,
        sponsor: newPrizeSponsor.trim(),
      });

      if (res.success) {
        setPrizeDialogOpen(false);
        setNewPrizeName("");
        setNewPrizeDesc("");
        setNewPrizeQty("1");
        setNewPrizeSponsor("");
        setFeedback({ type: "success", message: "Hadiah doorprize baru berhasil ditambahkan." });
        loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal menyimpan hadiah." });
      }
    } finally {
      setSavingPrize(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      {/* Confetti Explosion saat Pemenang Muncul */}
      <ConfettiCanvas active={showConfetti} />

      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Gift className="h-7 w-7 text-accent" />
              <span>Doorprize Spinner & Roda Keberuntungan</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Undian doorprize digital berbasis server-side randomization untuk 100+ peserta dengan animasi Roda Keberuntungan dan tayangan panggung.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/monitor/doorprize" target="_blank">
              <Button size="sm" variant="accent" className="text-xs gap-1.5 shadow-xs font-bold cursor-pointer">
                <Tv className="h-4 w-4" />
                <span>Buka Layar Monitor Panggung (Live TV)</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Kolom Kiri: Konfigurasi Undian, Hadiah, Filter, & Riwayat */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Pilih Hadiah Doorprize */}
            <Card className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <h2 className="font-heading text-sm font-bold text-foreground">
                    1. Hadiah yang Diundi
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrizeDialogOpen(true)}
                  className="text-xs h-7 gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Tambah Hadiah</span>
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium block">
                  Pilih Dari Daftar Hadiah Doorprize:
                </label>
                <select
                  value={selectedPrizeId || ""}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedPrizeId(pid);
                    const item = prizes.find((p) => p.id === pid);
                    if (item) setSelectedPrizeName(item.name);
                  }}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {prizes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sponsor ? `(Sponsor: ${p.sponsor})` : ""} — Sisa: {p.remainingQuantity} Unit
                    </option>
                  ))}
                </select>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Atau Tulis Nama Hadiah Kustom:</span>
                </div>
                <Input
                  value={selectedPrizeName}
                  onChange={(e) => {
                    setSelectedPrizeName(e.target.value);
                    setSelectedPrizeId(null);
                  }}
                  placeholder="Contoh: Sepeda Polygon / Smart TV 32 Inch"
                  className="h-9 text-xs"
                />
              </div>
            </Card>

            {/* 2. Filter Pool Peserta Eligible */}
            <Card className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <h2 className="font-heading text-sm font-bold text-foreground">
                    2. Filter Pool Peserta Eligible
                  </h2>
                </div>
                <Badge variant="gold" className="text-[11px] font-mono">
                  {eligibleCount} Peserta Siap Diundi
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                {/* Anti Duplikasi */}
                <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/80 bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.excludePreviousWinners}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, excludePreviousWinners: e.target.checked }))
                    }
                    className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Anti-Menang Ganda (Rekomendasi)
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Kecualikan peserta yang sudah pernah menang doorprize sebelumnya.
                    </span>
                  </div>
                </label>

                {/* Status Verifikasi */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium block">Status Peserta:</label>
                  <select
                    value={filters.verificationStatus}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        verificationStatus: e.target.value as any,
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value="all">Semua Peserta (Belum Ditolak)</option>
                    <option value="terverifikasi">Hanya Peserta Terverifikasi (Hadir)</option>
                    <option value="menunggu_verifikasi">Hanya Menunggu Verifikasi</option>
                  </select>
                </div>

                {/* Jenis Peserta */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-medium block">Kategori Peserta:</label>
                  <select
                    value={filters.participantType}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        participantType: e.target.value as any,
                      }))
                    }
                    className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    <option value="all">Semua (Peserta Lomba & Penonton Umum)</option>
                    <option value="lomba">Hanya Peserta yang Mendaftar Lomba</option>
                    <option value="non_lomba">Hanya Penonton / Non-Lomba</option>
                  </select>
                </div>

                {/* Minimal Poin */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground font-medium">Minimal Poin Keaktifan:</label>
                    <span className="text-accent font-mono font-bold">≥ {filters.minPoints} Pts</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={10}
                    value={filters.minPoints}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, minPoints: parseInt(e.target.value) || 0 }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Hanya peserta yang telah mengumpulkan minimal poin tantangan stand/twibbon.
                  </span>
                </div>
              </div>
            </Card>

            {/* 3. Riwayat Pemenang Doorprize */}
            <Card className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <h2 className="font-heading text-sm font-bold text-foreground">
                    Riwayat Pemenang ({history.length})
                  </h2>
                </div>
                {history.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleResetHistory}
                    className="text-[11px] h-7 text-danger hover:bg-danger/10"
                    title="Bersihkan riwayat undian"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-1 border border-dashed rounded-xl">
                  <Gift className="h-6 w-6 mx-auto opacity-30 text-accent" />
                  <p className="text-xs font-semibold text-foreground">Belum Ada Pemenang Undian</p>
                  <p className="text-[11px]">Tekan tombol putar roda untuk mengundi doorprize perdana.</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {history.map((w, idx) => {
                    const isCancelled = w.status === "dibatalkan";
                    return (
                      <div
                        key={w.id || idx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                          isCancelled
                            ? "border-border/40 bg-muted/20 opacity-60 line-through"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground truncate">{w.participantName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              ({w.participantRegNum})
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {w.participantInstitution}
                          </p>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <Badge variant={isCancelled ? "danger" : "gold"} className="text-[9px] px-1.5 py-0">
                              {w.doorprizeName}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(w.drawnAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {!isCancelled && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelWinner(w.id, w.participantName)}
                            className="text-xs h-7 text-danger hover:bg-danger/10 shrink-0"
                            title="Batalkan pemenang jika peserta tidak hadir saat dipanggil 3 kali"
                          >
                            Batal
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Kolom Kanan: Roda Keberuntungan & Tombol Spin */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-5">
            <Card className="p-6 sm:p-8 rounded-3xl border-2 border-accent/40 bg-gradient-to-b from-card via-card to-background shadow-xl w-full flex flex-col items-center relative overflow-hidden">
              {/* Stage Lights Banner */}
              <div className="w-full flex items-center justify-between pb-4 border-b border-border/80">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-heading text-xs sm:text-sm font-bold tracking-wider text-foreground uppercase">
                    PANGGUNG UNDIAN DOORPRIZE
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                    title={soundEnabled ? "Nonaktifkan Suara" : "Aktifkan Suara"}
                  >
                    {soundEnabled ? <Volume2 className="h-4 w-4 text-accent" /> : <VolumeX className="h-4 w-4" />}
                  </button>
                  <Badge variant="default" className="text-[10px] font-mono">
                    Pool: {eligibleCount} Peserta
                  </Badge>
                </div>
              </div>

              {/* Hadiah Aktif Badge */}
              <div className="py-3 text-center space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block">
                  SEDANG MENGUNDI HADIAH:
                </span>
                <h3 className="font-heading text-lg sm:text-2xl font-black text-accent drop-shadow-xs">
                  {selectedPrizeName || "Belum Memilih Hadiah"}
                </h3>
              </div>

              {/* Roda Keberuntungan Utama */}
              <div className="py-4">
                <LuckyWheel
                  isSpinning={isSpinning}
                  targetSegmentIndex={targetSegment}
                  spinDurationMs={6000}
                  onSpinComplete={handleSpinComplete}
                  soundEnabled={soundEnabled}
                  size={360}
                />
              </div>

              {/* Name Shuffle Bar saat berputar */}
              <div className="w-full max-w-md h-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center px-4 my-2 text-center">
                {isSpinning ? (
                  <div className="space-y-0.5 animate-pulse">
                    <span className="text-[10px] font-mono text-accent uppercase tracking-wider block">
                      ⚡ MENGACAK NAMA DARI DATABASE...
                    </span>
                    <span className="font-heading text-xs sm:text-sm font-bold text-foreground truncate block">
                      {shufflingName || "Memilih kandidat beruntung..."}
                    </span>
                  </div>
                ) : currentWinner ? (
                  <span className="text-xs font-semibold text-emerald-500">
                    🎉 Pemenang Terpilih: <strong>{currentWinner.fullName}</strong> ({currentWinner.institution})
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Siap diundi! Klik tombol putar roda di bawah ini.
                  </span>
                )}
              </div>

              {/* Tombol Spin Raksasa */}
              <div className="pt-3 w-full max-w-sm">
                <Button
                  onClick={handleSpin}
                  disabled={isSpinning || eligibleCount === 0}
                  className="w-full h-14 rounded-2xl font-heading text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-950 shadow-lg hover:shadow-amber-500/30 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSpinning ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>RODA SEDANG BERPUTAR...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 fill-slate-950" />
                      <span>PUTAR RODA SEKARANG (SPIN)</span>
                    </div>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal Pengumuman Pemenang (Winner Dialog) */}
        <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
          {currentWinner && (
            <div className="space-y-5 text-center p-2 sm:p-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg ring-4 ring-amber-300/30 animate-bounce">
                <Trophy className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold tracking-widest text-accent uppercase block">
                  SELAMAT KEPADA PEMENANG!
                </span>
                <DialogTitle className="font-heading text-2xl sm:text-3xl font-black text-foreground">
                  {currentWinner.fullName}
                </DialogTitle>
                <DialogDescription className="text-sm font-semibold text-muted-foreground">
                  {currentWinner.institution} • No: {currentWinner.registrationNumber}
                </DialogDescription>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-accent/10 to-amber-500/15 border border-amber-500/40 text-center space-y-1">
                <span className="text-[11px] font-mono text-muted-foreground uppercase">
                  BERHAK MEMPEROLEH HADIAH:
                </span>
                <p className="font-heading text-lg sm:text-xl font-black text-accent">
                  🎁 {selectedPrizeName}
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWinnerModal(false)}
                  className="w-full sm:w-auto text-xs"
                >
                  Tutup Notifikasi
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowWinnerModal(false);
                  }}
                  className="w-full sm:w-auto text-xs font-bold"
                >
                  Siap Undi Hadiah Lainnya
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>

        {/* Modal Tambah Hadiah Baru */}
        <Dialog open={prizeDialogOpen} onOpenChange={setPrizeDialogOpen}>
          <form onSubmit={handleSavePrize} className="space-y-4 p-2 sm:p-4">
            <DialogHeader>
              <DialogTitle>Tambah Hadiah Doorprize Baru</DialogTitle>
              <DialogDescription>
                Masukkan nama barang atau hadiah yang akan diundi pada sesi doorprize.
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Nama Hadiah *"
              placeholder="Contoh: Sepeda Lipat Polygon Urbano"
              value={newPrizeName}
              onChange={(e) => setNewPrizeName(e.target.value)}
              required
            />

            <Input
              label="Jumlah Stok Unit *"
              type="number"
              min={1}
              value={newPrizeQty}
              onChange={(e) => setNewPrizeQty(e.target.value)}
              required
            />

            <Input
              label="Sponsor / Donatur Hadiah (Opsional)"
              placeholder="Contoh: Komite Sekolah / Bank BJB"
              value={newPrizeSponsor}
              onChange={(e) => setNewPrizeSponsor(e.target.value)}
            />

            <Input
              label="Keterangan Tambahan (Opsional)"
              placeholder="Contoh: Warna merah hitam, garansi 1 tahun"
              value={newPrizeDesc}
              onChange={(e) => setNewPrizeDesc(e.target.value)}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrizeDialogOpen(false)}
                disabled={savingPrize}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={savingPrize} className="font-bold gap-1.5">
                {savingPrize && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Simpan Hadiah</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

