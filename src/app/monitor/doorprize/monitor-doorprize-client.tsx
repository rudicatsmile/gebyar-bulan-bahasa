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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VipCardCarousel } from "@/components/doorprize/VipCardCarousel";
import { ConfettiCanvas } from "@/components/doorprize/ConfettiCanvas";
import { F1StartLights } from "@/components/doorprize/F1StartLights";
import { BuzzerLeaderboardPodium } from "@/components/doorprize/BuzzerLeaderboardPodium";
import { BuzzerQrCode } from "@/components/doorprize/BuzzerQrCode";
import { renderBrandText } from "@/components/ui/BrandText";
import {
  getDoorprizePrizes,
  getDoorprizeHistory,
  getDoorprizeStageMode,
  type DoorprizeItem,
  type DoorprizeWinnerRecord,
  type EligibleParticipantItem,
  type BuzzerLeaderboardEntry,
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
}: {
  initialPrizes: DoorprizeItem[];
  initialHistory: DoorprizeWinnerRecord[];
}) {
  const [prizes, setPrizes] = React.useState<DoorprizeItem[]>(initialPrizes);
  const [history, setHistory] = React.useState<DoorprizeWinnerRecord[]>(initialHistory);
  const [activePrizeName, setActivePrizeName] = React.useState<string>(
    initialPrizes[0]?.name || "Doorprize Gebyar Bulan Bahasa"
  );

  // Spin states
  const [isSpinning, setIsSpinning] = React.useState(false);
  const [targetSegment, setTargetSegment] = React.useState(0);
  const [winner, setWinner] = React.useState<EligibleParticipantItem | null>(null);
  const [showWinnerCard, setShowWinnerCard] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [shufflingName, setShufflingName] = React.useState("");
  const [callCount, setCallCount] = React.useState<number>(0);

  // Game mode & Buzzer states: "vip_carousel" vs "buzzer"
  const [activeMode, setActiveMode] = React.useState<"vip_carousel" | "buzzer">("vip_carousel");
  const [buzzerStatus, setBuzzerStatus] = React.useState<"idle" | "countdown" | "green" | "finished">("idle");
  const [buzzerDelayMs, setBuzzerDelayMs] = React.useState(2800);
  const [buzzerLeaderboard, setBuzzerLeaderboard] = React.useState<BuzzerLeaderboardEntry[]>([]);

  // Display controls
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [realtimeConnected, setRealtimeConnected] = React.useState(true);

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

  // Initial Stage Mode Fetch
  React.useEffect(() => {
    getDoorprizeStageMode().then((res) => {
      if (res.success && res.mode) {
        setActiveMode(res.mode);
      }
    });
  }, []);

  // Realtime Supabase Subscription
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("doorprize-live-channel")
      .on("broadcast", { event: "doorprize_spin_started" }, ({ payload }) => {
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
        setShowConfetti(false);
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

  // Shuffling animation during spin
  React.useEffect(() => {
    if (!isSpinning) return;
    const dummyNames = [
      "Ahmad Fauzi • SMKN 2 Jakarta",
      "Siti Nurhaliza • SMAN 70 Jakarta",
      "Budi Santoso • SMK Diponegoro 2",
      "Rina Anggraini • SMKN 26 Jakarta",
      "Dimas Pratama • SMA Labschool",
      "Dewi Lestari • SMKN 48 Jakarta",
      "Eko Kurniawan • SMAN 8 Jakarta",
      "Fitri Handayani • SMK Grafika",
      "Gita Rahayu • SMAN 68 Jakarta",
      "Hadi Wibowo • SMK Negeri 1 Jakarta",
    ];

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * dummyNames.length);
      setShufflingName(dummyNames[idx]);
    }, 70);

    return () => clearInterval(interval);
  }, [isSpinning]);

  const handleSpinComplete = React.useCallback(() => {
    setIsSpinning(false);
    setShowConfetti(true);
    setShowWinnerCard(true);

    // Refresh history
    getDoorprizeHistory().then((res) => {
      if (res.success && res.winners) setHistory(res.winners);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Confetti Explosion */}
      <ConfettiCanvas active={showConfetti} />

      {/* Decorative Stage Lighting Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="h-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md px-6 sm:px-10 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/media/monitor"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Kembali ke Konsol Monitor"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg sm:text-xl font-black tracking-tight text-white">
                {renderBrandText("GEBYAR BULAN BAHASA")}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                PANGGUNG UTAMA
              </span>
            </div>
            <p className="text-xs text-white/50 font-medium">
              Sistem Undian Roda Keberuntungan & Doorprize Resmi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher Pills */}
          <div className="flex items-center p-1 rounded-2xl bg-white/10 border border-white/10 text-xs font-bold">
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                realtimeConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-white/80">
              {realtimeConnected ? "KONEKSI LIVE PANGGUNG" : "MENYAMBUNGKAN..."}
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
          /* PANGGUNG 1: CAROUSEL VIP SINEMATIK */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Kolom Kiri: Panggung Sinematik VIP Card Carousel */}
            <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-full">
                <VipCardCarousel
                  isSpinning={isSpinning}
                  winnerName={winner?.fullName}
                  winnerDetails={winner}
                  spinDurationMs={5500}
                  onSpinComplete={handleSpinComplete}
                  soundEnabled={soundEnabled}
                  size="large"
                />
              </div>

              {/* Status Bar Panggung Seremonial */}
              <div className="w-full max-w-xl h-14 rounded-2xl bg-white/5 border border-amber-500/20 flex items-center justify-center px-6 text-center backdrop-blur-md shadow-lg">
                {isSpinning ? (
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

            {/* Kolom Kanan: Hadiah Aktif & Riwayat Terakhir */}
            <div className="lg:col-span-4 space-y-6">
              {/* Kartu Hadiah yang Sedang Diundi */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/15 backdrop-blur-md shadow-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold tracking-widest uppercase">
                  <Gift className="h-4 w-4" />
                  <span>SEDANG DIUNDI SAAT INI</span>
                </div>
                <h2 className="font-heading text-2xl sm:text-4xl font-black text-white leading-tight drop-shadow-md">
                  {activePrizeName}
                </h2>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Hadiah resmi doorprize Gebyar Bulan Bahasa untuk peserta festival yang terpilih secara acak.
                </p>
              </div>

              {/* Riwayat Pemenang Terakhir di Layar TV */}
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span className="font-heading text-xs sm:text-sm font-bold text-white tracking-wider uppercase">
                      Pemenang Doorprize Sebelumnya
                    </span>
                  </div>
                  <span className="text-xs font-mono text-white/50">
                    {history.filter((w) => w.status !== "dibatalkan").length} Pemenang Sah
                  </span>
                </div>

                {history.filter((w) => w.status !== "dibatalkan").length === 0 ? (
                  <div className="py-6 text-center text-white/40 text-xs italic">
                    Belum ada pemenang yang tercatat. Putaran perdana akan segera dimulai!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {history
                      .filter((w) => w.status !== "dibatalkan")
                      .slice(0, 4)
                      .map((w, i) => (
                        <div
                          key={w.id || i}
                          className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <span className="font-bold text-white block truncate text-sm">
                              {w.participantName}
                            </span>
                            <span className="text-[11px] text-white/60 block truncate">
                              {w.participantInstitution} • No: {w.participantRegNum}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] shrink-0 border border-amber-500/30">
                            {w.doorprizeName}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
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

      {/* WINNER OVERLAY POP-UP (GIANT BANNER READABLE FROM DISTANCE) */}
      {showWinnerCard && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-in zoom-in-95 duration-300">
          <div className="relative max-w-3xl w-full p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.3)] text-center space-y-6">
            {/* Top Close Button */}
            <button
              onClick={() => setShowWinnerCard(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕ Tutup
            </button>

            {/* Glowing Trophy */}
            <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-400 via-amber-300 to-amber-600 text-slate-950 flex items-center justify-center shadow-2xl ring-8 ring-amber-400/20 animate-bounce">
              <Trophy className="h-14 w-14 sm:h-16 sm:w-16" />
            </div>

            <div className="space-y-3">
              <span className="font-mono text-sm sm:text-base font-bold text-amber-400 uppercase tracking-widest">
                🎉 SELAMAT KEPADA PEMENANG DOORPRIZE! 🎉
              </span>

              {/* Massive Name */}
              <h1 className="font-heading text-4xl sm:text-6xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                {winner.fullName}
              </h1>

              {/* Institution & No Registrasi */}
              <p className="font-heading text-lg sm:text-2xl font-bold text-white/80">
                {winner.institution}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-mono text-amber-300">
                <span>No. Registrasi: {winner.registrationNumber}</span>
                {winner.phone && maskPhoneNumber(winner.phone) && (
                  <span>• No. HP: {maskPhoneNumber(winner.phone)}</span>
                )}
              </div>
            </div>

            {/* Status Panggilan Kehadiran MC */}
            {callCount > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-amber-400/35 to-amber-500/25 border-2 border-amber-400 text-amber-300 animate-pulse shadow-xl space-y-1">
                <span className="font-mono text-xs uppercase tracking-wider block text-amber-200">
                  PANGGILAN KEHADIRAN PANGGUNG
                </span>
                <p className="font-heading text-2xl sm:text-3xl font-black text-amber-400">
                  📢 PANGGILAN KE-{callCount}!
                </p>
                <p className="text-xs sm:text-sm font-semibold text-white/95">
                  Peserta atas nama <strong>{winner.fullName}</strong> dipersilakan segera menuju ke depan panggung utama.
                </p>
              </div>
            )}

            {/* Prize Card */}
            <div className="p-5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 space-y-1">
              <span className="text-xs font-mono text-amber-200 uppercase tracking-wider block">
                MEMENANGKAN HADIAH:
              </span>
              <p className="font-heading text-2xl sm:text-3xl font-black text-amber-400">
                🎁 {activePrizeName}
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowWinnerCard(false)}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-heading text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-lg cursor-pointer"
              >
                Lanjutkan Undian Berikutnya
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

