import Link from "next/link";
import { Layers } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Theme */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-accent">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                Gebyar<span className="text-accent">BulanBahasa</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
              Sistem Penilaian Digital & Dashboard Operasional Acara &ldquo;Gebyar Bulan Bahasa dan Kebudayaan&rdquo; memperingati Hari Sumpah Pemuda.
            </p>
            <div className="p-3.5 rounded-lg bg-muted/60 border border-border max-w-md">
              <p className="text-xs italic text-foreground font-medium">
                &ldquo;Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.&rdquo;
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Akses Cepat
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/lomba" className="hover:text-foreground transition-colors">
                  Katalog 8 Lomba
                </Link>
              </li>
              <li>
                <Link href="/jadwal" className="hover:text-foreground transition-colors">
                  Jadwal & Agenda Panggung
                </Link>
              </li>
              <li>
                <Link href="/papan-skor" className="hover:text-foreground transition-colors">
                  Papan Skor Sementara
                </Link>
              </li>
              <li>
                <Link href="/pemenang" className="hover:text-foreground transition-colors">
                  Daftar Pemenang Resmi
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-foreground transition-colors">
                  Peringkat Challenge Peserta
                </Link>
              </li>
              <li>
                <Link href="/galeri/twibbon" className="hover:text-foreground transition-colors">
                  Galeri Twibbon
                </Link>
              </li>
            </ul>
          </div>

          {/* Panitia & Portals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Portal Panitia & Juri
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard Seksi Acara
                </Link>
              </li>
              <li>
                <Link href="/juri" className="hover:text-foreground transition-colors">
                  Portal Penilaian Juri
                </Link>
              </li>
              <li>
                <Link href="/media" className="hover:text-foreground transition-colors">
                  Dashboard Media Center
                </Link>
              </li>
              <li>
                <Link href="/peserta" className="hover:text-foreground transition-colors">
                  Dashboard Peserta & Reward
                </Link>
              </li>
              <li>
                <Link href="/monitor" target="_blank" className="hover:text-accent transition-colors font-medium">
                  Layar Monitor Lapangan (TV)
                </Link>
              </li>
              <li>
                <Link href="/kontak" className="hover:text-foreground transition-colors">
                  Hubungi Panitia
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>© 2026 GebyarBulanBahasa. Panitia Peringatan Hari Sumpah Pemuda.</p>
          <div className="flex items-center gap-4">
            <Link href="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <span>•</span>
            <Link href="/tentang" className="hover:text-foreground transition-colors">
              Tentang Acara
            </Link>
            <span>•</span>
            <Link href="/kontak" className="hover:text-foreground transition-colors">
              Sekretariat
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
