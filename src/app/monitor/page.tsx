"use client";

import * as React from "react";
import Link from "next/link";
import { MonitorLayout } from "@/components/layouts/MonitorLayout";
import {
  COMPETITIONS,
  SCHEDULES,
  SCORING_RECAPS,
  ANNOUNCEMENTS,
  WINNERS,
  TWIBBONS,
  CHALLENGE_LEADERBOARD,
} from "@/lib/dummy-data";
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
} from "lucide-react";

const MODULES = [
  { key: "jadwal", title: "Jadwal & Agenda Panggung Hari Ini" },
  { key: "papan_skor", title: "Papan Skor Sementara (5 Besar Lomba Aktif)" },
  { key: "pengumuman", title: "Warta Resmi & Arahan Panitia" },
  { key: "pemenang", title: "Hasil Juara Resmi Peringatan Sumpah Pemuda" },
  { key: "twibbon", title: "Semarak Twibbon Peserta & Pengunjung" },
  { key: "leaderboard", title: "Klasemen Poin Challenge Keliling Stand" },
];

export default function MonitorUtamaPage() {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const ROTATION_SECONDS = 15;

  React.useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % MODULES.length);
    }, ROTATION_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const activeModule = MODULES[currentIdx];

  // Data helpers
  const todaySchedules = SCHEDULES.filter((s) => s.day === 2);
  const liveComp = COMPETITIONS[0]; // Membaca Puisi
  const liveScores = SCORING_RECAPS[liveComp.id] || [];
  const importantAnnouncement = ANNOUNCEMENTS.find((a) => a.category === "penting") || ANNOUNCEMENTS[0];
  const featuredTwibbons = TWIBBONS.filter((t) => t.isFeatured || t.status === "disetujui").slice(0, 4);
  const topWinners = WINNERS.filter((w) => w.competitionId === "comp-7");
  const topChallenge = CHALLENGE_LEADERBOARD.slice(0, 5);

  return (
    <MonitorLayout
      activeModuleTitle={activeModule.title}
      currentCycleText={`Modul ${currentIdx + 1} dari ${MODULES.length} • Rotasi Otomatis 15 Detik`}
    >
      <div className="h-full flex flex-col justify-center">
        {/* ============================================================= */}
        {/* MODUL 1: JADWAL LIVE */}
        {/* ============================================================= */}
        {activeModule.key === "jadwal" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-in fade-in-50 duration-300">
            {todaySchedules.map((sch) => {
              const isLive = sch.status === "berlangsung";
              return (
                <div
                  key={sch.id}
                  className={`p-6 sm:p-8 rounded-2xl border transition-all flex flex-col justify-between ${
                    isLive
                      ? "border-danger bg-danger/15 shadow-lg"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-accent">
                        {sch.time}
                      </span>
                      {isLive && (
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-danger text-white uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                          <Radio className="h-3.5 w-3.5" /> SEDANG BERLANGSUNG
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                      {sch.title}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-base sm:text-lg text-white/70">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-accent" />
                      <strong className="text-white">{sch.venue}</strong>
                      <span>({sch.stage})</span>
                    </div>
                    <span>Pemandu: {sch.host}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 2: PAPAN SKOR 5 BESAR */}
        {/* ============================================================= */}
        {activeModule.key === "papan_skor" && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
              <span className="font-heading text-xl sm:text-2xl font-bold text-accent">
                Cabang: {liveComp.name} ({liveComp.category.toUpperCase()})
              </span>
              <span className="text-sm font-mono text-white/60">
                Panggung Utama • Agregasi Multi-Juri
              </span>
            </div>

            <div className="space-y-3">
              {liveScores.map((sc) => (
                <div
                  key={sc.registrationId}
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
                      #{sc.rank}
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
                      {sc.finalAverageScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 3: PENGUMUMAN PENTING */}
        {/* ============================================================= */}
        {activeModule.key === "pengumuman" && (
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
              Diterbitkan: {importantAnnouncement.publishedAt} oleh {importantAnnouncement.author}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 4: PEMENANG RESMI */}
        {/* ============================================================= */}
        {activeModule.key === "pemenang" && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            <div className="text-center space-y-1 mb-4">
              <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                Keputusan Resmi Dewan Juri
              </span>
              <h3 className="font-heading text-2xl sm:text-4xl font-bold text-white">
                Juara Lomba Seni Tradisi Palang Pintu Betawi
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Juara 2 */}
              <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/5 text-center space-y-3">
                <span className="text-4xl">🥈</span>
                <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-white uppercase block w-max mx-auto">
                  Juara 2
                </span>
                <h4 className="font-heading text-xl sm:text-2xl font-bold text-white">
                  M. Syafi&apos;i & Kawan-kawan
                </h4>
                <p className="text-xs sm:text-sm text-white/60">Kembang Kelapa Ciganjur</p>
                <div className="font-mono text-2xl font-bold text-accent">91,50 Pts</div>
              </div>

              {/* Juara 1 (Besar di Tengah) */}
              <div className="p-8 sm:p-10 rounded-2xl border-2 border-accent bg-accent/20 text-center space-y-4 md:-translate-y-4 shadow-xl">
                <span className="text-5xl">🥇</span>
                <span className="px-4 py-1.5 rounded-full text-xs font-mono font-black bg-accent text-black uppercase tracking-wider inline-block">
                  JUARA 1 UTAMA
                </span>
                <h4 className="font-heading text-2xl sm:text-4xl font-bold text-white">
                  Rezky Ramadhan & Tim
                </h4>
                <p className="text-sm sm:text-base text-white/80 font-medium">
                  Jawara Cukin Rawa Belong (Sanggar Seni Si Pitung)
                </p>
                <div className="font-mono text-4xl sm:text-5xl font-black text-accent">
                  94,80 Pts
                </div>
              </div>

              {/* Juara 3 */}
              <div className="p-6 sm:p-8 rounded-2xl border border-white/20 bg-white/5 text-center space-y-3">
                <span className="text-4xl">🥉</span>
                <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-white/10 text-white uppercase block w-max mx-auto">
                  Juara 3
                </span>
                <h4 className="font-heading text-xl sm:text-2xl font-bold text-white">
                  Fajar Kurniawan & Tim
                </h4>
                <p className="text-xs sm:text-sm text-white/60">Pendekar Tenabang</p>
                <div className="font-mono text-2xl font-bold text-accent">88,20 Pts</div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 5: TWIBBON UNGGULAN */}
        {/* ============================================================= */}
        {activeModule.key === "twibbon" && (
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
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-black font-mono uppercase">
                    ★ Unggulan
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-heading text-base font-bold text-white truncate">
                    {twb.uploaderName}
                  </h4>
                  <p className="text-xs text-white/60 truncate">{twb.institution}</p>
                  <p className="text-xs text-white/80 line-clamp-2 italic pt-1">
                    &ldquo;{twb.caption}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================= */}
        {/* MODUL 6: LEADERBOARD CHALLENGE */}
        {/* ============================================================= */}
        {activeModule.key === "leaderboard" && (
          <div className="space-y-4 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-heading text-xl font-bold text-accent">
                5 Teratas Penjelajah 8 Stand Pameran
              </span>
              <span className="text-sm font-mono text-white/60">
                Poin Terus Bertambah Real-Time
              </span>
            </div>

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
