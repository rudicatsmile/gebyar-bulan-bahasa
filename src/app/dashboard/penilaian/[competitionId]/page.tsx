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
import { COMPETITIONS, SCORING_RECAPS, type Competition } from "@/lib/dummy-data";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Award } from "lucide-react";

const compIdToSlug: Record<string, string> = {
  "a0000000-0000-0000-0000-000000000001": "membaca-puisi",
  "a0000000-0000-0000-0000-000000000002": "film-pendek",
  "a0000000-0000-0000-0000-000000000003": "pidato",
  "a0000000-0000-0000-0000-000000000004": "melukis-tas-kanvas",
  "a0000000-0000-0000-0000-000000000005": "monolog",
  "a0000000-0000-0000-0000-000000000006": "mc-formal",
  "a0000000-0000-0000-0000-000000000007": "palang-pintu",
  "a0000000-0000-0000-0000-000000000008": "vokal-grup",
};

const slugToDummyId: Record<string, string> = {
  "membaca-puisi": "comp-1",
  "film-pendek": "comp-2",
  "pidato": "comp-3",
  "melukis-tas-kanvas": "comp-4",
  "monolog": "comp-5",
  "mc-formal": "comp-6",
  "palang-pintu": "comp-7",
  "vokal-grup": "comp-8",
};

export default function DashboardPenilaianDetailPage() {
  const params = useParams();
  const rawCompId = (params?.competitionId as string) || "";

  const targetSlug = compIdToSlug[rawCompId] || rawCompId;
  const initialComp =
    COMPETITIONS.find(
      (c) =>
        c.id === rawCompId ||
        c.slug === rawCompId ||
        c.slug === targetSlug ||
        c.id === slugToDummyId[targetSlug]
    ) || COMPETITIONS[0];

  const [comp, setComp] = React.useState<Competition>(initialComp);

  // Sync with Supabase live data if available
  React.useEffect(() => {
    async function fetchLiveComp() {
      try {
        const { getCompetitionById } = await import("@/lib/supabase/queries");
        const live = await getCompetitionById(rawCompId);
        if (live) {
          setComp(live);
        }
      } catch (err) {
        console.error("Gagal memuat kompetisi dari Supabase:", err);
      }
    }
    fetchLiveComp();
  }, [rawCompId]);

  const dummyKey = slugToDummyId[comp.slug] || rawCompId;
  const recaps =
    SCORING_RECAPS[rawCompId] ||
    SCORING_RECAPS[comp.id] ||
    SCORING_RECAPS[dummyKey] ||
    SCORING_RECAPS["comp-1"] ||
    [];

  const [isFinalized, setIsFinalized] = React.useState(false);

  // Ambang batas selisih antar-juri (20 poin)
  const THRESHOLD = 20;

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
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isFinalized ? "success" : "live"} className="text-xs">
                  {isFinalized ? "NILAI SUDAH DIFINALISASI" : "SEDANG BERLANGSUNG"}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  Agregasi: {comp.aggregation.replace(/_/g, " ")}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Rekapitulasi Nilai: {comp.name}
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

        {/* Tabel Rekap Multi-Juri */}
        {recaps.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Peserta & Instansi</TableHead>
                  <TableHead className="text-center">
                    {recaps[0]?.scoresPerJudge[0]?.judgeName
                      ? `Juri 1 (${recaps[0].scoresPerJudge[0].judgeName.split(" ")[0]})`
                      : "Juri 1"}
                  </TableHead>
                  <TableHead className="text-center">
                    {recaps[0]?.scoresPerJudge[1]?.judgeName
                      ? `Juri 2 (${recaps[0].scoresPerJudge[1].judgeName.split(" ")[0]})`
                      : "Juri 2"}
                  </TableHead>
                  <TableHead className="text-center">Selisih Skor</TableHead>
                  <TableHead className="text-right">Skor Akhir (Agregat)</TableHead>
                  <TableHead className="text-center">Status Audit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recaps.map((item) => {
                  const s1 =
                    item.scoresPerJudge.find((j) => j.judgeId === "judge-1")?.weightedTotal ??
                    item.scoresPerJudge[0]?.weightedTotal ??
                    0;
                  const s2 =
                    item.scoresPerJudge.find((j) => j.judgeId === "judge-8")?.weightedTotal ??
                    item.scoresPerJudge[1]?.weightedTotal ??
                    s1;
                  const diff = Math.abs(s1 - s2);
                  const isGapExceeded = diff > THRESHOLD;

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
                      <TableCell className="text-center font-mono text-xs">
                        {s1.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {s2.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {diff.toFixed(2)} Pts
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                        {item.finalAverageScore.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isGapExceeded ? (
                          <Badge variant="danger" className="text-[10px]">
                            PERLU PENINJAUAN
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            VALID
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
            <p className="text-sm font-semibold text-foreground">Data penilaian belum masuk</p>
            <p className="text-xs text-muted-foreground">
              Form penilaian dari dewan juri akan muncul di sini segera setelah dikirimkan.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
