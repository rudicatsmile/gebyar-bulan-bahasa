"use client";

import * as React from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    const timer = setTimeout(() => setIsOpen(true), 400);
    return () => clearTimeout(timer);
  }, [data.active, data.title, data.content]);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // safe fallback
    }
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/60 backdrop-blur-sm animate-in fade-in-0 duration-300"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative z-[61] w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl animate-in zoom-in-95 fade-in-0 duration-300">
        {/* Decorative top gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-primary to-accent" />

        {/* Close button */}
        <button
          id="welcome-modal-close"
          onClick={handleClose}
          className="absolute right-3 top-4 z-10 rounded-full p-1.5 text-muted-foreground/70 transition-all hover:text-foreground hover:bg-muted cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Content area */}
        <div className="overflow-y-auto max-h-[calc(85vh-3.5rem)] p-6 sm:p-8 space-y-5">
          {/* Icon & Title */}
          <div className="space-y-3 pr-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent-foreground uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Selamat Datang</span>
            </div>

            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
              {data.title}
            </h2>
          </div>

          {/* Body Content — Render whitespace/newlines */}
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {data.content}
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <Button
              id="welcome-modal-cta"
              onClick={handleClose}
              size="lg"
              className="w-full text-xs sm:text-sm font-semibold gap-2 h-10 sm:h-11 cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Mulai Jelajahi</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
