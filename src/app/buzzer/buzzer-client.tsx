"use client";

import * as React from "react";
import Link from "next/link";
import {
  Zap,
  Trophy,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  ArrowRight,
  Radio,
  Timer,
  CheckCircle2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { F1StartLights } from "@/components/doorprize/F1StartLights";
import { ConfettiCanvas } from "@/components/doorprize/ConfettiCanvas";
import { soundEffects } from "@/components/doorprize/sound-effects";
import {
  submitBuzzerReaction,
  getBuzzerRoundState,
  type BuzzerRoundState,
} from "@/app/actions/doorprize";

export function BuzzerClient({
  initialRound,
  initialUser,
}: {
  initialRound?: BuzzerRoundState | null;
  initialUser?: {
    fullName: string;
    institution?: string;
    registrationNumber?: string;
    phone?: string;
  } | null;
}) {
  // Player identity
  const [fullName, setFullName] = React.useState(initialUser?.fullName || "");
  const [institution, setInstitution] = React.useState(initialUser?.institution || "");
  const [registrationNumber, setRegistrationNumber] = React.useState(
    initialUser?.registrationNumber || ""
  );
  const [isReady, setIsReady] = React.useState(Boolean(initialUser?.fullName));

  // Round states
  const [round, setRound] = React.useState<BuzzerRoundState | null>(initialRound || null);
  const [roundStatus, setRoundStatus] = React.useState<"idle" | "countdown" | "green" | "finished">(
    initialRound?.status || "idle"
  );
  const [greenDelayMs, setGreenDelayMs] = React.useState(initialRound?.greenDelayMs || 2800);

  // Gameplay states
  const [hasPressed, setHasPressed] = React.useState(false);
  const [isFalseStart, setIsFalseStart] = React.useState(false);
  const [reactionMs, setReactionMs] = React.useState<number | null>(null);
  const [userRank, setUserRank] = React.useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [showConfetti, setShowConfetti] = React.useState(false);

  const greenTimeRef = React.useRef<number>(0);

  // Realtime Supabase Subscription
  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("doorprize-live-channel")
      .on("broadcast", { event: "buzzer_round_starting" }, ({ payload }) => {
        setHasPressed(false);
        setIsFalseStart(false);
        setReactionMs(null);
        setUserRank(null);
        setShowConfetti(false);

        if (payload?.roundId) {
          setRound({
            roundId: payload.roundId,
            prizeName: payload.prizeName || "Doorprize Utama",
            status: "countdown",
            greenDelayMs: payload.greenDelayMs || 2800,
            startedAt: payload.startedAt,
            leaderboard: [],
            falseStartsCount: 0,
          });
          setGreenDelayMs(payload.greenDelayMs || 2800);
          setRoundStatus("countdown");
        }
      })
      .on("broadcast", { event: "buzzer_round_podium_locked" }, () => {
        setRoundStatus("finished");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Saat Lampu Berubah HIJAU
  const handleGreenTrigger = React.useCallback(() => {
    greenTimeRef.current = performance.now();
    setRoundStatus("green");
    soundEffects.playTick(1.8);
  }, []);

  // Handler saat tombol buzzer ditekan peserta
  const handleBuzzerPress = async () => {
    if (hasPressed || isFalseStart || roundStatus === "finished") return;

    // Haptic feedback getar HP
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(100);
    }

    // A. FALSE START (Lampu belum hijau / masih countdown merah)
    if (roundStatus === "countdown") {
      setIsFalseStart(true);
      setHasPressed(true);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      if (round?.roundId) {
        submitBuzzerReaction({
          roundId: round.roundId,
          fullName: fullName.trim() || "Peserta Anonim",
          institution: institution.trim() || "UMUM",
          registrationNumber: registrationNumber.trim() || "PESERTA",
          reactionTimeMs: 0,
          isFalseStart: true,
        }).catch(() => {});
      }
      return;
    }

    // B. REAKSI SAH (Lampu sudah Hijau)
    if (roundStatus === "green") {
      const now = performance.now();
      const elapsed = Math.max(80, Math.round(now - greenTimeRef.current));
      setReactionMs(elapsed);
      setHasPressed(true);
      soundEffects.playCeremonialChime();
      setShowConfetti(true);

      if (round?.roundId) {
        try {
          const res = await submitBuzzerReaction({
            roundId: round.roundId,
            fullName: fullName.trim() || "Peserta Kilat",
            institution: institution.trim() || "UMUM",
            registrationNumber: registrationNumber.trim() || "GBB",
            reactionTimeMs: elapsed,
            isFalseStart: false,
          });

          if (res.success && res.rank) {
            setUserRank(res.rank);
          }
        } catch (err) {
          console.error("Gagal kirim refleks:", err);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-black relative overflow-hidden">
      <ConfettiCanvas active={showConfetti} />

      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 border-b border-white/10 px-4 sm:px-8 flex items-center justify-between z-20 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black">
            <Zap className="h-4 w-4 fill-slate-950" />
          </div>
          <div>
            <span className="font-heading font-black text-sm text-white block">BUZZER KILAT F1</span>
            <span className="text-[10px] font-mono text-amber-400 block -mt-0.5">GEBYAR BULAN BAHASA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              soundEffects.setMuted(soundEnabled);
            }}
            className="p-2 rounded-xl bg-white/5 text-white/70 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <Link href="/monitor/doorprize" target="_blank">
            <button className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10">
              Layar TV
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center z-10 space-y-6">
        {/* STEP 1: FORM IDENTITAS PESERTA (JIKA BELUM DIISI) */}
        {!isReady ? (
          <div className="w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-amber-400/30 shadow-2xl space-y-5 animate-in fade-in-50 duration-300">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto mb-2 ring-4 ring-amber-400/10">
                <User className="h-7 w-7" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white">
                Masuk Arena Buzzer Kilat
              </h2>
              <p className="text-xs text-white/60">
                Masukkan nama dan sekolah Anda untuk langsung bergabung ke perebutan doorprize panggung.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (fullName.trim()) setIsReady(true);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80 block">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className="w-full h-11 rounded-xl bg-slate-950 border border-white/20 px-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80 block">Asal Sekolah / Instansi</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: SMKN 2 Jakarta"
                  className="w-full h-11 rounded-xl bg-slate-950 border border-white/20 px-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/80 block">Nomor Registrasi (Opsional)</label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Contoh: GBB-0142"
                  className="w-full h-11 rounded-xl bg-slate-950 border border-white/20 px-3 text-sm font-medium text-white placeholder:text-white/30 focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <span>SIAP IKUT BERTANDING</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: ARENA TOMBOL BUZZER LAYAR PENUH */
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Hadiah yang Sedang Diperebutkan */}
            <div className="text-center space-y-1">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
                MEREBUTKAN HADIAH:
              </span>
              <h2 className="font-heading text-lg sm:text-2xl font-black text-white">
                🎁 {round?.prizeName || "Doorprize Utama"}
              </h2>
              <span className="text-xs text-white/50 block">
                Pemain: <strong>{fullName}</strong> ({institution || "Umum"})
              </span>
            </div>

            {/* Lampu Start F1 Mini di HP */}
            <F1StartLights
              status={roundStatus}
              greenDelayMs={greenDelayMs}
              onGreenTrigger={handleGreenTrigger}
              size="default"
            />

            {/* HASIL REAKSI / FALSE START BANNER */}
            {isFalseStart && (
              <div className="p-4 rounded-2xl bg-red-500/20 border-2 border-red-500 text-center space-y-1 animate-bounce">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                <h3 className="font-heading font-black text-lg text-red-400">FALSE START!</h3>
                <p className="text-xs text-red-200">
                  Anda menekan sebelum lampu HIJAU menyala. Diskualifikasi untuk ronde ini! Tunggu aba-aba ronde berikutnya.
                </p>
              </div>
            )}

            {reactionMs !== null && !isFalseStart && (
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-400 text-center space-y-1 shadow-2xl">
                <Sparkles className="h-6 w-6 text-amber-400 mx-auto animate-pulse" />
                <span className="text-xs font-mono text-amber-300 uppercase tracking-wider block font-bold">
                  CATATAN REFLEKS ANDA:
                </span>
                <p className="font-heading text-3xl sm:text-4xl font-black text-amber-400">
                  ⚡ {reactionMs} ms
                </p>
                {userRank && (
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs inline-block mt-1">
                    Peringkat Sementara: #{userRank}
                  </span>
                )}
              </div>
            )}

            {/* TOMBOL BUZZER RAKSASA */}
            <div className="py-4">
              <button
                type="button"
                onClick={handleBuzzerPress}
                disabled={hasPressed || roundStatus === "finished" || roundStatus === "idle"}
                className={`relative rounded-full select-none transition-all duration-75 active:scale-90 flex items-center justify-center cursor-pointer ${
                  isFalseStart
                    ? "w-64 h-64 bg-red-950 border-8 border-red-600 opacity-60 cursor-not-allowed"
                    : roundStatus === "green"
                    ? "w-72 h-72 sm:w-80 sm:h-80 bg-gradient-to-tr from-emerald-600 via-emerald-400 to-emerald-200 border-8 border-emerald-300 shadow-[0_0_80px_rgba(16,185,129,0.9)] animate-pulse"
                    : roundStatus === "countdown"
                    ? "w-64 h-64 sm:w-72 sm:h-72 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 border-8 border-amber-300 shadow-[0_0_50px_rgba(245,158,11,0.5)]"
                    : "w-60 h-60 bg-slate-900 border-8 border-white/20 opacity-50 cursor-not-allowed"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                {/* Ring Efek Dalam */}
                <div className="absolute inset-4 rounded-full border-2 border-white/40 flex flex-col items-center justify-center text-center p-4">
                  <Zap
                    className={`h-12 w-12 sm:h-16 sm:w-16 mb-1 ${
                      roundStatus === "green" ? "fill-slate-950 text-slate-950" : "fill-white text-white"
                    }`}
                  />
                  <span
                    className={`font-heading font-black tracking-wider uppercase ${
                      roundStatus === "green"
                        ? "text-2xl sm:text-3xl text-slate-950"
                        : "text-lg sm:text-xl text-white"
                    }`}
                  >
                    {isFalseStart
                      ? "GUGUR"
                      : hasPressed
                      ? "TERCATAT!"
                      : roundStatus === "green"
                      ? "TEKAN SEKARANG!"
                      : roundStatus === "countdown"
                      ? "SIAP-SIAP!"
                      : "STANDBY"}
                  </span>
                  <span className="text-[10px] font-mono text-white/70 block mt-1">
                    {roundStatus === "countdown" ? "TUNGGU LAMPU HIJAU" : ""}
                  </span>
                </div>
              </button>
            </div>

            {/* Tips Peringatan */}
            <p className="text-[11px] text-white/50 text-center max-w-xs">
              {roundStatus === "countdown"
                ? "Awas! Jangan tekan saat lampu masih merah atau Anda akan terkena diskualifikasi False Start."
                : "Sentuh tombol secepat kilat saat lampu berubah hijau. Waktu refleks dihitung dalam milidetik."}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-white/10 px-6 flex items-center justify-between text-[11px] text-white/40 z-20">
        <span>Gebyar Bulan Bahasa • Arena Buzzer Kilat</span>
        <span>Akurasi Refleks ±1ms</span>
      </footer>
    </div>
  );
}

