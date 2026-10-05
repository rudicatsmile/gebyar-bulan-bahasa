"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getParticipantChallenges,
  type ParticipantChallengeItem,
} from "@/app/actions/challenges";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { Sparkles, QrCode, ArrowLeft, Puzzle, AlertCircle } from "lucide-react";

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

interface ChallengeItemProps {
  title: string;
  meta?: string;
  href: string | null;
  actionLabel: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Satu struktur untuk semua item challenge: nama + tombol aksi.
 * Tombol selebar kartu dengan tinggi 44px agar nyaman disentuh di HP.
 */
function ChallengeItem({ title, meta, href, actionLabel, icon: Icon }: ChallengeItemProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="min-w-0">
        <h3 className="font-heading text-sm sm:text-base font-semibold leading-snug text-foreground line-clamp-2">
          {title}
        </h3>
        {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
      </div>

      {href ? (
        <Link href={href} className="block">
          <Button variant="accent" className="h-11 w-full text-sm">
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{actionLabel}</span>
          </Button>
        </Link>
      ) : (
        <Button variant="outline" className="h-11 w-full text-sm" disabled>
          <span className="truncate">{actionLabel}</span>
        </Button>
      )}
    </Card>
  );
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
      <div className="space-y-4">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-accent" />
                <span>Misi Tantangan</span>
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kerjakan misi, kumpulkan poin.
              </p>
            </div>
            <Link href="/peserta/scan" className="shrink-0">
              <Button size="sm" variant="accent" className="h-10 px-3 text-xs gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                <span>Scan QR</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3 animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded-md" />
                <div className="h-3 w-16 bg-muted rounded-md" />
                <div className="h-11 w-full bg-muted rounded-md" />
              </Card>
            ))
          ) : (
            <>
              <ChallengeItem
                title="Challenge Puzzle: Cocokkan Baju Daerah"
                meta="+10 poin tiap jawaban benar"
                href="/peserta/challenge/puzzle"
                actionLabel="Mulai Main Puzzle"
                icon={Puzzle}
              />
              <ChallengeItem
                title="Challenge QR Huruf: Jelajah Aksara & Susun Kata"
                meta="+100 poin bila kalimat tersusun"
                href="/peserta/challenge/qr-huruf"
                actionLabel="Mulai Berburu QR"
                icon={QrCode}
              />

              {challenges.map((ch) => {
                const action = getChallengeAction(ch);
                return (
                  <ChallengeItem
                    key={ch.id}
                    title={ch.title}
                    meta={`+${ch.pointReward} poin`}
                    href={action?.href ?? null}
                    actionLabel={action?.label ?? "Poin diisi panitia"}
                  />
                );
              })}

              {!error && challenges.length === 0 ? (
                <p className="sm:col-span-2 py-1 text-center text-xs text-muted-foreground">
                  Belum ada tantangan tambahan dari panitia.
                </p>
              ) : null}
            </>
          )}

          {!loading && error ? (
            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 p-4">
              <div className="flex min-w-0 items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <p className="truncate text-xs text-muted-foreground">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-xs"
                onClick={handleRetry}
              >
                <span>Coba Lagi</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
