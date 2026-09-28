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
  ShieldCheck,
  FileCheck2,
} from "lucide-react";

interface UploadedDocument {
  id: string;
  participant_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  status: "menunggu" | "valid" | "tidak_valid";
  note: string | null;
  uploaded_at: string;
}

interface DocSlotConfig {
  type: string;
  title: string;
  subtitle: string;
  required: boolean;
  acceptedFormats: string;
  acceptAttribute: string;
}

const DOC_SLOTS: DocSlotConfig[] = [
  {
    type: "kartu_pelajar",
    title: "Kartu Pelajar / Mahasiswa / KTP",
    subtitle: "Bukti identitas peserta atau ketua tim yang masih berlaku.",
    required: true,
    acceptedFormats: "PDF, JPG, PNG (Maks. 10MB)",
    acceptAttribute: ".pdf,.jpg,.jpeg,.png,.webp",
  },
  {
    type: "surat_izin",
    title: "Surat Rekomendasi / Izin Sekolah",
    subtitle: "Surat tugas atau izin resmi dari pimpinan sekolah/instansi asal.",
    required: true,
    acceptedFormats: "PDF, JPG, PNG (Maks. 10MB)",
    acceptAttribute: ".pdf,.jpg,.jpeg,.png",
  },
  {
    type: "karya",
    title: "Naskah Karya / Dokumen Pendukung",
    subtitle: "Wajib untuk lomba berbasis naskah (Cipta Puisi, Esai, Naskah Pidato).",
    required: false,
    acceptedFormats: "PDF, DOC, DOCX (Maks. 10MB)",
    acceptAttribute: ".pdf,.doc,.docx",
  },
];

export function BerkasUploadSection({
  participantId,
  onUploadSuccess,
}: {
  participantId: string;
  onUploadSuccess?: () => void;
}) {
  const [documents, setDocuments] = React.useState<UploadedDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  const handleFileUpload = async (slotType: string, file: File) => {
    setUploadingType(slotType);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("participantId", participantId);
    formData.append("docType", slotType);

    try {
      const res = await fetch("/api/participants/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Berkas "${file.name}" berhasil diunggah dan disimpan ke antrean verifikasi!`,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-accent" />
            <span>Unggah Berkas Persyaratan Lomba</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Unggah dokumen yang disyaratkan agar pendaftaran Anda dapat diverifikasi oleh panitia seksi acara.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchDocs}
          disabled={loading}
          className="text-xs self-start sm:self-auto gap-1"
        >
          <RotateCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span>Segarkan</span>
        </Button>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DOC_SLOTS.map((slot) => {
          const doc = documents.find((d) => d.doc_type === slot.type);
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
                  : "border-border bg-card hover:border-accent/40"
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
                        <Badge variant="danger" className="text-[9px] px-1 py-0">
                          Wajib
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[9px] px-1 py-0 text-muted-foreground bg-muted">
                          Opsional
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
                      {slot.acceptedFormats}
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
                    accept={slot.acceptAttribute}
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slot.type, file);
                      e.target.value = ""; // reset agar bisa pilih file yang sama
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
  );
}
