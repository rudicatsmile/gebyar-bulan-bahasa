"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
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
import {
  getJudgeEvaluationHistory,
  type EvaluationHistoryItem,
} from "@/app/actions/assessments";
import {
  History,
  Loader2,
  ArrowRight,
  ClipboardCheck,
  Layers,
  Trophy,
} from "lucide-react";

export default function JuriRiwayatPage() {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<EvaluationHistoryItem[]>([]);
  const [judgeName, setJudgeName] = React.useState<string>("");
  const [filterType, setFilterType] = React.useState<"all" | "single_round" | "multi_stage">("all");

  React.useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await getJudgeEvaluationHistory();
        if (res.success) {
          setHistory(res.history);
          if (res.judgeName) setJudgeName(res.judgeName);
        } else {
          console.error("Gagal load history:", res.error);
        }
      } catch (err) {
        console.error("Error loadHistory:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const filteredHistory = React.useMemo(() => {
    if (filterType === "all") return history;
    return history.filter((h) => h.roundType === filterType);
  }, [history, filterType]);

  const multiStageCount = history.filter((h) => h.roundType === "multi_stage").length;
  const singleRoundCount = history.filter((h) => h.roundType === "single_round").length;

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="h-7 w-7 text-accent" />
              <span>Riwayat Formulir Penilaian Terkirim</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Audit rekam jejak penilaian final yang telah Anda kirimkan kepada panitia per cabang lomba dan per tahapan perlombaan.
            </p>
          </div>

          {judgeName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg w-fit">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              <span>
                Juri: <strong className="text-foreground">{judgeName}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterType === "all"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({history.length})
            </button>
            <button
              onClick={() => setFilterType("multi_stage")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                filterType === "multi_stage"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>Multi Stage ({multiStageCount})</span>
            </button>
            <button
              onClick={() => setFilterType("single_round")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                filterType === "single_round"
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-3 w-3" />
              <span>Single Round ({singleRoundCount})</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground border border-border rounded-xl bg-card">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat rekam riwayat penilaian dari database...</p>
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">No. Registrasi</TableHead>
                  <TableHead>Nama Peserta / Tim</TableHead>
                  <TableHead>Asal Sekolah / Kampus</TableHead>
                  <TableHead>Cabang Lomba</TableHead>
                  <TableHead>Babak / Tahap</TableHead>
                  <TableHead className="text-center">Status Form</TableHead>
                  <TableHead className="text-center">Skor Terbobot Anda</TableHead>
                  <TableHead className="text-right">Waktu Pengiriman</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs font-bold text-accent">
                      {h.registrationNumber}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                      {h.participantName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.institution}
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-medium">
                      {h.competitionName}
                    </TableCell>
                    <TableCell>
                      {h.roundType === "multi_stage" ? (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold inline-flex items-center gap-1"
                        >
                          <Layers className="h-3 w-3 shrink-0" />
                          <span>
                            Tahap {h.stageOrder}: {h.stageTitle}
                          </span>
                        </Badge>
                      ) : (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-muted/40 text-muted-foreground border-border inline-flex items-center gap-1"
                        >
                          <Trophy className="h-3 w-3 shrink-0" />
                          <span>Single Round</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={h.status === "terkirim" ? "success" : "default"}
                        className="text-[10px]"
                      >
                        {h.status === "terkirim" ? "TERKIRIM" : "DRAFT"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-accent text-sm">
                      {h.weightedScore.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {h.submittedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <History className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">
              {filterType === "all"
                ? "Belum Ada Riwayat Penilaian Terkirim"
                : `Tidak Ada Riwayat Penilaian untuk Kategori ${filterType === "multi_stage" ? "Multi Stage" : "Single Round"}`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Belum ada lembar penilaian final yang tercatat di database untuk akun dewan juri ini. Nilai yang Anda kirimkan pada roster peserta lomba akan tercatat otomatis di sini.
            </p>
            <div className="pt-2">
              <Link href="/juri">
                <Button size="sm" className="text-xs gap-1.5 font-medium cursor-pointer">
                  <span>Buka Penugasan Lomba Saya</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
