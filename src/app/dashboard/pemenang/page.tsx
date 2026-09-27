"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WINNERS, Winner, COMPETITIONS } from "@/lib/dummy-data";
import { Trophy, Award, CheckCircle2, Megaphone, Tv, AlertCircle } from "lucide-react";

export default function DashboardPemenangPage() {
  const [winners, setWinners] = React.useState<Winner[]>(WINNERS);
  const [published, setPublished] = React.useState(true);
  const [publishNotice, setPublishNotice] = React.useState(false);
  const [tieBreakerOpen, setTieBreakerOpen] = React.useState(false);
  const [tieNotes, setTieNotes] = React.useState("");

  const handlePublish = () => {
    setPublished(true);
    setPublishNotice(true);
    setTimeout(() => setPublishNotice(false), 3000);
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Trophy className="h-7 w-7 text-accent" />
              <span>Penetapan & Publikasi Juara Lomba</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Konfirmasi ranking otomatis, tetapkan juara secara manual bila terjadi seri, dan publikasikan hasil ke halaman pemenang dan layar monitor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTieBreakerOpen(true)}
              className="text-xs"
            >
              Sidang Penetapan Manual (Seri)
            </Button>
            <Button
              onClick={handlePublish}
              size="sm"
              variant="accent"
              className="text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>Publikasikan Seluruh Pemenang</span>
            </Button>
          </div>
        </div>

        {publishNotice && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              Pemenang resmi berhasil dipublikasikan! Data otomatis didorong ke rute <strong>/pemenang</strong> dan Layar Monitor Lapangan venue.
            </span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 text-center">Gelar Juara</TableHead>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead>Nama Juara / Tim</TableHead>
                <TableHead>Sekolah / Sanggar</TableHead>
                <TableHead className="text-center">Skor Akhir</TableHead>
                <TableHead>Hadiah & Penghargaan</TableHead>
                <TableHead className="text-center">Status Tayang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {winners.map((win) => (
                <TableRow key={win.id}>
                  <TableCell className="text-center font-mono font-bold text-xs">
                    <Badge variant={win.rank === 1 ? "gold" : "warning"} className="text-[10px]">
                      {win.title}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">
                    {win.competitionName}
                  </TableCell>
                  <TableCell>
                    <strong className="text-foreground text-xs sm:text-sm block">
                      {win.winnerName}
                    </strong>
                    {win.teamName && (
                      <span className="text-[11px] text-muted-foreground">{win.teamName}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {win.institution}
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-accent text-sm">
                    {win.finalScore.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {win.prize}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success" className="text-[10px]">
                      PUBLIK
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal Tie Breaker Manual */}
        <Dialog open={tieBreakerOpen} onOpenChange={setTieBreakerOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Penetapan Juara Manual (Penyelesaian Skor Seri)</DialogTitle>
              <DialogDescription>
                Bila terjadi nilai seri pada kriteria berbobot terbesar, tuliskan berita acara rapat dewan juri untuk menetapkan peringkat akhir.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              label="Berita Acara & Alasan Penetapan *"
              placeholder="Berdasarkan hasil musyawarah dewan juri pada tanggal 27 Oktober 2025, diputuskan..."
              value={tieNotes}
              onChange={(e) => setTieNotes(e.target.value)}
              rows={4}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setTieBreakerOpen(false)}>
                Batal
              </Button>
              <Button onClick={() => setTieBreakerOpen(false)}>
                Simpan Ketetapan Manual
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
