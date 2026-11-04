"use client";

import * as React from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminPreviewExcelRegistrations,
  adminImportRegistrationsFromExcel,
  type ExcelRowPreviewResult,
  type ExcelImportExecutionResult,
} from "@/app/actions/admin-registration";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileCheck,
  RotateCcw,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";

export interface ImportPesertaLombaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportPesertaLombaModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportPesertaLombaModalProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    items: ExcelRowPreviewResult[];
  } | null>(null);

  const [previewFilter, setPreviewFilter] = React.useState<"semua" | "valid" | "invalid">("semua");
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{
    summary: { total: number; successCount: number; failedCount: number };
    results: ExcelImportExecutionResult[];
  } | null>(null);

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset state saat modal dibuka/ditutup
  React.useEffect(() => {
    if (open) {
      setFile(null);
      setPreviewData(null);
      setImportResult(null);
      setErrorMsg(null);
      setPreviewFilter("semua");
    }
  }, [open]);

  // Handle Pilih File & Trigger Preview Otomatis
  const handleFileChange = async (selectedFile: File) => {
    setErrorMsg(null);
    setImportResult(null);
    setFile(selectedFile);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      setIsPreviewing(true);
      const res = await adminPreviewExcelRegistrations(formData);
      if (res.success) {
        setPreviewData({
          totalRows: res.totalRows,
          validCount: res.validCount,
          invalidCount: res.invalidCount,
          items: res.items,
        });
      } else {
        setErrorMsg(res.error || "Gagal membaca file Excel.");
        setPreviewData(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memeriksa file.";
      setErrorMsg(msg);
      setPreviewData(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls")
      ) {
        handleFileChange(droppedFile);
      } else {
        setErrorMsg("Harap pilih file dengan format Excel (.xlsx atau .xls).");
      }
    }
  };

  // Handle Eksekusi Import
  const handleExecuteImport = async () => {
    if (!file) return;

    setErrorMsg(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsImporting(true);
      const res = await adminImportRegistrationsFromExcel(formData);
      if (res.success) {
        setImportResult({
          summary: res.summary,
          results: res.results,
        });
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || "Gagal melakukan proses import.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setErrorMsg(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter baris preview
  const filteredPreviewItems = React.useMemo(() => {
    if (!previewData) return [];
    if (previewFilter === "valid") {
      return previewData.items.filter((i) => i.isValid);
    }
    if (previewFilter === "invalid") {
      return previewData.items.filter((i) => !i.isValid);
    }
    return previewData.items;
  }, [previewData, previewFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-start justify-between bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-accent/15 text-accent border border-accent/25">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-foreground">
                  Import Peserta Ikut Lomba via Excel
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Daftarkan banyak peserta ke cabang lomba sekaligus menggunakan template resmi.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Download Template Bar */}
            <div className="p-4 rounded-xl border border-border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-accent" />
                  Format Template Excel
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan template resmi yang telah menyertakan contoh data, daftar nama cabang lomba, dan petunjuk.
                </p>
              </div>
              <a
                href="/api/competitions/template"
                download="Template_Pendaftaran_Lomba_Gebyar_Bulan_Bahasa.xlsx"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-accent" />
                <span>Unduh Template Excel</span>
              </a>
            </div>

            {/* HASIL IMPORT SELESAI */}
            {importResult ? (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="p-4 rounded-xl border border-success/30 bg-success/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="font-bold text-sm text-foreground">
                      Proses Import Selesai Dijalankan
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sistem telah memproses pendaftaran lomba dari file Excel. Berikut ringkasan hasilnya:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="default" className="text-xs">
                      Total: {importResult.summary.total} Baris
                    </Badge>
                    <Badge variant="success" className="text-xs">
                      Berhasil: {importResult.summary.successCount} Peserta
                    </Badge>
                    {importResult.summary.failedCount > 0 && (
                      <Badge variant="danger" className="text-xs">
                        Gagal / Dilewati: {importResult.summary.failedCount} Baris
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tabel Rincian Hasil */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-foreground block">
                    Rincian Hasil Pendaftaran Baris per Baris:
                  </span>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
                      {importResult.results.map((res, idx) => (
                        <div
                          key={idx}
                          className={`p-3 text-xs flex items-start justify-between gap-3 ${
                            res.status === "berhasil"
                              ? "bg-card"
                              : "bg-danger/5 text-danger"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground font-bold">
                                #{res.rowNumber}
                              </span>
                              <span className="font-semibold text-foreground">
                                {res.participantName}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                ({res.institution})
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Lomba: <strong>{res.competitionName}</strong>
                            </p>
                            <p
                              className={`text-[11px] ${
                                res.status === "berhasil"
                                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                  : "text-danger font-medium"
                              }`}
                            >
                              {res.message}
                            </p>
                          </div>
                          <Badge
                            variant={res.status === "berhasil" ? "success" : "danger"}
                            className="text-[10px] shrink-0 uppercase"
                          >
                            {res.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      if (onSuccess) onSuccess();
                    }}
                    className="text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Selesai & Tutup</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* PROSES UPLOAD & PREVIEW */
              <>
                {/* Upload Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-accent/40 bg-muted/10 hover:bg-muted/20 transition-all text-center space-y-2.5 cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-foreground block">
                      {file ? file.name : "Klik atau seret file Excel ke sini"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Mendukung format .xlsx dan .xls (Maks. 5 MB)
                    </span>
                  </div>
                  {file && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground font-mono">
                      <span>Ukuran: {(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}
                </div>

                {/* Loading Preview */}
                {isPreviewing && (
                  <div className="py-8 text-center space-y-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                    <p className="text-xs font-medium">Memeriksa struktur & mencocokkan data Excel...</p>
                  </div>
                )}

                {/* Preview Table */}
                {previewData && !isPreviewing && (
                  <div className="space-y-3 pt-1 border-t border-border animate-in fade-in-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-foreground block">
                          Pra-Validasi Data ({previewData.totalRows} Baris Terdeteksi)
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="success" className="text-[10px]">
                            {previewData.validCount} Siap Didaftarkan
                          </Badge>
                          {previewData.invalidCount > 0 && (
                            <Badge variant="danger" className="text-[10px]">
                              {previewData.invalidCount} Terdapat Kesalahan
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Filter tab */}
                      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border text-[11px] self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewFilter("semua")}
                          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                            previewFilter === "semua"
                              ? "bg-card text-foreground shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Semua ({previewData.totalRows})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter("valid")}
                          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                            previewFilter === "valid"
                              ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Valid ({previewData.validCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewFilter("invalid")}
                          className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                            previewFilter === "invalid"
                              ? "bg-card text-danger shadow-2xs font-bold"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Error ({previewData.invalidCount})
                        </button>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="max-h-60 overflow-y-auto divide-y divide-border/60">
                        {filteredPreviewItems.map((item) => (
                          <div
                            key={item.rowNumber}
                            className={`p-3 text-xs flex items-start justify-between gap-3 ${
                              item.isValid
                                ? "bg-card hover:bg-muted/30"
                                : "bg-danger/5 text-danger"
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-muted-foreground font-bold">
                                  #{item.rowNumber}
                                </span>
                                <span className="font-semibold text-foreground">
                                  {item.fullName}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  — {item.institution}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <span>
                                  Lomba: <strong>{item.competitionName}</strong>
                                </span>
                                {item.teamName && (
                                  <span>
                                    • Tim: <strong>{item.teamName}</strong> ({item.teamMembersCount} anggota)
                                  </span>
                                )}
                              </div>
                              {item.errorMessage && (
                                <p className="text-[11px] text-danger font-semibold">
                                  {item.errorMessage}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {item.isValid ? (
                                <Badge
                                  variant="success"
                                  className="text-[10px] font-medium gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>{item.participantAction === "daftar_baru" ? "Baru" : "Terdaftar"}</span>
                                </Badge>
                              ) : (
                                <Badge variant="danger" className="text-[10px] font-medium">
                                  Error
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tombol Eksekusi Import */}
                    <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        Hanya baris yang valid ({previewData.validCount} baris) yang akan didaftarkan ke sistem.
                      </span>
                      <Button
                        onClick={handleExecuteImport}
                        disabled={isImporting || previewData.validCount === 0}
                        size="sm"
                        className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {isImporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileCheck className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isImporting
                            ? "Memproses Import..."
                            : `Daftarkan ${previewData.validCount} Peserta Valid`}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

