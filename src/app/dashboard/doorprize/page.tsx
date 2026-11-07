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
  Zap,
  Flame,
  QrCode,
  Timer,
  Crown,
} from "lucide-react";
import {
  getDoorprizePrizes,
  saveDoorprizePrize,
  getDoorprizeEligibleParticipants,
  getDoorprizeHistory,
  spinDoorprize,
  cancelDoorprizeWinner,
  resetDoorprizeHistory,
  startBuzzerRound,
  finishBuzzerRound,
  getBuzzerRoundState,
  switchDoorprizeMode,
  getDoorprizeStageMode,
  type DoorprizeItem,
  type DoorprizeWinnerRecord,
  type DoorprizeFilter,
  type EligibleParticipantItem,
  type BuzzerLeaderboardEntry,
  type BuzzerRoundState,
} from "@/app/actions/doorprize";
import { VipCardCarousel } from "@/components/doorprize/VipCardCarousel";
import { ConfettiCanvas } from "@/components/doorprize/ConfettiCanvas";
import { F1StartLights } from "@/components/doorprize/F1StartLights";
import { BuzzerLeaderboardPodium } from "@/components/doorprize/BuzzerLeaderboardPodium";
import { BuzzerQrCode } from "@/components/doorprize/BuzzerQrCode";
import { createClient } from "@/lib/supabase/client";

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
  const [mcCallCount, setMcCallCount] = React.useState<number>(0);

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

  // Mode State: "vip_carousel" (Undian Sinematik VIP) vs "buzzer" (Buzzer Kilat F1 Reflex)
  const [activeMode, setActiveMode] = React.useState<"vip_carousel" | "buzzer">("vip_carousel");

  // Buzzer Kilat F1 States
  const [buzzerRound, setBuzzerRound] = React.useState<BuzzerRoundState | null>(null);
  const [buzzerStatus, setBuzzerStatus] = React.useState<"idle" | "countdown" | "green" | "finished">("idle");
  const [buzzerLeaderboard, setBuzzerLeaderboard] = React.useState<BuzzerLeaderboardEntry[]>([]);
  const [isStartingBuzzer, setIsStartingBuzzer] = React.useState(false);
  const [isLockingBuzzer, setIsLockingBuzzer] = React.useState(false);
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false);

  // Persistent channel ref for reliable, immediate broadcasts
  const channelRef = React.useRef<any>(null);

  const sendLiveBroadcast = React.useCallback((event: string, payload: Record<string, any>) => {
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: "broadcast",
          event,
          payload,
        });
      } catch (err) {
        console.warn("sendLiveBroadcast error:", err);
      }
    } else {
      try {
        const supabase = createClient();
        supabase.channel("doorprize-live-channel").send({
          type: "broadcast",
          event,
          payload,
        });
      } catch (err) {
        console.warn("Fallback broadcast error:", err);
      }
    }
  }, []);

  // Load initial data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [prizesRes, historyRes, poolRes, buzzerRes, modeRes] = await Promise.all([
        getDoorprizePrizes(),
        getDoorprizeHistory(),
        getDoorprizeEligibleParticipants(filters),
        getBuzzerRoundState(),
        getDoorprizeStageMode(),
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

      if (buzzerRes.success && buzzerRes.round) {
        setBuzzerRound(buzzerRes.round);
        setBuzzerLeaderboard(buzzerRes.round.leaderboard || []);
        setBuzzerStatus(buzzerRes.round.status || "idle");
      }

      if (modeRes.success && modeRes.mode) {
        setActiveMode(modeRes.mode);
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

  // Realtime subscription for Buzzer leaderboard & sync
  React.useEffect(() => {
    const supabase = createClient();
    const liveChannel = supabase
      .channel("doorprize-live-channel")
      .on("broadcast", { event: "buzzer_round_starting" }, ({ payload }) => {
        setBuzzerStatus("countdown");
        setBuzzerLeaderboard([]);
      })
      .on("broadcast", { event: "buzzer_leaderboard_updated" }, ({ payload }) => {
        if (payload?.leaderboard) {
          setBuzzerLeaderboard(payload.leaderboard);
          setBuzzerStatus("green");
        }
      })
      .on("broadcast", { event: "buzzer_round_podium_locked" }, ({ payload }) => {
        setBuzzerStatus("finished");
        if (payload?.allResults) {
          setBuzzerLeaderboard(payload.allResults);
        }
      })
      .subscribe();

    channelRef.current = liveChannel;

    return () => {
      supabase.removeChannel(liveChannel);
      channelRef.current = null;
    };
  }, []);

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
    setMcCallCount(0);

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

      // 2. Set parameter putaran roda / drum
      setTargetSegment(res.targetSegmentIndex ?? 0);
      setCurrentWinner(res.winner);
      setIsSpinning(true);

      // 3. Broadcast langsung dari client browser ke Layar Monitor TV (WebSocket Realtime)
      sendLiveBroadcast("doorprize_spin_started", {
        winner: {
          id: res.winner.id,
          name: res.winner.fullName,
          fullName: res.winner.fullName,
          registrationNumber: res.winner.registrationNumber,
          institution: res.winner.institution,
          phone: res.winner.phone || null,
          totalPoints: res.winner.totalPoints,
        },
        prizeName: selectedPrizeName,
        targetSegmentIndex: res.targetSegmentIndex ?? 0,
        spinDurationMs: 5500,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memutar undian.";
      setFeedback({ type: "error", message });
    }
  };

  // Handle Panggilan Kehadiran MC Panggung (Panggilan 1, 2, 3)
  const handleMcCall = (count: number) => {
    setMcCallCount(count);
    sendLiveBroadcast("doorprize_call_winner", {
      count,
      winnerName: currentWinner?.fullName,
    });
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
        // Broadcast pembatalan ke monitor
        sendLiveBroadcast("doorprize_winner_cancelled", { winnerId });

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
        // Broadcast reset ke monitor
        sendLiveBroadcast("doorprize_history_reset", {});

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

  // Handle Ganti Mode Panggung (Sinematik VIP vs Buzzer Kilat)
  const handleSwitchMode = (mode: "vip_carousel" | "buzzer") => {
    setActiveMode(mode);
    sendLiveBroadcast("doorprize_switch_mode", { mode });
    switchDoorprizeMode(mode).catch((e) => console.warn("Gagal persist switch mode:", e));
  };

  // Handle Mulai Ronde Buzzer Kilat F1 Reflex
  const handleStartBuzzerRound = async () => {
    if (isStartingBuzzer) return;
    if (!selectedPrizeName.trim()) {
      setFeedback({ type: "error", message: "Silakan pilih hadiah doorprize terlebih dahulu." });
      return;
    }

    setIsStartingBuzzer(true);
    setFeedback(null);

    try {
      const res = await startBuzzerRound({
        prizeName: selectedPrizeName,
        prizeId: selectedPrizeId,
      });

      if (res.success && res.round) {
        setBuzzerRound(res.round);
        setBuzzerLeaderboard([]);
        setBuzzerStatus("countdown");

        // Broadcast langsung ke channel live agar Layar Monitor TV beralih otomatis
        sendLiveBroadcast("doorprize_switch_mode", { mode: "buzzer" });
        sendLiveBroadcast("buzzer_round_starting", {
          roundId: res.round.roundId,
          prizeName: res.round.prizeName,
          greenDelayMs: res.round.greenDelayMs,
          startedAt: res.round.startedAt,
        });
        switchDoorprizeMode("buzzer").catch(() => {});

        setFeedback({
          type: "success",
          message: `Ronde Buzzer F1 untuk hadiah "${selectedPrizeName}" telah dimulai! Lampu gantry start sedang menghitung mundur.`,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal memulai ronde buzzer." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat memulai ronde buzzer." });
    } finally {
      setIsStartingBuzzer(false);
    }
  };

  // Handle Kunci Hasil Podium & Tetapkan Juara Doorprize
  const handleLockBuzzerRound = async () => {
    if (!buzzerRound || isLockingBuzzer) return;
    if (buzzerLeaderboard.length === 0) {
      setFeedback({ type: "error", message: "Belum ada catatan refleks peserta yang masuk ke podium." });
      return;
    }

    setIsLockingBuzzer(true);
    try {
      const res = await finishBuzzerRound({ roundId: buzzerRound.roundId });

      if (res.success) {
        setBuzzerStatus("finished");
        setShowConfetti(true);

        // Broadcast penutupan ke layar TV panggung
        sendLiveBroadcast("buzzer_round_podium_locked", {
          roundId: buzzerRound.roundId,
          prizeName: buzzerRound.prizeName,
          podium: buzzerLeaderboard.slice(0, 3),
          allResults: buzzerLeaderboard,
        });

        const top1 = buzzerLeaderboard[0];
        setFeedback({
          type: "success",
          message: `🏆 Juara 1: ${top1.fullName} (${top1.reactionTimeMs} ms) berhasil dinobatkan & tersimpan di database pemenang!`,
        });
        loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal mengunci hasil ronde buzzer." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat mengunci hasil ronde." });
    } finally {
      setIsLockingBuzzer(false);
    }
  };

  // Handle Reset Status Ronde Buzzer
  const handleResetBuzzerRound = () => {
    setBuzzerStatus("idle");
    setBuzzerLeaderboard([]);
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
              <span>Doorprize Arena & Panggung Hadiah</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pilihan mode undian doorprize: Putaran Drum Kartu Sinematik VIP atau Permainan Interaktif Buzzer Kilat F1 Reflex.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQrDialogOpen(true)}
              className="text-xs gap-1.5 shadow-xs font-bold cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-accent" />
              <span>QR Code Peserta</span>
            </Button>
            <Link href="/monitor/doorprize" target="_blank">
              <Button size="sm" variant="accent" className="text-xs gap-1.5 shadow-xs font-bold cursor-pointer">
                <Tv className="h-4 w-4" />
                <span>Buka Layar Panggung (Live TV)</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between p-1.5 rounded-2xl bg-muted/60 border border-border flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleSwitchMode("vip_carousel")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === "vip_carousel"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>★ Undian Sinematik VIP (Drum Card)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("buzzer")}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeMode === "buzzer"
                  ? "bg-red-600 text-white shadow-md font-black shadow-red-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>⚡ Buzzer Kilat F1 Reflex (Multiplayer)</span>
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground px-2 flex items-center gap-2">
            <span className="hidden sm:inline">Mode Layar TV saat ini:</span>
            <Badge variant={activeMode === "buzzer" ? "danger" : "gold"} className="text-[10px] uppercase font-bold">
              {activeMode === "buzzer" ? "Buzzer F1 Reflex" : "Sinematik VIP"}
            </Badge>
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

          {/* Kolom Kanan: Panggung Undian (Sinematik VIP vs Buzzer Kilat) */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-5">
            {activeMode === "vip_carousel" ? (
              <Card className="p-6 sm:p-8 rounded-3xl border-2 border-accent/40 bg-gradient-to-b from-card via-card to-background shadow-xl w-full flex flex-col items-center relative overflow-hidden">
                {/* Stage Lights Banner */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-heading text-xs sm:text-sm font-bold tracking-wider text-foreground uppercase">
                      PANGGUNG SINEMATIK VIP CARD
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

                {/* Sinematik VIP Card Carousel Stage */}
                <div className="w-full py-1">
                  <VipCardCarousel
                    isSpinning={isSpinning}
                    winnerName={currentWinner?.fullName}
                    winnerDetails={currentWinner}
                    sampleParticipants={sampleParticipants}
                    spinDurationMs={5500}
                    onSpinComplete={handleSpinComplete}
                    soundEnabled={soundEnabled}
                    size="default"
                  />
                </div>

                {/* Status Bar Panggung Carousel */}
                <div className="w-full max-w-md h-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center px-4 my-2 text-center">
                  {isSpinning ? (
                    <div className="space-y-0.5 animate-pulse">
                      <span className="text-[10px] font-mono text-accent uppercase tracking-wider block">
                        ⚡ MEMILIH KANDIDAT PEMENANG DI PANGGUNG VIP...
                      </span>
                      <span className="font-heading text-xs sm:text-sm font-bold text-foreground truncate block">
                        Menggeser barisan kartu peserta resmi...
                      </span>
                    </div>
                  ) : currentWinner ? (
                    <span className="text-xs font-semibold text-emerald-500">
                      🎉 Penobatan Pemenang: <strong>{currentWinner.fullName}</strong> ({currentWinner.institution})
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Panggung siap! Klik tombol di bawah untuk memulai undian.
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
                        <span>PENGACAKAN SINEMATIK BERLANGSUNG...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 fill-slate-950" />
                        <span>PUTAR UNDIAN SEREMONIAL SEKARANG</span>
                      </div>
                    )}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 sm:p-8 rounded-3xl border-2 border-red-500/50 bg-gradient-to-b from-card via-card to-background shadow-xl w-full flex flex-col items-center relative overflow-hidden space-y-6">
                {/* Buzzer Stage Banner */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="font-heading text-xs sm:text-sm font-bold tracking-wider text-foreground uppercase flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-red-500 fill-red-500" />
                      <span>ARENA BUZZER KILAT F1 REFLEX • LIVE</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQrDialogOpen(true)}
                      className="text-xs h-7 gap-1 font-bold"
                    >
                      <QrCode className="h-3.5 w-3.5 text-accent" />
                      <span>QR Code</span>
                    </Button>
                    <Badge
                      variant={buzzerStatus === "green" ? "success" : buzzerStatus === "countdown" ? "danger" : "default"}
                      className="text-[10px] font-mono uppercase"
                    >
                      {buzzerStatus === "countdown"
                        ? "Countdown Lampu"
                        : buzzerStatus === "green"
                        ? "Lampu Hijau (Live)"
                        : buzzerStatus === "finished"
                        ? "Podium Dikunci"
                        : "Standby"}
                    </Badge>
                  </div>
                </div>

                {/* Hadiah Aktif Badge */}
                <div className="text-center space-y-1">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase block">
                    SEDANG MEMPEREBUTKAN HADIAH:
                  </span>
                  <h3 className="font-heading text-lg sm:text-2xl font-black text-red-500 drop-shadow-xs">
                    {selectedPrizeName || "Belum Memilih Hadiah"}
                  </h3>
                </div>

                {/* F1 Start Lights */}
                <div className="w-full flex flex-col items-center">
                  <F1StartLights
                    status={buzzerStatus}
                    greenDelayMs={buzzerRound?.greenDelayMs || 2800}
                    onGreenTrigger={() => setBuzzerStatus("green")}
                    size="default"
                  />
                </div>

                {/* Live Podium Leaderboard */}
                <div className="w-full">
                  <BuzzerLeaderboardPodium
                    leaderboard={buzzerLeaderboard}
                    prizeName={selectedPrizeName}
                    size="default"
                  />
                </div>

                {/* Status Bar */}
                <div className="w-full max-w-lg h-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center px-4 text-center">
                  {buzzerStatus === "countdown" ? (
                    <span className="text-xs font-mono font-bold text-red-500 animate-pulse flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      Lampu merah menyala bertahap... Menunggu padam & HIJAU!
                    </span>
                  ) : buzzerStatus === "green" ? (
                    <span className="text-xs font-bold text-emerald-500 animate-pulse flex items-center gap-2">
                      <Zap className="h-4 w-4 fill-emerald-500" />
                      Lampu HIJAU aktif! Menerima refleks peserta live ({buzzerLeaderboard.length} masuk)
                    </span>
                  ) : buzzerStatus === "finished" ? (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Podium Juara telah dikunci dan sah tersimpan ke database!
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Peserta scan QR atau buka /buzzer di HP. Klik tombol di bawah untuk menyalakan lampu F1!
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="w-full max-w-md space-y-2.5 pt-1">
                  {buzzerStatus === "countdown" ? (
                    <Button
                      disabled
                      className="w-full h-14 rounded-2xl font-heading text-sm sm:text-base font-black tracking-wider uppercase bg-muted text-muted-foreground border border-border"
                    >
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>LAMPU START F1 SEDANG MENGHITUNG MUNDUR...</span>
                    </Button>
                  ) : buzzerStatus === "green" && buzzerLeaderboard.length > 0 ? (
                    <Button
                      onClick={handleLockBuzzerRound}
                      disabled={isLockingBuzzer}
                      className="w-full h-14 rounded-2xl font-heading text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer font-bold"
                    >
                      {isLockingBuzzer ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>MENGUNCI JUARA PODIUM...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 fill-slate-950" />
                          <span>KUNCI JUARA PODIUM & SIMPAN KE DATABASE</span>
                        </div>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStartBuzzerRound}
                      disabled={isStartingBuzzer}
                      className="w-full h-14 rounded-2xl font-heading text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer font-bold"
                    >
                      {isStartingBuzzer ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>MENYIAPKAN LAMPU START F1...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 fill-white" />
                          <span>
                            {buzzerStatus === "finished" ? "MULAI RONDE BUZZER BARU (START)" : "MULAI RONDE BUZZER F1 (LAMPU START)"}
                          </span>
                        </div>
                      )}
                    </Button>
                  )}

                  {/* Secondary Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setQrDialogOpen(true)}
                      className="text-xs h-8 gap-1.5 flex-1"
                    >
                      <QrCode className="h-3.5 w-3.5 text-accent" />
                      <span>QR Peserta</span>
                    </Button>
                    <Link href="/buzzer" target="_blank" className="flex-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5 w-full"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Buka HP</span>
                      </Button>
                    </Link>
                    {buzzerStatus !== "idle" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleResetBuzzerRound}
                        className="text-xs h-8 text-muted-foreground hover:text-danger"
                        title="Reset tampilan ronde saat ini"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        <span>Reset</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
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

              {/* Kontrol Panggilan MC Kehadiran Panggung */}
              <div className="p-3.5 rounded-2xl border border-border bg-muted/40 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    Panggilan Kehadiran MC Panggung:
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-accent">
                    {mcCallCount === 0
                      ? "Menunggu Panggilan"
                      : `Panggilan ke-${mcCallCount}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      size="sm"
                      variant={mcCallCount >= num ? "accent" : "outline"}
                      onClick={() => handleMcCall(num)}
                      className="text-xs h-8 font-mono font-bold"
                    >
                      Panggilan {num}
                    </Button>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight">
                  Status panggilan langsung disiarkan ke Layar Monitor TV agar peserta segera maju ke panggung.
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2 justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const winnerRec = history.find((h) => h.participantId === currentWinner.id && h.status === "sah");
                    if (winnerRec) {
                      handleCancelWinner(winnerRec.id, currentWinner.fullName);
                    }
                    setShowWinnerModal(false);
                  }}
                  className="w-full sm:w-auto text-xs text-danger hover:bg-danger/10 border-danger/30"
                >
                  Peserta Tidak Hadir (Batalkan)
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWinnerModal(false)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Tutup
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowWinnerModal(false);
                    }}
                    className="w-full sm:w-auto text-xs font-bold"
                  >
                    Selesai & Lanjut
                  </Button>
                </div>
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
        {/* Modal QR Code Masuk Buzzer Kilat Peserta */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <div className="p-4 sm:p-6 text-center space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-heading font-black">
                QR Code Masuk Buzzer Kilat F1
              </DialogTitle>
              <DialogDescription className="text-xs">
                Peserta dapat scan QR ini dengan kamera HP masing-masing untuk langsung bergabung ke panggung buzzer tanpa ribet login.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center py-2">
              <BuzzerQrCode size={220} />
            </div>

            <div className="p-2.5 rounded-xl bg-muted/60 border border-border text-xs font-mono font-bold text-accent">
              URL: /buzzer (atau /peserta/buzzer)
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Link href="/buzzer" target="_blank" className="w-full sm:w-auto">
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5">
                  <span>Buka di Layar HP / Tab</span>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
              <Button size="sm" onClick={() => setQrDialogOpen(false)} className="w-full sm:w-auto text-xs font-bold">
                Tutup
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

