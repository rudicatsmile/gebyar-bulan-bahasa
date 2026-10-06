"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Competition, Winner } from "@/lib/dummy-data";
import { SCORING_RECAPS } from "@/lib/dummy-data";
import type { DutaBahasaStage, DutaBahasaParticipantInfo, DutaBahasaParticipantStatus } from "@/app/actions/duta-bahasa";
import { Flame, Trophy, RefreshCw, Crown, Calendar, Sparkles, CheckCircle2, Clock } from "lucide-react";

interface PapanSkorClientProps {
  competitions: Competition[];
  winners: Winner[];
  dutaStages?: DutaBahasaStage[];
  dutaParticipants?: DutaBahasaParticipantInfo[];
}

const statusBadge: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  lolos: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  tidak_lolos: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  menunggu: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const statusLabel: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "Terdaftar",
  lolos: "Lolos Tahap Ini",
  tidak_lolos: "Gugur / Tereliminasi",
  menunggu: "Dalam Penilaian",
};

export function PapanSkorClient({
  competitions,
  winners,
  dutaStages = [],
  dutaParticipants = [],
}: PapanSkorClientProps) {
  const [selectedCompId, setSelectedCompId] = React.useState<string>(
    competitions[0]?.id || "a0000000-0000-0000-0000-000000000001"
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Default active Duta Bahasa Stage: the active stage or first stage
  const activeDutaStage = dutaStages.find((s) => s.status === "active") || dutaStages[0];
  const [selectedDutaStageId, setSelectedDutaStageId] = React.useState<string>(
    activeDutaStage?.id || "db-stage-1"
  );

  React.useEffect(() => {
    if (activeDutaStage?.id && !selectedDutaStageId) {
      setSelectedDutaStageId(activeDutaStage.id);
    }
  }, [activeDutaStage, selectedDutaStageId]);

  const activeCompetition =
    competitions.find((c) => c.id === selectedCompId) || competitions[0];

  const isDutaBahasa =
    activeCompetition?.slug?.includes("duta") ||
    activeCompetition?.name?.toLowerCase().includes("duta") ||
    activeCompetition?.slug === "pidato" ||
    activeCompetition?.id === "a0000000-0000-0000-0000-000000000003";

  // Check if competition has recorded scores/recaps
  const recaps =
    SCORING_RECAPS[selectedCompId] ||
    SCORING_RECAPS["comp-1"]?.filter(
      () => selectedCompId === "a0000000-0000-0000-0000-000000000001" || selectedCompId === "comp-1"
    ) ||
    [];

  // Also check if competition is completed with published winners
  const compWinners = winners.filter((w) => w.competitionId === selectedCompId);

  const currentDutaStage = dutaStages.find((s) => s.id === selectedDutaStageId) || dutaStages[0];

  // Participants in selected Duta Bahasa stage
  const currentStageParticipants = React.useMemo(() => {
    if (!isDutaBahasa || !currentDutaStage) return [];
    return dutaParticipants.filter((p) => {
      const prog = p.progress[currentDutaStage.id];
      return !!prog;
    });
  }, [isDutaBahasa, currentDutaStage, dutaParticipants]);

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
            {competitions.map((c) => {
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
          {activeCompetition && (
            <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-accent uppercase font-bold tracking-wider flex items-center gap-1.5">
                  {isDutaBahasa && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  <span>Kategori {activeCompetition.category} • Panggung {activeCompetition.stage}</span>
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  {activeCompetition.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isDutaBahasa
                    ? "Kompetisi Bertahap Resmi: Seleksi Administrasi, Wawancara, Minat Bakat, hingga Grand Final 3 Besar"
                    : `Metode Agregasi: ${activeCompetition.aggregation.replace(/_/g, " ")} • ${activeCompetition.criteria.length} Kriteria Penilaian`}
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
          )}

          {/* DUTA BAHASA HYBRID MULTI-STAGE BOARD */}
          {isDutaBahasa ? (
            <div className="space-y-6">
              {/* Stage Selection Tabs */}
              {dutaStages.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Pilih Tahapan Penilaian Duta Bahasa:</span>
                    </span>
                    <Badge variant="gold" className="text-[10px]">
                      Sistem Gugur Bertingkat
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2 p-2 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    {dutaStages.map((st) => {
                      const isSelected = st.id === selectedDutaStageId;
                      const isCurrentActive = st.status === "active";
                      const isCompleted = st.status === "completed";

                      return (
                        <button
                          key={st.id}
                          onClick={() => setSelectedDutaStageId(st.id)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? "bg-amber-500 text-white font-bold shadow-sm"
                              : "bg-card text-foreground hover:bg-muted border border-border"
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-80">#{st.stageOrder}</span>
                          <span>{st.title}</span>
                          {isCurrentActive && (
                            <span className="h-2 w-2 rounded-full bg-amber-300 animate-ping" />
                          )}
                          {isCompleted && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Stage Banner */}
              {currentDutaStage && (
                <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">
                        Tahap {currentDutaStage.stageOrder} dari {dutaStages.length}
                      </span>
                      <Badge
                        variant={
                          currentDutaStage.status === "active"
                            ? "warning"
                            : currentDutaStage.status === "completed"
                            ? "success"
                            : "info"
                        }
                        className="text-[10px]"
                      >
                        {currentDutaStage.status === "active"
                          ? "SEDANG BERLANGSUNG"
                          : currentDutaStage.status === "completed"
                          ? "SELESAI"
                          : "AKAN DATANG"}
                      </Badge>
                    </div>
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {currentDutaStage.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{currentDutaStage.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-accent" />
                    <span>{currentDutaStage.stageDayLabel}</span>
                  </div>
                </div>
              )}

              {/* Stage Participants Table */}
              {currentStageParticipants.length > 0 ? (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">No.</TableHead>
                        <TableHead className="w-28">No. Registrasi</TableHead>
                        <TableHead>Nama Peserta / Pasangan</TableHead>
                        <TableHead>Instansi / Sekolah</TableHead>
                        <TableHead className="text-center w-40">Status Kualifikasi</TableHead>
                        <TableHead className="text-right w-36">Skor Rata-Rata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentStageParticipants.map((p, idx) => {
                        const prog = p.progress[currentDutaStage.id];
                        const status = prog?.status || "terdaftar";
                        const isQualified = status === "lolos";
                        const isFinalist = p.overallStatus === "finalis" || p.overallStatus === "pemenang";

                        return (
                          <TableRow
                            key={p.participantId}
                            className={
                              isFinalist
                                ? "bg-amber-500/10 font-medium"
                                : isQualified
                                ? "bg-emerald-500/5"
                                : ""
                            }
                          >
                            <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground">
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-accent">
                              {p.registrationNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                <span>{p.fullName}</span>
                                {isFinalist && (
                                  <Badge variant="gold" className="text-[9px] px-1.5 py-0">
                                    {p.overallStatus === "pemenang" ? "DUTA TERPILIH" : "FINALIS 3 BESAR"}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.institution || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`text-[10px] border ${statusBadge[status]}`}>
                                {statusLabel[status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-accent text-base">
                              {prog?.score != null ? Number(prog.score).toFixed(2) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
                  <Crown className="h-9 w-9 text-muted-foreground/50 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Belum Ada Peserta di Tahap Ini
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Peserta yang lolos dari tahap sebelumnya akan ditampilkan di sini secara otomatis setelah dewan juri/panitia menyelesaikan seleksi tahap.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : recaps.length > 0 ? (
            /* STANDARD SINGLE STAGE LEADERBOARD */
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
          ) : compWinners.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-center">Peringkat</TableHead>
                    <TableHead>Nama Juara</TableHead>
                    <TableHead>Instansi / Sanggar</TableHead>
                    <TableHead className="text-center w-36">Status</TableHead>
                    <TableHead className="text-right w-40">Skor Akhir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compWinners.map((win) => (
                    <TableRow key={win.id} className="bg-accent/5 font-medium">
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-mono font-bold bg-accent text-accent-foreground shadow-xs">
                          #{win.rank}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-sm">
                        {win.winnerName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {win.institution}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="success" className="text-[10px]">
                          {win.title}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-accent text-base sm:text-lg">
                        {win.finalScore.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
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
