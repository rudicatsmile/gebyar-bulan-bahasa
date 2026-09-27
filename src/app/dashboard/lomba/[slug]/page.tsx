"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
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
import {
  COMPETITIONS,
  JUDGES,
  PARTICIPANTS,
  SCORING_RECAPS,
} from "@/lib/dummy-data";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  UserCheck,
  Trophy,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function DashboardLombaDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const comp = COMPETITIONS.find((c) => c.slug === slug);
  if (!comp) return notFound();

  const judges = JUDGES.filter((j) => j.assignedCompetitionIds.includes(comp.id));
  const participants = PARTICIPANTS.filter((p) => p.competitionId === comp.id);
  const recaps = SCORING_RECAPS[comp.id] || [];

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8">
        <div>
          <Link
            href="/dashboard/lomba"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Monitoring Lomba</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={comp.status === "berlangsung" ? "live" : "success"}
                  className="text-[10px]"
                >
                  {comp.status.toUpperCase()}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {comp.category}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Monitoring: {comp.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/dashboard/penilaian/${comp.id}`}>
                <Button size="sm" className="text-xs">
                  Rekapitulasi Nilai & Agregasi →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Progress Pengiriman Nilai Tiap Juri */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-accent" />
            <span>Progress Pengiriman Nilai Dewan Juri</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {judges.map((j) => {
              // Hitung peserta yang sudah dinilai juri ini
              const gradedCount = recaps.filter((r) =>
                r.scoresPerJudge.some(
                  (spj) => spj.judgeId === j.id && spj.status === "terkirim"
                )
              ).length;
              const totalToGrade = participants.length;
              const percentage =
                totalToGrade > 0 ? Math.round((gradedCount / totalToGrade) * 100) : 0;

              return (
                <Card key={j.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-accent font-bold">
                        {j.isChiefJudge ? "Juri Utama" : "Anggota Dewan Juri"}
                      </span>
                      <h4 className="font-heading text-sm font-bold text-foreground">
                        {j.fullName}
                      </h4>
                      <p className="text-xs text-muted-foreground">{j.expertise}</p>
                    </div>
                    <Badge variant={percentage === 100 ? "success" : "warning"} className="text-xs font-mono">
                      {gradedCount} / {totalToGrade} Peserta
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Kelengkapan Penilaian:</span>
                      <strong className="text-foreground font-mono">{percentage}%</strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Breakdown Peserta & Nilai Agregat */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent" />
            <span>Daftar Peserta & Status Penilaian</span>
          </h2>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">No. Registrasi</TableHead>
                  <TableHead>Nama Peserta</TableHead>
                  <TableHead>Sekolah / Kampus</TableHead>
                  <TableHead className="text-center">Juri 1 (Siti)</TableHead>
                  <TableHead className="text-center">Juri 2 (Farhan)</TableHead>
                  <TableHead className="text-right">Rata-Rata Sementara</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => {
                  const recap = recaps.find((r) => r.registrationId === p.id);
                  const juri1Score = recap?.scoresPerJudge.find((j) => j.judgeId === "judge-1")?.weightedTotal;
                  const juri2Score = recap?.scoresPerJudge.find((j) => j.judgeId === "judge-8")?.weightedTotal;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {p.registrationNumber}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                        {p.fullName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.institution}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {juri1Score ? (
                          <span className="font-semibold text-foreground">{juri1Score.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Draft / Belum</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {juri2Score ? (
                          <span className="font-semibold text-foreground">{juri2Score.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Draft / Belum</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                        {recap ? recap.finalAverageScore.toFixed(2) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
