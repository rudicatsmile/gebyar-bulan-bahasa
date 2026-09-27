"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, Radio, Clock, ArrowLeft, Maximize2 } from "lucide-react";

export function MonitorLayout({
  children,
  activeModuleTitle,
  currentCycleText,
  emergencyMessage,
}: {
  children: React.ReactNode;
  activeModuleTitle: string;
  currentCycleText?: string;
  emergencyMessage?: string;
}) {
  const [timeString, setTimeString] = React.useState("");

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(226,18%,10%)] text-white flex flex-col justify-between select-none overflow-hidden p-6 sm:p-8 lg:p-12 relative">
      {/* Emergency Alert Banner Overlay */}
      {emergencyMessage && (
        <div className="absolute top-0 inset-x-0 z-50 bg-danger text-white py-3 px-6 text-center font-bold tracking-wider uppercase animate-pulse flex items-center justify-center gap-3">
          <span className="h-3 w-3 rounded-full bg-white animate-ping" />
          <span>PENGUMUMAN PENTING: {emergencyMessage}</span>
        </div>
      )}

      {/* Top Header Monitor */}
      <header className="flex items-center justify-between pb-6 border-b border-white/10 shrink-0">
        {/* Brand / Event */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-[hsl(226,18%,10%)] font-black">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight text-white leading-none">
                Gebyar<span className="text-accent">BulanBahasa</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-widest bg-white/10 text-white/90 uppercase">
                Monitor Lapangan
              </span>
            </div>
            <p className="text-xs text-white/60 tracking-wider uppercase mt-1">
              Hari Sumpah Pemuda 2025 • Tema: Berkarya dengan Bahasa, Bersatu dalam Budaya
            </p>
          </div>
        </div>

        {/* Status Live & Clock */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/20 border border-success/40 text-success text-xs font-semibold uppercase tracking-wider">
            <Radio className="h-4 w-4 animate-pulse" />
            <span>Terhubung Realtime</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xl lg:text-2xl font-bold text-accent">
            <Clock className="h-5 w-5 text-accent/80" />
            <span>{timeString || "00:00:00 WIB"}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Layar Penuh"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Active Module Title Bar */}
      <div className="py-4 flex items-center justify-between text-white/70 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
          <h2 className="text-base lg:text-xl font-bold font-heading text-white tracking-wide uppercase">
            {activeModuleTitle}
          </h2>
        </div>
        {currentCycleText && (
          <div className="text-xs font-mono text-white/50 tracking-wider uppercase">
            {currentCycleText}
          </div>
        )}
      </div>

      {/* Main Display Canvas (Dynamic Content) */}
      <main className="flex-1 flex flex-col justify-center py-6 min-h-0">
        {children}
      </main>

      {/* Bottom Ticker / Navigation */}
      <footer className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Web Publik</span>
          </Link>
          <span>•</span>
          <span>Rotasi Otomatis 15 Detik</span>
        </div>

        <div className="flex items-center gap-2 font-mono text-white/60">
          <span>Kanal: Panggung Utama & Selasar Pameran</span>
        </div>
      </footer>
    </div>
  );
}
