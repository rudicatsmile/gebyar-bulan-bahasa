"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  createBackupAction,
  getBackupSystemMetricsAction,
  getBackupHistoryAction,
  clearBackupHistoryAction,
  validateBackupFileAction,
  executeRestoreAction,
  getRestoreHistoryAction,
  BackupSystemMetrics,
  BackupHistoryEntry,
  RestoreHistoryEntry,
} from "@/app/actions/backup-restore";
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  FileText,
  Layers,
  Clock,
  User,
  HardDrive,
  RefreshCw,
  Trash2,
  History,
  Sparkles,
  ShieldCheck,
  FileJson,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
} from "lucide-react";

const REQUIRED_RESTORE_CONFIRMATION = "RESTORE DATA ACARA";

export default function BackupRestorePage() {
  const [activeTab, setActiveTab] = React.useState<"backup" | "restore" | "history">("backup");

  // Metrics state
  const [metrics, setMetrics] = React.useState<BackupSystemMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = React.useState(true);

  // Backup form state
  const [backupNotes, setBackupNotes] = React.useState("");
  const [isCreatingBackup, setIsCreatingBackup] = React.useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = React.useState<string | null>(null);

  // Restore file & analysis state
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileContent, setFileContent] = React.useState<string>("");
  const [isValidatingFile, setIsValidatingFile] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<any | null>(null);
  const [fileValidationError, setFileValidationError] = React.useState<string | null>(null);

  // Restore options & confirmation
  const [restoreMode, setRestoreMode] = React.useState<"clean" | "merge">("clean");
  const [confirmationInput, setConfirmationInput] = React.useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isExecutingRestore, setIsExecutingRestore] = React.useState(false);
  const [restoreResult, setRestoreResult] = React.useState<{
    success: boolean;
    message?: string;
    totalRestored?: number;
    details?: Record<string, number>;
  } | null>(null);

  // History state
  const [backupHistory, setBackupHistory] = React.useState<BackupHistoryEntry[]>([]);
  const [restoreHistory, setRestoreHistory] = React.useState<RestoreHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [isUnauthorized, setIsUnauthorized] = React.useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = React.useState<string | null>(null);

  // Penanda hidrasi client untuk mencegah hydration mismatch
  const [mounted, setMounted] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load initial data
  const loadData = React.useCallback(async () => {
    try {
      setLoadingMetrics(true);
      const mRes = await getBackupSystemMetricsAction();
      if (!mRes.success) {
        if (mRes.error?.includes("Akses ditolak") || mRes.error?.includes("Super Admin")) {
          setIsUnauthorized(true);
          setUnauthorizedMessage(mRes.error);
          return;
        }
      }

      if (mRes.success && mRes.metrics) {
        setIsUnauthorized(false);
        setMetrics(mRes.metrics);
      }

      setLoadingHistory(true);
      const [bHist, rHist] = await Promise.all([
        getBackupHistoryAction(),
        getRestoreHistoryAction(),
      ]);
      if (bHist.success && bHist.history) setBackupHistory(bHist.history);
      if (rHist.success && rHist.history) setRestoreHistory(rHist.history);
    } catch (err) {
      console.error("Gagal memuat data backup & restore:", err);
    } finally {
      setLoadingMetrics(false);
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler: Buat Backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupSuccessMessage(null);

    try {
      const res = await createBackupAction({ notes: backupNotes });
      if (res.success && res.backupPayload && res.filename) {
        // Trigger file download di browser
        const jsonString = JSON.stringify(res.backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = res.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const recordCount = res.backupPayload.meta?.totalRecords || 0;
        const tableCount = res.backupPayload.meta?.totalTables || 0;
        setBackupSuccessMessage(
          `File backup "${res.filename}" berhasil dibuat dan diunduh (${recordCount} baris data dari ${tableCount} tabel).`
        );
        setBackupNotes("");
        await loadData();
      } else {
        alert(res.error || "Gagal membuat backup data.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat membuat backup.");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Handler: Pemilihan File Restore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidationResult(null);
    setFileValidationError(null);
    setRestoreResult(null);
    setIsValidatingFile(true);

    try {
      const text = await file.text();
      setFileContent(text);

      const valRes = await validateBackupFileAction(text);
      if (valRes.success && valRes.validation) {
        setValidationResult(valRes.validation);
      } else {
        setFileValidationError(valRes.error || "File tidak memenuhi kriteria backup valid.");
      }
    } catch {
      setFileValidationError("Gagal membaca berkas yang dipilih.");
    } finally {
      setIsValidatingFile(false);
    }
  };

  // Handler: Buka Modal Konfirmasi Restore
  const handleOpenConfirmRestore = () => {
    setConfirmationInput("");
    setIsConfirmModalOpen(true);
  };

  // Handler: Eksekusi Restore
  const handleExecuteRestore = async () => {
    if (confirmationInput.trim().toUpperCase() !== REQUIRED_RESTORE_CONFIRMATION) {
      alert(`Harap ketik "${REQUIRED_RESTORE_CONFIRMATION}" secara persis untuk konfirmasi.`);
      return;
    }

    setIsExecutingRestore(true);
    try {
      const res = await executeRestoreAction(fileContent, restoreMode, confirmationInput);
      if (res.success) {
        setRestoreResult({
          success: true,
          message: res.message,
          totalRestored: res.totalRestored,
          details: res.details,
        });
        setIsConfirmModalOpen(false);
        // Reset file selection
        setSelectedFile(null);
        setFileContent("");
        setValidationResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadData();
      } else {
        alert(res.error || "Gagal memulihkan data backup.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan fatal saat proses restore.");
    } finally {
      setIsExecutingRestore(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    if (!mounted) return "-";
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isUnauthorized) {
    return (
      <DashboardLayout role="seksi_acara">
        <div className="max-w-xl mx-auto py-16 px-4">
          <Card className="p-8 text-center border-destructive/30 bg-destructive/5 space-y-4 shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto ring-8 ring-destructive/5">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">Akses Khusus Super Admin</h1>
              <p className="text-sm text-muted-foreground">
                {unauthorizedMessage ||
                  "Halaman Backup & Restore hanya dapat diakses oleh akun dengan role Super Admin."}
              </p>
            </div>
            <div className="pt-4 flex justify-center">
              <Link href="/dashboard">
                <Button variant="default" className="gap-2">
                  Kembali ke Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gold" className="text-[10px]">
                MANAJEMEN SISTEM & PEMULIHAN
              </Badge>
              <Badge variant="default" className="text-[10px] text-muted-foreground">
                DISASTER RECOVERY
              </Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Database className="h-7 w-7 text-accent" />
              <span>Backup & Restore Data Acara</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
              Amankan seluruh basis data operasional acara ke dalam arsip file JSON terstruktur, dan
              pulihkan data kapan pun dibutuhkan saat terjadi kegagalan sistem atau sebelum simulasi.
            </p>
          </div>

          <Button
            type="button"
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={mounted && loadingMetrics}
            className="text-xs gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${mounted && loadingMetrics ? "animate-spin" : ""}`} />
            <span>Segarkan Status</span>
          </Button>
        </div>

        {/* System Overview Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Record Database
              </span>
              <HardDrive className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {!mounted || loadingMetrics ? "..." : (metrics?.totalRecords || 0).toLocaleString("id-ID")}
              </span>
              <span className="text-xs text-muted-foreground">baris</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Seluruh tabel operasional</p>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Peserta & Pendaftaran
              </span>
              <User className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {!mounted || loadingMetrics
                  ? "..."
                  : (
                      (metrics?.counts["participants"] || 0) +
                      (metrics?.counts["registrations"] || 0)
                    ).toLocaleString("id-ID")}
              </span>
              <span className="text-xs text-muted-foreground">data</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Peserta: {!mounted || loadingMetrics ? "..." : metrics?.counts["participants"] || 0} | Reg:{" "}
              {!mounted || loadingMetrics ? "..." : metrics?.counts["registrations"] || 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Penilaian & Skor Juri
              </span>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {!mounted || loadingMetrics
                  ? "..."
                  : (
                      (metrics?.counts["assessments"] || 0) +
                      (metrics?.counts["assessment_scores"] || 0)
                    ).toLocaleString("id-ID")}
              </span>
              <span className="text-xs text-muted-foreground">nilai</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Penilaian: {!mounted || loadingMetrics ? "..." : metrics?.counts["assessments"] || 0} | Skor:{" "}
              {!mounted || loadingMetrics ? "..." : metrics?.counts["assessment_scores"] || 0}
            </p>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Backup Terakhir
              </span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-semibold text-foreground block truncate">
                {!mounted || loadingMetrics
                  ? "..."
                  : metrics?.lastBackupAt
                  ? formatDate(metrics.lastBackupAt)
                  : "Belum pernah backup"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Restore: {!mounted || loadingMetrics ? "..." : metrics?.lastRestoreAt ? formatDate(metrics.lastRestoreAt) : "Belum"}
              </p>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab("backup")}
            className={`pb-3 pt-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "backup"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>Buat Backup Data</span>
          </button>

          <button
            onClick={() => setActiveTab("restore")}
            className={`pb-3 pt-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "restore"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            <span>Restore Data dari File</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 pt-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "history"
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            <span>Riwayat Backup & Restore</span>
            {(backupHistory.length > 0 || restoreHistory.length > 0) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
                {backupHistory.length + restoreHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: BUAT BACKUP DATA */}
        {activeTab === "backup" && (
          <div className="space-y-6">
            <Card className="p-6 border-border bg-card space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Download className="h-5 w-5 text-accent" />
                    <span>Ekspor Snapshot Database Lengkap</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sistem akan mengekstrak seluruh data tabel operasional (peserta, registrasi, penilaian
                    juri, kriteria, stand bazar, tantangan, reward, jadwal, dan pengaturan acara) ke
                    dalam satu file terstruktur berkas <strong>.json</strong>.
                  </p>
                </div>
                <Badge variant="default" className="text-[11px] shrink-0">
                  Format JSON v1.0
                </Badge>
              </div>

              {backupSuccessMessage && (
                <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{backupSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setBackupSuccessMessage(null)}
                    className="text-[11px] font-bold hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Catatan Backup (Opsional)
                </label>
                <Textarea
                  placeholder="Misalnya: Backup sebelum pelaksanaan babak final lomba pidato, atau Backup harian 11 November 2026."
                  value={backupNotes}
                  onChange={(e) => setBackupNotes(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
                <p className="text-[11px] text-muted-foreground">
                  Catatan ini akan tersimpan dalam metadata file backup untuk mempermudah identifikasi
                  arsip di kemudian hari.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
                <div className="text-[11px] text-muted-foreground">
                  File backup aman disimpan di komputer lokal atau media penyimpanan cadangan eksternal.
                </div>
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  variant="accent"
                  className="w-full sm:w-auto text-xs gap-2 cursor-pointer shadow-sm"
                >
                  {isCreatingBackup ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sedang Mengekstrak Data...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>Buat & Unduh File Backup</span>
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Cakupan Data Card */}
            <Card className="p-5 border-border bg-card space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" />
                <span>Rincian Cakupan Data yang Disimpan dalam File Backup</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <span className="font-semibold text-foreground block">
                    1. Operasional Lomba & Peserta
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>Data Peserta & Dokumen Berkas</li>
                    <li>Pendaftaran Lomba & Anggota Tim</li>
                    <li>Penilaian Juri & Nilai Tiap Kriteria</li>
                    <li>Daftar Juara & Penetapan Pemenang</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <span className="font-semibold text-foreground block">
                    2. Gamifikasi, Stand & Interaktif
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>8 Stand Budaya & QR Token Stand</li>
                    <li>Misi Tantangan & Verifikasi Bukti</li>
                    <li>Katalog Reward & Klaim Penukaran</li>
                    <li>Kepingan Puzzle & Tantangan QR Huruf</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-1">
                  <span className="font-semibold text-foreground block">
                    3. Konfigurasi Sistem & Pengaturan
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
                    <li>Pengaturan Acara & Papan Skor Monitor</li>
                    <li>Master Sekolah / Instansi Terdaftar</li>
                    <li>Kriteria Penilaian & Bobot Nilai Lomba</li>
                    <li>Jadwal Acara & Warta Pengumuman</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: RESTORE DATA DARI FILE */}
        {activeTab === "restore" && (
          <div className="space-y-6">
            {/* Warning Alert */}
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-semibold block">
                  Perhatian Penting Sebelum Melakukan Restore:
                </strong>
                <p>
                  Proses restore akan memperbarui atau menimpa data di database aplikasi sesuai dengan
                  isi file backup yang diunggah. Pastikan Anda telah membuat backup terbaru dari kondisi
                  data saat ini sebelum melakukan pemulihan.
                </p>
              </div>
            </div>

            {/* Restore Result Alert */}
            {restoreResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  restoreResult.success
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold text-sm block">Pemulihan Data Berhasil!</strong>
                    <p>{restoreResult.message}</p>
                    {restoreResult.details && (
                      <div className="mt-2 text-[11px] bg-background/60 p-2.5 rounded border border-border/40 font-mono flex flex-wrap gap-x-4 gap-y-1">
                        {Object.entries(restoreResult.details).map(([tbl, cnt]) => (
                          <span key={tbl}>
                            {tbl}: <strong>{cnt}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setRestoreResult(null)}
                  className="text-[11px] font-bold hover:underline cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Step 1: Upload File */}
            <Card className="p-6 border-border bg-card space-y-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-accent" />
                <span>Langkah 1: Unggah Berkas Backup (.json)</span>
              </h2>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-accent rounded-xl p-8 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <FileJson className="h-10 w-10 text-accent/80" />
                  <div className="text-xs">
                    <strong className="font-semibold text-foreground">
                      Klik untuk memilih file backup
                    </strong>{" "}
                    atau seret file ke area ini
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hanya menerima file format .json hasil ekspor sistem Gebyar Bulan Bahasa
                  </p>
                </div>
              </div>

              {isValidatingFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span>Memeriksa dan memvalidasi struktur file backup...</span>
                </div>
              )}

              {fileValidationError && (
                <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fileValidationError}</span>
                </div>
              )}

              {/* Step 2: File Analysis & Preview */}
              {validationResult && (
                <div className="pt-4 border-t border-border space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-xs font-bold text-foreground">
                        Berkas Valid: {selectedFile?.name}
                      </span>
                    </div>
                    <Badge variant="success" className="text-[10px]">
                      SIAP DIRESTORE
                    </Badge>
                  </div>

                  {/* Metadata Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Waktu Backup
                      </span>
                      <span className="font-mono text-[11px]">
                        {formatDate(validationResult.meta.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Dibuat Oleh
                      </span>
                      <span className="text-[11px] truncate block">
                        {validationResult.meta.createdByName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Total Tabel
                      </span>
                      <span className="font-mono text-[11px]">
                        {validationResult.detectedTables.length} tabel
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">
                        Total Data
                      </span>
                      <span className="font-mono text-[11px] font-bold text-accent">
                        {validationResult.totalRecords.toLocaleString("id-ID")} baris
                      </span>
                    </div>
                  </div>

                  {validationResult.meta.notes && (
                    <div className="text-xs p-2.5 rounded bg-muted/20 border border-border text-muted-foreground italic">
                      Catatan: &ldquo;{validationResult.meta.notes}&rdquo;
                    </div>
                  )}

                  {/* Step 3: Pilih Mode Restore */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Langkah 2: Pilih Metode Pemulihan Data
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRestoreMode("clean")}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === "clean"
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <RotateCcw className="h-4 w-4 text-accent" />
                            <span>1. Timpa Bersih (Clean Restore)</span>
                          </strong>
                          {restoreMode === "clean" && (
                            <Badge variant="gold" className="text-[10px]">
                              Direkomendasikan
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                          Menghapus data operasional lama terlebih dahulu, kemudian memulihkan data dari
                          file backup secara utuh. Mencegah duplikasi data dan memastikan kondisi sistem
                          100% identik dengan waktu backup dibuat.
                        </p>
                      </div>

                      <div
                        onClick={() => setRestoreMode("merge")}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          restoreMode === "merge"
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <strong className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-emerald-500" />
                            <span>2. Gabungkan / Upsert (Merge)</span>
                          </strong>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                          Hanya memperbarui record yang ID-nya sama dan menambahkan data baru dari file
                          backup tanpa menghapus data yang saat ini sudah ada di database.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Lanjut ke Konfirmasi */}
                  <div className="pt-3 flex justify-end">
                    <Button
                      onClick={handleOpenConfirmRestore}
                      variant="destructive"
                      className="text-xs gap-1.5 cursor-pointer shadow-sm"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      <span>Lanjutkan ke Konfirmasi Restore</span>
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: RIWAYAT BACKUP & RESTORE */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Riwayat Backup */}
            <Card className="p-6 border-border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-accent" />
                    <span>Riwayat Pembuatan Backup</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daftar arsip cadangan data yang pernah dibuat oleh admin di sistem ini.
                  </p>
                </div>
                {backupHistory.length > 0 && (
                  <Button
                    onClick={async () => {
                      if (confirm("Bersihkan seluruh catatan riwayat backup?")) {
                        await clearBackupHistoryAction();
                        await loadData();
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    <span>Bersihkan Riwayat</span>
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu Pembuatan</TableHead>
                      <TableHead>Nama Berkas</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead className="text-center">Total Data</TableHead>
                      <TableHead>Admin Pembuat</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                          Belum ada riwayat pembuatan backup data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      backupHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-accent">
                              {item.filename}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatBytes(item.sizeBytes)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold">
                            {item.totalRecords.toLocaleString("id-ID")} baris
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="block font-medium text-foreground">
                              {item.createdByName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.createdByEmail}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">
                            {item.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Riwayat Restore */}
            <Card className="p-6 border-border bg-card space-y-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-emerald-500" />
                  <span>Riwayat Pemulihan (Restore) Data</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Catatan audit proses restore yang pernah dijalankan ke database.
                </p>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu Restore</TableHead>
                      <TableHead>Metode</TableHead>
                      <TableHead className="text-center">Data Dipulihkan</TableHead>
                      <TableHead>Eksekutor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restoreHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                          Belum ada riwayat pemulihan data yang tercatat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      restoreHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs">
                            {formatDate(item.restoredAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.mode === "clean" ? "gold" : "default"}
                              className="text-[10px]"
                            >
                              {item.mode === "clean" ? "Timpa Bersih" : "Gabungkan / Upsert"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                            {item.totalRecordsRestored.toLocaleString("id-ID")} baris
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="block font-medium text-foreground">
                              {item.restoredByName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.restoredByEmail}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.status === "sukses" ? "success" : "danger"}
                              className="text-[10px]"
                            >
                              {item.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}

        {/* Modal Dialog Konfirmasi Keamanan Restore */}
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                <span>Konfirmasi Pemulihan Basis Data</span>
              </DialogTitle>
              <DialogDescription>
                Tindakan ini memerlukan otorisasi keamanan tinggi karena akan mengubah kondisi data di
                database utama.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Konfirmasi Operasi: {restoreMode === "clean" ? "TIMPA BERSIH" : "GABUNGKAN"}</span>
              </div>
              <p className="text-muted-foreground">
                {restoreMode === "clean"
                  ? "Seluruh data operasional lama (peserta, registrasi, penilaian, tantangan, transaksi poin) akan dibersihkan terlebih dahulu lalu digantikan dengan data dari file backup."
                  : "Data yang ada saat ini akan digabungkan/di-upsert dengan data yang terdapat di file backup."}
              </p>
              <div className="font-mono text-[11px] pt-1 border-t border-border/50 text-foreground">
                Target: {validationResult?.totalRecords.toLocaleString("id-ID")} baris data |{" "}
                {validationResult?.detectedTables.length} tabel
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Ketik kalimat verifikasi berikut untuk mengonfirmasi:
              </label>
              <div className="p-2 rounded bg-muted font-mono font-bold text-center text-xs tracking-wider select-all text-accent border border-border">
                {REQUIRED_RESTORE_CONFIRMATION}
              </div>
              <Input
                placeholder={`Ketik "${REQUIRED_RESTORE_CONFIRMATION}" di sini`}
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                disabled={isExecutingRestore}
                className="text-xs font-mono uppercase"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isExecutingRestore}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleExecuteRestore}
                disabled={
                  confirmationInput.trim().toUpperCase() !== REQUIRED_RESTORE_CONFIRMATION ||
                  isExecutingRestore
                }
                className="text-xs gap-1.5"
              >
                {isExecutingRestore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sedang Memulihkan Database...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    <span>Eksekusi Restore Sekarang</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
