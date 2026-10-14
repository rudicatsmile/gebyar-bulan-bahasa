"use client";

import * as React from "react";
import { X, Sparkles, Rocket } from "lucide-react";

export interface WelcomeModalData {
  title: string;
  content: string;
  active: boolean;
}

interface WelcomeModalProps {
  data: WelcomeModalData;
}

const SESSION_KEY = "welcome_modal_dismissed";

export function WelcomeModal({ data }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  React.useEffect(() => {
    // Jangan tampilkan jika modal nonaktif
    if (!data.active || !data.title || !data.content) return;

    // Cek apakah sudah pernah ditutup dalam sesi ini
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch {
      // sessionStorage tidak tersedia (SSR / iframe sandbox)
    }

    // Tampilkan modal dengan sedikit delay agar halaman terload dulu
    const timer = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(timer);
  }, [data.active, data.title, data.content]);

  const handleClose = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // safe fallback
      }
    }, 250);
  }, []);

  // Tutup dengan Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop with blur */}
      <div
        className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-300 ${
          isClosing ? "opacity-0" : "opacity-100"
        }`}
        style={{ backgroundColor: "hsl(var(--primary) / 0.55)" }}
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div
        className={`relative z-[61] w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] overflow-hidden sm:rounded-3xl rounded-t-3xl transition-all duration-300 ${
          isClosing
            ? "opacity-0 translate-y-4 sm:scale-95 sm:translate-y-0"
            : "opacity-100 translate-y-0 sm:scale-100"
        }`}
        style={{
          background: "hsl(var(--card))",
          boxShadow: "0 25px 60px -12px hsl(var(--primary) / 0.35), 0 0 0 1px hsl(var(--border) / 0.5)",
        }}
      >
        {/* ====== Decorative Header with animated gradient ====== */}
        <div
          className="relative overflow-hidden px-6 pt-7 pb-5 sm:px-8 sm:pt-8 sm:pb-6"
          style={{
            background: "linear-gradient(135deg, hsl(220 82% 50%) 0%, hsl(220 82% 56%) 50%, hsl(210 90% 58%) 100%)",
          }}
        >
          {/* Floating decorative circles / confetti */}
          <div className="absolute top-2 left-6 w-3 h-3 rounded-full bg-white/20 animate-pulse" />
          <div className="absolute top-5 right-12 w-2 h-2 rounded-full bg-white/25" style={{ animation: "pulse 2s ease-in-out infinite 0.5s" }} />
          <div className="absolute bottom-3 left-20 w-2.5 h-2.5 rounded-full bg-white/15" style={{ animation: "pulse 3s ease-in-out infinite 1s" }} />
          <div className="absolute top-3 right-24 w-1.5 h-1.5 rounded-full bg-white/30" style={{ animation: "pulse 2.5s ease-in-out infinite 0.3s" }} />
          <div className="absolute bottom-2 right-8 w-2 h-2 rounded-full bg-white/20" style={{ animation: "pulse 2s ease-in-out infinite 1.2s" }} />

          {/* Close button — larger for mobile touch */}
          <button
            id="welcome-modal-close"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 bg-white/20 text-white/90 transition-all hover:bg-white/30 hover:text-white active:scale-90 cursor-pointer backdrop-blur-sm"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Wave emoji + Badge */}
          <div className="space-y-3">
            <span
              className="inline-block text-3xl sm:text-4xl"
              style={{ animation: "bounce 2s ease-in-out infinite" }}
              role="img"
              aria-label="wave"
            >
              👋
            </span>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
              <Sparkles className="h-3 w-3" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
              <span>Halo, Selamat Datang!</span>
            </div>
          </div>
        </div>

        {/* ====== Content Area ====== */}
        <div className="overflow-y-auto max-h-[calc(92vh-11rem)] sm:max-h-[calc(85vh-11rem)] p-6 sm:p-8 space-y-5">
          {/* Title */}
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
            {data.title}
          </h2>

          {/* Divider accent dot */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "hsl(220 82% 50%)" }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(220 82% 50% / 0.6)" }} />
            <span className="w-1 h-1 rounded-full" style={{ background: "hsl(220 82% 50% / 0.3)" }} />
          </div>

          {/* Body Content — Render whitespace/newlines */}
          <div className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {data.content}
          </div>

          {/* CTA Button — large, playful, touch-friendly */}
          <div className="pt-3 pb-1 sm:pb-0">
            <button
              id="welcome-modal-cta"
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{
                background: "linear-gradient(135deg, hsl(220 82% 50%) 0%, hsl(210 90% 55%) 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 14px hsl(220 82% 50% / 0.35)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px hsl(220 82% 50% / 0.5)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px hsl(220 82% 50% / 0.35)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              <Rocket className="h-5 w-5" />
              <span>Yuk, Mulai Jelajahi! 🚀</span>
            </button>
          </div>
        </div>

        {/* Bottom safe-area spacing for mobile */}
        <div className="h-2 sm:hidden" />
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
