"use client";

import * as React from "react";

interface F1StartLightsProps {
  status: "idle" | "countdown" | "green" | "finished";
  greenDelayMs?: number;
  onGreenTrigger?: () => void;
  size?: "default" | "large";
  className?: string;
}

export function F1StartLights({
  status,
  greenDelayMs = 2800,
  onGreenTrigger,
  size = "default",
  className = "",
}: F1StartLightsProps) {
  const isLarge = size === "large";
  const [litCount, setLitCount] = React.useState<number>(0);
  const [isGreen, setIsGreen] = React.useState<boolean>(false);

  const onGreenTriggerRef = React.useRef(onGreenTrigger);
  React.useEffect(() => {
    onGreenTriggerRef.current = onGreenTrigger;
  }, [onGreenTrigger]);

  React.useEffect(() => {
    if (status === "idle") {
      setLitCount(0);
      setIsGreen(false);
      return;
    }

    if (status === "countdown") {
      setIsGreen(false);
      setLitCount(0);

      // 5 Lampu menyala bertahap setiap 600ms
      const t1 = setTimeout(() => setLitCount(1), 400);
      const t2 = setTimeout(() => setLitCount(2), 1000);
      const t3 = setTimeout(() => setLitCount(3), 1600);
      const t4 = setTimeout(() => setLitCount(4), 2200);
      const t5 = setTimeout(() => setLitCount(5), 2800);

      // Setelah lampu ke-5 menyala, jeda acak greenDelayMs, lalu SEMUA LAMPU JADI HIJAU (GO!)
      const totalDelay = 2800 + greenDelayMs;
      const tGreen = setTimeout(() => {
        setIsGreen(true);
        if (onGreenTriggerRef.current) {
          onGreenTriggerRef.current();
        }
      }, totalDelay);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearTimeout(tGreen);
      };
    }

    if (status === "green") {
      setIsGreen(true);
    }
  }, [status, greenDelayMs]);

  const lightSize = isLarge ? "w-12 h-12 sm:w-16 sm:h-16" : "w-8 h-8 sm:w-10 sm:h-10";

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* FIA Formula 1 Start Gantry Carbon Housing */}
      <div className="p-3 sm:p-5 rounded-3xl bg-neutral-950 border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-2 ring-white/10 flex items-center gap-2 sm:gap-4">
        {[0, 1, 2, 3, 4].map((index) => {
          const isRedLit = !isGreen && litCount > index;

          return (
            <div
              key={index}
              className="p-1.5 sm:p-2 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col items-center gap-1.5 sm:gap-2"
            >
              {/* Lampu Atas (Merah) */}
              <div
                className={`rounded-full transition-all duration-100 relative ${lightSize} ${
                  isRedLit
                    ? "bg-red-600 shadow-[0_0_35px_rgba(239,68,68,1)] ring-4 ring-red-400/80 animate-pulse"
                    : "bg-red-950/40 border border-red-900/30"
                }`}
              >
                {isRedLit && (
                  <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-red-500 via-red-300 to-white/80 opacity-90" />
                )}
              </div>

              {/* Lampu Bawah (Hijau / Go) */}
              <div
                className={`rounded-full transition-all duration-100 relative ${lightSize} ${
                  isGreen
                    ? "bg-emerald-500 shadow-[0_0_45px_rgba(16,185,129,1)] ring-4 ring-emerald-300 animate-pulse"
                    : "bg-emerald-950/40 border border-emerald-900/30"
                }`}
              >
                {isGreen && (
                  <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-emerald-400 via-emerald-200 to-white/90" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Alert di bawah lampu */}
      <div className="mt-4 text-center">
        {isGreen ? (
          <span className="font-heading font-black text-2xl sm:text-4xl text-emerald-400 tracking-wider uppercase animate-bounce drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] block">
            ⚡ GO! GO! GO! TEKAN SEKARANG! ⚡
          </span>
        ) : litCount > 0 ? (
          <span className="font-mono font-bold text-sm sm:text-base text-red-400 tracking-widest uppercase animate-pulse block">
            🔴 BERSIAP... JANGAN TEKAN DULU (ANTI FALSE START)!
          </span>
        ) : (
          <span className="font-mono text-xs sm:text-sm text-white/50 tracking-wider uppercase block">
            Menunggu Aba-aba Start dari Panitia
          </span>
        )}
      </div>
    </div>
  );
}

