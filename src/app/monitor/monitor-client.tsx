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
  ChevronLeft,
  ChevronRight,
  Radio,
  Award,
} from "lucide-react";

const MODULES = [
  { key: "jadwal", title: "Jadwal & Agenda Panggung Hari Ini" },
  { key: "papan_skor", title: "Papan Skor Sementara (5 Besar Lomba Aktif)" },
  { key: "pengumuman", title: "Warta Resmi & Arahan Panitia" },
  { key: "pemenang", title: "Hasil Juara Resmi Peringatan Sumpah Pemuda" },
  { key: "twibbon", title: "Semarak Twibbon Peserta & Pengunjung" },
  { key: "leaderboard", title: "Klasemen Poin Challenge Keliling Stand" },
];

interface MonitorClientProps {
  initialData: MonitorDisplayData;
}

export function MonitorClient({ initialData }: MonitorClientProps) {
  const [data, setData] = React.useState<MonitorDisplayData>(initialData);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const ROTATION_SECONDS = 15;

  // Background polling to keep monitor synchronized with database
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

    const pollInterval = setInterval(fetchLatest, 15000);
    return () => clearInterval(pollInterval);
  }, []);

  // Auto rotation timer
  React.useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % MODULES.length);
    }, ROTATION_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const activeModule = MODULES[currentIdx];

  // Data helpers
  const schedules = data.schedules || [];
  const activeComp = data.activeCompetition;
  const liveScores = (data.liveScores || []).slice(0, 5);
  const importantAnnouncement = data.importantAnnouncement;
  const featuredTwibbons = (data.twibbons || []).slice(0, 4);
  const winners = data.winners || [];
  const topChallenge = (data.leaderboard || []).slice(0, 5);

  return (
    <MonitorLayout
      activeModuleTitle={activeModule.title}
      currentCycleText={`Modul ${currentIdx + 1} dari ${MODULES.length} • Rotasi Otomatis 15 Detik`}
      emergencyMessage={data.emergencyMessage || undefined}
      eventName={data.eventSettings?.eventName}
      eventTheme={data.eventSettings?.eventTheme}
      eventYear={data.eventSettings?.eventYear}
    >
      <div className="h-full flex flex-col justify-center">
        {/* ============================================================= */}
        {/* MODUL 1: JADWAL LIVE */}
        {/* ============================================================= */}
        {activeModule.key === "jadwal" && (
          <div>
            {schedules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-in fade-in-50 duration-300">
                {schedules.slice(0, 4).map((sch) => {
                  const isLive = sch.status === "berlangsung";
                  return (
                    <div
                      key={sch.id}
                      className={`p-6 sm:p-8 rounded-2xl border transition-all flex flex-col justify-between ${
                        isLive
                          ? "border-danger bg-danger/15 shadow-lg ring-2 ring-danger/30"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xl sm:text-2xl font-bold text-accent">
                            {sch.time}
                          </span>
                          {isLive ? (
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-danger text-white uppercase tracking-wider animate-pulse flex items-center gap-1.5">
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

                      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-base sm:text-lg text-white/70 mt-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-accent" />
                          <strong className="text-white">{sch.venue}</strong>
                          {sch.stage && <span>({sch.stage})</span>}
                        </div>
                        {sch.host && <span>Pemandu: {sch.host}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-lg mx-auto space-y-4">
                <Calendar className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Belum Ada Jadwal Panggung
                </h3>
                <p className="text-white/60 text-sm">
                  Jadwal acara dan agenda panggung akan diperbarui oleh Seksi Acara.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 2: PAPAN SKOR 5 BESAR */}
        {/* ============================================================= */}
        {activeModule.key === "papan_skor" && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <span className="font-heading text-xl sm:text-2xl font-bold text-accent">
                Cabang: {activeComp ? `${activeComp.name} (${activeComp.category.toUpperCase()})` : "Penilaian Lomba"}
              </span>
              <span className="text-sm font-mono text-white/60">
                Panggung Utama • Agregasi Penilaian Multi-Juri
              </span>
            </div>

            {liveScores.length > 0 ? (
              <div className="space-y-3">
                {liveScores.map((sc, idx) => (
                  <div
                    key={sc.registrationId || idx}
                    className={`p-5 sm:p-6 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      sc.rank === 1
                        ? "border-accent bg-accent/15"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <span
                        className={`h-12 w-12 rounded-xl flex items-center justify-center font-mono font-black text-xl sm:text-2xl ${
                          sc.rank === 1
                            ? "bg-accent text-black shadow-xs"
                            : "bg-white/10 text-white"
                        }`}
                      >
                        #{sc.rank || idx + 1}
                      </span>
                      <div>
                        <h4 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                          {sc.participantName}
                        </h4>
                        <p className="text-sm sm:text-base text-white/60">{sc.institution}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs uppercase font-mono text-white/50 block">
                        Skor Rata-Rata:
                      </span>
                      <span className="font-mono text-3xl sm:text-5xl font-black text-accent">
                        {Number(sc.finalAverageScore || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Sparkles className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Sesi Penilaian Sedang Berlangsung
                </h3>
                <p className="text-white/60 text-sm">
                  Rekapitulasi nilai dewan juri akan muncul secara otomatis segera setelah input nilai dimasukkan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 3: PENGUMUMAN PENTING */}
        {/* ============================================================= */}
        {activeModule.key === "pengumuman" && (
          <div>
            {importantAnnouncement ? (
              <div className="max-w-4xl mx-auto w-full p-8 sm:p-12 rounded-3xl border-2 border-accent/60 bg-accent/10 space-y-6 text-center animate-in zoom-in-95 duration-300">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-accent text-[hsl(226,18%,10%)] font-bold font-mono text-xs uppercase tracking-widest">
                  <Megaphone className="h-4 w-4" />
                  <span>SIARAN RESMI PANITIA</span>
                </div>

                <h3 className="font-heading text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                  {importantAnnouncement.title}
                </h3>

                <p className="text-lg sm:text-2xl text-white/90 leading-relaxed font-sans max-w-3xl mx-auto">
                  &ldquo;{importantAnnouncement.body}&rdquo;
                </p>

                <div className="pt-4 border-t border-white/10 text-xs sm:text-sm text-white/60 font-mono">
                  Diterbitkan: {importantAnnouncement.publishedAt} oleh {importantAnnouncement.author || "Seksi Acara"}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto w-full p-12 rounded-3xl border border-white/10 bg-white/5 text-center space-y-4">
                <Megaphone className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-3xl font-bold text-white font-heading">
                  Warta Resmi Panitia
                </h3>
                <p className="text-white/70 text-lg">
                  Selamat datang di Gebyar Bulan Bahasa & Kebudayaan. Ikuti seluruh rangkaian acara dan patuhi tata tertib panitia.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 4: PEMENANG RESMI */}
        {/* ============================================================= */}
        {activeModule.key === "pemenang" && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {winners.length > 0 ? (
              <>
                <div className="text-center space-y-1 mb-4">
                  <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                    Keputusan Resmi Dewan Juri
                  </span>
                  <h3 className="font-heading text-2xl sm:text-4xl font-bold text-white">
                    {winners[0]?.competitionName || "Juara Lomba Kebudayaan"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {/* Juara 2 */}
                  {winners.find((w) => w.rank === 2) && (
                    <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/5 text-center space-y-3 order-2 md:order-1">
                      <span className="text-4xl">🥈</span>
                      <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-white uppercase block w-max mx-auto">
                        Juara 2
                      </span>
                      <h4 className="font-heading text-xl sm:text-2xl font-bold text-white">
                        {winners.find((w) => w.rank === 2)?.winnerName}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/60">
                        {winners.find((w) => w.rank === 2)?.institution}
                      </p>
                      <div className="font-mono text-2xl font-bold text-accent">
                        {Number(winners.find((w) => w.rank === 2)?.finalScore || 0).toFixed(2)} Pts
                      </div>
                    </div>
                  )}

                  {/* Juara 1 (Besar di Tengah) */}
                  {winners.find((w) => w.rank === 1) && (
                    <div className="p-8 sm:p-10 rounded-2xl border-2 border-accent bg-accent/20 text-center space-y-4 md:-translate-y-4 shadow-xl order-1 md:order-2">
                      <span className="text-5xl">🥇</span>
                      <span className="px-4 py-1.5 rounded-full text-xs font-mono font-black bg-accent text-black uppercase tracking-wider inline-block">
                        JUARA 1 UTAMA
                      </span>
                      <h4 className="font-heading text-2xl sm:text-4xl font-bold text-white">
                        {winners.find((w) => w.rank === 1)?.winnerName}
                      </h4>
                      <p className="text-sm sm:text-base text-white/80 font-medium">
                        {winners.find((w) => w.rank === 1)?.institution}
                      </p>
                      <div className="font-mono text-4xl sm:text-5xl font-black text-accent">
                        {Number(winners.find((w) => w.rank === 1)?.finalScore || 0).toFixed(2)} Pts
                      </div>
                    </div>
                  )}

                  {/* Juara 3 */}
                  {winners.find((w) => w.rank === 3) && (
                    <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/5 text-center space-y-3 order-3">
                      <span className="text-4xl">🥉</span>
                      <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-white uppercase block w-max mx-auto">
                        Juara 3
                      </span>
                      <h4 className="font-heading text-xl sm:text-2xl font-bold text-white">
                        {winners.find((w) => w.rank === 3)?.winnerName}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/60">
                        {winners.find((w) => w.rank === 3)?.institution}
                      </p>
                      <div className="font-mono text-2xl font-bold text-accent">
                        {Number(winners.find((w) => w.rank === 3)?.finalScore || 0).toFixed(2)} Pts
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4">
                <Trophy className="h-14 w-14 text-accent mx-auto" />
                <h3 className="text-3xl font-bold text-white font-heading">
                  Rekapitulasi Pemenang Resmi
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Pengumuman pemenang resmi akan ditampilkan di layar ini setelah seluruh penilaian dewan juri selesai dan diverifikasi panitia.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 5: TWIBBON UNGGULAN */}
        {/* ============================================================= */}
        {activeModule.key === "twibbon" && (
          <div>
            {featuredTwibbons.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-in fade-in-50 duration-300">
                {featuredTwibbons.map((twb) => (
                  <div
                    key={twb.id}
                    className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex flex-col justify-between"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-black/40 relative">
                      <img
                        src={twb.imageUrl}
                        alt={twb.uploaderName}
                        className="h-full w-full object-cover"
                      />
                      {twb.isFeatured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-black font-mono uppercase">
                          ★ Unggulan
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-1">
                      <h4 className="font-heading text-base font-bold text-white truncate">
                        {twb.uploaderName}
                      </h4>
                      <p className="text-xs text-white/60 truncate">{twb.institution}</p>
                      {twb.caption && (
                        <p className="text-xs text-white/80 line-clamp-2 italic pt-1">
                          &ldquo;{twb.caption}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 rounded-2xl border border-white/10 bg-white/5 max-w-xl mx-auto space-y-4 animate-in fade-in-50 duration-300">
                <Camera className="h-12 w-12 text-accent mx-auto" />
                <h3 className="text-2xl font-bold text-white font-heading">
                  Galeri Semarak Twibbon
                </h3>
                <p className="text-white/60 text-sm">
                  Belum ada foto twibbon yang disetujui. Unggah foto keseruan Anda melalui menu Galeri Twibbon!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 6: LEADERBOARD CHALLENGE */}
        {/* ============================================================= */}
        {activeModule.key === "leaderboard" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-heading text-xl font-bold text-accent">
                5 Teratas Penjelajah Stand Pameran
              </span>
              <span className="text-sm font-mono text-white/60">
                Poin Terkoneksi Real-Time
              </span>
            </div>

            {topChallenge.length > 0 ? (
              <div className="space-y-3">
                {topChallenge.map((item) => (
                  <div
                    key={item.rank}
                    className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="h-10 w-10 rounded-lg bg-accent text-black font-mono font-bold text-lg flex items-center justify-center">
                        #{item.rank}
                      </span>
                      <div>
                        <h4 className="font-heading text-xl sm:text-2xl font-bold text-white">
                          {item.name}
                        </h4>
                        <p className="text-xs sm:text-sm text-white/60">{item.institution}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-2xl sm:text-4xl font-black text-accent">
                        {item.points} Poin
                      </span>
                      <span className="text-[11px] text-white/50 block font-mono uppercase">
                        Lencana: {item.badge}
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
                  Kunjungi stand pameran budaya dan kumpulkan poin eksplorasi untuk memimpin klasemen!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual Navigator controls overlay at bottom */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={() =>
            setCurrentIdx((prev) => (prev === 0 ? MODULES.length - 1 : prev - 1))
          }
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          title="Modul Sebelumnya"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono uppercase tracking-wider text-accent font-semibold cursor-pointer"
        >
          {isPaused ? "▶ Lanjutkan Rotasi Otomatis" : "⏸ Jeda Rotasi"}
        </button>

        <button
          onClick={() => setCurrentIdx((prev) => (prev + 1) % MODULES.length)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          title="Modul Berikutnya"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </MonitorLayout>
  );
}
