"use client";

import * as React from "react";
import { Sparkles, Trophy, Crown, UserCheck } from "lucide-react";
import { soundEffects } from "./sound-effects";

export interface ParticipantReelItem {
  id?: string;
  fullName: string;
  institution?: string;
  registrationNumber?: string;
}

interface NameReelRollerProps {
  isSpinning: boolean;
  winnerName?: string | null;
  winnerDetails?: {
    fullName: string;
    institution?: string;
    registrationNumber?: string;
  } | null;
  sampleParticipants?: ParticipantReelItem[];
  spinDurationMs?: number;
  onSpinComplete?: () => void;
  soundEnabled?: boolean;
  size?: "default" | "large"; // "default" untuk admin, "large" untuk monitor panggung
  className?: string;
}

const DEFAULT_NAMES: ParticipantReelItem[] = [
  { fullName: "Ahmad Fauzi", institution: "SMKN 2 Jakarta", registrationNumber: "GBB-0101" },
  { fullName: "Siti Nurhaliza", institution: "SMAN 70 Jakarta", registrationNumber: "GBB-0102" },
  { fullName: "Budi Santoso", institution: "SMK Diponegoro 2", registrationNumber: "GBB-0103" },
  { fullName: "Rina Anggraini", institution: "SMKN 26 Jakarta", registrationNumber: "GBB-0104" },
  { fullName: "Dimas Pratama", institution: "SMA Labschool", registrationNumber: "GBB-0105" },
  { fullName: "Dewi Lestari", institution: "SMKN 48 Jakarta", registrationNumber: "GBB-0106" },
  { fullName: "Eko Kurniawan", institution: "SMAN 8 Jakarta", registrationNumber: "GBB-0107" },
  { fullName: "Fitri Handayani", institution: "SMK Grafika", registrationNumber: "GBB-0108" },
  { fullName: "Gita Rahayu", institution: "SMAN 68 Jakarta", registrationNumber: "GBB-0109" },
  { fullName: "Hadi Wibowo", institution: "SMK Negeri 1 Jakarta", registrationNumber: "GBB-0110" },
];

export function NameReelRoller({
  isSpinning,
  winnerName,
  winnerDetails,
  sampleParticipants = [],
  spinDurationMs = 5500,
  onSpinComplete,
  soundEnabled = true,
  size = "default",
  className = "",
}: NameReelRollerProps) {
  // Ukuran item kartu
  const itemHeight = size === "large" ? 110 : 86;
  const containerHeight = size === "large" ? 440 : 344;
  const targetIndex = 36; // Posisi pemenang di urutan pita nama

  const [reelItems, setReelItems] = React.useState<ParticipantReelItem[]>(DEFAULT_NAMES);
  const [translateY, setTranslateY] = React.useState(0);
  const [isLocked, setIsLocked] = React.useState(false);
  const [pulseCenter, setPulseCenter] = React.useState(false);

  // Refs untuk sinkronisasi props & pembatalan timer
  const isSpinningRef = React.useRef(isSpinning);
  const onSpinCompleteRef = React.useRef(onSpinComplete);
  const hasFinishedRef = React.useRef(false);
  const spinTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const tickIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  React.useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Inisialisasi daftar item pita (reel) saat pertama kali atau saat ada data peserta
  React.useEffect(() => {
    if (!isSpinning) {
      const pool = sampleParticipants.length > 0 ? sampleParticipants : DEFAULT_NAMES;
      if (winnerName) {
        // Tampilkan pemenang di posisi tengah
        const initialList: ParticipantReelItem[] = [
          pool[1 % pool.length],
          { fullName: winnerName, institution: winnerDetails?.institution, registrationNumber: winnerDetails?.registrationNumber },
          pool[2 % pool.length],
        ];
        setReelItems(initialList);
        setTranslateY(-itemHeight);
      } else {
        setReelItems(pool.slice(0, 5));
        setTranslateY(-itemHeight);
      }
    }
  }, [sampleParticipants, winnerName, winnerDetails, isSpinning, itemHeight]);

  // Efek Putaran Utama (Spin Animation)
  React.useEffect(() => {
    if (!isSpinning) {
      hasFinishedRef.current = false;
      return;
    }

    hasFinishedRef.current = false;
    setIsLocked(false);
    setPulseCenter(false);

    // 1. Bangun pita nama sepanjang ~45 item dengan pemenang diletakkan di `targetIndex`
    const pool = sampleParticipants.length > 0 ? sampleParticipants : DEFAULT_NAMES;
    const finalWinnerName = winnerName || winnerDetails?.fullName || "Peserta Beruntung";

    const builtStrip: ParticipantReelItem[] = [];
    for (let i = 0; i < targetIndex + 5; i++) {
      if (i === targetIndex) {
        builtStrip.push({
          fullName: finalWinnerName,
          institution: winnerDetails?.institution,
          registrationNumber: winnerDetails?.registrationNumber,
        });
      } else {
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        builtStrip.push(randomItem);
      }
    }

    setReelItems(builtStrip);

    // Mulai dari posisi 0
    setTranslateY(0);

    // Beri sedikit jeda mikro (requestAnimationFrame) agar transisi CSS terpicu dari 0 ke target
    const rafId = requestAnimationFrame(() => {
      // Offset target: posisi item target berada tepat di tengah container
      // Container height dibagi 2 minus itemHeight dibagi 2
      const centerOffset = containerHeight / 2 - itemHeight / 2;
      const finalTranslate = -(targetIndex * itemHeight) + centerOffset;
      setTranslateY(finalTranslate);
    });

    // 2. Simulasi suara tick mekanik roda / drum berputar
    const tickStart = Date.now();
    let isCancelled = false;

    const runTicks = () => {
      if (isCancelled) return;
      const elapsed = Date.now() - tickStart;
      const progress = Math.min(1, elapsed / spinDurationMs);

      if (progress < 1) {
        soundEffects.playTick(1.0 + (1 - progress) * 0.4);
        const delay = 35 + Math.pow(progress, 2.8) * 480;
        tickIntervalRef.current = setTimeout(runTicks, delay);
      }
    };

    runTicks();

    // 3. Callback saat drum melambat dan terkunci di nama pemenang
    const finishSpin = () => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      isCancelled = true;
      if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);

      setIsLocked(true);
      setPulseCenter(true);
      soundEffects.playFanfare();

      if (onSpinCompleteRef.current) {
        onSpinCompleteRef.current();
      }
    };

    spinTimeoutRef.current = setTimeout(finishSpin, spinDurationMs);

    return () => {
      cancelAnimationFrame(rafId);
      isCancelled = true;
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);
    };
  }, [isSpinning, winnerName, winnerDetails, sampleParticipants, spinDurationMs, containerHeight, itemHeight]);

  return (
    <div
      className={`relative w-full max-w-2xl select-none mx-auto ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Outer Metallic Drum Casing (Cylindrical Bevel & Neon Border) */}
      <div className="absolute inset-0 rounded-3xl bg-slate-950 border-4 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden ring-2 ring-amber-400/20" />

      {/* Decorative Golden Rivets (Baut Mesin Undian) */}
      <div className="absolute top-2.5 left-3 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
      <div className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
      <div className="absolute bottom-2.5 left-3 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />
      <div className="absolute bottom-2.5 right-3 w-2 h-2 rounded-full bg-amber-400/80 shadow-xs" />

      {/* Central Winner Selection Zone (Bingkai Emas & Indikator Panah) */}
      <div
        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center justify-between px-3 sm:px-6 transition-all duration-300"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          height: itemHeight,
        }}
      >
        {/* Left Arrow Indicator */}
        <div className="flex items-center gap-1">
          <div
            className={`w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[18px] transition-all duration-300 ${
              isLocked
                ? "border-l-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] scale-110"
                : "border-l-amber-500/80"
            }`}
          />
          <span className="hidden sm:inline-block font-mono text-[10px] font-black text-amber-400/90 tracking-widest uppercase">
            WINNER
          </span>
        </div>

        {/* Golden Target Box Frame */}
        <div
          className={`absolute inset-x-2 sm:inset-x-4 inset-y-0 rounded-2xl border-2 transition-all duration-300 ${
            isLocked
              ? "border-amber-400 bg-amber-500/15 shadow-[0_0_35px_rgba(245,158,11,0.45)] ring-2 ring-amber-300/40"
              : isSpinning
              ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse"
              : "border-amber-500/30 bg-white/5"
          }`}
        />

        {/* Right Arrow Indicator */}
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline-block font-mono text-[10px] font-black text-amber-400/90 tracking-widest uppercase">
            WINNER
          </span>
          <div
            className={`w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[18px] transition-all duration-300 ${
              isLocked
                ? "border-r-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)] scale-110"
                : "border-r-amber-500/80"
            }`}
          />
        </div>
      </div>

      {/* Top 3D Cylinder Curvature Shadow Overlay */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />

      {/* Bottom 3D Cylinder Curvature Shadow Overlay */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />

      {/* Moving Reel Strip of Names */}
      <div
        className="w-full absolute top-0 inset-x-0"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isSpinning
            ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.85, 0.18, 1.0)`
            : "transform 400ms ease-out",
        }}
        onTransitionEnd={() => {
          if (isSpinning && !hasFinishedRef.current) {
            hasFinishedRef.current = true;
            setIsLocked(true);
            setPulseCenter(true);
            soundEffects.playFanfare();
            if (onSpinCompleteRef.current) {
              onSpinCompleteRef.current();
            }
          }
        }}
      >
        {reelItems.map((item, index) => {
          const isWinnerTarget = index === targetIndex && isLocked;

          return (
            <div
              key={`${item.fullName}-${index}`}
              className="w-full flex items-center justify-center px-6 transition-all duration-200"
              style={{ height: itemHeight }}
            >
              <div
                className={`w-full max-w-xl text-center px-4 py-2 rounded-xl transition-all duration-300 ${
                  isWinnerTarget
                    ? "scale-105"
                    : "opacity-75"
                }`}
              >
                {/* Nama Lengkap Super Besar */}
                <h3
                  className={`font-heading tracking-tight font-black truncate block ${
                    size === "large"
                      ? "text-3xl sm:text-5xl"
                      : "text-2xl sm:text-3xl"
                  } ${
                    isWinnerTarget
                      ? "text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] scale-105"
                      : "text-white/90"
                  }`}
                >
                  {item.fullName}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

