"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CHALLENGES } from "@/lib/dummy-data";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { Sparkles, QrCode, ArrowLeft, ArrowRight, CheckCircle2, Puzzle } from "lucide-react";

export default function PesertaChallengeListPage() {
  const { participant } = useCurrentParticipant();

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
          {CHALLENGES.map((ch) => (
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

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Lencana:</span>
                  <Badge variant="default" className="text-[10px]">
                    {ch.badge}
                  </Badge>
                </div>

                <Link href={ch.type === "scan_qr" ? "/peserta/scan" : "/twibbon/unggah"}>
                  <Button size="sm" className="text-xs gap-1">
                    <span>{ch.type === "scan_qr" ? "Scan Sekarang" : "Kirim Bukti"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
