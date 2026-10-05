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
import { Trophy, CheckCircle2, Megaphone, Loader2 } from "lucide-react";
import {
  getDashboardWinners,
  publishAllWinners,
  saveTieBreakerNotes,
  type DashboardWinnerItem,
} from "@/app/actions/winners";

export default function DashboardPemenangPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [winners, setWinners] = React.useState<DashboardWinnerItem[]>([]);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishNotice, setPublishNotice] = React.useState(false);
  const [tieBreakerOpen, setTieBreakerOpen] = React.useState(false);
  const [tieNotes, setTieNotes] = React.useState("");
  const [isSavingTie, setIsSavingTie] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardWinners();
      if (res.success) {
        setWinners(res.winners);
      }
    } catch (err) {
      console.error("Gagal memuat daftar pemenang:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await publishAllWinners();
      if (res.success) {
        await loadData();
        setPublishNotice(true);
        setTimeout(() => setPublishNotice(false), 4000);
      } else {
        alert(res.error || "Gagal mempublikasikan pemenang.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat publikasi.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveTieNotes = async () => {
    if (!tieNotes.trim()) return;
    try {
      setIsSavingTie(true);
      const res = await saveTieBreakerNotes(tieNotes);
      if (res.success) {
        setTieBreakerOpen(false);
        setTieNotes("");
        alert("Berita acara sidang penetapan juara berhasil disimpan ke log sistem.");
      } else {
        alert(res.error || "Gagal menyimpan berita acara.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menyimpan berita acara.");
    } finally {
      setIsSavingTie(false);
    }
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
              disabled={isMounted ? isPublishing : false}
              suppressHydrationWarning
              size="sm"
              variant="accent"
              className="text-xs gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Megaphone className="h-3.5 w-3.5" />
              )}
              <span>
                {winners.length > 0
                  ? "Publikasikan Seluruh Pemenang"
                  : "Tetapkan & Publikasikan Pemenang"}
              </span>
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

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat daftar juara resmi dari database...</p>
          </div>
        ) : winners.length > 0 ? (
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
                      <Badge variant={win.isPublished ? "success" : "default"} className="text-[10px]">
                        {win.isPublished ? "PUBLIK" : "DRAFT"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">Belum Ada Juara Ditetapkan</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum ada data pemenang yang tersimpan. Klik tombol di bawah ini untuk menetapkan dan mempublikasikan pemenang secara otomatis berdasarkan skor akhir juri.
            </p>
            <Button
              size="sm"
              variant="accent"
              onClick={handlePublish}
              disabled={isMounted ? isPublishing : false}
              className="text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              {isPublishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Megaphone className="h-3.5 w-3.5" />
              )}
              <span>Tetapkan &amp; Publikasikan Pemenang dari Nilai Juri</span>
            </Button>
          </div>
        )}

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
              <Button
                onClick={handleSaveTieNotes}
                disabled={isMounted ? (isSavingTie || !tieNotes.trim()) : false}
                suppressHydrationWarning
              >
                {isSavingTie ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  "Simpan Ketetapan Manual"
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
