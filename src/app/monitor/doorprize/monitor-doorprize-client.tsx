"use client";

import * as React from "react";
import Link from "next/link";
import {
  Trophy,
  Gift,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  Sparkles,
  Users,
  Award,
  ArrowLeft,
  Crown,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { soundEffects } from "@/components/doorprize/sound-effects";
import { VipCardCarousel } from "@/components/doorprize/VipCardCarousel";
import { MatrixRainDraw } from "@/components/doorprize/MatrixRainDraw";
import { ConfettiCanvas } from "@/components/doorprize/ConfettiCanvas";
import { F1StartLights } from "@/components/doorprize/F1StartLights";
import { BuzzerLeaderboardPodium } from "@/components/doorprize/BuzzerLeaderboardPodium";
import { BuzzerQrCode } from "@/components/doorprize/BuzzerQrCode";
import { renderBrandText } from "@/components/ui/BrandText";
import {
  getDoorprizePrizes,
  getDoorprizeHistory,
  getDoorprizeStageMode,
  getDoorprizeAnimationStyle,
  type DoorprizeItem,
  type DoorprizeWinnerRecord,
  type EligibleParticipantItem,
  type BuzzerLeaderboardEntry,
  type DoorprizeAnimationStyle,
} from "@/app/actions/doorprize";

function maskPhoneNumber(phone?: string | null): string {
  if (!phone || phone.trim().length < 6) return "";
  const clean = phone.trim();
  if (clean.length <= 8) {
    return clean.slice(0, 3) + "****" + clean.slice(-2);
  }
  return clean.slice(0, 4) + "-****-" + clean.slice(-4);
}

export function MonitorDoorprizeClient({
  initialPrizes,
  initialHistory,
  initialParticipants = [],
}: {
  initialPrizes: DoorprizeItem[];
  initialHistory: DoorprizeWinnerRecord[];
  initialParticipants?: EligibleParticipantItem[];
}) {
  const [prizes, setPrizes] = React.useState<DoorprizeItem[]>(initialPrizes);
  const [history, setHistory] = React.useState<DoorprizeWinnerRecord[]>(initialHistory);
  const [participants, setParticipants] = React.useState<EligibleParticipantItem[]>(initialParticipants);
  const [activePrizeName, setActivePrizeName] = React.useState<string>(
    initialPrizes[0]?.name || "Doorprize Gebyar Bulan Bahasa"
  );

  // Spin states
  const [isWarmingUp, setIsWarmingUp] = React.useState(false);
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [suspensePhase, setSuspensePhase] = React.useState<"idle" | "suspense" | "flash" | "revealed">("idle");
  const [targetSegment, setTargetSegment] = React.useState(0);
  // Inisialisasi pemenang dari pemenang sah terakhir jika ada, atau null (menampilkan kartu teaser misteri)
  const [winner, setWinner] = React.useState<EligibleParticipantItem | null>(() => {
    const latest = initialHistory.find((w) => w.status === "sah");
    if (!latest) return null;
    return {
      id: latest.participantId,
      fullName: latest.participantName,
      registrationNumber: latest.participantRegNum,
      institution: latest.participantInstitution,
      totalPoints: 0,
      status: "terverifikasi",
      phone: latest.participantPhone || null,
    };
  });
  const [showWinnerCard, setShowWinnerCard] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [shufflingName, setShufflingName] = React.useState("");
  const [callCount, setCallCount] = React.useState<number>(0);

  // Game mode & Buzzer states: "vip_carousel" vs "buzzer"
  const [activeMode, setActiveMode] = React.useState<"vip_carousel" | "buzzer">("vip_carousel");
  const [animationStyle, setAnimationStyle] = React.useState<DoorprizeAnimationStyle>("matrix");
  const [buzzerStatus, setBuzzerStatus] = React.useState<"idle" | "countdown" | "green" | "finished">("idle");
  const [buzzerDelayMs, setBuzzerDelayMs] = React.useState(2800);
  const [buzzerLeaderboard, setBuzzerLeaderboard] = React.useState<BuzzerLeaderboardEntry[]>([]);

  // Display controls
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [realtimeConnected, setRealtimeConnected] = React.useState(true);
  const [showHistoryDrawer, setShowHistoryDrawer] = React.useState(false);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Initial Stage Mode & Animation Style Fetch
  React.useEffect(() => {
    getDoorprizeStageMode().then((res) => {
      if (res.success && res.mode) {
        setActiveMode(res.mode);
      }
    });
    getDoorprizeAnimationStyle().then((res) => {
      if (res.success && res.style) {
        setAnimationStyle(res.style);
      }
    });
  }, []);

  // Realtime Supabase Subscription
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("doorprize-live-channel")
      .on("broadcast", { event: "doorprize_spin_initiating" }, ({ payload }) => {
        setActiveMode("vip_carousel");
        setShowWinnerCard(false);
        setSuspensePhase("idle");
        setShowConfetti(false);
        setCallCount(0);
        if (payload?.prizeName) setActivePrizeName(payload.prizeName);
        setIsWarmingUp(true);
        setIsSpinning(false);
      })
      .on("broadcast", { event: "doorprize_spin_started" }, ({ payload }) => {
        setIsWarmingUp(false);
        setSuspensePhase("idle");
        if (payload?.animationStyle) {
          setAnimationStyle(payload.animationStyle);
        }
        if (payload?.winner) {
          setActiveMode("vip_carousel");
          setShowWinnerCard(false);
          setShowConfetti(false);
          setCallCount(0);
          if (payload.prizeName) setActivePrizeName(payload.prizeName);
          setTargetSegment(payload.targetSegmentIndex ?? 0);
          setWinner({
            id: payload.winner.id,
            fullName: payload.winner.fullName || payload.winner.name || "Peserta Beruntung",
            registrationNumber: payload.winner.registrationNumber || "-",
            institution: payload.winner.institution || "Umum",
            totalPoints: payload.winner.totalPoints || 0,
            status: "terverifikasi",
            phone: payload.winner.phone || null,
          });
          setIsSpinning(true);
        }
      })
      .on("broadcast", { event: "doorprize_spin_cancelled" }, () => {
        setIsWarmingUp(false);
        setIsSpinning(false);
        setSuspensePhase("idle");
      })
      .on("broadcast", { event: "doorprize_call_winner" }, ({ payload }) => {
        if (payload?.count) {
          setCallCount(payload.count);
        }
      })
      .on("broadcast", { event: "doorprize_winner_cancelled" }, () => {
        getDoorprizeHistory().then((res) => {
          if (res.success && res.winners) setHistory(res.winners);
        });
      })
      .on("broadcast", { event: "doorprize_history_reset" }, () => {
        setHistory([]);
        setWinner(null);
        setShowWinnerCard(false);
        setSuspensePhase("idle");
        setShowConfetti(false);
        setIsWarmingUp(false);
        setIsSpinning(false);
        setCallCount(0);
        setBuzzerStatus("idle");
        setBuzzerLeaderboard([]);
        getDoorprizePrizes().then((res) => {
          if (res.success && res.prizes) setPrizes(res.prizes);
        });
      })
      .on("broadcast", { event: "buzzer_round_starting" }, ({ payload }) => {
        setActiveMode("buzzer");
        setBuzzerStatus("countdown");
        setBuzzerLeaderboard([]);
        if (payload?.prizeName) setActivePrizeName(payload.prizeName);
        if (payload?.greenDelayMs) setBuzzerDelayMs(payload.greenDelayMs);
      })
      .on("broadcast", { event: "buzzer_leaderboard_updated" }, ({ payload }) => {
        if (payload?.leaderboard) {
          setBuzzerLeaderboard(payload.leaderboard);
        }
      })
      .on("broadcast", { event: "buzzer_round_podium_locked" }, ({ payload }) => {
        setBuzzerStatus("finished");
        if (payload?.allResults) {
          setBuzzerLeaderboard(payload.allResults);
        }
        setShowConfetti(true);
      })
      .on("broadcast", { event: "doorprize_switch_mode" }, ({ payload }) => {
        if (payload?.mode) {
          const nextMode = payload.mode === "buzzer" ? "buzzer" : "vip_carousel";
          setActiveMode(nextMode);
        }
      })
      .on("broadcast", { event: "doorprize_animation_style_changed" }, ({ payload }) => {
        if (payload?.style) {
          setAnimationStyle(payload.style);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Shuffling animation during spin (Mengacak dari data peserta asli database festival)
  React.useEffect(() => {
    if (!isSpinning) return;

    const interval = setInterval(() => {
      if (participants.length > 0) {
        const idx = Math.floor(Math.random() * participants.length);
        const p = participants[idx];
        setShufflingName(`${p.fullName} • ${p.institution}`);
      } else {
        setShufflingName("Mengacak Peserta Terdaftar • Gebyar Bulan Bahasa");
      }
    }, 70);

    return () => clearInterval(interval);
  }, [isSpinning, participants]);

  const handleSpinComplete = React.useCallback(() => {
    setIsSpinning(false);

    // 1. Fase Suspense (500ms): Panggung hening sejenak membangun ketegangan & antisipasi
    setSuspensePhase("suspense");

    setTimeout(() => {
      // 2. Fase Flash & Sub-Boom (220ms): Kilatan cahaya emas meledak + dentuman bass panggung + konfeti
      setSuspensePhase("flash");
      setShowConfetti(true);
      if (soundEnabled) {
        soundEffects.playWinnerRevealSound();
      }

      setTimeout(() => {
        // 3. Fase Revealed: Popup Obsidian-Gold Megah tampil membesar di layar utama
        setSuspensePhase("revealed");
        setShowWinnerCard(true);

        // Refresh riwayat pemenang di database
        getDoorprizeHistory().then((res) => {
          if (res.success && res.winners) setHistory(res.winners);
        });
      }, 220);
    }, 500);
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Confetti Explosion */}
      <ConfettiCanvas active={showConfetti} />

      {/* Decorative Stage Lighting Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between z-20 gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/media/monitor"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0"
            title="Kembali ke Konsol Monitor"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-base sm:text-xl font-black tracking-tight text-white truncate">
                {renderBrandText("GEBYAR BULAN BAHASA")}
              </span>
              <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 shrink-0">
                PANGGUNG UTAMA
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/50 font-medium truncate">
              Sistem Undian Roda Keberuntungan & Doorprize Resmi
            </p>
          </div>
        </div>

        {/* Info Hadiah Aktif di Header (Ringkas & Elegan) */}
        <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-white/5 to-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm shadow-sm max-w-sm xl:max-w-md shrink min-w-0">
          <Gift className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-wider font-semibold">
              Hadiah Diundi:
            </span>
            <span className="text-white font-extrabold truncate text-xs drop-shadow-sm">
              {activePrizeName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Tombol Hamburger: Pemenang Doorprize Sebelumnya */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all cursor-pointer group shadow-sm"
            title="Buka Daftar Pemenang Doorprize Sebelumnya"
          >
            <Menu className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-xs font-bold tracking-wide">
              Pemenang Sebelumnya
            </span>
            {history.filter((w) => w.status !== "dibatalkan").length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                {history.filter((w) => w.status !== "dibatalkan").length}
              </span>
            )}
          </button>

          {/* Mode Switcher Pills */}
          <div className="hidden sm:flex items-center p-1 rounded-2xl bg-white/10 border border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveMode("vip_carousel")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "vip_carousel"
                  ? "bg-amber-400 text-slate-950 shadow-md font-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              <span>Sinematik VIP</span>
            </button>
            <button
              onClick={() => setActiveMode("buzzer")}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMode === "buzzer"
                  ? "bg-emerald-400 text-slate-950 shadow-md font-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Buzzer Kilat F1</span>
            </button>
          </div>

          {/* Status Realtime */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                realtimeConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-white/80">
              {realtimeConnected ? "LIVE PANGGUNG" : "CONNECTING..."}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title={soundEnabled ? "Matikan Suara" : "Aktifkan Suara"}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5 text-amber-400" /> : <VolumeX className="h-5 w-5" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (TV/Proyektor)"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center items-center z-10">
        {activeMode === "vip_carousel" ? (
          /* PANGGUNG 1: CAROUSEL VIP SINEMATIK & MATRIX NAMA PESERTA (TAMPIL FULL) */
          <div className="w-full flex-1 flex flex-col items-center justify-center space-y-5 my-auto">
            {/* Card Utama: Tampil Penuh Memanfaatkan Seluruh Ruang Layar */}
            <div className="w-full">
              {animationStyle === "matrix" ? (
                <MatrixRainDraw
                  isSpinning={isSpinning}
                  isWarmingUp={isWarmingUp}
                  winnerName={winner?.fullName}
                  winnerDetails={winner}
                  allParticipants={participants}
                  spinDurationMs={5500}
                  onSpinComplete={handleSpinComplete}
                  soundEnabled={soundEnabled}
                  size="large"
                />
              ) : (
                <VipCardCarousel
                  isSpinning={isSpinning}
                  isWarmingUp={isWarmingUp}
                  winnerName={winner?.fullName}
                  winnerDetails={winner}
                  sampleParticipants={participants}
                  spinDurationMs={5500}
                  onSpinComplete={handleSpinComplete}
                  soundEnabled={soundEnabled}
                  size="large"
                />
              )}
            </div>

            {/* Status Bar Panggung Seremonial */}
            <div className="w-full max-w-2xl h-14 rounded-2xl bg-white/5 border border-amber-500/20 flex items-center justify-center px-6 text-center backdrop-blur-md shadow-lg">
              {isWarmingUp ? (
                <div className="space-y-0.5 animate-pulse">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                    ⚡ MENGHUBUNGI SERVER & MENGACAK 100+ PESERTA ⚡
                  </span>
                  <span className="font-heading text-sm sm:text-base font-black text-amber-300 truncate block">
                    Mengacak database dari ratusan peserta festival...
                  </span>
                </div>
              ) : isSpinning ? (
                <div className="space-y-0.5 animate-pulse">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                    ✦ PENGUNDIAN SEREMONIAL SEDANG BERLANGSUNG ✦
                  </span>
                  <span className="font-heading text-sm sm:text-base font-black text-white truncate block">
                    Menyeleksi pemenang di bawah sorotan panggung...
                  </span>
                </div>
              ) : showWinnerCard && winner ? (
                <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Pemenang Sah Terkunci: <strong>{winner.fullName}</strong></span>
                </span>
              ) : (
                <div className="flex items-center gap-2 text-white/60 text-xs font-semibold">
                  <Radio className="h-4 w-4 text-amber-400 animate-pulse" />
                  <span>Panggung Siap • Menunggu Perintah Putar dari Panitia</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* PANGGUNG 2: ARENA BUZZER KILAT F1 REFLEX */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Kolom Kiri: F1 Start Lights + Podium Leaderboard */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-6">
              {/* F1 Start Lights Gantry */}
              <F1StartLights
                status={buzzerStatus}
                greenDelayMs={buzzerDelayMs}
                onGreenTrigger={() => setBuzzerStatus("green")}
                size="large"
              />

              {/* Realtime Podium Leaderboard */}
              <div className="w-full">
                <BuzzerLeaderboardPodium
                  leaderboard={buzzerLeaderboard}
                  prizeName={activePrizeName}
                  size="large"
                />
              </div>
            </div>

            {/* Kolom Kanan: Hadiah Aktif & QR Code Masuk Arena via HP */}
            <div className="lg:col-span-4 space-y-6">
              {/* Kartu Hadiah yang Sedang Diperebutkan */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-white/5 to-transparent border border-emerald-400/30 backdrop-blur-md shadow-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold tracking-widest uppercase font-mono">
                  <Zap className="h-4 w-4 fill-emerald-400" />
                  <span>DIPEREBUTKAN LEWAT REFLEKS KILAT</span>
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-black text-white leading-tight">
                  {activePrizeName}
                </h2>
                <p className="text-xs text-white/60 leading-relaxed">
                  Peserta tercepat menekan tombol saat lampu berubah hijau akan dinobatkan sebagai Juara 1 di panggung!
                </p>
              </div>

              {/* QR Code Bergabung via HP */}
              <BuzzerQrCode url="https://bulanbahasa.smkdp2jkt.sch.id/buzzer" />
            </div>
          </div>
        )}
      </main>

      {/* 1. SUSPENSE STAGE DIMMER (Saat putaran baru berhenti) */}
      {suspensePhase === "suspense" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none">
          <div className="text-center space-y-4 animate-pulse">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
              <Crown className="h-10 w-10 text-amber-300 animate-bounce" />
            </div>
            <div className="space-y-1">
              <span className="font-heading text-xl sm:text-3xl font-black text-amber-300 tracking-widest uppercase block drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                ✦ MENGUNCI KANDIDAT JUARA... ✦
              </span>
              <p className="font-mono text-xs sm:text-sm text-white/70">
                Panggung sedang menyiapkan penobatan pemenang resmi
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL-SCREEN GOLDEN FLASH BLAST */}
      {suspensePhase === "flash" && (
        <div className="fixed inset-0 z-[70] bg-gradient-to-tr from-amber-400 via-yellow-100 to-amber-500 pointer-events-none animate-out fade-out duration-300" />
      )}

      {/* 3. WINNER OVERLAY POP-UP (GRAND OBSIDIAN-GOLD CEREMONIAL MASTERPIECE) */}
      {showWinnerCard && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in-0 duration-300 overflow-y-auto">
          {/* Latar Belakang Sinar Matahari Emas Berputar (Rotating Sunburst Rays) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <div
              className="w-[1400px] h-[1400px] rounded-full opacity-35 animate-spin"
              style={{
                animationDuration: "50s",
                background:
                  "repeating-conic-gradient(from 0deg, rgba(245, 158, 11, 0.45) 0deg 12deg, transparent 12deg 24deg)",
                maskImage: "radial-gradient(circle, black 32%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(circle, black 32%, transparent 72%)",
              }}
            />
            {/* Ambient Golden Core Aura */}
            <div className="absolute w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-amber-500/35 via-yellow-400/25 to-transparent blur-3xl animate-pulse pointer-events-none" />
          </div>

          {/* KARTU OBSIDIAN-GOLD MEWAH */}
          <div className="relative max-w-4xl w-full p-8 sm:p-12 md:p-14 rounded-[36px] bg-gradient-to-b from-slate-900/95 via-slate-950/98 to-slate-900/95 border-2 border-amber-400/80 shadow-[0_0_120px_rgba(245,158,11,0.45)] text-center space-y-6 sm:space-y-7 overflow-hidden z-10 animate-in zoom-in-75 duration-500 ease-out">
            {/* Ornamen Sudut Emas Klasik Kerajaan */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400 pointer-events-none">
              <div className="w-1.5 h-1.5 bg-amber-400 absolute -top-1 -left-1 rounded-full shadow-[0_0_6px_#f59e0b]" />
            </div>
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-400 pointer-events-none">
              <div className="w-1.5 h-1.5 bg-amber-400 absolute -top-1 -right-1 rounded-full shadow-[0_0_6px_#f59e0b]" />
            </div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-amber-400 pointer-events-none">
              <div className="w-1.5 h-1.5 bg-amber-400 absolute -bottom-1 -left-1 rounded-full shadow-[0_0_6px_#f59e0b]" />
            </div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-amber-400 pointer-events-none">
              <div className="w-1.5 h-1.5 bg-amber-400 absolute -bottom-1 -right-1 rounded-full shadow-[0_0_6px_#f59e0b]" />
            </div>

            {/* Tombol Tutup Pojok */}
            <button
              onClick={() => {
                setShowWinnerCard(false);
                setShowConfetti(false);
                setSuspensePhase("idle");
              }}
              className="absolute top-5 right-5 text-white/50 hover:text-white text-xs px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer z-20"
            >
              ✕ Tutup
            </button>

            {/* Top Royal Crest Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              <Crown className="h-4 w-4 text-amber-300 animate-bounce" />
              <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-amber-200 uppercase">
                ★ PENOBATAN RESMI PEMENANG DOORPRIZE ★
              </span>
              <Sparkles className="h-4 w-4 text-amber-300" />
            </div>

            {/* Glowing Trophy Centerpiece with Royal Ring */}
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-600 blur-xl opacity-60 animate-pulse" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 text-slate-950 flex items-center justify-center shadow-2xl ring-4 sm:ring-8 ring-amber-400/30 animate-bounce">
                <Trophy className="h-12 w-12 sm:h-16 sm:w-16 drop-shadow-md text-slate-950" />
              </div>
            </div>

            {/* Massive Winner Name with Gold Glow */}
            <div className="space-y-2.5 sm:space-y-3">
              <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-400 tracking-tight leading-tight drop-shadow-[0_4px_35px_rgba(245,158,11,0.7)] break-words px-2">
                {winner.fullName}
              </h1>

              {/* Institution / School */}
              <p className="font-heading text-xl sm:text-3xl font-extrabold text-white/90 drop-shadow-md break-words">
                {winner.institution}
              </p>

              {/* Registration & Phone */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs sm:text-sm font-mono text-amber-300/90 pt-1">
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30">
                  No. Registrasi: <strong className="text-amber-200 font-bold">{winner.registrationNumber}</strong>
                </span>
                {winner.phone && maskPhoneNumber(winner.phone) && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30">
                    No. HP: <strong className="text-amber-200 font-bold">{maskPhoneNumber(winner.phone)}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Status Panggilan Kehadiran MC */}
            {callCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-600/30 via-amber-500/30 to-red-600/30 border-2 border-amber-400 text-amber-200 animate-pulse shadow-[0_0_40px_rgba(245,158,11,0.4)] space-y-1">
                <span className="font-mono text-xs uppercase tracking-widest block font-bold text-amber-300">
                  📢 PANGGILAN KEHADIRAN PANGGUNG UTAMA
                </span>
                <p className="font-heading text-3xl sm:text-4xl font-black text-amber-400 drop-shadow-md">
                  PANGGILAN KE-{callCount}!
                </p>
                <p className="text-xs sm:text-base font-semibold text-white/95 max-w-xl mx-auto">
                  Peserta atas nama <strong>{winner.fullName}</strong> dipersilakan segera menuju ke depan panggung utama sekarang.
                </p>
              </div>
            )}

            {/* Prize Showcase Pedestal */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-amber-500/20 border-2 border-amber-400/50 shadow-inner space-y-1.5">
              <span className="text-xs sm:text-sm font-mono text-amber-300 uppercase tracking-widest block font-bold">
                MEMENANGKAN HADIAH DOORPRIZE:
              </span>
              <p className="font-heading text-2xl sm:text-4xl font-black text-amber-300 drop-shadow-md break-words">
                🎁 {activePrizeName}
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setShowWinnerCard(false);
                  setShowConfetti(false);
                  setSuspensePhase("idle");
                }}
                className="px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-heading text-sm sm:text-base font-black uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_45px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer"
              >
                Lanjutkan Undian Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DRAWER SLIDE-OVER: DAFTAR PEMENANG DOORPRIZE SEBELUMNYA (GAYA MENU HAMBURGER) */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop gelap transparan (klik di luar untuk menutup) */}
          <div
            onClick={() => setShowHistoryDrawer(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          />

          {/* Panel Slide-over Drawer dari Kanan */}
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900/98 via-slate-950/98 to-slate-900/98 border-l border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.85)] h-full flex flex-col z-10 animate-in slide-in-from-right duration-300 ease-out">
            {/* Header Drawer */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-base tracking-wide">
                    Pemenang Sebelumnya
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    {history.filter((w) => w.status !== "dibatalkan").length} Pemenang Doorprize Sah
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Tutup Panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* List Riwayat Pemenang */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {history.filter((w) => w.status !== "dibatalkan").length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <p className="text-white/40 text-xs italic">
                    Belum ada pemenang yang tercatat. Putaran perdana akan segera dimulai!
                  </p>
                </div>
              ) : (
                history
                  .filter((w) => w.status !== "dibatalkan")
                  .map((w, i) => {
                    const timeStr = w.drawnAt
                      ? new Date(w.drawnAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "";

                    return (
                      <div
                        key={w.id || i}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition-all text-xs space-y-2.5 group"
                      >
                        {/* Baris Atas: Nama Pemenang & Asal Sekolah */}
                        <div className="min-w-0 space-y-0.5">
                          <span className="font-heading font-black text-white text-sm sm:text-base block truncate tracking-wide group-hover:text-amber-200 transition-colors">
                            {w.participantName}
                          </span>
                          <span className="text-[11px] sm:text-xs text-white/70 block truncate">
                            {w.participantInstitution} • No: {w.participantRegNum}
                          </span>
                        </div>

                        {/* Baris Bawah: Badge Hadiah & Jam Pengundian */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                          <span
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-semibold text-[11px] border border-amber-500/30 truncate max-w-[70%]"
                            title={w.doorprizeName}
                          >
                            🎁 {w.doorprizeName}
                          </span>
                          {timeStr && (
                            <span className="text-[10px] font-mono text-white/40 shrink-0">
                              {timeStr}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Footer Drawer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-white/40 font-mono">
              <span>Gebyar Bulan Bahasa</span>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer text-xs font-sans font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer Info Bar */}
      <footer className="h-14 border-t border-white/10 bg-slate-950/80 px-6 sm:px-10 flex items-center justify-between text-xs text-white/50 z-20">
        <span>Gebyar Bulan Bahasa • Layar Undian Resmi Panggung</span>
        <span>Kanal Monitor Panggung TV 1080p / 4K</span>
      </footer>
    </div>
  );
}

