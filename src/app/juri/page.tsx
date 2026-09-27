"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPETITIONS, JUDGES } from "@/lib/dummy-data";
import { Trophy, ArrowRight, UserCheck, CheckCircle2, Clock } from "lucide-react";

export default function DashboardJuriPage() {
  // Current active judge: Dr. Siti Nurhaliza M.Pd.
  const currentJudge = JUDGES[0];
  const assignedCompetitions = COMPETITIONS.filter((c) =>
    currentJudge.assignedCompetitionIds.includes(c.id)
  );

  return (
    <DashboardLayout role="juri">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={currentJudge.avatarUrl}
              alt={currentJudge.fullName}
              className="h-16 w-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  DEWAN JURI RESMI
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {currentJudge.expertise}
                </span>
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Selamat Bertugas, {currentJudge.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">{currentJudge.title}</p>
            </div>
          </div>

          <div className="sm:shrink-0 text-left sm:text-right">
            <span className="text-[11px] text-muted-foreground block">Tugas Penjurian Aktif:</span>
            <span className="font-mono text-2xl font-bold text-accent">
              {assignedCompetitions.length} Cabang Lomba
            </span>
          </div>
        </div>

        {/* Assigned Competitions Cards */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <span>Cabang Lomba yang Ditugaskan kepada Anda</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assignedCompetitions.map((comp) => (
              <Card key={comp.id} className="p-6 space-y-4 border-accent/40 bg-accent/5">
                <div className="flex items-center justify-between">
                  <Badge variant={comp.status === "berlangsung" ? "live" : "default"} className="text-xs">
                    {comp.status === "berlangsung" ? "SEDANG BERLANGSUNG" : comp.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-mono uppercase text-muted-foreground">
                    {comp.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {comp.description}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Lokasi & Panggung:</span>
                    <strong className="text-foreground">{comp.venue} ({comp.stage})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Jumlah Kriteria:</span>
                    <strong className="text-foreground">{comp.criteria.length} Komponen Berbobot 100%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Status Juri Anda:</span>
                    <strong className="text-accent">Juri Utama (Chief Judge)</strong>
                  </div>
                </div>

                <Link href={`/juri/lomba/${comp.slug}`} className="block">
                  <Button className="w-full text-xs gap-1.5 font-semibold" size="lg">
                    <span>Buka Roster Peserta & Mulai Menilai</span>
                    <ArrowRight className="h-4 w-4" />
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
