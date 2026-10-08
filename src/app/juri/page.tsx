"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { JUDGES } from "@/lib/dummy-data";
import { Trophy, ArrowRight, UserCheck, CheckCircle2, Clock, Loader2, Layers } from "lucide-react";
import { getJudgeDashboardData } from "@/app/actions/competitions";

function getStatusBadge(status: string) {
  switch (status) {
    case "berlangsung":
      return { variant: "live" as const, label: "SEDANG BERLANGSUNG" };
    case "pendaftaran":
      return { variant: "warning" as const, label: "PENDAFTARAN DIBUKA" };
    case "selesai":
      return { variant: "success" as const, label: "SELESAI" };
    case "dibatalkan":
      return { variant: "danger" as const, label: "DIBATALKAN" };
    default:
      return { variant: "default" as const, label: status ? status.toUpperCase() : "DRAFT" };
  }
}

export default function DashboardJuriPage() {
  const [loading, setLoading] = React.useState(true);
  const [judgeInfo, setJudgeInfo] = React.useState({
    fullName: "H.MULYANA,MM",
    expertise: "Dewan Juri Sastra & Puisi",
    title: "Dewan Juri Ahli Bersertifikasi",
    avatarUrl: JUDGES[0].avatarUrl,
  });
  const [assignedComps, setAssignedComps] = React.useState<
    Array<{
      id: string;
      slug: string;
      name: string;
      category: string;
      description: string;
      venue: string;
      stage: string;
      status: string;
      criteriaCount: number;
      isChiefJudge: boolean;
      roundType?: "single_round" | "multi_stage";
    }>
  >([]);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getJudgeDashboardData();
        if (res.success) {
          if (res.judgeInfo) {
            setJudgeInfo({
              fullName: res.judgeInfo.fullName,
              expertise: res.judgeInfo.expertise,
              title: res.judgeInfo.title,
              avatarUrl: res.judgeInfo.avatarUrl || JUDGES[0].avatarUrl,
            });
          }
          setAssignedComps(res.assignedComps);
        } else {
          console.error("Gagal load penugasan juri:", res.error);
        }
      } catch (err) {
        console.error("Error loadData juri:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <DashboardLayout role="juri">
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={judgeInfo.avatarUrl}
              alt={judgeInfo.fullName}
              className="h-16 w-16 rounded-full object-cover border-2 border-accent"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  DEWAN JURI RESMI
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {judgeInfo.expertise}
                </span>
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Selamat Bertugas, {judgeInfo.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">{judgeInfo.title}</p>
            </div>
          </div>

          <div className="sm:shrink-0 text-left sm:text-right">
            <span className="text-[11px] text-muted-foreground block">Tugas Penjurian Aktif:</span>
            <span className="font-mono text-2xl font-bold text-accent">
              {assignedComps.length} Cabang Lomba
            </span>
          </div>
        </div>

        {/* Assigned Competitions Cards */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <span>Cabang Lomba yang Ditugaskan kepada Anda</span>
          </h2>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span>Memuat data penugasan juri dari database...</span>
            </div>
          ) : assignedComps.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Belum ada cabang lomba yang ditugaskan.</p>
              <p className="text-xs">Hubungi Seksi Acara untuk melakukan sinkronisasi matriks penugasan.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignedComps.map((comp) => {
                const statusInfo = getStatusBadge(comp.status);

                const isMultiStage =
                  comp.roundType === "multi_stage" ||
                  comp.slug === "pidato" ||
                  comp.slug === "duta-bahasa" ||
                  comp.name?.toLowerCase().includes("duta");

                return (
                  <Card key={comp.id} className="p-6 space-y-4 border-accent/40 bg-accent/5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                        {isMultiStage ? (
                          <Badge variant="default" className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold gap-1">
                            <Layers className="h-3 w-3" />
                            <span>MULTI STAGE</span>
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground border-border gap-1">
                            <span>SINGLE ROUND</span>
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono uppercase text-muted-foreground font-semibold">
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
                        <strong className="text-foreground">
                          {comp.stage ? `${comp.venue} (${comp.stage})` : comp.venue}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Jumlah Kriteria:</span>
                        <strong className="text-foreground">{comp.criteriaCount} Komponen Berbobot 100%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Status Juri Anda:</span>
                        <strong className="text-accent">
                          {comp.isChiefJudge ? "Juri Utama (Chief Judge)" : "Anggota Dewan Juri"}
                        </strong>
                      </div>
                    </div>

                    <Link href={`/juri/lomba/${comp.slug}`} className="block">
                      <Button className="w-full text-xs gap-1.5 font-semibold" size="lg">
                        <span>Buka Roster Peserta & Mulai Menilai</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
