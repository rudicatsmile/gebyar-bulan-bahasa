"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
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
import {
  useRealtimeMonitoring,
  RealtimeStatus,
} from "@/hooks/useRealtimeMonitoring";
import {
  ArrowLeft,
  UserCheck,
  Trophy,
  Loader2,
  Users,
  Radio,
  RefreshCw,
  Wifi,
  WifiOff,
  RotateCw,
} from "lucide-react";

function RealtimeIndicator({
  status,
  lastUpdatedAt,
  onRefresh,
}: {
  status: RealtimeStatus;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
}) {
  const [timeAgo, setTimeAgo] = React.useState("");

  React.useEffect(() => {
    if (!lastUpdatedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000);
      if (diff < 5) setTimeAgo("baru saja");
      else if (diff < 60) setTimeAgo(`${diff} detik lalu`);
      else setTimeAgo(`${Math.floor(diff / 60)} menit lalu`);
    };
    update();
    const iv = setInterval(update, 5000);
    return () => clearInterval(iv);
  }, [lastUpdatedAt]);

  const statusConfig = {
    connected: {
      label: "Realtime Aktif",
      icon: <Wifi className="h-3 w-3" />,
      badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      dotClass: "bg-emerald-500 animate-pulse",
    },
    polling: {
      label: "Auto-Refresh",
      icon: <RotateCw className="h-3 w-3 animate-spin" style={{ animationDuration: "3s" }} />,
      badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      dotClass: "bg-amber-500",
    },
    connecting: {
      label: "Menghubungkan...",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      badgeClass: "bg-sky-500/15 text-sky-600 border-sky-500/30",
      dotClass: "bg-sky-500 animate-pulse",
    },
    disconnected: {
      label: "Terputus",
      icon: <WifiOff className="h-3 w-3" />,
      badgeClass: "bg-red-500/15 text-red-600 border-red-500/30",
      dotClass: "bg-red-500",
    },
  };

  const cfg = statusConfig[status];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${cfg.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
        {cfg.icon}
        <span>{cfg.label}</span>
      </div>

      {/* Timestamp */}
      {lastUpdatedAt && (
        <span className="text-[10px] text-muted-foreground font-mono">
          Update: {timeAgo}
        </span>
      )}

      {/* Manual refresh */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        title="Refresh manual"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function DashboardLombaDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const {
    loading,
    competition,
    judges,
    participants,
    scores,
    realtimeStatus,
    lastUpdatedAt,
    refresh,
  } = useRealtimeMonitoring(slug);

  if (!loading && !competition) {
    return notFound();
  }

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8">
        <div>
          <Link
            href="/dashboard/lomba"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Monitoring Lomba</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant={
                    competition?.status === "berlangsung"
                      ? "live"
                      : competition?.status === "selesai"
                      ? "success"
                      : competition?.status === "pendaftaran"
                      ? "warning"
                      : "default"
                  }
                  className="text-[10px]"
                >
                  {competition?.status === "pendaftaran"
                    ? "TAHAP PENDAFTARAN"
                    : competition?.status === "berlangsung"
                    ? "SEDANG BERLANGSUNG"
                    : (competition?.status || "PENDAFTARAN").toUpperCase()}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  {competition?.category || "Perlombaan"}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Monitoring: {competition?.name || "Memuat Lomba..."}
              </h1>
            </div>

            <div className="flex flex-col items-end gap-2">
              <RealtimeIndicator
                status={realtimeStatus}
                lastUpdatedAt={lastUpdatedAt}
                onRefresh={refresh}
              />
              <Link href={`/dashboard/penilaian/${competition?.id || slug}`}>
                <Button size="sm" className="text-xs">
                  Rekapitulasi Nilai &amp; Agregasi →
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Progress Pengiriman Nilai Tiap Juri */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              <span>
                Progress Pengiriman Nilai Dewan Juri ({judges.length} Juri Ditugaskan)
              </span>
            </h2>
            {loading && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Menyinkronkan data database...</span>
              </span>
            )}
          </div>

          {judges.length === 0 && !loading ? (
            <Card className="p-6 text-center text-xs text-muted-foreground">
              Belum ada dewan juri yang ditugaskan ke cabang lomba ini di database. Silakan atur di{" "}
              <Link href="/dashboard/juri/penugasan" className="text-accent underline">
                Matriks Penugasan Juri
              </Link>
              .
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {judges.map((j) => {
                // Hitung jumlah nilai peserta yang sudah dikirim oleh juri ini
                const gradedCount = participants.filter((p) => {
                  return scores[p.id] && scores[p.id][j.id] !== undefined;
                }).length;

                const totalToGrade = participants.length;
                const percentage =
                  totalToGrade > 0 ? Math.round((gradedCount / totalToGrade) * 100) : 0;

                return (
                  <Card key={j.id} className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-accent font-bold">
                          {j.isChiefJudge ? "★ Juri Utama (Chief Judge)" : "Anggota Dewan Juri"}
                        </span>
                        <h4 className="font-heading text-sm font-bold text-foreground">
                          {j.fullName}
                        </h4>
                        <p className="text-xs text-muted-foreground">{j.expertise}</p>
                      </div>
                      <Badge
                        variant={percentage === 100 && totalToGrade > 0 ? "success" : "warning"}
                        className="text-xs font-mono"
                      >
                        {gradedCount} / {totalToGrade} Peserta
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Kelengkapan Penilaian:</span>
                        <strong className="text-foreground font-mono">{percentage}%</strong>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Breakdown Peserta & Nilai Agregat */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" />
              <span>Daftar Peserta &amp; Status Penilaian</span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">
                Total: {participants.length} Peserta Terdaftar
              </span>
              {realtimeStatus === "connected" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                  <Radio className="h-3 w-3 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
          </div>

          {participants.length === 0 ? (
            <Card className="p-8 text-center space-y-2 border-dashed border-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground">
                Belum Ada Peserta Terdaftar
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Belum ada pendaftaran peserta yang tercatat di database untuk cabang lomba ini.
              </p>
            </Card>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">No. Registrasi</TableHead>
                    <TableHead>Nama Peserta / Tim</TableHead>
                    <TableHead>Sekolah / Kampus</TableHead>
                    {judges.map((j) => (
                      <TableHead key={j.id} className="text-center min-w-32">
                        <span className="block font-bold">
                          {j.fullName.split(",")[0].split(" ")[0]}
                        </span>
                        <span className="block text-[10px] font-mono text-muted-foreground">
                          {j.isChiefJudge ? "★ Juri Utama" : "Dewan Juri"}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Rata-Rata Sementara</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((p) => {
                    const judgeScores: number[] = [];

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs font-bold text-accent">
                          {p.registrationNumber}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                          {p.fullName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.institution}
                        </TableCell>

                        {judges.map((j) => {
                          const score = scores[p.id]?.[j.id] ?? null;
                          if (score !== null && !isNaN(score)) {
                            judgeScores.push(score);
                          }

                          return (
                            <TableCell key={j.id} className="text-center font-mono text-xs">
                              {score !== null ? (
                                <span className="font-semibold text-foreground transition-all duration-300">
                                  {score.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Draft / Belum</span>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                          {judgeScores.length > 0
                            ? (judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length).toFixed(
                                2
                              )
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
