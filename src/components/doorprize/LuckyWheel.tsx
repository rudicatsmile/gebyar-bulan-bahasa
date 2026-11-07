"use client";

import * as React from "react";
import { Sparkles, Trophy, Gift, Crown, Star, Gem, Clover, Zap, Flower2, Bird, Target, Scroll, Rocket } from "lucide-react";
import { soundEffects } from "./sound-effects";

export interface WheelSegment {
  id: number;
  label: string;
  icon: string;
  color: string;
  textColor: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: "BERKAH", icon: "🎁", color: "#d97706", textColor: "#ffffff" },
  { id: 1, label: "MAHKOTA", icon: "👑", color: "#312e81", textColor: "#ffffff" },
  { id: 2, label: "BINTANG", icon: "🌟", color: "#047857", textColor: "#ffffff" },
  { id: 3, label: "PERMATA", icon: "💎", color: "#b91c1c", textColor: "#ffffff" },
  { id: 4, label: "HOKI", icon: "🍀", color: "#7c2d12", textColor: "#ffffff" },
  { id: 5, label: "JUARA", icon: "🏆", color: "#4c1d95", textColor: "#ffffff" },
  { id: 6, label: "KILAT", icon: "⚡", color: "#0f766e", textColor: "#ffffff" },
  { id: 7, label: "MELATI", icon: "🌺", color: "#9f1239", textColor: "#ffffff" },
  { id: 8, label: "GARUDA", icon: "🦅", color: "#b45309", textColor: "#ffffff" },
  { id: 9, label: "TEPAT", icon: "🎯", color: "#1e1b4b", textColor: "#ffffff" },
  { id: 10, label: "SASTRA", icon: "📜", color: "#065f46", textColor: "#ffffff" },
  { id: 11, label: "HEBAT", icon: "🚀", color: "#831843", textColor: "#ffffff" },
];

interface LuckyWheelProps {
  isSpinning: boolean;
  targetSegmentIndex?: number; // 0 to 11
  spinDurationMs?: number;
  onSpinComplete?: () => void;
  size?: number; // pixel width & height (default: 440)
  className?: string;
  soundEnabled?: boolean;
}

export function LuckyWheel({
  isSpinning,
  targetSegmentIndex = 0,
  spinDurationMs = 6000,
  onSpinComplete,
  size = 440,
  className = "",
  soundEnabled = true,
}: LuckyWheelProps) {
  const [currentRotation, setCurrentRotation] = React.useState(0);
  const [pointerBounce, setPointerBounce] = React.useState(false);
  const prevIsSpinningRef = React.useRef(false);
  const spinTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const tickIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const numSegments = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / numSegments; // 30 degrees per segment

  React.useEffect(() => {
    soundEffects.setMuted(!soundEnabled);
  }, [soundEnabled]);

  React.useEffect(() => {
    // Saat isSpinning beralih dari false ke true
    if (isSpinning && !prevIsSpinningRef.current) {
      // Hitung total rotasi:
      // Pointer berada di atas (jam 12 / 270 derajat dari pusat SVG standar atau 0 derajat).
      // Segmen ke-i harus berhenti di puncak (pointer).
      const fullRotations = 360 * (6 + Math.floor(Math.random() * 2)); // 6-7 putaran penuh
      // Random offset kecil di dalam segmen (+-8 derajat dari tengah) agar tampak alami
      const jitter = (Math.random() - 0.5) * (segmentAngle * 0.6);
      
      // Sudut target agar segmen target berhenti di puncak (pointer)
      const targetDegree = 360 - (targetSegmentIndex * segmentAngle + segmentAngle / 2) + jitter;
      const nextRotation = currentRotation + fullRotations + (targetDegree - (currentRotation % 360));
      
      setCurrentRotation(nextRotation);

      // Simulasi bunyi tick roda selama putaran
      let tickCount = 0;
      const totalTicks = 42;
      const tickStart = Date.now();

      const runTicks = () => {
        const elapsed = Date.now() - tickStart;
        const progress = Math.min(1, elapsed / spinDurationMs);

        if (progress < 1) {
          // Kecepatan berkurang seiring berjalannya waktu
          soundEffects.playTick(1.0 + (1 - progress) * 0.5);
          setPointerBounce(true);
          setTimeout(() => setPointerBounce(false), 50);

          const delay = 40 + Math.pow(progress, 2.5) * 450;
          tickIntervalRef.current = setTimeout(runTicks, delay);
        }
      };

      runTicks();

      // Selesai berputar
      spinTimeoutRef.current = setTimeout(() => {
        if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);
        soundEffects.playFanfare();
        if (onSpinComplete) {
          onSpinComplete();
        }
      }, spinDurationMs);
    }

    prevIsSpinningRef.current = isSpinning;

    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);
    };
  }, [isSpinning, targetSegmentIndex, spinDurationMs, currentRotation, onSpinComplete, segmentAngle]);

  const radius = 200;
  const center = 220;

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Glow Halo Ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent/20 via-primary/20 to-amber-500/20 blur-xl animate-pulse" />

      {/* Pointer Panah Emas di Puncak (Jam 12) */}
      <div
        className={`absolute -top-3 z-30 transition-transform duration-75 flex flex-col items-center ${
          pointerBounce ? "-translate-y-1 scale-110" : "translate-y-0 scale-100"
        }`}
      >
        <div className="w-8 h-8 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 rounded-full shadow-lg flex items-center justify-center ring-2 ring-white/80 border border-amber-200">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-900" />
        </div>
        <div
          className="w-0 h-0 -mt-1 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-amber-500 drop-shadow-md"
        />
      </div>

      {/* Roda Utama (SVG) yang Berputar */}
      <div
        className="w-full h-full rounded-full shadow-2xl relative"
        style={{
          transform: `rotate(${currentRotation}deg)`,
          transition: isSpinning
            ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.85, 0.18, 1.0)`
            : "none",
        }}
      >
        <svg
          viewBox="0 0 440 440"
          className="w-full h-full drop-shadow-2xl"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Outer Rim Gradient */}
            <radialGradient id="goldRim" cx="50%" cy="50%" r="50%">
              <stop offset="90%" stopColor="#1e1b4b" />
              <stop offset="95%" stopColor="#d97706" />
              <stop offset="98%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#92400e" />
            </radialGradient>

            <linearGradient id="hubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Outer Ring Border */}
          <circle
            cx={center}
            cy={center}
            r={radius + 15}
            fill="url(#goldRim)"
            stroke="#fbbf24"
            strokeWidth="4"
          />

          {/* Lampu LED di Seputar Ring Luar (24 Titik) */}
          {Array.from({ length: 24 }).map((_, idx) => {
            const angle = (idx * 360) / 24;
            const rad = (angle * Math.PI) / 180;
            const ledR = radius + 9;
            const cx = center + ledR * Math.cos(rad);
            const cy = center + ledR * Math.sin(rad);
            const isLightOn = isSpinning ? (idx % 2 === Math.floor((currentRotation / 15) % 2)) : true;

            return (
              <circle
                key={`led-${idx}`}
                cx={cx}
                cy={cy}
                r={isLightOn ? "4" : "3"}
                fill={isLightOn ? "#fef08a" : "#78350f"}
                stroke="#d97706"
                strokeWidth="1"
                className={isLightOn ? "animate-pulse" : ""}
              />
            );
          })}

          {/* 12 Segmen Pie Roda */}
          <g>
            {WHEEL_SEGMENTS.map((seg, idx) => {
              const startAngle = idx * segmentAngle;
              const endAngle = startAngle + segmentAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = center + radius * Math.cos(startRad);
              const y1 = center + radius * Math.sin(startRad);
              const x2 = center + radius * Math.cos(endRad);
              const y2 = center + radius * Math.sin(endRad);

              // Path segitiga melingkar (arc pie slice)
              const pathD = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

              // Posisi teks di tengah-tengah segmen
              const midAngle = startAngle + segmentAngle / 2;
              const textRad = (midAngle * Math.PI) / 180;
              const textDist = radius * 0.65;
              const tx = center + textDist * Math.cos(textRad);
              const ty = center + textDist * Math.sin(textRad);

              return (
                <g key={`seg-${seg.id}`}>
                  {/* Slice Segmen */}
                  <path
                    d={pathD}
                    fill={seg.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                  />

                  {/* Ikon dan Label di dalam Segmen */}
                  <g
                    transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}
                    style={{ pointerEvents: "none" }}
                  >
                    <text
                      textAnchor="middle"
                      y="-12"
                      fontSize="18"
                      className="select-none"
                    >
                      {seg.icon}
                    </text>
                    <text
                      textAnchor="middle"
                      y="14"
                      fill={seg.textColor}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      letterSpacing="1px"
                      className="select-none drop-shadow-xs"
                    >
                      {seg.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Center Hub Metalik (Pusat Roda) */}
          <circle
            cx={center}
            cy={center}
            r="44"
            fill="url(#hubGradient)"
            stroke="#ffffff"
            strokeWidth="3"
            filter="url(#shadow3d)"
          />
          <circle
            cx={center}
            cy={center}
            r="32"
            fill="#1e1b4b"
            stroke="#fbbf24"
            strokeWidth="2"
          />

          {/* Ikon Pusat */}
          <text
            x={center}
            y={center + 5}
            textAnchor="middle"
            fill="#fef08a"
            fontSize="18"
            className="select-none"
          >
            🎡
          </text>
        </svg>
      </div>
    </div>
  );
}

