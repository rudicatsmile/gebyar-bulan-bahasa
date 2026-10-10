"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Competition, ScheduleItem, Announcement } from "@/lib/dummy-data";
import {
  Sparkles,
  ArrowRight,
  Calendar,
  MapPin,
  Trophy,
  Flame,
  ChevronRight,
  Tv,
} from "lucide-react";

interface LeaderboardItem {
  rank: number;
  name: string;
  institution: string;
  points: number;
  badge: string;
}

interface HomeClientProps {
  competitions: Competition[];
  schedules: ScheduleItem[];
  announcements: Announcement[];
  leaderboard: LeaderboardItem[];
  eventName?: string;
  eventTheme?: string;
  eventDate?: string;
  eventYear?: string;
  heroImageUrl?: string;
  verifiedParticipantsCount?: number;
  judgesCount?: number;
}

/**
 * Mengubah string tanggal acara bebas (mis. "11 November 2026", "10 - 11 November 2026", "2026-11-11")
 * menjadi objek Date target yang valid pada pukul 08:00 WIB.
 */
function parseEventTargetDate(dateStr?: string, yearStr?: string): Date {
  const defaultYear = parseInt(yearStr || "", 10) || new Date().getFullYear();
  if (!dateStr) return new Date(defaultYear, 10, 11, 8, 0, 0);

  const str = String(dateStr).trim();
  const MONTHS: Record<string, number> = {
    januari: 0, jan: 0,
    februari: 1, feb: 1,
    maret: 2, mar: 2,
    april: 3, apr: 3,
    mei: 4, may: 4,
    juni: 5, jun: 5,
    juli: 6, jul: 6,
    agustus: 7, agu: 7, ags: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    oktober: 9, okt: 9, oct: 9,
    november: 10, nov: 10,
    desember: 11, des: 11, dec: 11,
  };

  // 1. Format teks tanggal: "11 November 2026", "10 - 11 November 2026", "11 Nov"
  const textMatch = str.match(/(?:(\d{1,2})\s*[-–]\s*)?(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?/i);
  if (textMatch) {
    const day = parseInt(textMatch[2], 10);
    const mStr = textMatch[3].toLowerCase();
    const month = MONTHS[mStr];
    const year = textMatch[4] ? parseInt(textMatch[4], 10) : defaultYear;
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day, 8, 0, 0);
    }
  }

  // 2. Format ISO: "2026-11-11"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10), 8, 0, 0);
  }

  // 3. Format DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10), 8, 0, 0);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date(defaultYear, 10, 11, 8, 0, 0);
}

function calculateTimeRemaining(targetDate: Date) {
  const now = new Date().getTime();
  const diffMs = targetDate.getTime() - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

interface ActiveDayInfo {
  day: number;
  isToday: boolean;
  isLive: boolean;
  formattedDate: string;
}

function resolveInitialActiveDay(items: ScheduleItem[]): ActiveDayInfo {
  if (!items || items.length === 0) {
    return { day: 1, isToday: false, isLive: false, formattedDate: "" };
  }

  // 1. Cek apakah ada jadwal yang cocok persis dengan tanggal hari ini (WIB / UTC+7)
  const today = new Date();
  const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(today);
  const todayIndo = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(today);
  const todayMonthDay = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(today);

  const exactTodayMatch = items.find((s) => {
    if (!s.date) return false;
    const sDateClean = s.date.trim().toLowerCase();
    return (
      sDateClean === todayIso.toLowerCase() ||
      sDateClean.includes(todayIndo.toLowerCase()) ||
      sDateClean.includes(todayMonthDay.toLowerCase())
    );
  });

  if (exactTodayMatch) {
    return {
      day: exactTodayMatch.day,
      isToday: true,
      isLive: exactTodayMatch.status === "berlangsung",
      formattedDate: exactTodayMatch.date,
    };
  }

  // 2. Cek apakah ada agenda yang statusnya sedang 'berlangsung' (LIVE saat ini)
  const liveMatch = items.find((s) => s.status === "berlangsung");
  if (liveMatch) {
    return {
      day: liveMatch.day,
      isToday: false,
      isLive: true,
      formattedDate: liveMatch.date,
    };
  }

  // 3. Cek apakah ada agenda yang statusnya 'terjadwal'
  const scheduledMatch = items.find((s) => s.status === "terjadwal");
  if (scheduledMatch) {
    return {
      day: scheduledMatch.day,
      isToday: false,
      isLive: false,
      formattedDate: scheduledMatch.date,
    };
  }

  // 4. Jika semua selesai, tampilkan hari terakhir dari rangkaian acara
  const allDays = Array.from(new Set(items.map((s) => s.day))).sort((a, b) => a - b);
  const lastDay = allDays[allDays.length - 1] || 1;
  const lastDayItem = items.find((s) => s.day === lastDay);
  return {
    day: lastDay,
    isToday: false,
    isLive: false,
    formattedDate: lastDayItem?.date || "",
  };
}

export function HomeClient({
  competitions,
  schedules,
  announcements,
  leaderboard,
  eventName = "Gebyar Bulan Bahasa dan Kebudayaan",
  eventTheme = "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
  eventDate = "11 November 2026",
  eventYear = "2026",
  heroImageUrl = "",
  verifiedParticipantsCount,
  judgesCount,
}: HomeClientProps) {
  const [currentEventName, setCurrentEventName] = React.useState(eventName);
  const [currentEventTheme, setCurrentEventTheme] = React.useState(eventTheme);
  const [currentEventDate, setCurrentEventDate] = React.useState(eventDate);
  const [currentEventYear, setCurrentEventYear] = React.useState(eventYear);
  const [currentHeroImageUrl, setCurrentHeroImageUrl] = React.useState(heroImageUrl);
  const [currentSchedules, setCurrentSchedules] = React.useState<ScheduleItem[]>(schedules);
  const [currentLeaderboard, setCurrentLeaderboard] = React.useState(leaderboard);

  React.useEffect(() => {
    setCurrentEventName(eventName);
  }, [eventName]);

  React.useEffect(() => {
    setCurrentEventTheme(eventTheme);
  }, [eventTheme]);

  React.useEffect(() => {
    setCurrentEventDate(eventDate);
  }, [eventDate]);

  React.useEffect(() => {
    setCurrentEventYear(eventYear);
  }, [eventYear]);

  React.useEffect(() => {
    setCurrentHeroImageUrl(heroImageUrl);
  }, [heroImageUrl]);

  React.useEffect(() => {
    setCurrentSchedules(schedules);
  }, [schedules]);

  React.useEffect(() => {
    setCurrentLeaderboard(leaderboard);
  }, [leaderboard]);

  React.useEffect(() => {
    // Sinkronisasi realtime / client-side dari pengaturan acara jika baru diperbarui di dashboard
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.eventName) {
            setCurrentEventName(data.settings.eventName);
          }
          if (data.settings.eventTheme) {
            setCurrentEventTheme(data.settings.eventTheme);
          }
          if (data.settings.eventDate) {
            setCurrentEventDate(data.settings.eventDate);
          }
          if (data.settings.eventYear) {
            setCurrentEventYear(String(data.settings.eventYear));
          }
          if (typeof data.settings.heroImageUrl === "string") {
            setCurrentHeroImageUrl(data.settings.heroImageUrl);
          }
        }
      })
      .catch(() => { });

    // Sinkronisasi realtime / client-side dari database schedules
    fetch("/api/schedules")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data?.schedules) && data.schedules.length > 0) {
          setCurrentSchedules(data.schedules);
        }
      })
      .catch(() => { });

    // Sinkronisasi realtime / client-side dari database leaderboard challenge
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data?.leaderboard)) {
          setCurrentLeaderboard(data.leaderboard);
        }
      })
      .catch(() => { });
  }, []);

  // Hitung hari aktif secara dinamis dari database dan kalender
  const activeInfo = React.useMemo(() => resolveInitialActiveDay(currentSchedules), [currentSchedules]);
  const [selectedDay, setSelectedDay] = React.useState<number>(() => activeInfo.day);

  // Jika activeInfo berubah (misal setelah fetch data terbaru), update selectedDay
  React.useEffect(() => {
    setSelectedDay(activeInfo.day);
  }, [activeInfo.day]);

  // Daftar semua hari yang tersedia di jadwal
  const availableDays = React.useMemo(() => {
    return Array.from(new Set(currentSchedules.map((s) => s.day))).sort((a, b) => a - b);
  }, [currentSchedules]);

  // Jadwal untuk hari yang dipilih
  const todaySchedules = React.useMemo(() => {
    return currentSchedules.filter((s) => s.day === selectedDay);
  }, [currentSchedules, selectedDay]);

  // Tanggal untuk hari yang sedang dipilih
  const selectedDayDate = React.useMemo(() => {
    const item = currentSchedules.find((s) => s.day === selectedDay);
    return item?.date || "";
  }, [currentSchedules, selectedDay]);

  const isSelectedActive = selectedDay === activeInfo.day;
  const titleText = isSelectedActive
    ? `Jadwal Hari Ini (Hari ke-${selectedDay})`
    : `Jadwal Agenda Panggung (Hari ke-${selectedDay})`;

  // Countdown dinamis yang menghitung selisih waktu nyata ke tanggal acara target
  const [timeLeft, setTimeLeft] = React.useState(() => {
    const target = parseEventTargetDate(eventDate, eventYear);
    return calculateTimeRemaining(target);
  });

  React.useEffect(() => {
    const target = parseEventTargetDate(currentEventDate, currentEventYear);
    setTimeLeft(calculateTimeRemaining(target));

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(target));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentEventDate, currentEventYear]);

  const featuredAnnouncements = announcements.slice(0, 3);
  const topParticipants = currentLeaderboard.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1">
        {/* ============================================================= */}
        {/* HERO SECTION */}
        {/* ============================================================= */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background pt-5 pb-10 sm:pt-7 sm:pb-14 lg:pt-8 lg:pb-16">
          {/* Subtle decorative grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4 sm:space-y-5">
            {/* 1. Hero Image Showcase di PALING ATAS (Ditampilkan utuh tanpa terpotong) */}
            {currentHeroImageUrl && (
              <div className="mx-auto max-w-4xl flex justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-border/80 bg-card/60 shadow-lg backdrop-blur-xs">
                  <img
                    src={currentHeroImageUrl}
                    alt={currentEventName || "Hero Banner Acara"}
                    className="block h-auto w-auto max-h-[220px] sm:max-h-[260px] lg:max-h-[300px] max-w-full object-contain rounded-2xl"
                  />
                </div>
              </div>
            )}

            {/* 2. Badge Peringatan */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent-foreground uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>{currentEventName}</span>
            </div>

            {/* 3. Tema Peringatan (Font diperkecil agar image & tema terlihat dalam 1 monitor) */}
            <div className="space-y-2 max-w-3xl mx-auto">
              <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug">
                {currentEventTheme}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Sistem Penilaian Digital &amp; Dashboard Operasional Terpadu untuk 8 Cabang Lomba Kebudayaan dan Challenge Interaktif Lapangan.
              </p>
            </div>

            {/* 4. CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <Link href="/lomba">
                <Button size="default" className="text-xs sm:text-sm font-semibold gap-2 shadow-xs h-9 sm:h-10 px-3.5 sm:px-4">
                  <span>Jelajahi {competitions.length} Lomba</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/papan-skor">
                <Button variant="outline" size="default" className="text-xs sm:text-sm font-semibold gap-2 h-9 sm:h-10 px-3.5 sm:px-4">
                  <Flame className="h-4 w-4 text-danger animate-pulse" />
                  <span>Papan Skor Sementara</span>
                </Button>
              </Link>
              <Link href="/monitor" target="_blank">
                <Button variant="secondary" size="default" className="text-xs sm:text-sm font-semibold gap-2 border border-border h-9 sm:h-10 px-3.5 sm:px-4">
                  <Tv className="h-4 w-4 text-accent" />
                  <span>Layar Monitor Venue</span>
                </Button>
              </Link>
            </div>

            {/* 5. Countdown Box */}
            <div className="pt-3 sm:pt-4">
              <p className="text-[11px] sm:text-xs font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Hitung Mundur Puncak Peringatan {currentEventName} ({currentEventDate})
              </p>
              <div className="inline-grid grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-3.5 rounded-xl border border-border bg-card/80 backdrop-blur-xs">
                <div className="px-3 sm:px-5 py-1 text-center">
                  <span className="font-mono text-lg sm:text-2xl font-bold text-foreground block" suppressHydrationWarning>
                    {String(timeLeft.days).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Hari</span>
                </div>
                <div className="px-3 sm:px-5 py-1 text-center border-l border-border">
                  <span className="font-mono text-lg sm:text-2xl font-bold text-foreground block" suppressHydrationWarning>
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Jam</span>
                </div>
                <div className="px-3 sm:px-5 py-1 text-center border-l border-border">
                  <span className="font-mono text-lg sm:text-2xl font-bold text-foreground block" suppressHydrationWarning>
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Menit</span>
                </div>
                <div className="px-3 sm:px-5 py-1 text-center border-l border-border">
                  <span className="font-mono text-lg sm:text-2xl font-bold text-accent block" suppressHydrationWarning>
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground">Detik</span>
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
              <span className="font-mono text-3xl font-bold text-foreground">{competitions.length}</span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Cabang Lomba Paralel</p>
            </div>
            <div className="space-y-1 border-l border-border">
              <span className="font-mono text-3xl font-bold text-foreground">
                {verifiedParticipantsCount !== undefined ? verifiedParticipantsCount : "150+"}
              </span>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Peserta Terverifikasi</p>
            </div>
            <div className="space-y-1 border-l border-border">
              <span className="font-mono text-3xl font-bold text-foreground">
                {judgesCount !== undefined ? judgesCount : "8"}
              </span>
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
                {competitions.length} Cabang Lomba Kebudayaan & Sastra
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
            {competitions.map((comp) => {
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
                            : "PENDAFTARAN DIBUKA"}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono tracking-widest text-accent uppercase font-bold">
                      Agenda Panggung
                    </span>
                    {selectedDayDate && (
                      <span className="text-xs font-mono text-muted-foreground">
                        • {selectedDayDate}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                    <span>{titleText}</span>
                    {isSelectedActive && activeInfo.isLive && (
                      <Badge variant="live" className="text-[10px] hidden sm:inline-flex">
                        Sedang Berlangsung
                      </Badge>
                    )}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  {/* Selector Tombol Hari (Dihasilkan dinamis dari database) */}
                  {availableDays.length > 1 && (
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-card">
                      {availableDays.map((d) => {
                        const isCurrentActive = d === activeInfo.day;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSelectedDay(d)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${selectedDay === d
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              }`}
                          >
                            <span>Hari ke-{d}</span>
                            {isCurrentActive && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${activeInfo.isLive ? "bg-danger animate-pulse" : "bg-accent"
                                  }`}
                                title="Hari Aktif Acara"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <Link href="/jadwal" className="text-xs font-semibold text-accent hover:underline whitespace-nowrap">
                    Semua Hari →
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                {todaySchedules.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border bg-card/50">
                    <p className="text-sm text-muted-foreground">
                      Belum ada agenda panggung yang dijadwalkan untuk Hari ke-{selectedDay}.
                    </p>
                  </div>
                ) : (
                  todaySchedules.map((sch) => {
                    const isLive = sch.status === "berlangsung";
                    return (
                      <div
                        key={sch.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isLive
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
                  })
                )}
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
                  {topParticipants.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Belum ada poin terkumpul dari challenge stand.
                    </div>
                  ) : (
                    topParticipants.map((p) => (
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
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* BANNER TEMA PERINGATAN */}
        {/* ============================================================= */}
        <section className="bg-primary text-primary-foreground py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="gold" className="text-xs">
              Semangat {currentEventName}
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

      <PublicFooter competitionsCount={competitions.length} />
    </div>
  );
}
