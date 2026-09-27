"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COMPETITIONS, SCORING_RECAPS } from "@/lib/dummy-data";
import { Calculator, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function DashboardPenilaianPage() {
  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Calculator className="h-7 w-7 text-accent" />
              <span>Rekapitulasi Penilaian Digital 8 Lomba</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pantau masuknya formulir penilaian digital dewan juri, kalkulasi agregasi multi-juri, dan status finalisasi nilai.
            </p>
          </div>

          <Link href="/dashboard/pemenang">
            <Button size="sm" variant="accent" className="text-xs gap-1.5">
              <span>Penetapan Pemenang Lomba →</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COMPETITIONS.map((comp) => {
            const recaps = SCORING_RECAPS[comp.id] || [];
            const hasFinalScores = recaps.length > 0;
            const isLive = comp.status === "berlangsung";

            return (
              <Card
                key={comp.id}
                className="p-5 flex flex-col justify-between space-y-4 hover:border-accent transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={isLive ? "live" : comp.status === "selesai" ? "success" : "default"}
                      className="text-[10px]"
                    >
                      {comp.status.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase">
                      {comp.category}
                    </span>
                  </div>

                  <h3 className="font-heading text-base font-bold text-foreground">
                    {comp.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Metode: <strong className="text-foreground capitalize">{comp.aggregation.replace(/_/g, " ")}</strong>
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Data Penilaian:</span>
                    <strong className="text-foreground font-mono">
                      {recaps.length} Peserta Ternilai
                    </strong>
                  </div>

                  <Link href={`/dashboard/penilaian/${comp.id}`} className="block">
                    <Button
                      variant={hasFinalScores ? "default" : "outline"}
                      size="sm"
                      className="w-full text-xs gap-1"
                    >
                      <span>Buka Detail Rekap</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
