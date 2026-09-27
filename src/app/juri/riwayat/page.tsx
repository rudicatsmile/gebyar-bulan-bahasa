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
import { History, Eye, CheckCircle2 } from "lucide-react";

interface EvaluationHistory {
  id: string;
  registrationNumber: string;
  participantName: string;
  institution: string;
  competitionName: string;
  weightedScore: number;
  submittedAt: string;
}

const HISTORIES: EvaluationHistory[] = [
  {
    id: "eval-1",
    registrationNumber: "GBB-PUI-014",
    participantName: "Ahmad Fauzan Ramadhan",
    institution: "SMAN 1 Bandung",
    competitionName: "Membaca Puisi",
    weightedScore: 92.85,
    submittedAt: "27 Okt 2025, 11:42 WIB",
  },
  {
    id: "eval-2",
    registrationNumber: "GBB-PUI-015",
    participantName: "Nurul Hidayah Salsabila",
    institution: "SMKN 3 Jakarta",
    competitionName: "Membaca Puisi",
    weightedScore: 89.5,
    submittedAt: "27 Okt 2025, 11:15 WIB",
  },
  {
    id: "eval-3",
    registrationNumber: "GBB-PUI-008",
    participantName: "Kirana Ayu Lestari",
    institution: "SMA Taman Siswa Yogyakarta",
    competitionName: "Membaca Puisi",
    weightedScore: 87.4,
    submittedAt: "27 Okt 2025, 10:30 WIB",
  },
];

export default function JuriRiwayatPage() {
  return (
    <DashboardLayout role="juri">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-accent" />
            <span>Riwayat Formulir Penilaian Terkirim</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Audit rekam jejak penilaian final yang telah Anda kirimkan kepada panitia beserta rincian skor terbobot.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama Peserta</TableHead>
                <TableHead>Asal Sekolah / Kampus</TableHead>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead className="text-center">Skor Terbobot Anda</TableHead>
                <TableHead className="text-right">Waktu Pengiriman</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {HISTORIES.map((h) => (
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
      </div>
    </DashboardLayout>
  );
}
