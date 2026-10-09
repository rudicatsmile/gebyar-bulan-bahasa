"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getJudgeCompetitionRoster,
  JudgeRosterParticipant,
} from "@/app/actions/assessments";
import {
  ArrowLeft,
  Edit3,
  Loader2,
  MapPin,
  User,
  UserCheck,
  Layers,
  Trophy,
  Clock,
  Gavel,
  ShieldAlert,
  Info,
} from "lucide-react";

export default function JuriLombaPesertaPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = React.useState(true);
  const [notFoundState, setNotFoundState] = React.useState(false);
  const [competition, setCompetition] = React.useState<{
    id: string;
    name: string;
    slug: string;
    category: string;
    stageName?: string | null;
    status: string;
    rules?: string | null;
    roundType?: "single_round" | "multi_stage";
    activeStage?: {
      id: string;
      stageOrder: number;
      title: string;
      status: string;
      requiresJudge: boolean;
    } | null;
  } | null>(null);
  const [participants, setParticipants] = React.useState<JudgeRosterParticipant[]>([]);
  const [judgeName, setJudgeName] = React.useState<string>("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await getJudgeCompetitionRoster(slug);
      if (!res.success || !res.competition) {
        setNotFoundState(true);
      } else {
        setCompetition(res.competition);
        setParticipants(res.participants);
        setNotice(res.notice || null);
        if (res.judge?.name) {
          setJudgeName(res.judge.name);
        }
      }
    } catch {
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (notFoundState) {
    return notFound();
  }

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6">
        <div>
          <Link
            href="/juri"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Lomba Saya</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="gold" className="text-[10px]">
                  ROSTER PESERTA RESMI
                </Badge>
                {competition?.roundType === "multi_stage" ? (
                  <Badge variant="default" className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold gap-1">
                    <Layers className="h-3 w-3" />
                    <span>MULTI STAGE</span>
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground border-border gap-1">
                    <Trophy className="h-3 w-3" />
                    <span>SINGLE ROUND</span>
                  </Badge>
                )}
                {competition && (
                  <>
                    <span className="text-xs font-mono text-muted-foreground uppercase">
                      {competition.category}
                    </span>
                    {competition.stageName && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                        <MapPin className="h-3 w-3" />
                        {competition.stageName}
                      </span>
                    )}
                  </>
                )}
                {competition?.activeStage && (
                  <Badge
                    variant="live"
                    className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  >
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>TAHAP {competition.activeStage.stageOrder}: {competition.activeStage.title}</span>
                  </Badge>
                )}
                {competition?.activeStage && (
                  competition.activeStage.requiresJudge ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                      ✓ PERLU JURI
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground border-border">
                      TIDAK PERLU JURI
                    </Badge>
                  )
                )}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Penilaian: {competition?.name || (loading ? "Memuat Lomba..." : "Cabang Lomba")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {competition?.roundType === "multi_stage"
                  ? "Menilai peserta yang aktif pada tahapan seleksi yang memerlukan dewan juri."
                  : "Pilih peserta di bawah untuk membuka lembar penilaian digital per kriteria."}
              </p>
            </div>

            {judgeName && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/80 text-xs text-muted-foreground shrink-0 self-start sm:self-auto">
                <UserCheck className="h-4 w-4 text-accent" />
                <span>
                  Juri Penilai: <strong className="text-foreground">{judgeName}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* BANNER TAHAP AKTIF TIDAK MEMERLUKAN JURI */}
        {/* ============================================================= */}
        {competition?.roundType === "multi_stage" &&
          competition.activeStage &&
          !competition.activeStage.requiresJudge && (
            <div className="p-5 sm:p-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 space-y-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="text-[10px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40">
                    Tahap {competition.activeStage.stageOrder} Sedang Berlangsung
                  </Badge>
                  <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground border-border">
                    Administrasi / Hanya Panitia
                  </Badge>
                </div>
                <h2 className="font-heading text-base sm:text-lg font-bold text-foreground">
                  Tahap {competition.activeStage.stageOrder}: {competition.activeStage.title} Tidak Memerlukan Penilaian Juri
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {notice ||
                    "Tahap seleksi yang sedang aktif saat ini adalah tahap administrasi dan verifikasi berkas oleh panitia. Dewan juri akan aktif melakukan penilaian pada tahapan seleksi berikutnya yang memerlukan dewan juri."}
                </p>
              </div>
            </div>
          )}

        {/* ============================================================= */}
        {/* BANNER TAHAP AKTIF MEMERLUKAN JURI */}
        {/* ============================================================= */}
        {competition?.roundType === "multi_stage" &&
          competition.activeStage?.requiresJudge && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  Tahap Penilaian Aktif: <strong>Tahap {competition.activeStage.stageOrder} - {competition.activeStage.title}</strong>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Menampilkan peserta yang masuk tahap ini (peserta gugur / belum masuk tahap ini otomatis difilter).
              </span>
            </div>
          )}

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Sekolah / Instansi</TableHead>
                {competition?.roundType === "multi_stage" && (
                  <TableHead className="text-center">Status Tahap Ini</TableHead>
                )}
                <TableHead className="text-center">Status Penilaian Anda</TableHead>
                <TableHead className="text-right">Aksi Form Penilaian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={competition?.roundType === "multi_stage" ? 6 : 5}
                    className="py-12 text-center text-xs text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span>Memuat daftar peserta resmi dari database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={competition?.roundType === "multi_stage" ? 6 : 5}
                    className="py-12 text-center text-xs text-muted-foreground"
                  >
                    {notice
                      ? notice
                      : "Belum ada peserta yang aktif pada tahap ini atau memenuhi syarat penilaian."}
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((p) => {
                  const isSent = p.status === "terkirim" || p.status === "final";
                  const isDraft = p.status === "draft";

                  return (
                    <TableRow key={p.registrationId}>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {p.registrationNumber}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {p.teamName || p.fullName}
                        </strong>
                        {p.members && p.members.length > 0 ? (
                          <div className="flex flex-wrap gap-1 pt-1 max-w-sm">
                            {p.members.map((m, mIdx) => (
                              <span
                                key={m.id || mIdx}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.isLeader || m.role?.toLowerCase() === "ketua"
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                                    : "bg-muted/70 text-foreground border-border/60"
                                  }`}
                              >
                                <User className="h-2.5 w-2.5 opacity-70" />
                                <span>{m.name}</span>
                                {m.role && (
                                  <span className="text-[8px] opacity-80">
                                    ({m.role})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          p.teamName && (
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              {p.fullName}
                            </span>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.institution}
                      </TableCell>
                      {competition?.roundType === "multi_stage" && (
                        <TableCell className="text-center">
                          {p.stageStatus === "menunggu" ? (
                            <Badge variant="warning" className="text-[10px]">
                              ⏳ Menunggu Penilaian
                            </Badge>
                          ) : p.stageStatus === "terdaftar" ? (
                            <Badge variant="info" className="text-[10px]">
                              📝 Terdaftar
                            </Badge>
                          ) : p.stageStatus === "lolos" ? (
                            <Badge variant="success" className="text-[10px]">
                              ✓ Lolos ke Tahap Berikutnya
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground">
                              {p.stageStatusLabel || "Aktif"}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        {isSent ? (
                          <Badge variant="success" className="text-[10px]">
                            ✓ TERKIRIM {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="warning" className="text-[10px]">
                            DRAFT DISIMPAN {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            BELUM DINILAI
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={
                            competition?.roundType === "multi_stage" &&
                            (p.activeStageId || competition?.activeStage?.id)
                              ? `/juri/penilaian/${p.registrationId}?stageId=${
                                  p.activeStageId || competition?.activeStage?.id
                                }`
                              : `/juri/penilaian/${p.registrationId}`
                          }
                        >
                          <Button
                            size="sm"
                            variant={isSent ? "outline" : "default"}
                            className="text-xs h-8 gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>
                              {isSent
                                ? "Lihat / Ubah Nilai"
                                : isDraft
                                  ? `Lanjutkan Menilai${
                                      competition?.roundType === "multi_stage" &&
                                      competition?.activeStage
                                        ? ` (Tahap ${competition.activeStage.stageOrder})`
                                        : ""
                                    }`
                                  : `Buka Form Nilai${
                                      competition?.roundType === "multi_stage" &&
                                      competition?.activeStage
                                        ? ` (Tahap ${competition.activeStage.stageOrder})`
                                        : ""
                                    }`}
                            </span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>Memuat daftar peserta...</span>
              </div>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              {notice
                ? notice
                : "Belum ada peserta yang aktif pada tahap ini atau memenuhi syarat penilaian."}
            </div>
          ) : (
            participants.map((p) => {
              const isSent = p.status === "terkirim" || p.status === "final";
              const isDraft = p.status === "draft";

              return (
                <div key={p.registrationId} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-accent">
                      {p.registrationNumber}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {competition?.roundType === "multi_stage" && (
                        p.stageStatus === "menunggu" ? (
                          <Badge variant="warning" className="text-[10px]">
                            Menunggu Penilaian
                          </Badge>
                        ) : p.stageStatus === "terdaftar" ? (
                          <Badge variant="info" className="text-[10px]">
                            Terdaftar
                          </Badge>
                        ) : p.stageStatus === "lolos" ? (
                          <Badge variant="success" className="text-[10px]">
                            Lolos
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] bg-muted/40 text-muted-foreground">
                            {p.stageStatusLabel}
                          </Badge>
                        )
                      )}
                      {isSent ? (
                        <Badge variant="success" className="text-[10px]">
                          ✓ TERKIRIM {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                        </Badge>
                      ) : isDraft ? (
                        <Badge variant="warning" className="text-[10px]">
                          DRAFT {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">
                          BELUM DINILAI
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {p.teamName || p.fullName}
                    </h3>
                    {p.members && p.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.members.map((m, mIdx) => (
                          <span
                            key={m.id || mIdx}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${m.isLeader || m.role?.toLowerCase() === "ketua"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                                : "bg-muted/70 text-foreground border-border/60"
                              }`}
                          >
                            <User className="h-2.5 w-2.5 opacity-70" />
                            <span>{m.name}</span>
                            {m.role && (
                              <span className="text-[8px] opacity-80">
                                ({m.role})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      p.teamName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.fullName}</p>
                      )
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{p.institution}</p>
                  </div>

                  <Link
                    href={
                      competition?.roundType === "multi_stage" &&
                      (p.activeStageId || competition?.activeStage?.id)
                        ? `/juri/penilaian/${p.registrationId}?stageId=${
                            p.activeStageId || competition?.activeStage?.id
                          }`
                        : `/juri/penilaian/${p.registrationId}`
                    }
                    className="block"
                  >
                    <Button
                      size="sm"
                      variant={isSent ? "outline" : "default"}
                      className="w-full text-xs h-10 gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>
                        {isSent
                          ? "Lihat / Ubah Nilai"
                          : isDraft
                            ? `Lanjutkan Menilai${
                                competition?.roundType === "multi_stage" &&
                                competition?.activeStage
                                  ? ` (Tahap ${competition.activeStage.stageOrder})`
                                  : ""
                              }`
                            : `Buka Form Nilai${
                                competition?.roundType === "multi_stage" &&
                                competition?.activeStage
                                  ? ` (Tahap ${competition.activeStage.stageOrder})`
                                  : ""
                              }`}
                      </span>
                    </Button>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
