"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Loader2,
  Users,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useRealtimeScoringRecap } from "@/hooks/useRealtimeScoringRecap";
import { toggleCompetitionFinalize } from "@/app/actions/assessments";
import { cn } from "@/lib/utils";

export default function DashboardPenilaianDetailPage() {
  const params = useParams();
  const rawCompId = (params?.competitionId as string) || "";

  const {
    loading,
    isRefreshing,
    competition: comp,
    judges,
    recaps,
    realtimeStatus,
    lastUpdatedAt,
    refresh,
  } = useRealtimeScoringRecap(rawCompId);

  // Status finalisasi diambil secara persisten dari database (status: 'selesai')
  const isFinalized = comp?.status === "selesai";

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [confirmDialog, setConfirmDialog] = React.useState<"finalize" | "unlock" | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleToggleFinalize = async () => {
    if (!comp) return;
    const willFinalize = confirmDialog === "finalize";
    setIsUpdatingStatus(true);
    setFeedback(null);
    try {
      const res = await toggleCompetitionFinalize(rawCompId, willFinalize);
      if (res.success) {
        setFeedback({
          type: "success",
          message: willFinalize
            ? "Nilai lomba berhasil difinalisasi! Seluruh formulir penilaian juri kini terkunci."
            : "Kunci nilai berhasil dibuka. Dewan juri dapat melakukan penyesuaian nilai kembali.",
        });
        await refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal memperbarui status finalisasi nilai.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan sistem saat memperbarui status finalisasi.",
      });
    } finally {
      setIsUpdatingStatus(false);
      setConfirmDialog(null);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/penilaian"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Rekap Nilai</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge
                  variant={
                    comp?.status === "berlangsung"
                      ? "live"
                      : comp?.status === "selesai"
                      ? "success"
                      : comp?.status === "pendaftaran"
                      ? "warning"
                      : "default"
                  }
                  className="text-xs"
                >
                  {comp?.status === "pendaftaran"
                    ? "TAHAP PENDAFTARAN"
                    : comp?.status === "berlangsung"
                    ? "SEDANG BERLANGSUNG"
                    : comp?.status === "selesai"
                    ? "LOMBA SELESAI"
                    : (comp?.status || "MEMUAT...").toUpperCase()}
                </Badge>
                {isFinalized && (
                  <Badge variant="success" className="text-xs flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>NILAI SUDAH DIFINALISASI</span>
                  </Badge>
                )}
                <span className="text-xs font-mono text-muted-foreground uppercase">
                  Agregasi: {comp?.aggregation ? comp.aggregation.replace(/_/g, " ") : "Rata-Rata"}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Rekapitulasi Nilai: {comp?.name || "Memuat..."}
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Indikator Status Realtime */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground shadow-xs"
                title={
                  !isMounted
                    ? "Menghubungkan ke layanan realtime..."
                    : realtimeStatus === "connected"
                    ? "Tersambung ke Supabase Realtime"
                    : realtimeStatus === "polling"
                    ? "Menggunakan sinkronisasi otomatis (polling interval 8 detik)"
                    : "Menghubungkan ke layanan realtime..."
                }
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    !isMounted
                      ? "bg-muted-foreground"
                      : realtimeStatus === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : realtimeStatus === "polling"
                      ? "bg-amber-500"
                      : "bg-muted-foreground"
                  )}
                />
                <span className="font-mono text-[11px] font-medium">
                  {!isMounted
                    ? "Menyambungkan..."
                    : realtimeStatus === "connected"
                    ? "Live Realtime"
                    : realtimeStatus === "polling"
                    ? "Auto-sync (8s)"
                    : "Menyambungkan..."}
                </span>
                {isMounted && lastUpdatedAt && (
                  <span className="text-[10px] text-muted-foreground/75 hidden md:inline ml-1">
                    ({lastUpdatedAt.toLocaleTimeString("id-ID")})
                  </span>
                )}
              </div>

              {/* Tombol Segarkan Manual */}
              <Button
                size="sm"
                variant="outline"
                onClick={refresh}
                disabled={isMounted ? (isRefreshing || loading) : false}
                className="text-xs gap-1.5 cursor-pointer"
                title="Segarkan data rekap penilaian"
                suppressHydrationWarning
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isMounted && isRefreshing && "animate-spin text-accent")}
                />
                <span className="hidden sm:inline">Segarkan</span>
              </Button>

              {/* Tombol Finalisasi / Buka Kunci Nilai */}
              <Button
                size="sm"
                variant={isFinalized ? "secondary" : "default"}
                onClick={() => setConfirmDialog(isFinalized ? "unlock" : "finalize")}
                disabled={isMounted ? (isUpdatingStatus || loading) : false}
                className="text-xs gap-1.5 cursor-pointer"
                suppressHydrationWarning
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                <span>{isFinalized ? "Buka Kunci Nilai" : "Finalisasi Nilai Lomba"}</span>
              </Button>

              <Link href="/dashboard/pemenang">
                <Button size="sm" variant="accent" className="text-xs gap-1.5">
                  <Award className="h-4 w-4" />
                  <span>Ke Penetapan Juara</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Notifikasi Feedback Sukses / Gagal */}
        {feedback && (
          <div
            className={cn(
              "p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200",
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
            )}
          >
            <span>{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold ml-4 hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Kriteria Info Strip */}
        {comp && (comp.criteria || []).length > 0 && (
          <div className="p-4 rounded-xl border border-border bg-card flex flex-wrap items-center justify-between text-xs gap-3">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Komposisi Bobot ({comp.criteria.length} kriteria):</span>
              {comp.criteria.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                  {c.name}: {c.weight}%
                </span>
              ))}
            </div>
            <span className="font-mono text-accent font-bold">Total: 100%</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat rekapitulasi penilaian...</p>
          </div>
        ) : recaps.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Peserta & Instansi</TableHead>
                    {judges.map((j) => (
                      <TableHead key={j.id} className="text-center min-w-28">
                        <span className="block font-bold">
                          {j.fullName.split(",")[0].split(" ")[0]}
                        </span>
                        <span className="block text-[10px] font-mono text-muted-foreground">
                          {j.isChiefJudge ? "★ Juri Utama" : "Dewan Juri"}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Selisih Skor</TableHead>
                    <TableHead className="text-right">Skor Akhir (Agregat)</TableHead>
                    <TableHead className="text-center">Status Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recaps.map((item) => {
                    return (
                      <TableRow key={item.registrationId}>
                        <TableCell className="text-center font-mono font-bold text-xs">
                          #{item.rank}
                        </TableCell>
                        <TableCell>
                          <strong className="text-foreground text-xs sm:text-sm block">
                            {item.participantName}
                          </strong>
                          <span className="text-[11px] text-muted-foreground">{item.institution}</span>
                        </TableCell>
                        {judges.map((j) => {
                          const jScore = item.scoresPerJudge.find((s) => s.judgeId === j.id);
                          return (
                            <TableCell key={j.id} className="text-center font-mono text-xs">
                              {jScore !== undefined ? (
                                <span className="font-semibold text-foreground">
                                  {jScore.weightedTotal.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Belum Dinilai</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-mono text-xs">
                          {item.scoresPerJudge.length >= 2 ? `${item.scoreGap.toFixed(2)} Pts` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                          {item.finalScore > 0 ? item.finalScore.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status === "audit" ? (
                            <Badge variant="danger" className="text-[10px]">
                              PERLU PENINJAUAN
                            </Badge>
                          ) : item.status === "selesai" ? (
                            <Badge variant="success" className="text-[10px]">
                              VALID
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">
                              MENUNGGU JURI
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {recaps.map((item) => (
                <div key={item.registrationId} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-6 px-2 rounded bg-accent/15 text-accent font-mono text-xs font-bold">
                        #{item.rank}
                      </span>
                      {item.status === "audit" ? (
                        <Badge variant="danger" className="text-[10px]">
                          PERLU PENINJAUAN
                        </Badge>
                      ) : item.status === "selesai" ? (
                        <Badge variant="success" className="text-[10px]">
                          VALID
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px]">
                          MENUNGGU JURI
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-mono">Skor Agregat</span>
                      <span className="font-mono font-bold text-accent text-sm sm:text-base">
                        {item.finalScore > 0 ? item.finalScore.toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {item.participantName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.institution}</p>
                  </div>

                  {/* Rincian Skor per Juri & Selisih */}
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase font-mono">
                      <span>Rincian Juri:</span>
                      {item.scoresPerJudge.length >= 2 && (
                        <span>Gap: {item.scoreGap.toFixed(2)} Pts</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {judges.map((j) => {
                        const jScore = item.scoresPerJudge.find((s) => s.judgeId === j.id);
                        return (
                          <div key={j.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground truncate">
                              {j.fullName.split(",")[0].split(" ")[0]}:
                            </span>
                            <span className="font-mono font-semibold text-foreground ml-1">
                              {jScore !== undefined ? jScore.weightedTotal.toFixed(2) : "Draft/—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Belum Ada Peserta Terdaftar</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum ada pendaftaran peserta yang tercatat untuk cabang lomba ini.
            </p>
          </div>
        )}
      </div>

      {/* Modal Dialog Konfirmasi Finalisasi / Buka Kunci */}
      <Dialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open && !isUpdatingStatus) setConfirmDialog(null);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck
              className={cn(
                "h-5 w-5",
                confirmDialog === "finalize" ? "text-accent" : "text-amber-500"
              )}
            />
            <span>
              {confirmDialog === "finalize"
                ? "Finalisasi & Kunci Nilai Lomba"
                : "Buka Kunci Nilai Lomba"}
            </span>
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-2 text-foreground/80">
            {confirmDialog === "finalize" ? (
              <>
                <p>
                  Apakah Anda yakin ingin memfinalisasi perolehan skor untuk cabang lomba{" "}
                  <strong>{comp?.name || "ini"}</strong>?
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">⚠️ Dampak Finalisasi:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Nilai seluruh peserta akan dikunci secara resmi.</li>
                    <li>Dewan juri tidak dapat mengubah atau menginput nilai lagi.</li>
                    <li>Status lomba beralih ke <strong>SELESAI</strong> dan siap untuk penetapan juara.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p>
                  Apakah Anda yakin ingin membuka kembali kunci penilaian untuk cabang lomba{" "}
                  <strong>{comp?.name || "ini"}</strong>?
                </p>
                <div className="p-3 rounded-lg bg-muted border border-border text-xs text-muted-foreground">
                  ℹ️ <strong>Catatan:</strong> Dewan juri akan dapat melakukan penyesuaian atau input ulang nilai pada formulir penilaian.
                </div>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog(null)}
            disabled={isUpdatingStatus}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={confirmDialog === "finalize" ? "accent" : "default"}
            size="sm"
            onClick={handleToggleFinalize}
            disabled={isUpdatingStatus}
            className="gap-1.5"
          >
            {isUpdatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>
              {confirmDialog === "finalize" ? "Ya, Kunci & Finalisasi" : "Ya, Buka Kunci"}
            </span>
          </Button>
        </DialogFooter>
      </Dialog>
    </DashboardLayout>
  );
}
