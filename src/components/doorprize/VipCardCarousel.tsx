"use client";

import * as React from "react";
import { Sparkles, Trophy, Crown, Award, CheckCircle2 } from "lucide-react";
import { soundEffects } from "./sound-effects";

export interface VipCardItem {
  id?: string;
  fullName: string;
  institution?: string;
  registrationNumber?: string;
  phone?: string | null;
}

interface VipCardCarouselProps {
  isSpinning: boolean;
  winnerName?: string | null;
  winnerDetails?: VipCardItem | null;
  sampleParticipants?: VipCardItem[];
  spinDurationMs?: number;
  onSpinComplete?: () => void;
  soundEnabled?: boolean;
  size?: "default" | "large"; // "default" untuk admin, "large" untuk monitor panggung
  className?: string;
}

const DEFAULT_SAMPLE_CARDS: VipCardItem[] = [
  { fullName: "Ahmad Fauzi", institution: "SMKN 2 JAKARTA", registrationNumber: "GBB-0101" },
  { fullName: "Siti Nurhaliza", institution: "SMAN 70 JAKARTA", registrationNumber: "GBB-0102" },
  { fullName: "Budi Santoso", institution: "SMK DIPONEGORO 2", registrationNumber: "GBB-0103" },
  { fullName: "Rina Anggraini", institution: "SMKN 26 JAKARTA", registrationNumber: "GBB-0104" },
  { fullName: "Dimas Pratama", institution: "SMA LABSCHOOL", registrationNumber: "GBB-0105" },
  { fullName: "Dewi Lestari", institution: "SMKN 48 JAKARTA", registrationNumber: "GBB-0106" },
  { fullName: "Eko Kurniawan", institution: "SMAN 8 JAKARTA", registrationNumber: "GBB-0107" },
  { fullName: "Fitri Handayani", institution: "SMK GRAFIKA", registrationNumber: "GBB-0108" },
  { fullName: "Gita Rahayu", institution: "SMAN 68 JAKARTA", registrationNumber: "GBB-0109" },
  { fullName: "Hadi Wibowo", institution: "SMKN 1 JAKARTA", registrationNumber: "GBB-0110" },
];

function getInitials(name: string): string {
  if (!name) return "GB";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function VipCardCarousel({
  isSpinning,
  winnerName,
  winnerDetails,
  sampleParticipants = [],
  spinDurationMs = 5500,
  onSpinComplete,
  soundEnabled = true,
  size = "default",
  className = "",
}: VipCardCarouselProps) {
  const isLarge = size === "large";

  // Ukuran dimensi Kartu VIP
  const cardWidth = isLarge ? 320 : 250;
  const cardHeight = isLarge ? 430 : 330;
  const stageHeight = isLarge ? 490 : 380;
  const targetIndex = 28; // Urutan kartu pemenang pada pita horizontal

  const [cards, setCards] = React.useState<VipCardItem[]>(DEFAULT_SAMPLE_CARDS);
  const [translateX, setTranslateX] = React.useState(0);
  const [isLocked, setIsLocked] = React.useState(false);
  const [winnerCrestRevealed, setWinnerCrestRevealed] = React.useState(false);

  // Refs untuk sinkronisasi props & pembatalan timer
  const onSpinCompleteRef = React.useRef(onSpinComplete);
  const hasFinishedRef = React.useRef(false);
  const spinTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const sweepIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    onSpinCompleteRef.current = onSpinComplete;
  }, [onSpinComplete]);

  React.useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  // Inisialisasi awal saat tidak berputar
  React.useEffect(() => {
    if (!isSpinning) {
      const pool = sampleParticipants.length > 0 ? sampleParticipants : DEFAULT_SAMPLE_CARDS;
      if (winnerName || winnerDetails) {
        const finalWinner: VipCardItem = {
          fullName: winnerName || winnerDetails?.fullName || "Pemenang Terpilih",
          institution: winnerDetails?.institution || "UMUM",
          registrationNumber: winnerDetails?.registrationNumber || "GBB-WIN",
        };
        const initialCards = [
          pool[0 % pool.length],
          pool[1 % pool.length],
          finalWinner,
          pool[2 % pool.length],
          pool[3 % pool.length],
        ];
        setCards(initialCards);
        // Posisikan kartu pemenang (index 2) di tengah
        setTranslateX(-2 * cardWidth);
        setIsLocked(true);
        setWinnerCrestRevealed(true);
      } else {
        setCards(pool.slice(0, 7));
        setTranslateX(-2 * cardWidth);
        setIsLocked(false);
        setWinnerCrestRevealed(false);
      }
    }
  }, [sampleParticipants, winnerName, winnerDetails, isSpinning, cardWidth]);

  // Efek Perputaran Sinematik (Carousel Sweep)
  React.useEffect(() => {
    if (!isSpinning) {
      hasFinishedRef.current = false;
      return;
    }

    hasFinishedRef.current = false;
    setIsLocked(false);
    setWinnerCrestRevealed(false);

    // 1. Bangun deretan ~35 kartu dengan target pemenang diletakkan di `targetIndex`
    const pool = sampleParticipants.length > 0 ? sampleParticipants : DEFAULT_SAMPLE_CARDS;
    const finalWinnerName = winnerName || winnerDetails?.fullName || "Peserta Beruntung";
    const finalInstitution = winnerDetails?.institution || "GEBYAR BULAN BAHASA";
    const finalRegNum = winnerDetails?.registrationNumber || "GBB-WIN";

    const builtStrip: VipCardItem[] = [];
    for (let i = 0; i < targetIndex + 5; i++) {
      if (i === targetIndex) {
        builtStrip.push({
          fullName: finalWinnerName,
          institution: finalInstitution,
          registrationNumber: finalRegNum,
        });
      } else {
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        builtStrip.push(randomItem);
      }
    }

    setCards(builtStrip);

    // Mulai dari kartu awal (index 0)
    setTranslateX(0);

    // Beri jeda mikro agar transisi CSS bergerak mulus dari 0 ke targetIndex
    const rafId = requestAnimationFrame(() => {
      // Posisi target: menggeser strip sehingga kartu di targetIndex tepat di tengah
      setTranslateX(-targetIndex * cardWidth);
    });

    // 2. Efek audio seremonial melambat
    const sweepStart = Date.now();
    let isCancelled = false;

    const runSweeps = () => {
      if (isCancelled) return;
      const elapsed = Date.now() - sweepStart;
      const progress = Math.min(1, elapsed / spinDurationMs);

      if (progress < 1) {
        soundEffects.playCinematicSweep(1.0 + (1 - progress) * 0.5);
        const delay = 45 + Math.pow(progress, 2.6) * 490;
        sweepIntervalRef.current = setTimeout(runSweeps, delay);
      }
    };

    runSweeps();

    // 3. Callback saat kartu pemenang terkunci dan terangkat maju
    const finishSpin = () => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;
      isCancelled = true;
      if (sweepIntervalRef.current) clearTimeout(sweepIntervalRef.current);

      setIsLocked(true);
      setWinnerCrestRevealed(true);
      soundEffects.playCeremonialChime();

      if (onSpinCompleteRef.current) {
        onSpinCompleteRef.current();
      }
    };

    spinTimeoutRef.current = setTimeout(finishSpin, spinDurationMs);

    return () => {
      cancelAnimationFrame(rafId);
      isCancelled = true;
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (sweepIntervalRef.current) clearTimeout(sweepIntervalRef.current);
    };
  }, [isSpinning, winnerName, winnerDetails, sampleParticipants, spinDurationMs, cardWidth]);

  return (
    <div
      className={`relative w-full max-w-5xl mx-auto overflow-hidden select-none flex flex-col items-center justify-center ${className}`}
      style={{ height: stageHeight }}
    >
      {/* PANGGUNG 3D DUAL SPOTLIGHT BEAMS (Lampu Sorot Panggung Sinematik Emas) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Lampu Sorot Kiri Atas */}
        <div
          className={`absolute -top-10 left-1/4 w-72 sm:w-96 h-[500px] bg-gradient-to-b from-amber-400/25 via-amber-500/10 to-transparent blur-2xl transform -rotate-12 transition-opacity duration-700 pointer-events-none ${
            isSpinning || isLocked ? "opacity-100" : "opacity-40"
          }`}
        />

        {/* Lampu Sorot Kanan Atas */}
        <div
          className={`absolute -top-10 right-1/4 w-72 sm:w-96 h-[500px] bg-gradient-to-b from-amber-400/25 via-amber-500/10 to-transparent blur-2xl transform rotate-12 transition-opacity duration-700 pointer-events-none ${
            isSpinning || isLocked ? "opacity-100" : "opacity-40"
          }`}
        />

        {/* Golden Central Aura Halo saat Pemenang Terkunci */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-transparent blur-3xl transition-all duration-700 pointer-events-none ${
            isLocked ? "scale-125 opacity-100" : "scale-75 opacity-0"
          }`}
        />
      </div>

      {/* Frame Batas Panggung & Golden Stage Line */}
      <div className="absolute inset-x-8 bottom-3 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-20 bottom-3 h-8 bg-amber-500/5 blur-md pointer-events-none z-10" />

      {/* Indikator Panah Mahkota Penobatan di Puncak */}
      <div className="absolute top-2 z-30 flex flex-col items-center pointer-events-none">
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400/40 bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
            isLocked
              ? "border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105"
              : "text-amber-400/70"
          }`}
        >
          <Crown className={`h-3.5 w-3.5 ${isLocked ? "animate-bounce text-amber-300" : "text-amber-400/70"}`} />
          <span className="font-mono text-[10px] tracking-widest uppercase font-bold">
            {isLocked ? "PEMENANG TERPILIH" : "SOROTAN PEMENANG"}
          </span>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400/80 -mt-0.5" />
      </div>

      {/* Panggung Penutup Kiri & Kanan (Vignette Fade-out) */}
      <div className="absolute left-0 inset-y-0 w-24 sm:w-44 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 inset-y-0 w-24 sm:w-44 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-20 pointer-events-none" />

      {/* 3D CAROUSEL TRACK */}
      <div
        className="w-full flex items-center relative"
        style={{
          perspective: "1200px",
          height: cardHeight + 40,
        }}
      >
        <div
          className="flex items-center absolute"
          style={{
            left: "50%",
            transform: `translateX(calc(${translateX}px - ${cardWidth / 2}px))`,
            transition: isSpinning
              ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.85, 0.18, 1.0)`
              : "transform 400ms ease-out",
          }}
          onTransitionEnd={() => {
            if (isSpinning && !hasFinishedRef.current) {
              hasFinishedRef.current = true;
              setIsLocked(true);
              setWinnerCrestRevealed(true);
              soundEffects.playCeremonialChime();
              if (onSpinCompleteRef.current) {
                onSpinCompleteRef.current();
              }
            }
          }}
        >
          {cards.map((item, index) => {
            const isCenterWinner = isLocked && index === targetIndex;

            return (
              <div
                key={`${item.fullName}-${index}`}
                className="shrink-0 flex items-center justify-center transition-all duration-500 relative"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* KARTU VIP OBSIDIAN-GOLD */}
                <div
                  className={`w-[92%] h-[94%] rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative transition-all duration-700 overflow-hidden ${
                    isCenterWinner
                      ? "scale-110 z-40 bg-gradient-to-b from-slate-900 via-neutral-900 to-black border-2 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.55)] ring-4 ring-amber-300/30"
                      : "scale-95 bg-gradient-to-b from-slate-900/95 via-neutral-900/90 to-black/95 border border-amber-500/25 opacity-70 shadow-xl"
                  }`}
                >
                  {/* Watermark Garis Emas Geometris Halus di Belakang */}
                  <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full border border-amber-500/10 pointer-events-none" />
                  <div className="absolute -right-12 -bottom-12 w-52 h-52 rounded-full border border-amber-500/5 pointer-events-none" />

                  {/* Corner Gold Accents (Baut Presisi Mewah di 4 Sudut) */}
                  <div className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <div className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <div className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-400/60" />

                  {/* Top Bar: No Registrasi & Crest Inisial */}
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                    <span className="font-mono text-[10px] sm:text-xs font-bold text-amber-300/90 tracking-wider">
                      {item.registrationNumber || "VIP-GBB"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[9px] font-mono text-amber-300 uppercase tracking-widest font-semibold">
                      VIP PASS
                    </span>
                  </div>

                  {/* Center Body: Monogram Lencana & Nama Lengkap Emas */}
                  <div className="my-auto py-2 flex flex-col items-center text-center space-y-3">
                    {/* Glowing Circular Monogram Crest */}
                    <div
                      className={`rounded-full flex items-center justify-center transition-all duration-500 font-heading font-black ${
                        isCenterWinner
                          ? "w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-600 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] ring-4 ring-amber-300/40 text-xl sm:text-2xl"
                          : "w-12 h-12 sm:w-14 sm:h-14 bg-white/5 border border-amber-500/30 text-amber-300 text-sm sm:text-base"
                      }`}
                    >
                      {getInitials(item.fullName)}
                    </div>

                    {/* Nama Peserta dengan Tipografi Emas */}
                    <div className="w-full space-y-1">
                      <h3
                        className={`font-heading font-black tracking-tight leading-tight line-clamp-2 ${
                          isLarge
                            ? "text-xl sm:text-2xl"
                            : "text-lg sm:text-xl"
                        } ${
                          isCenterWinner
                            ? "bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.5)]"
                            : "text-white/90"
                        }`}
                      >
                        {item.fullName}
                      </h3>
                    </div>
                  </div>

                  {/* Bottom Bar: Asal Sekolah & Lambang Acara */}
                  <div className="border-t border-amber-500/20 pt-3 text-center space-y-1">
                    <p className="font-heading text-[10px] sm:text-xs font-bold text-amber-200/90 tracking-[0.2em] uppercase truncate">
                      {item.institution || "GEBYAR BULAN BAHASA"}
                    </p>
                    <span className="text-[9px] font-mono text-white/40 tracking-widest block uppercase">
                      ✦ BULAN BAHASA FESTIVAL ✦
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

