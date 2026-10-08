"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getMaintenanceDataCounts,
  exportBackupSnapshotAction,
  executeDataResetAction,
  MaintenanceCounts,
  ResetOptions,
} from "@/app/actions/maintenance";
import {
  Trash2,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Database,
  Trophy,
  Sparkles,
  Users,
  FileText,
  Camera,
  History,
  Lock,
  ArrowRight,
} from "lucide-react";

export default function ResetDataPage() {
  const [mounted, setMounted] = React.useState(false);
  const [counts, setCounts] = React.useState<MaintenanceCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = React.useState(true);
  const [downloadingBackup, setDownloadingBackup] = React.useState(false);
  const [backupSuccess, setBackupSuccess] = React.useState(false);

  // Granular Options State
  const [options, setOptions] = React.useState<ResetOptions>({
    cleanCompetitions: true,
    cleanChallenges: true,
    cleanLogs: true,
    cleanStorage: true,
    cleanParticipantAccounts: true,
    resetCompetitionStatus: true,
  });

  const [acknowledgedWarning, setAcknowledgedWarning] = React.useState(false);

  // Dialog & Execution State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    loadCounts();
  }, []);

  async function loadCounts() {
    try {
      setLoadingCounts(true);
      const res = await getMaintenanceDataCounts();
      if (res.success && res.counts) {
        setCounts(res.counts);
      }
    } catch (err) {
      console.error("Gagal load counts:", err);
    } finally {
      setLoadingCounts(false);
    }
  }

  async function handleDownloadBackup() {
    try {
      setDownloadingBackup(true);
      const res = await exportBackupSnapshotAction();
      if (res.success && res.snapshot) {
        const jsonStr = JSON.stringify(res.snapshot, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || `backup-gebyar-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setBackupSuccess(true);
        setTimeout(() => setBackupSuccess(false), 5000);
      } else {
        alert(res.error || "Gagal mengunduh cadangan data.");
      }
    } catch (err) {
      console.error("Error backup:", err);
      alert("Terjadi kesalahan saat mengekspor file cadangan.");
    } finally {
      setDownloadingBackup(false);
    }
  }

  function handleSelectAll() {
    setOptions({
      cleanCompetitions: true,
      cleanChallenges: true,
      cleanLogs: true,
      cleanStorage: true,
      cleanParticipantAccounts: true,
      resetCompetitionStatus: true,
    });
  }

  function handleDeselectAll() {
    setOptions({
      cleanCompetitions: false,
      cleanChallenges: false,
      cleanLogs: false,
      cleanStorage: false,
      cleanParticipantAccounts: false,
      resetCompetitionStatus: false,
    });
  }

  const selectedCount = Object.values(options).filter(Boolean).length;

  async function handleExecuteReset() {
    if (confirmationInput.trim().toUpperCase() !== "BERSIHKAN DATA HARI H") {
      return;
    }

    try {
      setIsExecuting(true);
      setFeedback(null);
      const res = await executeDataResetAction(options, confirmationInput);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Pembersihan data berhasil dilakukan!",
        });
        setModalOpen(false);
        setConfirmationInput("");
        setAcknowledgedWarning(false);
        await loadCounts();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal melakukan pembersihan data.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan internal.",
      });
    } finally {
      setIsExecuting(false);
    }
  }

  const REQUIRED_PHRASE = "BERSIHKAN DATA HARI H";
  const isPhraseMatch = confirmationInput.trim().toUpperCase() === REQUIRED_PHRASE;

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header Title */}
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="danger" className="text-[10px]">
                  ZONA KRITIS / SUPER ADMIN
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  Persiapan Hari-H Acara
                </span>
              </div>
              <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pusat Pembersihan & Reset Data Sistem
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Kosongkan seluruh data testing dan transaksional sebelum perlombaan dan challenge resmi dimulai.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadCounts}
            disabled={!mounted || loadingCounts}
            className="text-xs gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loadingCounts ? "animate-spin" : ""}`} />
            <span>Segarkan Metrik</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* 1. Live Data Inspector */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              <h2 className="font-heading text-base font-bold text-foreground">
                1. Metrik Data Transaksional di Database Saat Ini
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {loadingCounts ? "Memeriksa tabel..." : "Data Aktif"}
            </span>
          </div>

          {loadingCounts ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <span className="text-xs">Menghitung jumlah rekaman di Supabase...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" /> Pendaftaran Lomba
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.registrations ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.registrationMembers ?? 0} anggota regu
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-500" /> Berkas Persyaratan
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.participantDocuments ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.storageDocumentsCount ?? 0} file di Storage
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-indigo-500" /> Penilaian Juri
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.assessments ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.assessmentScores ?? 0} skor kriteria
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Transaksi Poin
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.pointTransactions ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.challengeSubmissions ?? 0} bukti submit
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-pink-500" /> Galeri Twibbon
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.twibbons ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.storageTwibbonCount ?? 0} file di Storage
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-500" /> Akun Peserta Tes
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.participantProfiles ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.participants ?? 0} biodata peserta
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-1">
                <span className="text-[11px] text-muted-foreground block flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-cyan-500" /> Log Aktivitas
                </span>
                <span className="font-mono text-xl font-bold text-foreground">
                  {counts?.activityLogs ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {counts?.notifications ?? 0} notifikasi
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Data Master Aman
                </span>
                <span className="font-mono text-xs text-foreground block font-medium">
                  8 Lomba & Juri
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Kriteria, Stand, & Jadwal tetap utuh
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* 2. Unduh Cadangan (Backup Snapshot) */}
        <Card className="p-6 space-y-4 border-accent/30 bg-accent/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-accent" />
                <h2 className="font-heading text-base font-bold text-foreground">
                  2. Amankan Data Cadangan (Backup Snapshot JSON)
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Sangat disarankan untuk mengunduh arsip cadangan data testing saat ini sebelum memulai proses pembersihan.
              </p>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              {downloadingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengekspor JSON...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Unduh Arsip Cadangan (JSON)</span>
                </>
              )}
            </Button>
          </div>

          {backupSuccess && (
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                File cadangan berhasil diunduh ke komputer Anda! Anda dapat melanjutkan ke tahapan pemilihan opsi.
              </span>
            </div>
          )}
        </Card>

        {/* 3. Opsi Pembersihan Granular */}
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="space-y-0.5">
              <h2 className="font-heading text-base font-bold text-foreground">
                3. Tentukan Lingkup Data yang Akan Dibersihkan
              </h2>
              <p className="text-xs text-muted-foreground">
                Centang kategori data yang ingin dikosongkan. Data master (cabang lomba, kriteria nilai, penugasan juri, stand) akan selalu dipertahankan.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-7 cursor-pointer"
              >
                Pilih Semua
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs h-7 text-muted-foreground cursor-pointer"
              >
                Kosongkan
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opsi 1 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.cleanCompetitions
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.cleanCompetitions}
                onChange={(e) =>
                  setOptions({ ...options, cleanCompetitions: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  Pendaftaran Lomba & Penilaian Juri
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menghapus seluruh pendaftaran peserta lomba, anggota regu, riwayat berkas, lembar penilaian juri, skor kriteria, dan penetapan juara.
                </p>
              </div>
            </label>

            {/* Opsi 2 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.cleanChallenges
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.cleanChallenges}
                onChange={(e) =>
                  setOptions({ ...options, cleanChallenges: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  Gamifikasi, Challenge & Twibbon
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menghapus bukti submit challenge, klaim reward/merchandise, transaksi poin bazar stand, dan foto twibbon peserta.
                </p>
              </div>
            </label>

            {/* Opsi 3 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.cleanStorage
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.cleanStorage}
                onChange={(e) =>
                  setOptions({ ...options, cleanStorage: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  File Fisik Supabase Storage
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menghapus file fisik PDF berkas di bucket <code className="text-[11px] bg-muted px-1 py-0.5 rounded">dokumen-peserta</code> dan gambar foto di bucket <code className="text-[11px] bg-muted px-1 py-0.5 rounded">twibbon</code>.
                </p>
              </div>
            </label>

            {/* Opsi 4 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.cleanParticipantAccounts
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.cleanParticipantAccounts}
                onChange={(e) =>
                  setOptions({ ...options, cleanParticipantAccounts: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  Hapus Akun Peserta Testing
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Menghapus akun dan biodata peserta testing. Akun <strong>Super Admin, Seksi Acara, Juri Resmi, dan Media Center</strong> tetap aman dan tidak akan dihapus.
                </p>
              </div>
            </label>

            {/* Opsi 5 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.resetCompetitionStatus
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.resetCompetitionStatus}
                onChange={(e) =>
                  setOptions({ ...options, resetCompetitionStatus: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  Reset Status Lomba & Tahapan Duta Bahasa
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mengembalikan status seluruh 8 lomba menjadi <code className="text-[11px] bg-muted px-1 py-0.5 rounded">pendaftaran</code>, mereset progress Duta Bahasa, serta menyetel Tahap 1 aktif dan Tahap 2–5 upcoming.
                </p>
              </div>
            </label>

            {/* Opsi 6 */}
            <label className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
              options.cleanLogs
                ? "border-accent bg-accent/5"
                : "border-border bg-card/40 opacity-75"
            }`}>
              <input
                type="checkbox"
                checked={options.cleanLogs}
                onChange={(e) =>
                  setOptions({ ...options, cleanLogs: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded accent-accent"
              />
              <div className="space-y-1">
                <span className="font-heading text-sm font-bold text-foreground block">
                  Log Aktivitas & Notifikasi Sistem
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Membersihkan riwayat log jejak audit dan notifikasi testing agar linimasa aktivitas dimulai segar pada hari-H.
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* 4. Danger Zone Execution */}
        <Card className="p-6 space-y-4 border-rose-500/40 bg-rose-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <h2 className="font-heading text-base font-bold text-rose-600 dark:text-rose-400">
              4. Zona Eksekusi Pembersihan
            </h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Tindakan pembersihan ini akan menghapus rekaman di Supabase database secara langsung. Pastikan Anda telah mengunduh arsip cadangan sebelum mengeksekusi.
          </p>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/30 bg-card/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledgedWarning}
              onChange={(e) => setAcknowledgedWarning(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-rose-600"
            />
            <span className="text-xs text-foreground font-medium">
              Saya memahami bahwa tindakan pembersihan data ini bersifat permanen dan {selectedCount} kategori data yang dipilih akan dikosongkan.
            </span>
          </label>

          <div className="pt-2 flex justify-end">
            <Button
              variant="default"
              disabled={!acknowledgedWarning || selectedCount === 0}
              onClick={() => {
                setConfirmationInput("");
                setModalOpen(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 cursor-pointer font-semibold"
            >
              <Trash2 className="h-4 w-4" />
              <span>Buka Konfirmasi Pembersihan Data...</span>
            </Button>
          </div>
        </Card>

        {/* Modal Konfirmasi Keamanan */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogHeader>
            <DialogTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2 font-heading text-lg">
              <ShieldAlert className="h-5 w-5" />
              Konfirmasi Terakhir Pembersihan Data
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Anda akan menghapus data pada sistem untuk persiapan hari-H. Silakan ketik kata kunci di bawah ini untuk mengonfirmasi bahwa tindakan ini disengaja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-1.5 text-xs">
              <span className="font-semibold text-foreground block">Ringkasan Tindakan yang Dipilih:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[11px]">
                {options.cleanCompetitions && <li>Data Pendaftaran Lomba & Lembar Nilai Juri</li>}
                {options.cleanChallenges && <li>Gamifikasi, Bukti Challenge, Poin & Twibbon</li>}
                {options.cleanStorage && <li>File Berkas di Supabase Storage</li>}
                {options.cleanParticipantAccounts && <li>Akun Peserta Testing (Admin & Juri dipertahankan)</li>}
                {options.resetCompetitionStatus && <li>Status 8 Lomba ke 'Pendaftaran' & Reset Duta Bahasa</li>}
                {options.cleanLogs && <li>Log Aktivitas & Notifikasi Sistem</li>}
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground block">
                Ketik teks pengaman:{" "}
                <strong className="text-rose-600 font-mono tracking-wider font-bold">
                  {REQUIRED_PHRASE}
                </strong>
              </label>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Ketik BERSIHKAN DATA HARI H di sini..."
                className="font-mono text-xs uppercase"
                disabled={isExecuting}
                autoFocus
              />
              {!isPhraseMatch && confirmationInput.length > 0 && (
                <p className="text-[11px] text-destructive">
                  Teks belum sesuai dengan kata kunci di atas.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={isExecuting}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!isPhraseMatch || isExecuting}
              onClick={handleExecuteReset}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2 text-xs font-semibold cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Membersihkan Data...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eksekusi Pembersihan Sekarang</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
