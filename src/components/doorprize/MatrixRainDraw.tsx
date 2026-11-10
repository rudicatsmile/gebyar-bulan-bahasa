"use client";

import * as React from "react";
import { Terminal, Users } from "lucide-react";
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

interface NameDropItem {
  laneIndex: number;
  name: string;
  regNum: string;
  x: number;
  y: number;
  speed: number;
  isHead: boolean;
}

export function MatrixRainDraw({
  isSpinning,
  isWarmingUp = false,
  allParticipants = [],
  spinDurationMs = 5500,
  onSpinComplete,
  soundEnabled = true,
  size = "default",
  className = "",
}: MatrixRainDrawProps) {
  const isLarge = size === "large";
  const stageHeight = isLarge ? 620 : 440;

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const onSpinCompleteRef = React.useRef(onSpinComplete);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  React.useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Siapkan daftar nama & nomor peserta terdaftar dari database (Hanya nama peserta asli)
  const participantPool = React.useMemo(() => {
    if (!allParticipants || allParticipants.length === 0) {
      return [
        { name: "PESERTA BULAN BAHASA", regNum: "GBB-01" },
        { name: "KANDIDAT DOORPRIZE", regNum: "GBB-02" },
        { name: "SMK DINAMIKA PEMBANGUNAN 2", regNum: "DP2-01" },
        { name: "TIKET KEBERUNTUNGAN", regNum: "LUCKY" },
        { name: "PESERTA TERDAFTAR", regNum: "GBB-03" },
      ];
    }

    return allParticipants.map((p) => {
      const cleanName = (p.fullName || "PESERTA").trim().toUpperCase();
      // Potong jika terlalu panjang agar tidak bertabrakan dengan kolom lain
      const displayName = cleanName.length > 22 ? cleanName.slice(0, 20) + ".." : cleanName;
      const reg = p.registrationNumber ? p.registrationNumber.slice(-5) : "DP2";
      return {
        name: displayName,
        regNum: reg,
      };
    });
  }, [allParticipants]);

  // =========================================================================
  // 1. CANVAS MATRIX RAIN: HANYA NAMA PESERTA MENGALIR TURUN VERTIKAL
  // =========================================================================
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || stageHeight);

    const laneWidth = isLarge ? 220 : 170;
    const fontSize = isLarge ? 15 : 13;

    const getRandomParticipant = () => {
      const idx = Math.floor(Math.random() * participantPool.length);
      return participantPool[idx] || { name: "PESERTA DP2", regNum: "GBB" };
    };

    // Buat jalur kolom vertikal (lanes) dan item-item nama yang mengalir
    let drops: NameDropItem[] = [];

    const initDrops = () => {
      drops = [];
      const numLanes = Math.max(3, Math.floor(width / laneWidth));
      const itemsPerLane = Math.max(3, Math.floor(height / (isLarge ? 70 : 55)));

      for (let l = 0; l < numLanes; l++) {
        const laneX = l * laneWidth + 14;

        for (let i = 0; i < itemsPerLane; i++) {
          const p = getRandomParticipant();
          // Offset y bertingkat per jalur
          const initialY =
            (i * (height / itemsPerLane)) + (Math.random() * 40 - 20) - height;

          const baseSpeed = isSpinning ? 3.4 : isWarmingUp ? 2.6 : 1.3;
          const speed = baseSpeed + (Math.random() * 0.8 - 0.4);

          drops.push({
            laneIndex: l,
            name: p.name,
            regNum: p.regNum,
            x: laneX,
            y: initialY,
            speed,
            isHead: i === itemsPerLane - 1,
          });
        }
      }
    };

    initDrops();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || stageHeight;
      initDrops();
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      // Background: bersihkan penuh setiap frame agar TIDAK ada trail/smear
      // Nama peserta tampil 100% tajam dan terbaca tanpa sisa frame sebelumnya
      ctx.fillStyle = "rgb(2, 6, 23)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "Courier New", monospace`;

      const speedFactor = isSpinning ? 1.6 : isWarmingUp ? 1.3 : 1.0;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];

        // Gambar Nama Peserta yang Mengalir Turun — TANPA blur, TANPA shadow
        if (drop.y > -20 && drop.y < height + 30) {
          if (drop.isHead) {
            // Nama kepala aliran: putih terang / aksen emas — 0 blur
            if ((isSpinning || isWarmingUp) && Math.random() > 0.82) {
              ctx.fillStyle = "#fbbf24"; // Aksen Emas
            } else {
              ctx.fillStyle = "#ffffff"; // Putih Terang
            }
          } else {
            // Nama aliran biasa: Hijau Matrix Emerald terang — 0 blur
            ctx.fillStyle = "#34d399";
          }

          // Format teks: "> NAMA PESERTA [REG]"
          const displayText = `> ${drop.name} ${
            drop.regNum ? `[${drop.regNum}]` : ""
          }`;
          ctx.fillText(displayText, drop.x, drop.y);
        }

        // Geser ke bawah
        drop.y += drop.speed * speedFactor;

        // Jika sudah mencapai batas bawah, kembalikan ke atas dengan nama peserta baru
        if (drop.y > height + 35) {
          drop.y = -35 - Math.random() * 40;
          const nextP = getRandomParticipant();
          drop.name = nextP.name;
          drop.regNum = nextP.regNum;
          drop.isHead = Math.random() > 0.65;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpinning, isWarmingUp, isLarge, stageHeight, participantPool]);

  // =========================================================================
  // 2. LOGIKA AUDIO TICKING & TIMER SELESAI PENGACAKAN
  // =========================================================================
  React.useEffect(() => {
    if (!isSpinning && !isWarmingUp) {
      return;
    }

    const startTime = Date.now();
    let tickCounter = 0;

    const tickInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / spinDurationMs);

      tickCounter++;
      if (tickCounter % 3 === 0 && soundEnabled) {
        soundEffects.playTick(1.0 + progress * 0.5);
      }
    }, 45);

    // Kunci durasi putaran dan panggil onSpinComplete
    timerRef.current = setTimeout(() => {
      clearInterval(tickInterval);
      if (onSpinCompleteRef.current) {
        onSpinCompleteRef.current();
      }
    }, spinDurationMs);

    return () => {
      clearInterval(tickInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSpinning, isWarmingUp, spinDurationMs, soundEnabled]);

  return (
    <div
      style={{ minHeight: `${stageHeight}px` }}
      className={`relative w-full h-full rounded-3xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 flex flex-col justify-between p-4 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] ${className}`}
    >
      {/* 1. Canvas Matrix Rain (100% Full: Nama-Nama Peserta Mengalir Turun Vertikal) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-90"
      />

      {/* Cyber Vignette Overlay tipis di pinggir agar tetap bernuansa Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/20 to-slate-950/80 z-1 pointer-events-none" />

      {/* 2. Top Cyber Bar: Live Pool Indicator */}
      <div className="relative z-10 w-full flex items-center justify-between text-[10px] sm:text-xs font-mono border-b border-emerald-500/30 pb-2.5 bg-slate-950/40 backdrop-blur-xs px-2 rounded-t-xl">
        <div className="flex items-center gap-2 text-emerald-400">
          <Terminal className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span className="font-bold tracking-widest uppercase">
            {isSpinning
              ? "⚡ MATRIX STREAM: NAMA PESERTA TERDAFTAR SEDANG DIUNDI"
              : isWarmingUp
              ? "⚡ MENYIAPKAN SELURUH DATA PESERTA FESTIVAL..."
              : "✦ MATRIX NAMA PESERTA TERDAFTAR SIAP ✦"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300 font-bold flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-accent" />
            POOL: {allParticipants.length || "100+"} NAMA PESERTA
          </span>
        </div>
      </div>

      {/* 3. Center Area Kosong & Bebas: Nama pemenang tidak ditampilkan di tengah card ini (di-reveal via Winner Overlay Pop-up) */}
      <div className="relative z-5 flex-1 w-full pointer-events-none" />

      {/* 4. Bottom Status Strip */}
      <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono text-emerald-400/70 border-t border-emerald-500/20 pt-2.5 bg-slate-950/40 backdrop-blur-xs px-2 rounded-b-xl">
        <span>SECURITY: CSRNG VERIFIED</span>
        <span className="hidden sm:inline">ALIRAN VERTIKAL NAMA PESERTA RESMI</span>
        <span>STATUS: {isSpinning ? "MENGACAK NAMA..." : "STANDBY"}</span>
      </div>
    </div>
  );
}
