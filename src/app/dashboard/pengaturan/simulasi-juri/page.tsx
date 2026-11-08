"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSimulationStatus,
  generateSimulationParticipants,
  clearSimulationData,
  SimulationOverview,
  CompetitionSimulationItem,
} from "@/app/actions/simulation";
import {
  ArrowLeft,
  FlaskConical,
  Sparkles,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Trophy,
  Users,
  CheckSquare,
  Building2,
  Info,
  ExternalLink,
} from "lucide-react";

export default function SimulasiJuriPage() {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [overview, setOverview] = React.useState<SimulationOverview | null>(null);
  const [countPerComp, setCountPerComp] = React.useState<number>(3);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Super Admin Access State
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = React.useState<string | null>(null);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    type: "generate_all" | "generate_single" | "clear_all" | "clear_single";
    targetComp?: CompetitionSimulationItem;
  }>({
    isOpen: false,
    type: "generate_all",
  });

  const loadStatus = React.useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await getSimulationStatus();
      if (!res.success) {
        if (res.error?.includes("Akses ditolak") || res.error?.includes("Super Admin")) {
          setIsUnauthorized(true);
          setUnauthorizedMessage(res.error);
          return;
        }
        setFeedback({ type: "error", message: res.error || "Gagal memuat status simulasi." });
        return;
      }
      setIsUnauthorized(false);
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat status simulasi:", err);
      setFeedback({ type: "error", message: "Terjadi kesalahan saat memuat data." });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStatus(true);
  }, [loadStatus]);

  // Handle Generate Confirmation Action
  const handleExecuteGenerate = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const compId =
        confirmDialog.type === "generate_single" ? confirmDialog.targetComp?.id : undefined;
      const res = await generateSimulationParticipants({
        competitionId: compId,
        countPerComp,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            `Berhasil membuat ${res.countGenerated || 0} peserta simulasi untuk sosialisasi juri.`,
        });
        setConfirmDialog({ isOpen: false, type: "generate_all" });
        await loadStatus(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal membuat peserta simulasi.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Clear Confirmation Action
  const handleExecuteClear = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const compId =
        confirmDialog.type === "clear_single" ? confirmDialog.targetComp?.id : undefined;
      const res = await clearSimulationData({ competitionId: compId });

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            `Berhasil mengosongkan data peserta simulasi. Cabang lomba kembali kosong.`,
        });
        setConfirmDialog({ isOpen: false, type: "clear_all" });
        await loadStatus(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengosongkan data simulasi.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Layar Khusus Akses Ditolak (Bukan Super Admin)
  if (isUnauthorized) {
    return (
      <DashboardLayout role="seksi_acara">
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-danger/15 text-danger flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Akses Khusus Super Admin</h1>
            <p className="text-sm text-muted-foreground">
              {unauthorizedMessage ||
                "Halaman Simulasi Sosialisasi Juri hanya dapat diakses oleh akun dengan role Super Admin."}
            </p>
          </div>
          <div className="pt-4 flex justify-center">
            <Link href="/dashboard">
              <Button variant="default" className="gap-2">
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header Breadcrumb & Title */}
        <div>
          <Link
            href="/dashboard/pengaturan"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Pengaturan Acara</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <FlaskConical className="h-7 w-7 text-amber-500" />
                  <span>Simulasi Sosialisasi Juri</span>
                </h1>
                <Badge variant="warning" className="text-[10px] font-mono uppercase">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Isi pendaftaran peserta dummy agar dewan juri dapat mempraktikkan penilaian saat sosialisasi, lalu kembalikan agar lomba kembali kosong setelah selesai.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatus(true)}
              disabled={loading || submitting}
              className="text-xs gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Segarkan Status</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              feedback.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold hover:underline cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> Cabang Lomba Tersedia
            </span>
            <span className="font-mono text-2xl font-bold text-foreground block">
              {overview?.totalCompetitions ?? 9}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              5 Individu & 4 Kelompok
            </span>
          </Card>

          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" /> Peserta Simulasi Aktif
            </span>
            <span className="font-mono text-2xl font-bold text-foreground block">
              {overview?.totalSimulationRegistrations ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Pendaftar terverifikasi berlabel [Simulasi]
            </span>
          </Card>

          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Nilai Juri Masuk
            </span>
            <span className="font-mono text-2xl font-bold text-foreground block">
              {overview?.totalAssessmentsSubmitted ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Lembar nilai uji coba yang telah diisi juri
            </span>
          </Card>

          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-purple-500" /> Asal Sekolah Standar
            </span>
            <span className="font-mono text-xs font-bold text-foreground block truncate">
              SMK DINAMIKA PEMBANGUNAN 2
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Semua peserta simulasi berasal dari DP 2
            </span>
          </Card>
        </div>

        {/* Global Action Panel */}
        <Card className="p-5 border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Kontrol Cepat Sosialisasi Serentak (Semua Lomba)</span>
              </h3>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Isi pendaftaran peserta dummy serentak untuk seluruh cabang lomba agar semua dewan juri memiliki peserta untuk dinilai. Setelah sesi sosialisasi selesai, tekan <strong>Kosongkan Semua</strong> untuk mengembalikan seluruh lomba menjadi bersih kembali (0 pendaftar).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="quota-input" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Jumlah / Lomba:
                </label>
                <Input
                  id="quota-input"
                  type="number"
                  min={1}
                  max={10}
                  value={countPerComp}
                  onChange={(e) => setCountPerComp(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-18 h-9 text-xs font-mono font-bold text-center"
                />
              </div>

              <Button
                variant="accent"
                onClick={() => setConfirmDialog({ isOpen: true, type: "generate_all" })}
                disabled={submitting}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Isi Semua Lomba Sekaligus</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ isOpen: true, type: "clear_all" })}
                disabled={submitting || (overview?.totalSimulationRegistrations ?? 0) === 0}
                className="text-xs font-semibold gap-1.5 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Kosongkan Semua Peserta Simulasi</span>
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <span>
              <strong>Keamanan Terjamin:</strong> Peserta simulasi ditandai dengan kode unik <code className="font-mono text-accent">SIM-JURI-xxx</code> dan catatan <code className="font-mono text-accent">[SIMULASI_JURI]</code>. Pembersihan data hanya menghapus akun dan nilai simulasi, tanpa memengaruhi akun Admin, Panitia, Juri, maupun peserta resmi.
            </span>
          </div>
        </Card>

        {/* Tabel Cabang Lomba & Kontrol Independen */}
        <Card className="border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading text-base font-bold text-foreground">
                Status Per Cabang Lomba (9 Lomba)
              </h2>
              <p className="text-xs text-muted-foreground">
                Anda juga dapat mengisi atau mengosongkan peserta simulasi untuk cabang lomba tertentu saja.
              </p>
            </div>
            <Link
              href="/juri"
              target="_blank"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Pratinjau Layar Juri</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Cabang Lomba</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead className="text-center">Juri Aktif</TableHead>
                  <TableHead className="text-center">Peserta Simulasi</TableHead>
                  <TableHead className="text-center">Nilai Masuk</TableHead>
                  <TableHead className="text-right pr-4">Aksi Per Lomba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto mb-2" />
                      <p className="text-xs">Memuat daftar cabang lomba...</p>
                    </TableCell>
                  </TableRow>
                ) : !overview?.competitions || overview.competitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                      Tidak ada cabang lomba yang terdaftar di database.
                    </TableCell>
                  </TableRow>
                ) : (
                  overview.competitions.map((comp, idx) => (
                    <TableRow key={comp.id} className="hover:bg-muted/20">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{comp.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">/{comp.slug}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={comp.type === "kelompok" ? "gold" : "default"}
                          className="text-[10px]"
                        >
                          {comp.type === "kelompok"
                            ? `Regu (${comp.minTeamMembers} org)`
                            : "Individu"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        <Badge variant="default" className="text-[10px] border border-border">
                          {comp.totalJudges} Juri
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={comp.simulationCount > 0 ? "success" : "default"}
                          className="text-xs font-mono"
                        >
                          {comp.simulationCount} Peserta
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={comp.assessedCount > 0 ? "warning" : "default"}
                          className="text-xs font-mono"
                        >
                          {comp.assessedCount} Dinilai
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                type: "generate_single",
                                targetComp: comp,
                              })
                            }
                            disabled={submitting}
                            className="text-[11px] h-7 gap-1 border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
                            title={`Isi ${countPerComp} peserta simulasi untuk lomba ${comp.name}`}
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Isi ({countPerComp})</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                type: "clear_single",
                                targetComp: comp,
                              })
                            }
                            disabled={submitting || comp.simulationCount === 0}
                            className="text-[11px] h-7 gap-1 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer"
                            title={`Kosongkan peserta simulasi untuk lomba ${comp.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Kosongkan</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Modal Konfirmasi Dialog */}
        <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => !submitting && setConfirmDialog((prev) => ({ ...prev, isOpen: open }))}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {confirmDialog.type.startsWith("clear") ? (
                  <div className="p-2 rounded-full bg-danger/15 text-danger">
                    <Trash2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-amber-500/15 text-amber-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}
                <DialogTitle>
                  {confirmDialog.type === "generate_all" && "Konfirmasi Buat Peserta Simulasi (Semua Lomba)"}
                  {confirmDialog.type === "generate_single" && `Konfirmasi Buat Peserta: ${confirmDialog.targetComp?.name}`}
                  {confirmDialog.type === "clear_all" && "Konfirmasi Kosongkan Semua Peserta Simulasi"}
                  {confirmDialog.type === "clear_single" && `Konfirmasi Kosongkan: ${confirmDialog.targetComp?.name}`}
                </DialogTitle>
              </div>
              <DialogDescription>
                {confirmDialog.type === "generate_all" && (
                  <span>
                    Sistem akan membuat <strong>{countPerComp} peserta simulasi</strong> untuk masing-masing <strong>{overview?.totalCompetitions || 9} cabang lomba</strong> (Total: {(overview?.totalCompetitions || 9) * countPerComp} peserta) dari <strong>SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong>. Semua peserta berstatus terverifikasi dan siap dinilai oleh dewan juri.
                  </span>
                )}
                {confirmDialog.type === "generate_single" && (
                  <span>
                    Sistem akan membuat <strong>{countPerComp} peserta simulasi</strong> khusus untuk cabang lomba <strong>{confirmDialog.targetComp?.name}</strong> dari <strong>SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong>.
                  </span>
                )}
                {confirmDialog.type === "clear_all" && (
                  <span className="text-danger font-medium block">
                    Apakah Anda yakin ingin mengosongkan seluruh peserta simulasi dan menghapus nilai latihan yang sempat diinput oleh juri? Seluruh cabang lomba akan kembali ke kondisi 0 peserta seperti semula.
                  </span>
                )}
                {confirmDialog.type === "clear_single" && (
                  <span className="text-danger font-medium block">
                    Apakah Anda yakin ingin mengosongkan peserta simulasi untuk cabang lomba <strong>{confirmDialog.targetComp?.name}</strong>? Data peserta simulasi dan lembar nilai juri lomba ini akan dihapus.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Asal Sekolah:</span>
                <strong className="text-foreground">SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong>
              </div>
              <div className="flex justify-between">
                <span>Cakupan Tindakan:</span>
                <strong className="text-foreground">
                  {confirmDialog.type.includes("all") ? "Semua 9 Cabang Lomba" : confirmDialog.targetComp?.name}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Tipe Aksi:</span>
                <strong className={confirmDialog.type.startsWith("clear") ? "text-danger" : "text-amber-500"}>
                  {confirmDialog.type.startsWith("clear") ? "Pembersihan Data (Kembali Kosong)" : "Generate Peserta Uji Coba"}
                </strong>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="text-xs"
              >
                Batal
              </Button>
              {confirmDialog.type.startsWith("clear") ? (
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={handleExecuteClear}
                  className="text-xs font-semibold gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Membersihkan...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Ya, Kosongkan Sekarang</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="accent"
                  disabled={submitting}
                  onClick={handleExecuteGenerate}
                  className="text-xs font-semibold gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Ya, Buat Peserta Sekarang</span>
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
