"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getParticipantChallenges,
  type ParticipantChallengeItem,
} from "@/app/actions/challenges";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { Sparkles, QrCode, ArrowLeft, ArrowRight, Puzzle, AlertCircle, CalendarX } from "lucide-react";

// Tombol aksi disesuaikan dengan tipe challenge dan alur yang tersedia bagi peserta.
function getChallengeAction(ch: ParticipantChallengeItem): { href: string; label: string } | null {
  switch (ch.type) {
    case "scan_qr":
      return { href: "/peserta/scan", label: "Scan Sekarang" };
    case "kode_unik":
      return { href: "/peserta/scan", label: "Masukkan Kode" };
    case "unggah_bukti":
      return { href: "/twibbon/unggah", label: "Kirim Bukti" };
    default:
      return null; // input_panitia: poin diisi manual oleh panitia, tidak ada aksi mandiri
  }
}

export default function PesertaChallengeListPage() {
  const { participant } = useCurrentParticipant();

  const [challenges, setChallenges] = React.useState<ParticipantChallengeItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // challenge yang tampil di sini bersumber dari tabel `challenges` yang sama
  // dengan halaman admin /dashboard/challenge
  const loadChallenges = React.useCallback(() => {
    return getParticipantChallenges()
      .then((res) => {
        if (res.success) {
          setChallenges(res.challenges);
          setError(null);
        } else {
          setChallenges([]);
          setError(res.error || "Gagal memuat daftar tantangan.");
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
        setChallenges([]);
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleRetry = () => {
    setLoading(true);
    void loadChallenges();
  };

  React.useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-accent" />
                <span>Misi Tantangan & Kuis Interaktif</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Selesaikan misi keliling stand dan game interaktif untuk mengumpulkan poin reward tambahan.
              </p>
            </div>
            <Link href="/peserta/scan">
              <Button size="sm" variant="accent" className="text-xs gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>Kamera Scanner Stand</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured: Puzzle Challenge */}
        <Card className="p-6 relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-[10px] font-bold">
                  GAME SPESIAL NON-LOMBA
                </Badge>
                <Badge variant="info" className="text-[10px]">
                  +10 Poin / Jawaban Benar
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <Puzzle className="h-5 w-5 text-primary" />
                <span>Challenge Puzzle: Cocokkan Baju Daerah</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tantang wawasan kebudayaanmu! Cocokkan nama pakaian adat nusantara (Kebaya, Ulos, Baju Bodo, Beskap, Payas Agung, dll.) dengan daerah asalnya. Mainkan interaktif dengan seret-lepas atau tombol pilihan.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/peserta/challenge/puzzle">
                <Button size="lg" className="w-full sm:w-auto font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md">
                  <Puzzle className="h-4 w-4" />
                  <span>Mulai Main Puzzle</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Featured: Challenge QR Huruf */}
        <Card className="p-6 relative overflow-hidden border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card hover:border-accent transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="gold" className="text-[10px] font-bold">
                  PETUALANGAN AKSARA
                </Badge>
                <Badge variant="info" className="text-[10px]">
                  +100 Poin Penuh
                </Badge>
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
                <QrCode className="h-5 w-5 text-accent" />
                <span>Challenge QR Huruf: Jelajah Aksara & Susun Kata</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Temukan stiker QR code huruf yang ditempel di berbagai lokasi tersembunyi acara. Scan stikernya, kumpulkan semua huruf di inventarismu, lalu susun menjadi kalimat bermakna rahasia!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/peserta/challenge/qr-huruf">
                <Button size="lg" variant="accent" className="w-full sm:w-auto font-bold gap-2 shadow-md">
                  <QrCode className="h-4 w-4" />
                  <span>Mulai Berburu QR Huruf</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-28 bg-muted rounded-md" />
                  <div className="h-4 w-20 bg-muted rounded-md" />
                </div>
                <div className="h-5 w-3/4 bg-muted rounded-md" />
                <div className="h-4 w-full bg-muted rounded-md" />
                <div className="h-4 w-2/3 bg-muted rounded-md" />
                <div className="pt-3 border-t border-border">
                  <div className="h-8 w-full bg-muted rounded-md" />
                </div>
              </Card>
            ))
          ) : error ? (
            <Card className="p-6 md:col-span-2 flex flex-col items-center gap-3 text-center border-destructive/40">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Daftar tantangan gagal dimuat
                </h3>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs" onClick={handleRetry}>
                <span>Coba Muat Ulang</span>
              </Button>
            </Card>
          ) : challenges.length === 0 ? (
            <Card className="p-6 md:col-span-2 flex flex-col items-center gap-3 text-center">
              <CalendarX className="h-6 w-6 text-muted-foreground" />
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Belum ada tantangan aktif
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tantangan akan muncul di sini setelah panitia mengaktifkannya. Sementara ini,
                  silakan ikuti misi game spesial di atas atau kunjungi stand lewat pemindai QR.
                </p>
              </div>
              <Link href="/peserta/scan">
                <Button size="sm" variant="accent" className="text-xs gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Scan Stand</span>
                </Button>
              </Link>
            </Card>
          ) : (
            challenges.map((ch) => {
              const action = getChallengeAction(ch);
              return (
            <Card key={ch.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-accent transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="gold" className="text-[10px]">
                    +{ch.pointReward} POIN REWARD
                  </Badge>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground">
                    Tipe: {ch.type.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-bold text-foreground">
                  {ch.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ch.description}
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground shrink-0">Lencana:</span>
                  <Badge variant="default" className="text-[10px] truncate">
                    {ch.badge}
                  </Badge>
                </div>

                {action ? (
                  <Link href={action.href} className="shrink-0">
                    <Button size="sm" className="text-xs gap-1">
                      <span>{action.label}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <span className="text-[10px] text-muted-foreground text-right shrink-0">
                    Poin diisi panitia
                  </span>
                )}
              </div>
            </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
