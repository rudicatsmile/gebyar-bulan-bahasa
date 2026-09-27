"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
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
import { COMPETITIONS, PARTICIPANTS, SCORING_RECAPS } from "@/lib/dummy-data";
import { ArrowLeft, Edit3, CheckCircle2, Clock, Trophy } from "lucide-react";

export default function JuriLombaPesertaPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const comp = COMPETITIONS.find((c) => c.slug === slug);
  if (!comp) return notFound();

  const participants = PARTICIPANTS.filter((p) => p.competitionId === comp.id);
  const recaps = SCORING_RECAPS[comp.id] || [];

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6">
        <div>
          <Link
            href="/juri"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Lomba Saya</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  ROSTER PESERTA RESMI
                </Badge>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {comp.category}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Penilaian: {comp.name}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pilih peserta di bawah untuk membuka lembar penilaian digital per kriteria.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama Peserta</TableHead>
                <TableHead>Sekolah / Kampus</TableHead>
                <TableHead className="text-center">Status Penilaian Anda</TableHead>
                <TableHead className="text-right">Aksi Form Penilaian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => {
                const recap = recaps.find((r) => r.registrationId === p.id);
                const myGrading = recap?.scoresPerJudge.find((j) => j.judgeId === "judge-1");
                const isSent = myGrading?.status === "terkirim";
                const isDraft = myGrading?.status === "draft";

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-bold text-accent">
                      {p.registrationNumber}
                    </TableCell>
                    <TableCell>
                      <strong className="text-foreground text-xs sm:text-sm block">
                        {p.fullName}
                      </strong>
                      {p.teamName && (
                        <span className="text-[11px] text-muted-foreground">{p.teamName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.institution}
                    </TableCell>
                    <TableCell className="text-center">
                      {isSent ? (
                        <Badge variant="success" className="text-[10px]">
                          ✓ TERKIRIM ({myGrading?.weightedTotal.toFixed(2)})
                        </Badge>
                      ) : isDraft ? (
                        <Badge variant="warning" className="text-[10px]">
                          DRAFT DISIMPAN
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">
                          BELUM DINILAI
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/juri/penilaian/${p.id}`}>
                        <Button
                          size="sm"
                          variant={isSent ? "outline" : "default"}
                          className="text-xs h-8 gap-1.5"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>{isSent ? "Lihat Nilai" : "Buka Form Nilai"}</span>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
