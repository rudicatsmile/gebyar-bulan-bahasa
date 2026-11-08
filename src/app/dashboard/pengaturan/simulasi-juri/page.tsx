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
  generateSimulationJudgeScores,
  clearSimulationWinners,
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
  Award,
  Calculator,
  Lock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulasiJuriDanPanitiaPage() {
  const [activeTab, setActiveTab] = React.useState<"juri" | "panitia">("panitia");
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
    type:
      | "generate_all"
      | "generate_single"
      | "generate_scores_all"
      | "generate_scores_single"
      | "clear_winners_all"
      | "clear_winners_single"
      | "clear_all"
      | "clear_single";
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

  // Handle Generate Participants Action
  const handleExecuteGenerateParticipants = async () => {
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

  // Handle Generate Judge Scores Action (Untuk Panitia)
  const handleExecuteGenerateScores = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const compId =
        confirmDialog.type === "generate_scores_single" ? confirmDialog.targetComp?.id : undefined;
      const res = await generateSimulationJudgeScores({
        competitionId: compId,
        onlyIfEmpty: true, // Pertahankan nilai asli yang sudah diisi oleh juri saat sosialisasi juri!
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            `Berhasil melengkapi penilaian juri. Data siap direkap dan ditetapkan pemenangnya oleh panitia.`,
        });
        setConfirmDialog({ isOpen: false, type: "generate_scores_all" });
        await loadStatus(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghasilkan nilai juri otomatis.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Clear Winners Only (Kembalikan Penetapan Juara Kosong untuk Latihan Ulang)
  const handleExecuteClearWinners = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const compId =
        confirmDialog.type === "clear_winners_single" ? confirmDialog.targetComp?.id : undefined;
      const res = await clearSimulationWinners({ competitionId: compId });

      if (res.success) {
        setFeedback({
          type: "success",
          message:
            res.message ||
            `Berhasil mengosongkan penetapan pemenang. Panitia dapat mengulang latihan penetapan juara.`,
        });
        setConfirmDialog({ isOpen: false, type: "clear_winners_all" });
        await loadStatus(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengosongkan pemenang.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Clear All Action (Reset Bersih Total)
  const handleExecuteClearAll = async () => {
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
            `Berhasil mengosongkan seluruh data simulasi. Cabang lomba kembali kosong bersih (0 pendaftar).`,
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
                "Halaman Simulasi Sosialisasi Juri & Panitia hanya dapat diakses oleh akun dengan role Super Admin."}
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
                  <span>Simulasi Sosialisasi Juri & Panitia</span>
                </h1>
                <Badge variant="warning" className="text-[10px] font-mono uppercase font-bold">
                  Super Admin
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Kelola data simulasi berkesinambungan untuk gladi resik penilaian juri, rekapitulasi nilai panitia, dan penetapan juara resmi.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadStatus(true)}
              disabled={loading || submitting}
              className="text-xs gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer font-semibold"
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

        {/* Metrics Overview Grid */}
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
              <Users className="h-3.5 w-3.5 text-blue-500" /> Peserta Simulasi DP 2
            </span>
            <span className="font-mono text-2xl font-bold text-foreground block">
              {overview?.totalSimulationRegistrations ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Asal SMK Dinamika Pembangunan 2
            </span>
          </Card>

          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-500" /> Lembar Nilai Juri
            </span>
            <span className="font-mono text-2xl font-bold text-foreground block">
              {overview?.totalAssessmentsSubmitted ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Tersimpan di tabel assessments
            </span>
          </Card>

          <Card className="p-4 border-border space-y-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-purple-500" /> Juara Ditetapkan
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-foreground block">
                {overview?.totalWinnersDeclared ?? 0}
              </span>
              <Badge
                variant={overview?.totalWinnersDeclared ? "gold" : "default"}
                className="text-[10px] font-mono"
              >
                {overview?.totalWinnersDeclared ? "DITETAPKAN" : "KOSONG"}
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Tercatat resmi di tabel winners
            </span>
          </Card>
        </div>

        {/* Tab Switcher: Simulasi Juri vs Simulasi Panitia */}
        <div className="flex border-b border-border space-x-2">
          <button
            onClick={() => setActiveTab("panitia")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm transition-all cursor-pointer",
              activeTab === "panitia"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Calculator className="h-4 w-4" />
            <span>Simulasi Panitia / Seksi Acara (Rekap & Penetapan Juara)</span>
            <Badge variant="gold" className="text-[10px] ml-1">
              Rekomendasi
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("juri")}
            className={cn(
              "flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm transition-all cursor-pointer",
              activeTab === "juri"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <UserCheck className="h-4 w-4" />
            <span>Simulasi Dewan Juri (Penilaian Mandiri)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SIMULASI DEWAN JURI */}
        {/* ========================================================================= */}
        {activeTab === "juri" && (
          <Card className="p-5 border-border space-y-4 animate-in fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-accent" />
                  <span>Sesi Sosialisasi Dewan Juri (Penilaian Mandiri)</span>
                </h3>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  Buat peserta dummy dari <strong>SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong> dengan <strong>lembar nilai dibiarkan kosong</strong>. Para dewan juri akan login ke akun juri masing-masing dan berlatih mengisi formulir penilaian digital secara langsung.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="quota-input-juri" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Jumlah / Lomba:
                  </label>
                  <Input
                    id="quota-input-juri"
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
                  <span>Isi Semua Lomba (Nilai Kosong)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setConfirmDialog({ isOpen: true, type: "clear_all" })}
                  disabled={submitting || (overview?.totalSimulationRegistrations ?? 0) === 0}
                  className="text-xs font-semibold gap-1.5 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Kosongkan Peserta Simulasi</span>
                </Button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-accent shrink-0" />
                <span>
                  Setelah peserta dibuat, dewan juri dapat login dan mengakses penilaian melalui tautan antarmuka juri.
                </span>
              </div>
              <Link
                href="/juri"
                target="_blank"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-semibold shrink-0"
              >
                <span>Buka Layar Juri</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SIMULASI PANITIA & SEKSI ACARA (REKAP & PEMENANG) */}
        {/* ========================================================================= */}
        {activeTab === "panitia" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Action Box Panitia */}
            <Card className="p-5 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Sesi Sosialisasi Panitia: Rekapitulasi Nilai & Penetapan Pemenang
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                    Seksi Acara dan Panitia mempraktikkan proses rekap ranking, finalisasi nilai lomba, serta sidang penetapan dan publikasi juara.
                    Data nilai yang diinput oleh dewan juri otomatis sinkron ke rekap panitia!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    variant="accent"
                    onClick={() => setConfirmDialog({ isOpen: true, type: "generate_scores_all" })}
                    disabled={submitting}
                    className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
                    title="Isi nilai juri otomatis (bervariasi 75-95) sehingga panitia dapat langsung melihat rekap dan menetapkan juara"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Lengkapi / Isi Nilai Juri Otomatis</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setConfirmDialog({ isOpen: true, type: "clear_winners_all" })}
                    disabled={submitting || (overview?.totalWinnersDeclared ?? 0) === 0}
                    className="text-xs font-semibold gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    title="Hapus baris pemenang dan buka kembali kunci finalisasi nilai agar panitia bisa latihan penetapan juara berulang kali"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Kosongkan Penetapan Pemenang Saja</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setConfirmDialog({ isOpen: true, type: "clear_all" })}
                    disabled={submitting || (overview?.totalSimulationRegistrations ?? 0) === 0}
                    className="text-xs font-semibold gap-1.5 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer"
                    title="Hapus seluruh peserta simulasi, nilai juri, dan pemenang kembali ke 0 pendaftar (reset bersih total)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Kosongkan Seluruh Simulasi (Reset Total)</span>
                  </Button>
                </div>
              </div>

              {/* 4-Step Interactive Guide Box */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-border/60">
                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>1. Lembar Nilai Juri</span>
                    <Badge variant={overview?.totalAssessmentsSubmitted ? "success" : "default"} className="text-[9px]">
                      {overview?.totalAssessmentsSubmitted ? "SIAP" : "BELUM"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Bisa menggunakan nilai asli juri saat sosialisasi, atau klik <em>"Lengkapi Nilai Otomatis"</em>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>2. Rekap Nilai Panitia</span>
                    <Link
                      href="/dashboard/penilaian"
                      target="_blank"
                      className="text-accent text-[11px] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Buka</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Panitia meninjau rekap ranking seluruh juri dan mengklik <strong>Finalisasi Nilai</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>3. Penetapan Juara</span>
                    <Link
                      href="/dashboard/pemenang"
                      target="_blank"
                      className="text-accent text-[11px] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Buka</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Panitia menetapkan pemenang resmi dan mempublikasikan hasil ke sistem.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>4. Tinjau Hasil Publik</span>
                    <Link
                      href="/pemenang"
                      target="_blank"
                      className="text-accent text-[11px] hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Buka</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hasil pemenang resmi langsung tampil di portal peserta dan layar monitor.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TABEL STATUS CABANG LOMBA & KONTROL INDEPENDEN */}
        {/* ========================================================================= */}
        <Card className="border-border overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span>Status & Progres Seluruh Cabang Lomba (9 Lomba)</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Pantau jumlah peserta simulasi DP 2, nilai juri yang telah masuk, status finalisasi nilai, dan penetapan juara per lomba.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/penilaian"
                target="_blank"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Buka Rekap Nilai</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                href="/dashboard/pemenang"
                target="_blank"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-semibold"
              >
                <span>Buka Penetapan Juara</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Cabang Lomba</TableHead>
                  <TableHead className="text-center">Kategori</TableHead>
                  <TableHead className="text-center">Juri Bertugas</TableHead>
                  <TableHead className="text-center">Peserta DP 2</TableHead>
                  <TableHead className="text-center">Nilai Juri</TableHead>
                  <TableHead className="text-center">Status Lomba</TableHead>
                  <TableHead className="text-center">Juara Ditetapkan</TableHead>
                  <TableHead className="text-right pr-4">Aksi Kontrol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto mb-2" />
                      <p className="text-xs">Memuat status cabang lomba...</p>
                    </TableCell>
                  </TableRow>
                ) : !overview?.competitions || overview.competitions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground text-xs">
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
                      <TableCell className="text-center">
                        {comp.isFinalized ? (
                          <Badge variant="success" className="text-[10px] flex items-center justify-center gap-1 mx-auto w-fit">
                            <Lock className="h-2.5 w-2.5" />
                            <span>FINAL</span>
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            {comp.status.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={comp.winnersCount > 0 ? "gold" : "default"}
                          className="text-xs font-mono"
                        >
                          {comp.winnersCount > 0 ? `${comp.winnersCount} Juara` : "Kosong"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Tombol Isi Peserta */}
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
                            className="text-[11px] h-7 px-2 border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
                            title={`Buat ${countPerComp} peserta simulasi untuk lomba ${comp.name}`}
                          >
                            <span>Peserta ({countPerComp})</span>
                          </Button>

                          {/* Tombol Isi Nilai */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                type: "generate_scores_single",
                                targetComp: comp,
                              })
                            }
                            disabled={submitting}
                            className="text-[11px] h-7 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            title={`Isi nilai juri otomatis untuk lomba ${comp.name}`}
                          >
                            <span>Nilai</span>
                          </Button>

                          {/* Tombol Kosongkan Juara */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                type: "clear_winners_single",
                                targetComp: comp,
                              })
                            }
                            disabled={submitting || comp.winnersCount === 0}
                            className="text-[11px] h-7 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                            title={`Hapus data juara dan buka kunci nilai lomba ${comp.name}`}
                          >
                            <span>Reset Juara</span>
                          </Button>

                          {/* Tombol Kosongkan Total Lomba Ini */}
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
                            className="text-[11px] h-7 px-2 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer"
                            title={`Kosongkan total peserta, nilai, dan juara untuk lomba ${comp.name}`}
                          >
                            <Trash2 className="h-3 w-3" />
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
                {confirmDialog.type.startsWith("clear_all") || confirmDialog.type === "clear_single" ? (
                  <div className="p-2 rounded-full bg-danger/15 text-danger">
                    <Trash2 className="h-5 w-5" />
                  </div>
                ) : confirmDialog.type.includes("winners") ? (
                  <div className="p-2 rounded-full bg-amber-500/15 text-amber-500">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-amber-500/15 text-amber-500">
                    <Sparkles className="h-5 w-5" />
                  </div>
                )}

                <DialogTitle>
                  {confirmDialog.type === "generate_all" && "Konfirmasi Buat Peserta Simulasi (Semua Lomba)"}
                  {confirmDialog.type === "generate_single" && `Konfirmasi Buat Peserta: ${confirmDialog.targetComp?.name}`}
                  {confirmDialog.type === "generate_scores_all" && "Konfirmasi Lengkapi / Isi Nilai Juri Otomatis (Semua Lomba)"}
                  {confirmDialog.type === "generate_scores_single" && `Konfirmasi Isi Nilai: ${confirmDialog.targetComp?.name}`}
                  {confirmDialog.type === "clear_winners_all" && "Konfirmasi Kosongkan Penetapan Pemenang (Semua Lomba)"}
                  {confirmDialog.type === "clear_winners_single" && `Konfirmasi Kosongkan Pemenang: ${confirmDialog.targetComp?.name}`}
                  {confirmDialog.type === "clear_all" && "Konfirmasi Kosongkan Seluruh Simulasi (Reset Total)"}
                  {confirmDialog.type === "clear_single" && `Konfirmasi Kosongkan Total: ${confirmDialog.targetComp?.name}`}
                </DialogTitle>
              </div>

              <DialogDescription>
                {confirmDialog.type === "generate_all" && (
                  <span>
                    Sistem akan membuat <strong>{countPerComp} peserta simulasi</strong> untuk masing-masing <strong>{overview?.totalCompetitions || 9} cabang lomba</strong> dari <strong>SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong> dengan lembar nilai kosong siap dinilai juri.
                  </span>
                )}
                {confirmDialog.type === "generate_single" && (
                  <span>
                    Sistem akan membuat <strong>{countPerComp} peserta simulasi</strong> khusus untuk cabang lomba <strong>{confirmDialog.targetComp?.name}</strong> dari <strong>SMK DINAMIKA PEMBANGUNAN 2 JAKARTA</strong>.
                  </span>
                )}
                {confirmDialog.type === "generate_scores_all" && (
                  <span>
                    Sistem akan menghasilkan <strong>penilaian juri otomatis bervariasi (75–95)</strong> untuk seluruh peserta simulasi yang belum dinilai. Nilai asli juri yang sudah ada akan tetap dipertahankan. Setelah ini, panitia dapat langsung melakukan rekap nilai dan menetapkan pemenang.
                  </span>
                )}
                {confirmDialog.type === "generate_scores_single" && (
                  <span>
                    Sistem akan menghasilkan penilaian juri otomatis untuk peserta simulasi pada cabang lomba <strong>{confirmDialog.targetComp?.name}</strong>.
                  </span>
                )}
                {confirmDialog.type === "clear_winners_all" && (
                  <span className="text-foreground">
                    Tindakan ini akan <strong>menghapus seluruh baris juara di tabel pemenang</strong> dan <strong>mengembalikan status seluruh lomba ke 'pendaftaran'</strong> (membuka kembali kunci nilai). Peserta dan nilai juri tetap aman sehingga panitia dapat mengulang latihan penetapan juara.
                  </span>
                )}
                {confirmDialog.type === "clear_winners_single" && (
                  <span className="text-foreground">
                    Tindakan ini akan menghapus data juara pada cabang lomba <strong>{confirmDialog.targetComp?.name}</strong> dan membuka kembali kunci nilai lomba tersebut.
                  </span>
                )}
                {confirmDialog.type === "clear_all" && (
                  <span className="text-danger font-medium block">
                    Apakah Anda yakin ingin mengosongkan seluruh simulasi (reset total)? Seluruh peserta simulasi, nilai juri, dan penetapan juara akan dihapus permanen. Seluruh lomba akan kembali ke kondisi 0 pendaftar.
                  </span>
                )}
                {confirmDialog.type === "clear_single" && (
                  <span className="text-danger font-medium block">
                    Apakah Anda yakin ingin mengosongkan total peserta, nilai, dan pemenang untuk cabang lomba <strong>{confirmDialog.targetComp?.name}</strong>?
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
                <strong className={confirmDialog.type.startsWith("clear_all") || confirmDialog.type === "clear_single" ? "text-danger" : confirmDialog.type.includes("winners") ? "text-amber-500" : "text-emerald-500"}>
                  {confirmDialog.type.includes("scores")
                    ? "Isi Nilai Juri Otomatis"
                    : confirmDialog.type.includes("winners")
                    ? "Kosongkan Pemenang (Latihan Ulang)"
                    : confirmDialog.type.startsWith("clear")
                    ? "Reset Bersih Total (0 Pendaftar)"
                    : "Generate Peserta Simulasi"}
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

              {confirmDialog.type.startsWith("clear_all") || confirmDialog.type === "clear_single" ? (
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={handleExecuteClearAll}
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
                      <span>Ya, Kosongkan Total</span>
                    </>
                  )}
                </Button>
              ) : confirmDialog.type.includes("winners") ? (
                <Button
                  variant="accent"
                  disabled={submitting}
                  onClick={handleExecuteClearWinners}
                  className="text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengosongkan Pemenang...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Ya, Kosongkan Pemenang</span>
                    </>
                  )}
                </Button>
              ) : confirmDialog.type.includes("scores") ? (
                <Button
                  variant="accent"
                  disabled={submitting}
                  onClick={handleExecuteGenerateScores}
                  className="text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Menghasilkan Nilai...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Ya, Isi Nilai Juri</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="accent"
                  disabled={submitting}
                  onClick={handleExecuteGenerateParticipants}
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
