"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  RotateCcw,
  Loader2,
  Paperclip,
  FileCheck2,
  UploadCloud,
  Trash2,
  Files,
  Info,
} from "lucide-react";

export interface UploadedDocument {
  id: string;
  participant_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  status: "menunggu" | "valid" | "tidak_valid";
  note: string | null;
  uploaded_at: string;
}

export interface BerkasUploadSectionProps {
  participantId: string;
  competitionName?: string;
  requireDocument?: boolean;
  uploadMode?: "single" | "multi";
  requiredDocumentList?: Array<string | { name: string; required: boolean }>;
  onUploadSuccess?: () => void;
}

const DEFAULT_DOC_SLOTS = [
  {
    type: "kartu_pelajar",
    title: "Kartu Pelajar / Mahasiswa / KTP",
    subtitle: "Bukti identitas peserta atau ketua tim yang masih berlaku.",
    required: true,
  },
  {
    type: "surat_izin",
    title: "Surat Rekomendasi / Izin Sekolah",
    subtitle: "Surat tugas atau izin resmi dari pimpinan sekolah/instansi asal.",
    required: true,
  },
  {
    type: "karya",
    title: "Naskah Karya / Dokumen Pendukung",
    subtitle: "Wajib untuk lomba berbasis naskah (Cipta Puisi, Esai, Naskah Pidato).",
    required: false,
  },
];

export function BerkasUploadSection({
  participantId,
  competitionName,
  requireDocument = true,
  uploadMode = "single",
  requiredDocumentList,
  onUploadSuccess,
}: BerkasUploadSectionProps) {
  const [documents, setDocuments] = React.useState<UploadedDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);
  const [isUploadingMulti, setIsUploadingMulti] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fetchDocs = React.useCallback(async () => {
    if (!participantId) return;
    try {
      const res = await fetch(`/api/participants/documents?participantId=${participantId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.documents)) {
          setDocuments(data.documents);
        }
      }
    } catch (err) {
      console.error("Gagal memuat dokumen:", err);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  React.useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Upload single file slot
  const handleSingleFileUpload = async (slotType: string, file: File) => {
    setUploadingType(slotType);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("participantId", participantId);
    formData.append("docType", slotType);
    formData.append("isMulti", "false");

    try {
      const res = await fetch("/api/participants/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Berkas "${file.name}" berhasil diunggah!`,
        });
        await fetchDocs();
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal mengunggah berkas.",
        });
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setFeedback({
        type: "error",
        message: "Terjadi gangguan jaringan saat mengunggah berkas.",
      });
    } finally {
      setUploadingType(null);
    }
  };

  // Upload multiple files simultaneously
  const handleMultiFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingMulti(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("participantId", participantId);
        formData.append("docType", "multi_file");
        formData.append("isMulti", "true");

        const res = await fetch("/api/participants/documents", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsUploadingMulti(false);
    await fetchDocs();
    if (onUploadSuccess) onUploadSuccess();

    if (successCount > 0 && failCount === 0) {
      setFeedback({
        type: "success",
        message: `${successCount} berkas berhasil diunggah sekaligus!`,
      });
    } else if (successCount > 0 && failCount > 0) {
      setFeedback({
        type: "success",
        message: `${successCount} berkas berhasil diunggah, namun ${failCount} berkas gagal.`,
      });
    } else {
      setFeedback({
        type: "error",
        message: "Gagal mengunggah berkas. Pastikan ukuran file di bawah 10MB.",
      });
    }
  };

  // Delete document
  const handleDeleteDoc = async (documentId: string, fileName: string) => {
    if (!confirm(`Hapus berkas "${fileName}"?`)) return;
    setDeletingId(documentId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/participants/documents?documentId=${documentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Berkas "${fileName}" berhasil dihapus.`,
        });
        await fetchDocs();
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal menghapus berkas.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghapus berkas.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Build slots for Single Mode
  const singleSlots = React.useMemo(() => {
    if (requiredDocumentList && requiredDocumentList.length > 0) {
      return requiredDocumentList.map((item) => {
        const docName = typeof item === "string" ? item : item.name;
        const isRequired = typeof item === "string" ? true : item.required !== false;
        const key = docName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        return {
          type: key,
          title: docName,
          subtitle: isRequired
            ? `Wajib diunggah untuk kelengkapan pendaftaran ${competitionName || "lomba"} (PDF, JPG, PNG, DOCX maks. 10MB).`
            : `Berkas opsional / pendukung, boleh dikosongkan jika tidak ada (PDF, JPG, PNG, DOCX maks. 10MB).`,
          required: isRequired,
        };
      });
    }
    return DEFAULT_DOC_SLOTS;
  }, [requiredDocumentList, competitionName]);

  // If this competition does NOT require documents
  if (requireDocument === false) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3 text-xs">
          <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              Tidak Wajib Berkas Persyaratan
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Cabang lomba {competitionName ? <strong>&quot;{competitionName}&quot;</strong> : "ini"} tidak mewajibkan unggah berkas persyaratan. Anda dapat langsung melanjutkan pendaftaran tanpa perlu mengunggah berkas.
            </p>
          </div>
        </div>

        {/* Jika peserta sebelumnya sudah punya berkas diunggah, tetap tampilkan preview */}
        {documents.length > 0 && (
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Berkas yang Tersimpan ({documents.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <Paperclip className="h-3 w-3 text-accent" />
                  <span className="truncate max-w-[150px]">{doc.file_name}</span>
                  <button
                    type="button"
                    onClick={() => window.open(doc.file_url, "_blank")}
                    className="text-accent hover:underline text-[10px] ml-1"
                  >
                    Buka
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-accent" />
            <span>Unggah Berkas Persyaratan Lomba</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {uploadMode === "multi"
              ? "Mode Multi-Upload: Anda dapat memilih dan mengunggah beberapa berkas sekaligus."
              : "Mode Satu per Satu: Silakan unggah berkas sesuai daftar persyaratan di bawah."}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge
            variant="default"
            className="text-[10px] font-mono uppercase bg-accent/10 border-accent/30 text-accent"
          >
            {uploadMode === "multi" ? "Multi Upload" : "Satu per Satu"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchDocs}
            disabled={loading}
            className="text-xs gap-1 cursor-pointer"
          >
            <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-in fade-in-50 ${
            feedback.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: MULTI UPLOAD */}
      {/* ============================================================== */}
      {uploadMode === "multi" ? (
        <div className="space-y-4">
          {/* Dropzone Card */}
          <Card
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleMultiFileUpload(e.dataTransfer.files);
              }
            }}
            className={`p-6 sm:p-8 text-center border-2 border-dashed transition-all ${
              isDragOver
                ? "border-accent bg-accent/10 scale-[0.99]"
                : "border-border hover:border-accent/50 bg-card"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              disabled={isUploadingMulti}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleMultiFileUpload(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                {isUploadingMulti ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1 max-w-md">
                <p className="font-heading text-sm sm:text-base font-bold text-foreground">
                  {isUploadingMulti
                    ? "Sedang Mengunggah Berkas..."
                    : "Pilih atau Tarik Beberapa Berkas Sekaligus ke Sini"}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Format yang didukung: <strong>PDF, JPG, PNG, DOC, DOCX</strong>. Maksimal 10MB per file. Anda dapat memilih beberapa file secara bersamaan.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMulti}
                  className="text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  {isUploadingMulti ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Files className="h-3.5 w-3.5" />
                      <span>Pilih Berkas Sekaligus</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Daftar berkas yang telah diunggah dalam mode multi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                <span>Berkas yang Telah Diunggah ({documents.length})</span>
              </h3>
              {documents.length > 0 && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {documents.filter((d) => d.status === "valid").length} Terverifikasi
                </span>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center bg-muted/10 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Belum ada berkas persyaratan yang diunggah.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Klik tombol <strong>&quot;Pilih Berkas Sekaligus&quot;</strong> di atas untuk mengunggah dokumen Anda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documents.map((doc, idx) => {
                  const isDeleting = deletingId === doc.id;
                  return (
                    <Card
                      key={doc.id || idx}
                      className="p-3.5 flex flex-col justify-between border-border bg-card space-y-2.5 transition-all hover:border-accent/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-start gap-2">
                          <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate" title={doc.file_name}>
                              {doc.file_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {new Date(doc.uploaded_at).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={
                            doc.status === "valid"
                              ? "success"
                              : doc.status === "tidak_valid"
                              ? "danger"
                              : "warning"
                          }
                          className="text-[9px] shrink-0 uppercase"
                        >
                          {doc.status === "valid"
                            ? "Valid"
                            : doc.status === "tidak_valid"
                            ? "Ditolak"
                            : "Menunggu"}
                        </Badge>
                      </div>

                      {doc.note && (
                        <p className="text-[10px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                          <strong>Catatan Panitia:</strong> {doc.note}
                        </p>
                      )}

                      <div className="pt-2 border-t border-border/50 flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.file_url, "_blank")}
                          className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Lihat File</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDoc(doc.id, doc.file_name)}
                          disabled={isDeleting}
                          className="text-[11px] h-7 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* MODE 1: SATU PER SATU UPLOAD */
        /* ============================================================== */
        <div className="space-y-4">
          {/* Status Kelengkapan Berkas Wajib */}
          {(() => {
            const requiredSlots = singleSlots.filter((s) => s.required);
            const uploadedRequiredCount = requiredSlots.filter((s) =>
              documents.some(
                (d) =>
                  d.status !== "tidak_valid" &&
                  (d.doc_type === s.type || d.doc_type.includes(s.type))
              )
            ).length;
            const optionalSlots = singleSlots.filter((s) => !s.required);
            const isAllRequiredUploaded =
              requiredSlots.length === 0 || uploadedRequiredCount >= requiredSlots.length;

            return (
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all ${
                  isAllRequiredUploaded
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAllRequiredUploaded ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>
                    {isAllRequiredUploaded
                      ? "Semua berkas wajib telah berhasil diunggah! Anda siap melanjutkan pendaftaran."
                      : `Harap lengkapi semua berkas wajib (${uploadedRequiredCount}/${requiredSlots.length} terunggah) sebelum mengirim pendaftaran.`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] font-medium">
                  <span className="px-2 py-0.5 rounded bg-background/80 border border-border shadow-2xs font-semibold">
                    {uploadedRequiredCount}/{requiredSlots.length} Berkas Wajib
                  </span>
                  {optionalSlots.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-background/80 border border-border shadow-2xs text-muted-foreground">
                      {optionalSlots.length} Berkas Opsional
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {singleSlots.map((slot) => {
            const doc = documents.find(
              (d) => d.doc_type === slot.type || d.doc_type.includes(slot.type)
            );
            const isUploading = uploadingType === slot.type;

            return (
              <Card
                key={slot.type}
                className={`p-5 flex flex-col justify-between transition-all ${
                  doc
                    ? doc.status === "valid"
                      ? "border-success/40 bg-success/5"
                      : doc.status === "tidak_valid"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-accent/40 bg-accent/5"
                    : slot.required
                    ? "border-border bg-card hover:border-accent/40"
                    : "border-border/70 bg-card/60 hover:border-accent/30"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-heading text-sm font-bold text-foreground">
                          {slot.title}
                        </span>
                        {slot.required ? (
                          <Badge variant="danger" className="text-[10px] px-1.5 py-0.5 font-bold tracking-wide">
                            Wajib Diunggah *
                          </Badge>
                        ) : (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0.5 text-muted-foreground bg-muted font-medium"
                          >
                            Opsional (Boleh Kosong)
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {slot.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Status Berkas */}
                  {doc ? (
                    <div className="p-3 rounded-lg border border-border/60 bg-background/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground">
                          Status Berkas:
                        </span>
                        {doc.status === "valid" ? (
                          <Badge variant="success" className="text-[9px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>VALID</span>
                          </Badge>
                        ) : doc.status === "tidak_valid" ? (
                          <Badge variant="danger" className="text-[9px] gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            <span>DITOLAK</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[9px] gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            <span>MENUNGGU</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-medium text-foreground truncate">
                        <Paperclip className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="truncate" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                      </div>

                      {doc.note && (
                        <p className="text-[11px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                          <strong>Catatan Panitia:</strong> {doc.note}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 text-center space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Belum ada berkas diunggah
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        PDF, JPG, PNG, DOCX (Maks. 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-border/60 flex items-center gap-2 mt-4">
                  {doc && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(doc.file_url, "_blank")}
                      className="text-xs h-8 flex-1 gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Lihat</span>
                    </Button>
                  )}

                  <label
                    className={`flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs ${
                      isUploading
                        ? "bg-muted text-muted-foreground pointer-events-none"
                        : doc
                        ? "border border-border bg-card hover:bg-muted text-foreground"
                        : "bg-accent text-accent-foreground hover:bg-accent/90"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSingleFileUpload(slot.type, file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>{doc ? "Ganti File" : "Pilih Berkas"}</span>
                      </>
                    )}
                  </label>
                </div>
              </Card>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
