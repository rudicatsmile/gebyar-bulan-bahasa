"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  CHALLENGES,
  REWARDS,
} from "@/lib/dummy-data";
import {
  Coins,
  QrCode,
  Sparkles,
  Gift,
  Trophy,
  ArrowRight,
  Camera,
  Loader2,
} from "lucide-react";

export default function DashboardPesertaPage() {
  const { participant, loading } = useCurrentParticipant();

  const nextReward = REWARDS && REWARDS.length > 0 ? (REWARDS[1] || REWARDS[0]) : null;
  const currentPoints = participant?.totalPoints ?? 0;
  const remainingForNextReward = nextReward
    ? Math.max(0, nextReward.pointsRequired - currentPoints)
    : 0;
  const activeChallenges = (CHALLENGES || []).slice(0, 3);

  return (
    <DashboardLayout role="peserta" participantPoints={currentPoints}>
      <div className="space-y-8">
        {/* Welcome Card & Point Balance */}
        {loading || !participant ? (
          <div className="p-6 sm:p-8 rounded-2xl border border-accent/40 bg-accent/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-pulse">
            <div className="space-y-3">
              <div className="h-5 w-32 bg-accent/20 rounded-md" />
              <div className="h-8 w-64 bg-accent/25 rounded-md" />
              <div className="h-4 w-48 bg-accent/15 rounded-md" />
            </div>
            <div className="p-5 rounded-xl border border-accent/30 bg-card h-28 w-44 shrink-0" />
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-2xl border border-accent/40 bg-accent/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2">
              <Badge variant="gold" className="text-[10px]">
                AKUN PESERTA RESMI
              </Badge>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Halo, {participant.fullName}!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {participant.institution} • No. Registrasi:{" "}
                <strong className="text-accent font-mono">{participant.registrationNumber}</strong>
              </p>
            </div>

            {/* Point Counter Block */}
            <div className="p-5 rounded-xl border border-accent/30 bg-card text-center sm:text-right shrink-0">
              <div className="flex items-center justify-center sm:justify-end gap-1.5 text-accent text-xs font-semibold uppercase tracking-wider mb-1">
                <Coins className="h-4 w-4" />
                <span>Saldo Poin Anda</span>
              </div>
              <div className="font-mono text-4xl font-black text-accent">
                {currentPoints}
              </div>
              <span className="text-[11px] text-muted-foreground block mt-1">
                {nextReward ? (
                  remainingForNextReward > 0 ? (
                    <>Butuh {remainingForNextReward} poin lagi untuk &ldquo;{nextReward.name}&rdquo;</>
                  ) : (
                    <>Poin Anda mencukupi untuk &ldquo;{nextReward.name}&rdquo;!</>
                  )
                ) : (
                  <>Kumpulkan poin dengan mengunjungi stand pameran budaya!</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/peserta/scan">
            <Card className="p-4 text-center space-y-2 hover:border-accent transition-colors cursor-pointer group">
              <QrCode className="h-6 w-6 text-accent mx-auto group-hover:scale-110 transition-transform" />
              <h4 className="font-heading text-xs font-bold text-foreground">Scan QR Stand</h4>
              <p className="text-[10px] text-muted-foreground">+10 Poin per Kunjungan</p>
            </Card>
          </Link>

          <Link href="/peserta/reward">
            <Card className="p-4 text-center space-y-2 hover:border-accent transition-colors cursor-pointer group">
              <Gift className="h-6 w-6 text-accent mx-auto group-hover:scale-110 transition-transform" />
              <h4 className="font-heading text-xs font-bold text-foreground">Tukar Reward</h4>
              <p className="text-[10px] text-muted-foreground">Katalog Merchandise</p>
            </Card>
          </Link>

          <Link href="/peserta/twibbon">
            <Card className="p-4 text-center space-y-2 hover:border-accent transition-colors cursor-pointer group">
              <Camera className="h-6 w-6 text-accent mx-auto group-hover:scale-110 transition-transform" />
              <h4 className="font-heading text-xs font-bold text-foreground">Twibbon Saya</h4>
              <p className="text-[10px] text-muted-foreground">Status Unggahan Foto</p>
            </Card>
          </Link>

          <Link href="/peserta/pendaftaran">
            <Card className="p-4 text-center space-y-2 hover:border-accent transition-colors cursor-pointer group">
              <Trophy className="h-6 w-6 text-accent mx-auto group-hover:scale-110 transition-transform" />
              <h4 className="font-heading text-xs font-bold text-foreground">Lomba Diikuti</h4>
              <p className="text-[10px] text-muted-foreground truncate">
                {participant?.competitionName || "Pilih Cabang Lomba"}
              </p>
            </Card>
          </Link>
        </div>

        {/* Active Challenges Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Misi Challenge yang Dapat Diikuti</span>
            </h2>
            <Link href="/peserta/challenge" className="text-xs text-accent hover:underline">
              Lihat Semua →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeChallenges.map((ch) => (
              <Card key={ch.id} className="p-5 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="gold" className="text-[10px]">
                      +{ch.pointReward} Poin
                    </Badge>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      {ch.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {ch.description}
                  </p>
                </div>

                <Link href={ch.type === "scan_qr" ? "/peserta/scan" : "/peserta/challenge"}>
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1">
                    <span>Kerjakan Misi</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
