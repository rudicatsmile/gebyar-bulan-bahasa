"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ShieldCheck, Award, Loader2, Users } from "lucide-react";
import {
  getCompetitionScoringRecap,
  type ScoringRecapItem,
} from "@/app/actions/assessments";

export default function DashboardPenilaianDetailPage() {
  const params = useParams();
  const rawCompId = (params?.competitionId as string) || "";

  const [loading, setLoading] = React.useState(true);
  const [comp, setComp] = React.useState<{
    id: string;
    slug: string;
    name: string;
    shortName: string;
    category: string;
    status: string;
    aggregation: string;
    criteria: Array<{ id: string; name: string; weight: number }>;
  } | null>(null);

  const [judges, setJudges] = React.useState<
    Array<{ id: string; fullName: string; isChiefJudge: boolean }>
  >([]);
  const [recaps, setRecaps] = React.useState<ScoringRecapItem[]>([]);
  const [isFinalized, setIsFinalized] = React.useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getCompetitionScoringRecap(rawCompId);
        if (res.success) {
          if (res.competition) setComp(res.competition);
          setJudges(res.judges);
          setRecaps(res.recaps);
        }
      } catch (err) {
        console.error("Gagal memuat rekap nilai:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [rawCompId]);

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/penilaian"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Rekap Nilai</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant={
                    comp?.status === "berlangsung"
                      ? "live"
                      : comp?.status === "selesai"
                      ? "success"
                      : comp?.status === "pendaftaran"
                      ? "warning"
                      : "default"
                  }
                  className="text-xs"
                >
                  {comp?.status === "pendaftaran"
                    ? "TAHAP PENDAFTARAN"
                    : comp?.status === "berlangsung"
                    ? "SEDANG BERLANGSUNG"
                    : comp?.status === "selesai"
                    ? "LOMBA SELESAI"
                    : (comp?.status || "MEMUAT...").toUpperCase()}
                </Badge>
                {isFinalized && (
                  <Badge variant="success" className="text-xs">
                    NILAI SUDAH DIFINALISASI
                  </Badge>
                )}
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  Agregasi: {comp?.aggregation ? comp.aggregation.replace(/_/g, " ") : "Rata-Rata"}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Rekapitulasi Nilai: {comp?.name || "Memuat..."}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isFinalized ? "secondary" : "default"}
                onClick={() => setIsFinalized(!isFinalized)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{isFinalized ? "Buka Kunci Nilai" : "Finalisasi Nilai Lomba"}</span>
              </Button>
              <Link href="/dashboard/pemenang">
                <Button size="sm" variant="accent" className="text-xs gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>Ke Penetapan Juara</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Kriteria Info Strip */}
        {comp && (comp.criteria || []).length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Komposisi Bobot ({comp.criteria.length} kriteria):</span>
              {comp.criteria.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                  {c.name}: {c.weight}%
                </span>
              ))}
            </div>
            <span className="font-mono text-accent font-bold">Total: 100%</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat rekapitulasi penilaian...</p>
          </div>
        ) : recaps.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Peserta & Instansi</TableHead>
                  {judges.map((j) => (
                    <TableHead key={j.id} className="text-center min-w-28">
                      <span className="block font-bold">
                        {j.fullName.split(",")[0].split(" ")[0]}
                      </span>
                      <span className="block text-[10px] font-mono text-muted-foreground">
                        {j.isChiefJudge ? "★ Juri Utama" : "Dewan Juri"}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Selisih Skor</TableHead>
                  <TableHead className="text-right">Skor Akhir (Agregat)</TableHead>
                  <TableHead className="text-center">Status Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recaps.map((item) => {
                  return (
                    <TableRow key={item.registrationId}>
                      <TableCell className="text-center font-mono font-bold text-xs">
                        #{item.rank}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {item.participantName}
                        </strong>
                        <span className="text-[11px] text-muted-foreground">{item.institution}</span>
                      </TableCell>
                      {judges.map((j) => {
                        const jScore = item.scoresPerJudge.find((s) => s.judgeId === j.id);
                        return (
                          <TableCell key={j.id} className="text-center font-mono text-xs">
                            {jScore !== undefined ? (
                              <span className="font-semibold text-foreground">
                                {jScore.weightedTotal.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Belum Dinilai</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-mono text-xs">
                        {item.scoresPerJudge.length >= 2 ? `${item.scoreGap.toFixed(2)} Pts` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                        {item.finalScore > 0 ? item.finalScore.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.status === "audit" ? (
                          <Badge variant="danger" className="text-[10px]">
                            PERLU PENINJAUAN
                          </Badge>
                        ) : item.status === "selesai" ? (
                          <Badge variant="success" className="text-[10px]">
                            VALID
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            MENUNGGU JURI
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Belum Ada Peserta Terdaftar</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum ada pendaftaran peserta yang tercatat untuk cabang lomba ini.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
