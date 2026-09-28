"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPETITIONS } from "@/lib/dummy-data";
import { Calculator, ArrowRight, Loader2 } from "lucide-react";
import { getPenilaianOverviewData } from "@/app/actions/assessments";

interface CompetitionItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: string;
  aggregation: string;
  totalParticipants: number;
  scoredParticipants: number;
}

export default function DashboardPenilaianPage() {
  const [loading, setLoading] = React.useState(true);
  const [competitions, setCompetitions] = React.useState<CompetitionItem[]>(
    COMPETITIONS.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      category: c.category,
      status: c.status,
      aggregation: c.aggregation,
      totalParticipants: 0,
      scoredParticipants: 0,
    }))
  );

  React.useEffect(() => {
    async function loadLiveComps() {
      try {
        setLoading(true);
        const res = await getPenilaianOverviewData();
        if (res.success && res.competitions.length > 0) {
          setCompetitions(res.competitions);
        }
      } catch (err) {
        console.error("Gagal load kompetisi penilaian:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLiveComps();
  }, []);

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

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat rekapitulasi penilaian dari database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {competitions.map((comp) => {
              const hasData = comp.totalParticipants > 0 || comp.scoredParticipants > 0;
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
                        {comp.scoredParticipants > 0
                          ? `${comp.scoredParticipants} Peserta Ternilai`
                          : comp.totalParticipants > 0
                            ? `${comp.totalParticipants} Peserta Terdaftar`
                            : "0 Peserta Ternilai"}
                      </strong>
                    </div>

                    <Link href={`/dashboard/penilaian/${comp.slug || comp.id}`} className="block">
                      <Button
                        variant={hasData ? "default" : "outline"}
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
        )}
      </div>
    </DashboardLayout>
  );
}
