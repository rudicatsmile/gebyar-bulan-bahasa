"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COMPETITIONS,
  SCHEDULES,
  ANNOUNCEMENTS,
  CHALLENGE_LEADERBOARD,
} from "@/lib/dummy-data";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Flame,
  Award,
  Layers,
  ChevronRight,
  Tv,
} from "lucide-react";

export default function HomePage() {
  // Countdown to 28 Oktober 2025, 08:00 WIB
  const [timeLeft, setTimeLeft] = React.useState({
    days: 1,
    hours: 20,
    minutes: 45,
    seconds: 12,
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todaySchedules = SCHEDULES.filter((s) => s.day === 2);
  const featuredAnnouncements = ANNOUNCEMENTS.slice(0, 3);
  const topParticipants = CHALLENGE_LEADERBOARD.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* ============================================================= */}
        {/* HERO SECTION */}
        {/* ============================================================= */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background py-16 sm:py-24 lg:py-32">
          {/* Subtle decorative grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {/* Badge Peringatan */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent-foreground uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Peringatan Hari Sumpah Pemuda 2025</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4 max-w-4xl mx-auto">
              <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                Berkarya dengan Bahasa,{" "}
                <span className="text-accent underline decoration-accent/40 underline-offset-8">
                  Bersatu dalam Budaya
                </span>
                , Menginspirasi Indonesia.
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Sistem Penilaian Digital & Dashboard Operasional Terpadu untuk 8 Cabang Lomba Kebudayaan dan Challenge Interaktif Lapangan.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/lomba">
                <Button size="lg" className="text-sm font-semibold gap-2 shadow-xs">
                  <span>Jelajahi 8 Lomba</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/papan-skor">
                <Button variant="outline" size="lg" className="text-sm font-semibold gap-2">
                  <Flame className="h-4 w-4 text-danger animate-pulse" />
                  <span>Papan Skor Sementara</span>
                </Button>
              </Link>
              <Link href="/monitor" target="_blank">
                <Button variant="secondary" size="lg" className="text-sm font-semibold gap-2 border border-border">
                  <Tv className="h-4 w-4 text-accent" />
                  <span>Layar Monitor Venue</span>
                </Button>
              </Link>
            </div>

            {/* Countdown Box */}
            <div className="pt-8">
              <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase mb-3">
                Hitung Mundur Puncak Peringatan Hari Sumpah Pemuda (28 Okt 2025)
              </p>
              <div className="inline-grid grid-cols-4 gap-2 sm:gap-4 p-4 rounded-xl border border-border bg-card/80 backdrop-blur-xs">
                <div className="px-3 sm:px-6 py-2 text-center">
                  <span className="font-mono text-2xl sm:text-4xl font-bold text-foreground block">
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Hari</span>
                </div>
                <div className="px-3 sm:px-6 py-2 text-center border-l border-border">
                  <span className="font-mono text-2xl sm:text-4xl font-bold text-foreground block">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Jam</span>
                </div>
                <div className="px-3 sm:px-6 py-2 text-center border-l border-border">
                  <span className="font-mono text-2xl sm:text-4xl font-bold text-foreground block">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Menit</span>
                </div>
                <div className="px-3 sm:px-6 py-2 text-center border-l border-border">
                  <span className="font-mono text-2xl sm:text-4xl font-bold text-accent block">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Detik</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* STATS STRIP */}
        {/* ============================================================= */}
        <section className="border-b border-border bg-card py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <span className="font-mono text-3xl font-bold text-foreground">8</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Cabang Lomba Paralel</p>
            </div>
            <div className="space-y-1 border-l border-border">
              <span className="font-mono text-3xl font-bold text-foreground">150+</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Peserta Terverifikasi</p>
            </div>
            <div className="space-y-1 border-l border-border">
              <span className="font-mono text-3xl font-bold text-foreground">8</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dewan Juri Ahli</p>
            </div>
            <div className="space-y-1 border-l border-border">
              <span className="font-mono text-3xl font-bold text-accent">100%</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Penilaian Digital Realtime</p>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 8 KOMPETISI KATALOG */}
        {/* ============================================================= */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                Katalog Perlombaan
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                8 Cabang Lomba Kebudayaan & Sastra
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Setiap lomba dinilai secara digital oleh dewan juri ahli berlisensi menggunakan bobot kriteria terstandarisasi.
              </p>
            </div>
            <Link href="/lomba">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>Lihat Seluruh Detail</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COMPETITIONS.map((comp) => {
              const statusVariant =
                comp.status === "berlangsung"
                  ? "live"
                  : comp.status === "selesai"
                  ? "success"
                  : "default";
              return (
                <Card
                  key={comp.id}
                  className="flex flex-col justify-between hover:border-accent/60 transition-colors group"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusVariant} className="text-[10px]">
                        {comp.status === "berlangsung"
                          ? "LIVE SEKARANG"
                          : comp.status === "selesai"
                          ? "SELESAI"
                          : "TERJADWAL"}
                      </Badge>
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {comp.category}
                      </span>
                    </div>
                    <CardTitle className="group-hover:text-accent transition-colors text-base line-clamp-1">
                      {comp.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {comp.description}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
                    <div className="space-y-1.5 border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="truncate">{comp.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{comp.time}</span>
                      </div>
                    </div>

                    <Link href={`/lomba/${comp.slug}`} className="block pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs gap-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <span>Kriteria & Skor</span>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ============================================================= */}
        {/* JADWAL HARI INI & PENGUMUMAN TERBARU */}
        {/* ============================================================= */}
        <section className="border-t border-border bg-card/40 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Jadwal Hari Ini */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                    Agenda Panggung
                  </span>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    Jadwal Hari Ini (Hari ke-2)
                  </h3>
                </div>
                <Link href="/jadwal" className="text-xs font-semibold text-accent hover:underline">
                  Semua Hari →
                </Link>
              </div>

              <div className="space-y-3">
                {todaySchedules.map((sch) => {
                  const isLive = sch.status === "berlangsung";
                  return (
                    <div
                      key={sch.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isLive
                          ? "border-danger/40 bg-danger/5 shadow-xs"
                          : "border-border bg-card hover:border-accent/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {sch.time}
                          </span>
                          {isLive && (
                            <Badge variant="live" className="text-[10px]">
                              Sedang Berlangsung
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-heading text-sm font-bold text-foreground">
                          {sch.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-accent" />
                          <span>{sch.venue} ({sch.stage})</span>
                        </div>
                      </div>

                      <div className="text-right sm:shrink-0">
                        <span className="text-[11px] text-muted-foreground block">
                          Host: {sch.host}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pengumuman & Leaderboard Mini */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                  Warta Resmi
                </span>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Pengumuman Panitia
                </h3>
              </div>

              <div className="space-y-3">
                {featuredAnnouncements.map((ann) => (
                  <Link
                    key={ann.id}
                    href={`/pengumuman/${ann.slug}`}
                    className="block p-4 rounded-xl border border-border bg-card hover:border-accent transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <Badge
                        variant={ann.category === "penting" ? "danger" : "default"}
                        className="text-[10px]"
                      >
                        {ann.category}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {ann.publishedAt}
                      </span>
                    </div>
                    <h5 className="font-heading text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                      {ann.title}
                    </h5>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ann.body}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Leaderboard Mini Box */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span>5 Besar Challenge Stand</span>
                  </h4>
                  <Link href="/leaderboard" className="text-xs text-accent hover:underline">
                    Peringkat Penuh →
                  </Link>
                </div>
                <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                  {topParticipants.map((p) => (
                    <div key={p.rank} className="flex items-center justify-between p-2.5 text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono font-bold text-muted-foreground w-4">
                          #{p.rank}
                        </span>
                        <div className="truncate">
                          <span className="font-medium text-foreground block truncate">
                            {p.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {p.institution}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-accent shrink-0 ml-2">
                        {p.points} Poin
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* BANNER TEMA SUMPAH PEMUDA */}
        {/* ============================================================= */}
        <section className="bg-primary text-primary-foreground py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="gold" className="text-xs">
              Semangat 97 Tahun Sumpah Pemuda
            </Badge>
            <h3 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
              &ldquo;Kami poetra dan poetri Indonesia, mendjoendjoeng bahasa persatoean, bahasa Indonesia.&rdquo;
            </h3>
            <p className="text-xs sm:text-sm text-primary-foreground/70 max-w-xl mx-auto leading-relaxed">
              Jadikan momen Gebyar Bulan Bahasa ini sebagai ladang unjuk kebolehan karya, memupuk persaudaraan antar generasi muda Indonesia.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link href="/twibbon/unggah">
                <Button variant="accent" size="lg" className="text-xs font-semibold gap-2">
                  <span>Pasang Twibbon Sekarang</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href="/challenge">
                <Button variant="outline" size="lg" className="text-xs font-semibold text-white border-white/20 hover:bg-white/10">
                  <span>Ikuti Challenge Berhadiah</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
