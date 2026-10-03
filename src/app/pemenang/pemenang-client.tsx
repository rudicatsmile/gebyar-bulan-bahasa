"use client";

import * as React from "react";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Trophy, Award, Sparkles, Calendar, ArrowRight } from "lucide-react";
import type { Winner, Competition } from "@/lib/dummy-data";

interface PemenangClientProps {
  initialWinners: Winner[];
  competitions: Competition[];
}

export function PemenangClient({ initialWinners, competitions }: PemenangClientProps) {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventYear, setEventYear] = React.useState("2026");
  const [selectedFilter, setSelectedFilter] = React.useState<string>("semua");
  const [winners, setWinners] = React.useState<Winner[]>(initialWinners);

  React.useEffect(() => {
    // Sinkronisasi pengaturan acara
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.eventName) {
            setEventName(data.settings.eventName);
          }
          if (data.settings.eventYear) {
            setEventYear(String(data.settings.eventYear));
          }
        }
      })
      .catch(() => {});
  }, []);

  const filteredWinners = winners.filter((w) => {
    if (selectedFilter === "semua") return true;
    return w.competitionId === selectedFilter;
  });

  // Kelompokkan pemenang berdasarkan cabang lomba untuk mendeteksi podium
  const winnersByComp = React.useMemo(() => {
    const map = new Map<string, Winner[]>();
    winners.forEach((w) => {
      const key = w.competitionId || w.competitionName;
      const list = map.get(key) || [];
      list.push(w);
      map.set(key, list);
    });
    // Urutkan tiap list berdasarkan rank
    map.forEach((list) => list.sort((a, b) => a.rank - b.rank));
    return map;
  }, [winners]);

  // Cari lomba yang memiliki minimal 3 pemenang untuk ditampilkan di podium
  const podiumComps = React.useMemo(() => {
    const list: { compName: string; compId: string; winners: Winner[] }[] = [];
    winnersByComp.forEach((compWinners, compId) => {
      if (selectedFilter === "semua" || selectedFilter === compId) {
        if (compWinners.length >= 3) {
          list.push({
            compId,
            compName: compWinners[0]?.competitionName || "Cabang Lomba",
            winners: compWinners,
          });
        }
      }
    });
    return list;
  }, [winnersByComp, selectedFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="space-y-4 text-center max-w-3xl mx-auto">
            <Badge variant="gold" className="text-xs">
              Hasil Resmi Sidang Dewan Juri
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Daftar Pemenang & Penganugerahan Juara
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Selamat kepada para juara yang telah berkarya dan menorehkan prestasi gemilang dalam {eventName} {eventYear}.
            </p>
          </div>

          {/* Filter Cabang Lomba */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedFilter("semua")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                selectedFilter === "semua"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua Cabang
            </button>
            {competitions.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedFilter(c.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  selectedFilter === c.id
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.shortName || c.name}
              </button>
            ))}
          </div>

          {/* Podium Juara Resmi (Untuk lomba yang memiliki minimal 3 pemenang terpublikasi) */}
          {podiumComps.map((comp) => {
            const w1 = comp.winners.find((w) => w.rank === 1) || comp.winners[0];
            const w2 = comp.winners.find((w) => w.rank === 2) || comp.winners[1];
            const w3 = comp.winners.find((w) => w.rank === 3) || comp.winners[2];

            return (
              <div key={comp.compId} className="space-y-6 pt-4">
                <div className="text-center space-y-1">
                  <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                    Pemenang Resmi Terpublikasi
                  </span>
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    {comp.compName}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end max-w-4xl mx-auto">
                  {/* JUARA 2 */}
                  {w2 && (
                    <Card className="order-2 md:order-1 border-muted-foreground/30 bg-card p-6 text-center space-y-3">
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto text-xl font-bold font-mono shadow-xs">
                        🥈
                      </div>
                      <Badge variant="default" className="text-xs">
                        {w2.title || "Juara 2"}
                      </Badge>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {w2.winnerName}
                      </h3>
                      <p className="text-xs text-muted-foreground">{w2.institution}</p>
                      <div className="text-sm font-mono font-bold text-accent">
                        Skor Akhir: {w2.finalScore ? w2.finalScore.toFixed(2) : "-"}
                      </div>
                      {w2.prize && (
                        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                          {w2.prize}
                        </p>
                      )}
                    </Card>
                  )}

                  {/* JUARA 1 (Center High) */}
                  {w1 && (
                    <Card className="order-1 md:order-2 border-accent bg-accent/5 p-8 text-center space-y-4 md:-translate-y-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1 font-mono uppercase">
                        Juara Utama
                      </div>
                      <div className="h-20 w-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto text-3xl font-bold font-mono shadow-xs">
                        🥇
                      </div>
                      <Badge variant="gold" className="text-xs font-bold">
                        {w1.title || "JUARA 1 (TERBAIK)"}
                      </Badge>
                      <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                        {w1.winnerName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {w1.institution}
                      </p>
                      <div className="text-lg font-mono font-black text-accent">
                        Skor Akhir: {w1.finalScore ? w1.finalScore.toFixed(2) : "-"}
                      </div>
                      {w1.prize && (
                        <p className="text-xs text-foreground/80 border-t border-accent/20 pt-3 font-medium">
                          {w1.prize}
                        </p>
                      )}
                    </Card>
                  )}

                  {/* JUARA 3 */}
                  {w3 && (
                    <Card className="order-3 border-amber-700/30 bg-card p-6 text-center space-y-3">
                      <div className="h-14 w-14 rounded-full bg-amber-700/10 flex items-center justify-center mx-auto text-xl font-bold font-mono shadow-xs">
                        🥉
                      </div>
                      <Badge variant="warning" className="text-xs">
                        {w3.title || "Juara 3"}
                      </Badge>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {w3.winnerName}
                      </h3>
                      <p className="text-xs text-muted-foreground">{w3.institution}</p>
                      <div className="text-sm font-mono font-bold text-accent">
                        Skor Akhir: {w3.finalScore ? w3.finalScore.toFixed(2) : "-"}
                      </div>
                      {w3.prize && (
                        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                          {w3.prize}
                        </p>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            );
          })}

          {/* Cards Pemenang Keseluruhan */}
          {filteredWinners.length > 0 ? (
            <div className="space-y-4 pt-8 border-t border-border">
              <h3 className="font-heading text-xl font-bold text-foreground">
                Daftar Seluruh Pemenang & Skor Resmi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredWinners.map((win) => (
                  <Card key={win.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="warning" className="text-[10px]">
                        {win.title}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-accent">
                        {win.finalScore ? win.finalScore.toFixed(2) : "-"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {win.competitionName}
                      </span>
                      <h4 className="font-heading text-base font-bold text-foreground">
                        {win.winnerName}
                      </h4>
                      <p className="text-xs text-muted-foreground">{win.institution}</p>
                    </div>

                    {win.prize && (
                      <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                        Hadiah: {win.prize}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-12 text-center space-y-4 border-dashed border-2 border-border max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                <Trophy className="h-8 w-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <Badge variant="gold" className="text-xs">
                  Tahap Penjurian & Sidang Pleno
                </Badge>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Pengumuman Pemenang Belum Tersedia
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Penetapan juara resmi dari seluruh cabang perlombaan <strong>{eventName}</strong> akan dipublikasikan oleh dewan juri setelah rangkaian lomba dan sidang pleno rekapitulasi nilai selesai.
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
