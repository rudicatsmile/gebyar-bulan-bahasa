"use client";

import * as React from "react";
import Link from "next/link";
import { MonitorLayout } from "@/components/layouts/MonitorLayout";
import type { MonitorDisplayData } from "@/lib/supabase/queries";
import {
  Calendar,
  Flame,
  Megaphone,
  Trophy,
  Camera,
  Coins,
  MapPin,
  Clock,
  Sparkles,
  Radio,
  ArrowLeft,
  QrCode,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface MonitorSpesifikClientProps {
  slug: string;
  initialData: MonitorDisplayData;
}

export function MonitorSpesifikClient({ slug: rawSlug, initialData }: MonitorSpesifikClientProps) {
  const [data, setData] = React.useState<MonitorDisplayData>(initialData);
  const slug = rawSlug.toLowerCase();

  // Polling every 10 seconds for real-time updates
  React.useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/monitor", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to refresh monitor data:", err);
      }
    };

    const pollInterval = setInterval(fetchLatest, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  const schedules = data.schedules || [];
  const activeComp = data.activeCompetition;
  const liveScores = data.liveScores || [];
  const importantAnnouncement = data.importantAnnouncement;
  const featuredTwibbons = data.twibbons || [];
  const winners = data.winners || [];
  const topChallenge = (data.leaderboard || []).slice(0, 8);

  const getModuleTitle = () => {
    switch (slug) {
      case "jadwal":
        return "Jadwal & Agenda Panggung — Saluran Khusus";
      case "papan-skor":
        return `Papan Skor Langsung — ${activeComp?.name || "Penilaian Lomba"}`;
      case "pemenang":
        return "Daftar Juara & Pemenang";
      case "twibbon":
        return "Semarak Galeri Twibbon Peserta & Pengunjung";
      case "leaderboard":
        return "Klasemen Poin Challenge Keliling Stand";
      case "pengumuman":
        return "Pengumuman Resmi & Arahan Panitia";
      default:
        return `Monitor Lapangan — ${rawSlug}`;
    }
  };

  return (
    <MonitorLayout
      activeModuleTitle={getModuleTitle()}
      currentCycleText={`Saluran Statis Dedicated • /monitor/${slug}`}
      emergencyMessage={data.emergencyMessage || undefined}
      eventName={data.eventSettings?.eventName}
      eventTheme={data.eventSettings?.eventTheme}
      eventYear={data.eventSettings?.eventYear}
    >
      <div className="h-full flex flex-col justify-center">
        {/* ============================================================= */}
        {/* 1. JADWAL DEDICATED */}
        {/* ============================================================= */}
        {slug === "jadwal" && (
          <div className="space-y-6">
            {schedules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                {schedules.map((sch) => {
                  const isLive = sch.status === "berlangsung";
                  return (
                    <div
                      key={sch.id}
                      className={`p-6 sm:p-8 rounded-2xl border transition-all flex flex-col justify-between ${isLive
                          ? "border-danger bg-danger/15 shadow-xl ring-2 ring-danger/30"
                          : "border-white/10 bg-white/5"
                        }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xl sm:text-2xl font-bold text-accent">
                            {sch.time}
                          </span>
                          {isLive ? (
                            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-danger text-white uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                              <Radio className="h-3.5 w-3.5" /> SEDANG BERLANGSUNG
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-white/70 uppercase">
                              Hari ke-{sch.day}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                          {sch.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10 text-white/70 text-base sm:text-lg">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-accent" />
                          <strong className="text-white">{sch.venue}</strong>
                          {sch.stage && <span>({sch.stage})</span>}
                        </span>
                        {sch.host && (
                          <span className="font-mono text-sm text-white/60">
                            Pemandu: {sch.host}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Calendar className="h-14 w-14 text-accent mx-auto" />
                <h3 className="text-3xl font-bold text-white font-heading">
                  Belum Ada Jadwal Panggung
                </h3>
                <p className="text-white/60">
                  Agenda panggung dan jadwal acara akan disinkronkan secara real-time oleh Seksi Acara.
                </p>
              </div>
            )}
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-white/70 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Semua jadwal disinkronkan secara real-time dengan kendali Seksi Acara.
              </span>
              <span className="font-mono text-xs text-white/40">ZONA WAKTU: WIB (UTC+7)</span>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* 2. PAPAN SKOR DEDICATED */}
        {/* ============================================================= */}
        {slug === "papan-skor" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-sm font-mono text-accent uppercase tracking-widest">
                  LIVE SCOREBOARD
                </span>
                <h3 className="font-heading text-3xl font-bold text-white">
                  {activeComp ? activeComp.name : "Penilaian Lomba"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {activeComp && (
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent/20 text-accent border border-accent/30">
                    {activeComp.category === "individu" ? "INDIVIDU" : "KELOMPOK"}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-danger/20 text-danger border border-danger/30 animate-pulse">
                  REKAP SKOR
                </span>
              </div>
            </div>

            {liveScores.length > 0 ? (
              <div className="space-y-4">
                {liveScores.slice(0, 5).map((score, idx) => (
                  <div
                    key={score.registrationId || idx}
                    className="flex items-center justify-between p-5 sm:p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className={`font-mono text-3xl sm:text-4xl font-extrabold w-12 text-center ${idx === 0
                            ? "text-accent"
                            : idx === 1
                              ? "text-white/90"
                              : idx === 2
                                ? "text-amber-500"
                                : "text-white/40"
                          }`}
                      >
                        0{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight">
                          {score.participantName}
                        </h4>
                        <p className="text-white/60 text-lg font-mono">
                          {score.institution}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-3xl sm:text-5xl font-black text-accent tracking-tight">
                        {Number(score.finalAverageScore || 0).toFixed(2)}
                      </div>
                      <span className="text-xs uppercase font-mono text-white/50 tracking-widest">
                        NILAI RATA-RATA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Sparkles className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Belum Ada Nilai Masuk
                </h3>
                <p className="text-white/60 text-sm">
                  Hasil agregasi nilai dewan juri akan tampil secara otomatis di papan skor ini.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 3. PEMENANG DEDICATED */}
        {/* ============================================================= */}
        {slug === "pemenang" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent flex items-center justify-center gap-2">
                <Trophy className="h-4 w-4" /> KEPUTUSAN DEWAN JURI RESMI
              </span>
              <h3 className="font-heading text-4xl sm:text-5xl font-bold text-white tracking-tight">
                {winners[0]?.competitionName || "Juara Resmi Lomba Kebudayaan"}
              </h3>
            </div>

            {winners.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
                {/* Podium 2 */}
                {winners.find((w) => w.rank === 2) && (
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center space-y-4 order-2 md:order-1">
                    <div className="w-16 h-16 rounded-full bg-white/10 text-white font-mono text-2xl font-bold flex items-center justify-center mx-auto border border-white/20">
                      2
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase text-white/60">
                        JUARA II
                      </span>
                      <h4 className="font-heading text-2xl font-bold text-white">
                        {winners.find((w) => w.rank === 2)?.winnerName}
                      </h4>
                      <p className="text-sm font-mono text-white/60">
                        {winners.find((w) => w.rank === 2)?.institution}
                      </p>
                    </div>
                    <div className="font-mono text-3xl font-extrabold text-white">
                      {Number(winners.find((w) => w.rank === 2)?.finalScore || 0).toFixed(2)} Pts
                    </div>
                  </div>
                )}

                {/* Podium 1 */}
                {winners.find((w) => w.rank === 1) && (
                  <div className="p-8 rounded-2xl border-2 border-accent bg-accent/15 text-center space-y-5 order-1 md:order-2 shadow-2xl relative">
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-mono font-bold bg-accent text-ink uppercase tracking-wider">
                      JUARA UTAMA
                    </span>
                    <div className="w-20 h-20 rounded-full bg-accent text-ink font-mono text-3xl font-black flex items-center justify-center mx-auto shadow-lg">
                      1
                    </div>
                    <div>
                      <span className="text-sm font-mono uppercase text-accent font-bold">
                        JUARA I
                      </span>
                      <h4 className="font-heading text-3xl sm:text-4xl font-black text-white">
                        {winners.find((w) => w.rank === 1)?.winnerName}
                      </h4>
                      <p className="text-base font-mono text-white/80">
                        {winners.find((w) => w.rank === 1)?.institution}
                      </p>
                    </div>
                    <div className="font-mono text-4xl sm:text-5xl font-black text-accent">
                      {Number(winners.find((w) => w.rank === 1)?.finalScore || 0).toFixed(2)} Pts
                    </div>
                  </div>
                )}

                {/* Podium 3 */}
                {winners.find((w) => w.rank === 3) && (
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/5 text-center space-y-4 order-3">
                    <div className="w-16 h-16 rounded-full bg-amber-600/20 text-amber-400 font-mono text-2xl font-bold flex items-center justify-center mx-auto border border-amber-500/30">
                      3
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase text-amber-400/80">
                        JUARA III
                      </span>
                      <h4 className="font-heading text-2xl font-bold text-white">
                        {winners.find((w) => w.rank === 3)?.winnerName}
                      </h4>
                      <p className="text-sm font-mono text-white/60">
                        {winners.find((w) => w.rank === 3)?.institution}
                      </p>
                    </div>
                    <div className="font-mono text-3xl font-extrabold text-amber-400">
                      {Number(winners.find((w) => w.rank === 3)?.finalScore || 0).toFixed(2)} Pts
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Trophy className="h-14 w-14 text-accent mx-auto" />
                <h3 className="text-3xl font-bold text-white font-heading">
                  Rekapitulasi Pemenang Resmi
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Daftar pemenang resmi akan ditampilkan di layar ini setelah penetapan dan verifikasi nilai dewan juri selesai.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 4. TWIBBON DEDICATED */}
        {/* ============================================================= */}
        {slug === "twibbon" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-sm font-mono text-accent uppercase tracking-widest">
                  GALERI FOTO SEMARAK
                </span>
                <h3 className="font-heading text-3xl font-bold text-white">
                  Twibbon Peserta & Pengunjung
                </h3>
              </div>
              <div className="flex items-center gap-2 text-white/60 text-sm font-mono">
                <QrCode className="h-4 w-4 text-accent" />
                Unggah twibbon di menu Galeri Twibbon
              </div>
            </div>

            {featuredTwibbons.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {featuredTwibbons.slice(0, 4).map((twib) => (
                  <div
                    key={twib.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center text-center space-y-3"
                  >
                    <div className="w-full aspect-square rounded-xl bg-ink/50 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                      <img
                        src={twib.imageUrl}
                        alt={twib.uploaderName}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur text-[11px] font-mono text-white truncate">
                        {twib.uploaderName}
                      </span>
                    </div>
                    <div className="w-full">
                      <p className="text-xs text-white/60 font-mono truncate">
                        {twib.institution}
                      </p>
                      {twib.caption && (
                        <p className="text-xs text-accent mt-1 italic line-clamp-2">
                          &quot;{twib.caption}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Camera className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Galeri Twibbon
                </h3>
                <p className="text-white/60 text-sm">
                  Belum ada foto twibbon yang disetujui. Unggah twibbon Anda dan bagikan keseruan acara!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 5. LEADERBOARD DEDICATED */}
        {/* ============================================================= */}
        {slug === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-sm font-mono text-accent uppercase tracking-widest">
                  KLASEMEN POIN REAL-TIME
                </span>
                <h3 className="font-heading text-3xl font-bold text-white">
                  Leaderboard Challenge Stand Budaya
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent/20 text-accent border border-accent/30">
                TOP PESERTA
              </span>
            </div>

            {topChallenge.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topChallenge.map((item) => (
                  <div
                    key={item.rank}
                    className="flex items-center justify-between p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`font-mono text-2xl font-black w-8 text-center ${item.rank === 1
                            ? "text-accent"
                            : item.rank === 2
                              ? "text-white"
                              : item.rank === 3
                                ? "text-amber-500"
                                : "text-white/40"
                          }`}
                      >
                        #{item.rank}
                      </span>
                      <div>
                        <h4 className="font-heading text-xl font-bold text-white">
                          {item.name}
                        </h4>
                        <p className="text-xs font-mono text-white/50">
                          {item.institution} • {item.badge}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-2xl sm:text-3xl font-black text-accent flex items-center gap-1.5 justify-end">
                        <Coins className="h-5 w-5 text-accent" />
                        {item.points}
                      </span>
                      <span className="text-[11px] font-mono uppercase text-white/40">
                        POIN
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Coins className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Klasemen Challenge Stand
                </h3>
                <p className="text-white/60 text-sm">
                  Belum ada data perolehan poin challenge stand. Kunjungi stand untuk mengumpulkan poin!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* 6. PENGUMUMAN DEDICATED */}
        {/* ============================================================= */}
        {slug === "pengumuman" && (
          <div className="space-y-6">
            {importantAnnouncement ? (
              <div className="p-8 sm:p-12 rounded-2xl border-2 border-accent/40 bg-accent/10 space-y-6">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-danger text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4" /> WARTA RESMI PANITIA
                  </span>
                  <span className="text-sm font-mono text-white/60">
                    {importantAnnouncement.publishedAt}
                  </span>
                </div>

                <h2 className="font-heading text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  {importantAnnouncement.title}
                </h2>

                <p className="text-white/80 text-xl sm:text-2xl leading-relaxed font-body">
                  {importantAnnouncement.body}
                </p>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between text-sm sm:text-base text-white/60">
                  <span className="font-mono">
                    Diterbitkan oleh {importantAnnouncement.author || "Seksi Acara"}
                  </span>
                  <span className="font-mono text-accent">DOKUMEN RESMI</span>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl border border-white/10 bg-white/5 text-center space-y-4 max-w-2xl mx-auto">
                <Megaphone className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Pengumuman Resmi Panitia
                </h3>
                <p className="text-white/60">
                  Selamat datang di Gebyar Bulan Bahasa & Kebudayaan. Ikuti informasi resmi acara di halaman ini.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* FALLBACK IF UNKNOWN SLUG */}
        {/* ============================================================= */}
        {![
          "jadwal",
          "papan-skor",
          "pemenang",
          "twibbon",
          "leaderboard",
          "pengumuman",
        ].includes(slug) && (
            <div className="p-12 rounded-2xl border border-white/10 bg-white/5 text-center space-y-6 max-w-xl mx-auto">
              <AlertTriangle className="h-16 w-16 text-accent mx-auto" />
              <div className="space-y-2">
                <h3 className="font-heading text-3xl font-bold text-white">
                  Saluran Monitor Tidak Ditemukan
                </h3>
                <p className="text-white/60">
                  Saluran <code className="text-accent font-mono">&quot;{rawSlug}&quot;</code> tidak
                  tersedia. Silakan pilih salah satu saluran monitor resmi berikut:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <Link
                  href="/monitor/jadwal"
                  className="p-3 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-mono text-center"
                >
                  /monitor/jadwal
                </Link>
                <Link
                  href="/monitor/papan-skor"
                  className="p-3 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-mono text-center"
                >
                  /monitor/papan-skor
                </Link>
                <Link
                  href="/monitor/pemenang"
                  className="p-3 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-mono text-center"
                >
                  /monitor/pemenang
                </Link>
                <Link
                  href="/monitor/twibbon"
                  className="p-3 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-mono text-center"
                >
                  /monitor/twibbon
                </Link>
                <Link
                  href="/monitor/leaderboard"
                  className="p-3 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-mono text-center"
                >
                  /monitor/leaderboard
                </Link>
                <Link
                  href="/monitor"
                  className="p-3 rounded-lg border border-accent/40 bg-accent/20 text-accent hover:bg-accent/30 text-sm font-mono text-center"
                >
                  /monitor (Utama Auto)
                </Link>
              </div>
            </div>
          )}

        {/* Quick Nav Bar between channels on the bottom for field operators */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-white/50">
          <div className="flex items-center gap-2">
            <Link
              href="/monitor"
              className="text-accent hover:underline flex items-center gap-1 font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Beranda Monitor
            </Link>
            <span>•</span>
            <span>Kanal Aktif: {slug}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>Pindah Saluran:</span>
            {["jadwal", "papan-skor", "pemenang", "twibbon", "leaderboard", "pengumuman"].map(
              (ch) => (
                <Link
                  key={ch}
                  href={`/monitor/${ch}`}
                  className={`px-2 py-1 rounded transition-colors ${slug === ch
                      ? "bg-accent text-ink font-bold"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                >
                  {ch}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </MonitorLayout>
  );
}
