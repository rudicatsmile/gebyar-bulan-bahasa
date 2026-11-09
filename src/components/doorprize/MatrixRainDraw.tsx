"use client";

import * as React from "react";
import { Sparkles, Trophy, Crown, Terminal, ShieldCheck, Cpu, Zap } from "lucide-react";
import { soundEffects } from "./sound-effects";
import type { EligibleParticipantItem } from "@/app/actions/doorprize";

interface MatrixRainDrawProps {
  isSpinning: boolean;
  isWarmingUp?: boolean;
  winnerName?: string | null;
  winnerDetails?: EligibleParticipantItem | null;
  allParticipants?: EligibleParticipantItem[];
  spinDurationMs?: number;
  onSpinComplete?: () => void;
  soundEnabled?: boolean;
  size?: "default" | "large";
  className?: string;
}

const MATRIX_CHARS =
  "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜNｸﾔﾏｹﾀﾅ101010#@$&*<>/\\{}[]~+=!";

function maskPhone(phone?: string | null): string {
  if (!phone || phone.trim().length < 6) return "";
  const clean = phone.trim();
  if (clean.length <= 8) return clean.slice(0, 3) + "****" + clean.slice(-2);
  return clean.slice(0, 4) + "-****-" + clean.slice(-4);
}

export function MatrixRainDraw({
  isSpinning,
  isWarmingUp = false,
  winnerName,
  winnerDetails,
  allParticipants = [],
  spinDurationMs = 5500,
  onSpinComplete,
  soundEnabled = true,
  size = "default",
  className = "",
}: MatrixRainDrawProps) {
  const isLarge = size === "large";
  const stageHeight = isLarge ? 500 : 390;

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [scrambleName, setScrambleName] = React.useState<string>("");
  const [scrambleReg, setScrambleReg] = React.useState<string>("");
  const [scrambleInst, setScrambleInst] = React.useState<string>("");
  const [fastPoolStream, setFastPoolStream] = React.useState<EligibleParticipantItem[]>([]);
  const [isLocked, setIsLocked] = React.useState(false);

  const onSpinCompleteRef = React.useRef(onSpinComplete);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  React.useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Siapkan pool peserta yang kaya untuk cascading stream
  React.useEffect(() => {
    if (allParticipants.length > 0) {
      setFastPoolStream(allParticipants.slice(0, 40));
    }
  }, [allParticipants]);

  // =========================================================================
  // 1. CANVAS MATRIX DIGITAL RAIN (Background cascading 60fps)
  // =========================================================================
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || stageHeight);

    const fontSize = isLarge ? 16 : 13;
    let columns = Math.floor(width / fontSize);
    let drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || stageHeight;
      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -50));
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      // Background fade trail
      ctx.fillStyle = isSpinning
        ? "rgba(2, 6, 23, 0.15)"
        : "rgba(2, 6, 23, 0.25)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      const speedMultiplier = isSpinning ? 1.8 : 0.8;

      for (let i = 0; i < drops.length; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Karakter kepala lebih terang/putih neon
        if (Math.random() > 0.85) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#10b981";
          ctx.shadowBlur = 8;
        } else if (isSpinning && Math.random() > 0.92) {
          ctx.fillStyle = "#f59e0b"; // Percikan aksen emas festival
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = "#10b981"; // Emerald Matrix green
          ctx.shadowColor = "#059669";
          ctx.shadowBlur = 4;
        }

        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speedMultiplier;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpinning, isLarge, stageHeight]);

  // =========================================================================
  // 2. LOGIKA DEKRIPSI & ACUAN NAMA PESERTA BERPUTAR CEPAT (SCRAMBLE CYCLE)
  // =========================================================================
  React.useEffect(() => {
    if (!isSpinning && !isWarmingUp) {
      setIsLocked(false);
      return;
    }

    setIsLocked(false);
    const startTime = Date.now();
    const finalTargetName =
      winnerName || winnerDetails?.fullName || "Peserta Beruntung";
    const finalTargetReg =
      winnerDetails?.registrationNumber || "GBB-2026-WIN";
    const finalTargetInst =
      winnerDetails?.institution || "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA";

    let tickCounter = 0;
    const scrambleInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / spinDurationMs);

      tickCounter++;
      if (tickCounter % 3 === 0 && soundEnabled) {
        soundEffects.playTick(1.0 + progress * 0.5);
      }

      // Ambil peserta acak dari pool untuk stream nama
      if (allParticipants.length > 0) {
        const randP =
          allParticipants[Math.floor(Math.random() * allParticipants.length)];
        // Ganti nama acak jika masih fase acak cepat
        if (progress < 0.65) {
          setScrambleName(randP.fullName);
          setScrambleReg(randP.registrationNumber || "GBB-PASS");
          setScrambleInst(randP.institution || "Festival Peserta");
          return;
        }
      }

      // Fase Dekripsi Progresif Menuju Pemenang (Progress >= 0.65)
      const lockThreshold = (progress - 0.65) / 0.35; // 0 to 1
      const charsToLock = Math.floor(lockThreshold * finalTargetName.length);

      let scrambled = "";
      for (let i = 0; i < finalTargetName.length; i++) {
        if (i < charsToLock || finalTargetName[i] === " ") {
          scrambled += finalTargetName[i];
        } else {
          scrambled +=
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        }
      }
      setScrambleName(scrambled);

      // Dekripsi no registrasi & instansi
      if (progress > 0.8) {
        setScrambleReg(finalTargetReg);
        setScrambleInst(finalTargetInst);
      } else {
        setScrambleReg(`GBB-${Math.floor(1000 + Math.random() * 9000)}`);
        setScrambleInst(
          allParticipants[Math.floor(Math.random() * allParticipants.length)]
            ?.institution || "MENGANALISIS ENTRI DATABASE..."
        );
      }
    }, 45);

    // Saat durasi putaran berakhir: Kunci nama pemenang penuh
    timerRef.current = setTimeout(() => {
      clearInterval(scrambleInterval);
      setScrambleName(finalTargetName);
      setScrambleReg(finalTargetReg);
      setScrambleInst(finalTargetInst);
      setIsLocked(true);

      if (onSpinCompleteRef.current) {
        onSpinCompleteRef.current();
      }
    }, spinDurationMs);

    return () => {
      clearInterval(scrambleInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    isSpinning,
    isWarmingUp,
    winnerName,
    winnerDetails,
    allParticipants,
    spinDurationMs,
    soundEnabled,
  ]);

  const activeWinner = winnerDetails
    ? winnerDetails
    : winnerName
    ? {
        fullName: winnerName,
        institution: "UMUM",
        registrationNumber: "GBB-WIN",
        phone: null as string | null,
      }
    : null;
  const showRevealedCard = !isSpinning && !isWarmingUp && activeWinner;

  return (
    <div
      style={{ minHeight: `${stageHeight}px` }}
      className={`relative w-full rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] ${className}`}
    >
      {/* 1. Canvas Rain Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
      />

      {/* Cyber Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/60 to-slate-950 z-1 pointer-events-none" />

      {/* 2. Top Cyber Bar: Ticker Analisis Seluruh Peserta */}
      <div className="absolute top-3 inset-x-4 sm:inset-x-8 z-10 flex items-center justify-between text-[10px] sm:text-xs font-mono border-b border-emerald-500/30 pb-2">
        <div className="flex items-center gap-2 text-emerald-400">
          <Terminal className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span className="font-bold tracking-widest uppercase">
            {isSpinning
              ? "⚡ PROTOKOL PENGUNDIAN MATRIX: MENGACAK SELURUH PESERTA"
              : isWarmingUp
              ? "⚡ INITIALIZING QUANTUM CYBER SCANNER..."
              : "✦ SISTEM PENGUNDIAN DIGITAL MATRIX SIAP ✦"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-bold">
            POOL: {allParticipants.length || "100+"} PESERTA TERDAFTAR
          </span>
        </div>
      </div>

      {/* 3. Running Multi-Column Stream Preview (Efek Seluruh Peserta Ikut Diundi) */}
      {isSpinning && (
        <div className="absolute inset-x-4 top-12 bottom-28 z-5 opacity-25 overflow-hidden pointer-events-none flex justify-around text-[11px] font-mono text-emerald-400 select-none">
          {[0, 1, 2, 3].map((colIdx) => (
            <div
              key={colIdx}
              className="flex flex-col space-y-2 animate-pulse"
              style={{
                animationDuration: `${0.8 + colIdx * 0.3}s`,
              }}
            >
              {allParticipants.slice(colIdx * 8, colIdx * 8 + 8).map((p, pIdx) => (
                <div key={p.id || pIdx} className="truncate max-w-44">
                  &gt; {p.fullName} • {p.registrationNumber || "DP2"}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 4. Center Content (HUD Scanner / Decryption Terminal / Winner Reveal) */}
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center justify-center my-auto py-6">
        {isSpinning || isWarmingUp ? (
          /* ========================================================= */
          /* FASE SEDANG BERPUTAR (DEKODING NAMA SEPERTI FILM MATRIX)   */
          /* ========================================================= */
          <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in duration-200">
            {/* Hologram Scanner Frame */}
            <div className="relative w-full p-6 sm:p-8 rounded-3xl bg-slate-900/90 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-xl flex flex-col items-center text-center space-y-3">
              {/* Corner Tech Accents */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
              <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />

              {/* Status Header */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider">
                <Cpu className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>DECRYPTING RANDOM WINNER ENTITY</span>
              </div>

              {/* Nama yang sedang terdekripsi (Teks Matrix Besar) */}
              <div className="w-full min-h-16 sm:min-h-20 flex items-center justify-center px-2">
                <h2 className="font-heading text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-wider font-mono drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] break-words line-clamp-2">
                  {scrambleName || "SCANNING DATA STREAM..."}
                </h2>
              </div>

              {/* Info Registrasi & Sekolah yang sedang dipindai */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 font-mono text-xs text-emerald-400/80 pt-2 border-t border-emerald-500/20 w-full">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 font-bold">
                  {scrambleReg || "REG-SEARCH"}
                </span>
                <span className="truncate max-w-md">
                  {scrambleInst || "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA"}
                </span>
              </div>
            </div>

            <p className="font-mono text-xs text-emerald-300/80 animate-pulse flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Mengocok acak seluruh {allParticipants.length || "100+"} tiket
              terdaftar tanpa terkecuali...
            </p>
          </div>
        ) : showRevealedCard ? (
          /* ========================================================= */
          /* FASE PEMENANG SAH TERKUNCI (REVEAL KARTU DIGITAL MEGAH)   */
          /* ========================================================= */
          <div className="w-full animate-in zoom-in-95 duration-500 flex flex-col items-center space-y-4">
            <div className="relative w-full p-6 sm:p-9 rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-black/95 border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.35)] backdrop-blur-2xl flex flex-col items-center text-center space-y-4">
              {/* Ambient Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black font-heading text-xs sm:text-sm uppercase tracking-widest shadow-lg">
                <Crown className="h-4 w-4 fill-slate-950" />
                <span>PEMENANG RESMI DOORPRIZE</span>
                <Sparkles className="h-4 w-4 fill-slate-950" />
              </div>

              {/* Nama Pemenang Panggung Megah */}
              <div className="space-y-1.5 w-full">
                <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_0_30px_rgba(255,255,255,0.7)] leading-tight">
                  {activeWinner.fullName}
                </h1>
                <p className="font-mono text-sm sm:text-lg font-bold text-amber-300">
                  {activeWinner.institution || "UMUM"}
                </p>
              </div>

              {/* Metadata Tiket & Telepon */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-white/10 w-full text-xs font-mono">
                <div className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>No. Tiket: <strong>{activeWinner.registrationNumber || "GBB-WIN"}</strong></span>
                </div>

                {activeWinner.phone && (
                  <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                    HP: <strong>{maskPhone(activeWinner.phone)}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* FASE IDLE / STANDBY: MENUNGGU INSTRUKSI PANITIA            */
          /* ========================================================= */
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-3xl bg-slate-900/60 border border-emerald-500/30 backdrop-blur-md max-w-lg">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Terminal className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white tracking-wide">
                Terminal Digital Matrix Panggung
              </h3>
              <p className="font-mono text-xs text-white/60 leading-relaxed">
                Menghubungkan {allParticipants.length || "100+"} data peserta
                festival ke algoritma acak terenkripsi. Menunggu panitia menekan
                tombol undian.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Bottom Status Strip */}
      <div className="absolute bottom-3 inset-x-6 z-10 flex items-center justify-between text-[10px] font-mono text-emerald-400/60 border-t border-emerald-500/20 pt-2">
        <span>SECURITY PROTOCOL: CSRNG VERIFIED</span>
        <span className="hidden sm:inline">GEBYAR BULAN BAHASA 2026 • DIGITAL ARENA</span>
        <span>STATUS: {isSpinning ? "LOCKING TARGET..." : "STANDBY"}</span>
      </div>
    </div>
  );
}
