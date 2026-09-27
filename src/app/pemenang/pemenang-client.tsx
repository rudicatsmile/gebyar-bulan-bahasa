"use client";

import * as React from "react";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Winner, Competition } from "@/lib/dummy-data";

interface PemenangClientProps {
  initialWinners: Winner[];
  competitions: Competition[];
}

export function PemenangClient({ initialWinners, competitions }: PemenangClientProps) {
  const [selectedFilter, setSelectedFilter] = React.useState<string>("semua");

  const filteredWinners = initialWinners.filter((w) => {
    if (selectedFilter === "semua") return true;
    return w.competitionId === selectedFilter;
  });

  const palangPintuWinners = initialWinners.filter(
    (w) => w.competitionName.toLowerCase().includes("palang pintu") || w.competitionId.includes("7")
  );

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
              Selamat kepada para juara yang telah berkarya dan menorehkan prestasi gemilang dalam Gebyar Bulan Bahasa dan Kebudayaan 2025.
            </p>
          </div>

          {/* Filter Lomba */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedFilter("semua")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                selectedFilter === "semua"
                  ? "bg-primary text-primary-foreground font-bold"
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
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.shortName}
              </button>
            ))}
          </div>

          {/* Podium Juara Palang Pintu (Juara 1, 2, 3) */}
          {palangPintuWinners.length >= 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                  Cabang Selesai Resmi
                </span>
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Lomba Seni Tradisi Palang Pintu
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* JUARA 2 */}
                {palangPintuWinners[1] && (
                  <Card className="order-2 md:order-1 border-muted-foreground/30 bg-card p-6 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto text-xl font-bold font-mono">
                      🥈
                    </div>
                    <Badge variant="default" className="text-xs">
                      Juara 2
                    </Badge>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {palangPintuWinners[1].winnerName}
                    </h3>
                    <p className="text-xs text-muted-foreground">{palangPintuWinners[1].institution}</p>
                    <div className="text-sm font-mono font-bold text-accent">
                      Skor Akhir: {palangPintuWinners[1].finalScore.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                      {palangPintuWinners[1].prize}
                    </p>
                  </Card>
                )}

                {/* JUARA 1 (Center High) */}
                {palangPintuWinners[0] && (
                  <Card className="order-1 md:order-2 border-accent bg-accent/5 p-8 text-center space-y-4 md:-translate-y-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[10px] font-bold px-3 py-1 font-mono uppercase">
                      Juara Utama
                    </div>
                    <div className="h-20 w-20 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto text-3xl font-bold font-mono shadow-xs">
                      🥇
                    </div>
                    <Badge variant="gold" className="text-xs">
                      JUARA 1 (TERBAIK)
                    </Badge>
                    <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                      {palangPintuWinners[0].winnerName}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      {palangPintuWinners[0].institution}
                    </p>
                    <div className="text-lg font-mono font-black text-accent">
                      Skor Akhir: {palangPintuWinners[0].finalScore.toFixed(2)}
                    </div>
                    <p className="text-xs text-foreground/80 border-t border-accent/20 pt-3 font-medium">
                      {palangPintuWinners[0].prize}
                    </p>
                  </Card>
                )}

                {/* JUARA 3 */}
                {palangPintuWinners[2] && (
                  <Card className="order-3 border-amber-700/30 bg-card p-6 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-amber-700/10 flex items-center justify-center mx-auto text-xl font-bold font-mono">
                      🥉
                    </div>
                    <Badge variant="warning" className="text-xs">
                      Juara 3
                    </Badge>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {palangPintuWinners[2].winnerName}
                    </h3>
                    <p className="text-xs text-muted-foreground">{palangPintuWinners[2].institution}</p>
                    <div className="text-sm font-mono font-bold text-accent">
                      Skor Akhir: {palangPintuWinners[2].finalScore.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                      {palangPintuWinners[2].prize}
                    </p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Cards Pemenang Lainnya / Sementara */}
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
                      {win.finalScore.toFixed(2)}
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

                  <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                    Hadiah: {win.prize}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
