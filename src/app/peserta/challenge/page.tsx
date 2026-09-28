"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CHALLENGES } from "@/lib/dummy-data";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { Sparkles, QrCode, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

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
                Selesaikan misi keliling stand dan unggah karya untuk mengumpulkan poin reward tambahan.
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
