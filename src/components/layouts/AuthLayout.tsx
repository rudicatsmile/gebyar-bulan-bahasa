import Link from "next/link";
import { Layers, Sparkles, BookOpen, HeartHandshake } from "lucide-react";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background">
      {/* Kolom Kiri: Form */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 border-r border-border">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-accent">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-heading text-sm font-bold tracking-tight text-foreground">
              Gebyar<span className="text-accent">BulanBahasa</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>

        {/* Center Content */}
        <div className="my-auto py-8 max-w-sm w-full mx-auto space-y-6">
          <div className="space-y-1.5 text-left">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>
          {children}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border/60 text-center sm:text-left text-xs text-muted-foreground">
          © 2026 Panitia Gebyar Bulan Bahasa dan Kebudayaan
        </div>
      </div>

      {/* Kolom Kanan: Tipografi & Visual Sumpah Pemuda */}
      <div className="hidden lg:col-span-6 xl:col-span-7 bg-primary text-primary-foreground p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-accent">
          <Sparkles className="h-4 w-4 text-accent" />
          <span>Peringatan Hari Sumpah Pemuda 2026</span>
        </div>

        <div className="space-y-6 max-w-xl">
          <div className="space-y-3">
            <span className="text-xs font-mono tracking-widest text-accent uppercase">
              Tema Resmi Acara
            </span>
            <blockquote className="font-heading text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-white">
              &ldquo;Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.&rdquo;
            </blockquote>
          </div>
          <p className="text-sm text-primary-foreground/75 leading-relaxed">
            Platform operasional dan penilaian digital terintegrasi untuk 8 cabang perlombaan kebahasaan, sastra, sinematografi, dan seni tradisi nusantara.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-start gap-2.5">
              <BookOpen className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-semibold">8 Cabang Lomba</strong>
                <span className="text-white/60">Puisi, Film, Pidato, Melukis, Monolog, MC, Palang Pintu, Vokal.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-semibold">Challenge Non-Lomba</strong>
                <span className="text-white/60">Keliling 8 stand, kumpulkan poin, raih reward eksklusif.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-primary-foreground/60 border-t border-white/10 pt-4 font-mono">
          <span>Jakarta, 26 - 28 Oktober 2026</span>
          <span>Versi 1.0.0 (Digital Scoring)</span>
        </div>
      </div>
    </div>
  );
}
