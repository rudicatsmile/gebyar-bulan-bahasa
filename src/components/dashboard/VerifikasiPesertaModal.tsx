"use client";

import * as React from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { verifyParticipantRegistration } from "@/app/actions/participants";
import { getCompetitionRequireDocumentsMap } from "@/app/actions/competitions";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertCircle,
  Trophy,
  School,
  Mail,
  Phone,
  ExternalLink,
  ShieldAlert,
  Info,
  Tag,
} from "lucide-react";

export interface ParticipantVerificationTarget {
  id: string; // participantId
  registrationId?: string;
  fullName: string;
  registrationNumber?: string;
  institution?: string;
  email?: string;
  phone?: string;
  competitionId?: string;
  competitionName?: string;
  category?: "individu" | "kelompok";
  teamName?: string;
  teamMembers?: string[];
  status?: string;
  rejectionReason?: string;
  documents?: Array<{
    id: string;
    type: string;
    fileName: string;
    fileUrl?: string;
    status: string;
  }>;
}

interface VerifikasiPesertaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantVerificationTarget | null;
  onSuccess?: () => void;
}

const QUICK_REJECTION_TEMPLATES = [
  "Kartu Pelajar / Identitas diri tidak jelas atau buram.",
  "Surat tugas / rekomendasi dari kepala sekolah belum dilampirkan.",
  "Foto bukti pendaftaran / formulir tidak sesuai ketentuan.",
  "Kategori kelas / jenjang usia peserta tidak memenuhi kriteria cabang lomba.",
  "Dokumen persyaratan wajib belum diunggah oleh peserta.",
];

export function VerifikasiPesertaModal({
  open,
  onOpenChange,
  participant,
  onSuccess,
}: VerifikasiPesertaModalProps) {
  const [requireDocsMap, setRequireDocsMap] = React.useState<Record<string, boolean>>({});
  const [loadingDocsMap, setLoadingDocsMap] = React.useState(false);

  // Mode: "view" (tinjau berkas & pilih setujui/tolak) atau "reject" (isi alasan penolakan)
  const [mode, setMode] = React.useState<"view" | "reject">("view");
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Muat peta status wajib berkas kompetisi
  React.useEffect(() => {
    if (open) {
      setMode("view");
      setRejectionReason("");
      setErrorMsg(null);
      setSuccessMsg(null);
      setLoadingDocsMap(true);

      getCompetitionRequireDocumentsMap()
        .then((map) => {
          setRequireDocsMap(map || {});
        })
        .catch((err) => {
          console.error("Gagal memuat aturan berkas lomba:", err);
        })
        .finally(() => {
          setLoadingDocsMap(false);
        });
    }
  }, [open]);

  if (!participant) return null;

  // Cek apakah lomba mewajibkan berkas fisik
  // Default true jika tidak ada konfigurasi khusus
  const isDocRequired =
    participant.competitionId && requireDocsMap[participant.competitionId] !== undefined
      ? requireDocsMap[participant.competitionId]
      : true;

  const hasDocuments = Array.isArray(participant.documents) && participant.documents.length > 0;

  // Jika wajib berkas tapi berkas kosong -> persetujuan dikunci
  const isApproveBlocked = isDocRequired && !hasDocuments;

  // Aksi Menyetujui Pendaftaran
  const handleApprove = async () => {
    if (isApproveBlocked) {
      setErrorMsg("Cabang lomba ini mewajibkan berkas fisik. Peserta belum mengunggah dokumen persyaratan.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Panggil Server Action langsung
      const res = await verifyParticipantRegistration(participant.id, "approve");

      if (res?.success) {
        setSuccessMsg(`Pendaftaran & berkas ${participant.fullName} berhasil disetujui (Status: Terverifikasi)!`);
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1200);
        return;
      }

      // 2. Fallback via API route jika Server Action mengembalikan error
      const apiRes = await fetch("/api/participants/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          action: "approve",
        }),
      });

      const data = await apiRes.json();
      if (data.success) {
        setSuccessMsg(`Pendaftaran & berkas ${participant.fullName} berhasil disetujui (Status: Terverifikasi)!`);
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1200);
      } else {
        setErrorMsg(data.error || res?.error || "Gagal menyetujui pendaftaran peserta.");
      }
    } catch (err: unknown) {
      console.error("Error approving participant:", err);
      setErrorMsg("Terjadi kesalahan sistem saat menyetujui pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aksi Menolak Pendaftaran
  const handleReject = async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      setErrorMsg("Alasan penolakan berkas wajib diisi.");
      return;
    }
    if (reason.length < 5) {
      setErrorMsg("Alasan penolakan minimal 5 karakter agar jelas bagi peserta.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Panggil Server Action langsung
      const res = await verifyParticipantRegistration(participant.id, "reject", reason);

      if (res?.success) {
        setSuccessMsg(`Pendaftaran peserta ${participant.fullName} telah ditolak dengan catatan penolakan.`);
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1200);
        return;
      }

      // 2. Fallback via API route
      const apiRes = await fetch("/api/participants/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.id,
          action: "reject",
          rejectionReason: reason,
        }),
      });

      const data = await apiRes.json();
      if (data.success) {
        setSuccessMsg(`Pendaftaran peserta ${participant.fullName} telah ditolak dengan catatan penolakan.`);
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1200);
      } else {
        setErrorMsg(data.error || res?.error || "Gagal menolak pendaftaran peserta.");
      }
    } catch (err: unknown) {
      console.error("Error rejecting participant:", err);
      setErrorMsg("Terjadi kesalahan sistem saat menolak pendaftaran.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTemplate = (tmpl: string) => {
    setRejectionReason((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tmpl;
      if (trimmed.includes(tmpl)) return prev;
      return `${trimmed}\n${tmpl}`;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="space-y-5 max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                Verifikasi Berkas & Pendaftaran
              </DialogTitle>
              <DialogDescription className="text-xs">
                Tinjau kelengkapan dokumen persyaratan dan tentukan status pendaftaran peserta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Notifikasi Sukses / Error */}
        {successMsg && (
          <div className="p-3.5 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Pemberitahuan:</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Ringkasan Profil Peserta */}
        <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground text-sm">
                  {participant.fullName}
                </span>
                {participant.registrationNumber && (
                  <Badge variant="gold" className="text-[10px] font-mono font-bold">
                    {participant.registrationNumber}
                  </Badge>
                )}
                {participant.status && (
                  <Badge
                    variant={
                      participant.status === "terverifikasi"
                        ? "success"
                        : participant.status === "menunggu_verifikasi"
                        ? "warning"
                        : "danger"
                    }
                    className="text-[10px]"
                  >
                    {participant.status.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-0.5">
                {participant.institution && (
                  <span className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{participant.institution}</span>
                  </span>
                )}
                {participant.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{participant.email}</span>
                  </span>
                )}
                {participant.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{participant.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Cabang Lomba */}
          <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="h-4 w-4 text-accent shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase font-mono">
                  Cabang Lomba yang Diikuti
                </span>
                <span className="font-semibold text-foreground truncate">
                  {participant.competitionName || "Belum Memilih Lomba"}
                </span>
              </div>
            </div>
            {participant.category && (
              <Badge variant="default" className="text-[10px] shrink-0 uppercase">
                {participant.category}
              </Badge>
            )}
          </div>

          {/* Rombongan / Tim jika ada */}
          {participant.teamMembers && participant.teamMembers.length > 0 && (
            <div className="text-xs space-y-1 pt-1 border-t border-border/50">
              <span className="font-semibold text-foreground text-[11px]">
                Anggota Tim ({participant.teamName || "Grup"}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {participant.teamMembers.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-muted/80 text-[11px] text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODE 1: VIEW & VERIFIKASI DOKUMEN */}
        {mode === "view" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  <span>Berkas Dokumen Persyaratan</span>
                </h4>
                <Badge
                  variant={isDocRequired ? "warning" : "default"}
                  className="text-[10px]"
                >
                  {isDocRequired ? "Wajib Upload Berkas" : "Berkas Opsional / Bebas"}
                </Badge>
              </div>

              {/* Status Berkas */}
              {hasDocuments ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {participant.documents!.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        <div className="p-2 rounded-lg bg-muted text-accent shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate min-w-0">
                          <span className="font-semibold text-foreground block truncate">
                            {doc.fileName || "Dokumen Persyaratan"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono uppercase">
                            Tipe: {doc.type ? doc.type.replace(/_/g, " ") : "Lampiran"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={doc.status === "valid" ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {doc.status.toUpperCase()}
                        </Badge>
                        {doc.fileUrl ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1 cursor-pointer"
                            onClick={() => window.open(doc.fileUrl, "_blank")}
                            title="Buka dokumen di tab baru"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Buka</span>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Tanpa URL
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : isDocRequired ? (
                /* Peringatan: Cabang lomba wajib berkas tapi peserta belum unggah */
                <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-xs text-danger space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Berkas Wajib Belum Diunggah</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Cabang lomba ini mensyaratkan berkas fisik, namun peserta belum mengunggah dokumen apapun.
                    Tombol <strong>Setujui Pendaftaran</strong> dinonaktifkan. Anda dapat menunggu peserta mengunggah berkas atau menolak pendaftaran untuk meminta revisi.
                  </p>
                </div>
              ) : (
                /* Info: Cabang lomba tidak wajib berkas */
                <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs text-sky-800 dark:text-sky-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Info className="h-4 w-4 shrink-0 text-sky-500" />
                    <span>Cabang Lomba Tidak Memerlukan Berkas Fisik</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Peserta tidak diharuskan melampirkan berkas fisik pada cabang lomba ini. Anda dapat langsung menyetujui pendaftaran.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs cursor-pointer w-full sm:w-auto"
              >
                Tutup
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMode("reject");
                    setErrorMsg(null);
                  }}
                  disabled={isSubmitting}
                  className="text-xs gap-1.5 border-danger/40 text-danger hover:bg-danger/10 cursor-pointer w-full sm:w-auto"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Tolak Berkas</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleApprove}
                  disabled={isSubmitting || isApproveBlocked || loadingDocsMap}
                  className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer w-full sm:w-auto shadow-sm"
                  title={
                    isApproveBlocked
                      ? "Persetujuan dikunci: Peserta wajib mengunggah berkas persyaratan terlebih dahulu"
                      : "Setujui berkas dan konfirmasi pendaftaran"
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    {isApproveBlocked ? "Persetujuan Terkunci" : "Setujui Pendaftaran"}
                  </span>
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          /* MODE 2: FORM PENOLAKAN DENGAN TEMPLATE CEPAT */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-danger" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  Form Penolakan Berkas / Pendaftaran
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Pilih template alasan penolakan cepat di bawah atau tuliskan catatan perbaikan untuk peserta.
              </p>
            </div>

            {/* Template Alasan Cepat */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3 text-accent" />
                <span>Template Alasan Cepat (Klik untuk memilih):</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REJECTION_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="text-[11px] text-left px-2.5 py-1 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer"
                  >
                    + {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Alasan Penolakan */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Alasan Penolakan Lengkap <span className="text-danger">*</span>
              </label>
              <Textarea
                rows={3}
                placeholder="Contoh: Kartu pelajar buram, mohon upload ulang foto kartu pelajar yang jelas dan terbaca..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs resize-none"
              />
              <span className="text-[10px] text-muted-foreground block text-right">
                Minimal 5 karakter ({rejectionReason.trim().length}/5)
              </span>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setMode("view");
                  setErrorMsg(null);
                }}
                disabled={isSubmitting}
                className="text-xs cursor-pointer w-full sm:w-auto"
              >
                Kembali ke Peninjauan
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || rejectionReason.trim().length < 5}
                className="text-xs gap-1.5 font-bold cursor-pointer w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span>Konfirmasi Tolak Pendaftaran</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </div>
    </Dialog>
  );
}
