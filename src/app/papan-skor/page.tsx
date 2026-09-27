"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPETITIONS, SCORING_RECAPS, WINNERS } from "@/lib/dummy-data";
import { Flame, Radio, Trophy, Award, ArrowRight, RefreshCw } from "lucide-react";

export default function PapanSkorPage() {
  const [selectedCompId, setSelectedCompId] = React.useState<string>("comp-1");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const activeCompetition = COMPETITIONS.find((c) => c.id === selectedCompId) || COMPETITIONS[0];
  const recaps = SCORING_RECAPS[selectedCompId] || [];

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-4 max-w-3xl">
              <Badge variant="live" className="text-xs">
                Pembaruan Realtime Tanpa Kertas
              </Badge>
              <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Flame className="h-8 w-8 text-danger animate-pulse" />
                <span>Papan Skor Publik Sementara</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Skor akhir dihitung secara otomatis melalui formula agregasi multi-juri dewan penilai. Penilaian draft disembunyikan guna menjaga integritas penjurian.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Segarkan Data</span>
              </Button>
              <Link href="/monitor" target="_blank">
                <Button variant="secondary" size="sm" className="text-xs">
                  Tampilan Layar TV →
                </Button>
              </Link>
            </div>
          </div>

          {/* Competition Selector Tabs */}
          <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-border bg-card">
            {COMPETITIONS.map((c) => {
              const isSelected = c.id === selectedCompId;
              const isLive = c.status === "berlangsung";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompId(c.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{c.name}</span>
                  {isLive && (
                    <span className="h-2 w-2 rounded-full bg-danger animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Current Competition Banner */}
          <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-accent uppercase font-bold tracking-wider">
                Kategori {activeCompetition.category} • Panggung {activeCompetition.stage}
              </span>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                {activeCompetition.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Metode Agregasi:{" "}
                <strong className="text-foreground capitalize font-mono">
                  {activeCompetition.aggregation.replace(/_/g, " ")}
                </strong>{" "}
                • {activeCompetition.criteria.length} Kriteria Penilaian
              </p>
            </div>

            <div className="flex items-center gap-3 sm:shrink-0">
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground block">Status Lomba:</span>
                <Badge
                  variant={activeCompetition.status === "berlangsung" ? "live" : "success"}
                  className="text-xs"
                >
                  {activeCompetition.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Table Leaderboard Lomba */}
          {recaps.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-center">Peringkat</TableHead>
                    <TableHead>Nama Peserta</TableHead>
                    <TableHead>Instansi / Sekolah</TableHead>
                    <TableHead className="text-center w-36">Status Juri</TableHead>
                    <TableHead className="text-right w-40">Skor Rata-Rata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recaps.map((item) => {
                    const isPodium = item.rank <= 3;
                    return (
                      <TableRow
                        key={item.registrationId}
                        className={isPodium ? "bg-accent/5 font-medium" : ""}
                      >
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-mono font-bold ${
                              item.rank === 1
                                ? "bg-accent text-accent-foreground shadow-xs"
                                : item.rank === 2
                                ? "bg-muted-foreground/30 text-foreground"
                                : item.rank === 3
                                ? "bg-amber-700/20 text-amber-700 dark:text-amber-300"
                                : "text-muted-foreground"
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-sm">
                          {item.participantName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.institution}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success" className="text-[10px]">
                            {item.scoresPerJudge.length} Juri Terkirim
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-accent text-base sm:text-lg">
                          {item.finalAverageScore.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
              <Trophy className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Penilaian Belum Dimulai atau Masih Draft
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Dewan juri sedang menilai sesi penampilan. Skor akan tampil secara otomatis segera setelah juri menekan tombol kirim final.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
