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

const DEFAULT_IMAGE = "/images/images.png";

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
    avatarUrl: DEFAULT_IMAGE,
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
      posterUrl?: string;
    }>
  >([]);

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await getJudgeDashboardData();
        if (res.success) {
          if (res.judgeInfo) {
            let expertise = res.judgeInfo.expertise || "Dewan Juri Resmi";
            if (expertise === "Teater & Monolog" || expertise === "Seni Teater Monolog") {
              expertise = "Monolog";
            }
            setJudgeInfo({
              fullName: res.judgeInfo.fullName,
              expertise: expertise,
              title: res.judgeInfo.title,
              avatarUrl: res.judgeInfo.avatarUrl || DEFAULT_IMAGE,
            });
          }
          if (res.assignedComps) {
            setAssignedComps(
              res.assignedComps.map((comp) => {
                let compName = comp.name;
                if (comp.slug === "monolog" || compName === "Teater & Monolog" || compName === "Seni Teater Monolog") {
                  compName = "Monolog";
                }
                return {
                  ...comp,
                  name: compName,
                  posterUrl: comp.posterUrl || DEFAULT_IMAGE,
                };
              })
            );
          }
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
              src={judgeInfo.avatarUrl || DEFAULT_IMAGE}
              alt={judgeInfo.fullName}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith(DEFAULT_IMAGE)) {
                  target.src = DEFAULT_IMAGE;
                }
              }}
              className="h-16 w-16 rounded-full object-cover border-2 border-accent bg-accent/10 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="gold" className="text-[10px]">
                  DEWAN JURI RESMI
                </Badge>
                <span className="text-xs font-mono text-muted-foreground font-semibold">
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
                  <Card key={comp.id} className="p-5 sm:p-6 space-y-4 border-accent/40 bg-accent/5 flex flex-col justify-between hover:border-accent/70 transition-all">
                    <div className="space-y-4">
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

                      {/* Poster / Thumbnail Lomba & Deskripsi */}
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="w-full sm:w-24 sm:h-24 h-44 rounded-xl overflow-hidden bg-card border border-border shrink-0 relative shadow-xs">
                          <img
                            src={comp.posterUrl || DEFAULT_IMAGE}
                            alt={comp.name}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.endsWith(DEFAULT_IMAGE)) {
                                target.src = DEFAULT_IMAGE;
                              }
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h3 className="font-heading text-xl font-bold text-foreground leading-snug">
                            {comp.name}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {comp.description}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-card border border-border text-xs text-muted-foreground space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span>Lokasi & Panggung:</span>
                          <strong className="text-foreground text-right">
                            {comp.stage ? `${comp.venue} (${comp.stage})` : comp.venue}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Jumlah Kriteria:</span>
                          <strong className="text-foreground text-right">{comp.criteriaCount} Komponen Berbobot 100%</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Status Juri Anda:</span>
                          <strong className="text-accent text-right">
                            {comp.isChiefJudge ? "Juri Utama (Chief Judge)" : "Anggota Dewan Juri"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <Link href={`/juri/lomba/${comp.slug}`} className="block pt-2">
                      <Button className="w-full text-xs gap-1.5 font-semibold cursor-pointer" size="lg">
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
