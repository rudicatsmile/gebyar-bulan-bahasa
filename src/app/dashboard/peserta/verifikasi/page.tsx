"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Participant } from "@/lib/dummy-data";
import { verifyParticipantRegistration } from "@/app/actions/participants";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RotateCcw,
  Search,
} from "lucide-react";

export default function DashboardVerifikasiBerkasPage() {
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchParticipants = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/participants", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.participants)) {
          setParticipants(data.participants);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data peserta:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // HANYA tampilkan peserta yang statusnya 'menunggu_verifikasi' DAN SUDAH UPLOAD BERKAS (documents.length > 0)
  const pendingList = participants.filter(
    (p) =>
      p.status === "menunggu_verifikasi" &&
      Array.isArray(p.documents) &&
      p.documents.length > 0
  );

  const filteredPendingList = pendingList.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.registrationNumber.toLowerCase().includes(q) ||
      p.institution.toLowerCase().includes(q) ||
      (p.competitionName && p.competitionName.toLowerCase().includes(q))
    );
  });

  const handleApprove = async (id: string, participantName: string) => {
    setProcessingId(id);
    setFeedback(null);
    try {
      // 1. Panggil Server Action langsung
      const actionRes = await verifyParticipantRegistration(id, "approve");

      if (actionRes?.success) {
        setFeedback({
          type: "success",
          message: `Berkas dan pendaftaran ${participantName} berhasil disetujui (Status: Terverifikasi)!`,
        });
        setParticipants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "terverifikasi" } : p))
        );
        await fetchParticipants();
        return;
      }

      // 2. Fallback via API route jika Server Action mengembalikan error
      const res = await fetch("/api/participants/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: id,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Berkas dan pendaftaran ${participantName} berhasil disetujui (Status: Terverifikasi)!`,
        });
        setParticipants((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "terverifikasi" } : p))
        );
        await fetchParticipants();
      } else {
        setFeedback({
          type: "error",
          message: data.error || actionRes?.error || "Gagal menyetujui berkas pada database.",
        });
      }
    } catch (err: unknown) {
      console.error("Error approve participant:", err);
      try {
        const res = await fetch("/api/participants/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: id, action: "approve" }),
        });
        const data = await res.json();
        if (data.success) {
          setFeedback({
            type: "success",
            message: `Berkas dan pendaftaran ${participantName} berhasil disetujui (Status: Terverifikasi)!`,
          });
          setParticipants((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: "terverifikasi" } : p))
          );
          await fetchParticipants();
          return;
        }
      } catch (_) {}

      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat memperbarui status di database.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (p: Participant) => {
    setSelectedParticipant(p);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedParticipant || !rejectionReason.trim()) return;
    const targetId = selectedParticipant.id;
    const targetName = selectedParticipant.fullName;
    const note = rejectionReason.trim();

    setProcessingId(targetId);
    setFeedback(null);
    try {
      // 1. Panggil Server Action langsung
      const actionRes = await verifyParticipantRegistration(targetId, "reject", note);

      if (actionRes?.success) {
        setFeedback({
          type: "success",
          message: `Berkas peserta ${targetName} telah ditolak (Status: Ditolak).`,
        });
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, status: "ditolak", rejectionReason: note } : p
          )
        );
        setRejectModalOpen(false);
        setSelectedParticipant(null);
        await fetchParticipants();
        return;
      }

      // 2. Fallback via API route
      const res = await fetch("/api/participants/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: targetId,
          action: "reject",
          rejectionReason: note,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Berkas peserta ${targetName} telah ditolak (Status: Ditolak).`,
        });
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, status: "ditolak", rejectionReason: note } : p
          )
        );
        setRejectModalOpen(false);
        setSelectedParticipant(null);
        await fetchParticipants();
      } else {
        setFeedback({
          type: "error",
          message: data.error || actionRes?.error || "Gagal menolak berkas di database.",
        });
      }
    } catch (err: unknown) {
      console.error("Error reject participant:", err);
      try {
        const res = await fetch("/api/participants/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: targetId,
            action: "reject",
            rejectionReason: note,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setFeedback({
            type: "success",
            message: `Berkas peserta ${targetName} telah ditolak (Status: Ditolak).`,
          });
          setParticipants((prev) =>
            prev.map((p) =>
              p.id === targetId ? { ...p, status: "ditolak", rejectionReason: note } : p
            )
          );
          setRejectModalOpen(false);
          setSelectedParticipant(null);
          await fetchParticipants();
          return;
        }
      } catch (_) {}

      setFeedback({
        type: "error",
        message: "Terjadi kesalahan saat memproses penolakan di database.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Antrean Verifikasi Berkas Peserta
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Periksa keabsahan kartu pelajar, surat izin sekolah, dan naskah/karya peserta sebelum dinilai oleh juri.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchParticipants}
                disabled={isMounted ? isLoading : false}
                suppressHydrationWarning
                className="text-xs gap-1.5 cursor-pointer"
                title="Segarkan data"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isMounted && isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
              <Badge variant="warning" className="text-xs" suppressHydrationWarning>
                {isMounted ? pendingList.length : 0} Berkas Menunggu
              </Badge>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
              feedback.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Filter / Search Bar */}
        {pendingList.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
            <Search className="h-4 w-4 text-muted-foreground ml-1" />
            <input
              type="text"
              placeholder="Cari nama peserta, nomor registrasi, instansi, atau cabang lomba..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        )}

        {isLoading && participants.length === 0 ? (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
            <p className="text-xs text-muted-foreground">Memuat antrean verifikasi...</p>
          </div>
        ) : filteredPendingList.length > 0 ? (
          <div className="space-y-4">
            {filteredPendingList.map((p) => {
              const isProcessingThis = processingId === p.id;
              return (
                <Card key={p.id} className="p-6 space-y-4 border-accent/40 bg-accent/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-accent">
                          {p.registrationNumber}
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          MENUNGGU TINJAUAN
                        </Badge>
                      </div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {p.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {p.institution} • Mendaftar: <strong>{p.competitionName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectModal(p)}
                        disabled={isProcessingThis || !!processingId}
                        className="text-xs gap-1 cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Tolak Berkas</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleApprove(p.id, p.fullName)}
                        disabled={isProcessingThis || !!processingId}
                        className="text-xs gap-1 cursor-pointer"
                      >
                        {isProcessingThis ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>{isProcessingThis ? "Menyimpan..." : "Setujui Berkas"}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Berkas List */}
                  <div className="pt-3 border-t border-accent/20 space-y-2">
                    <span className="text-xs font-semibold text-foreground">
                      Lampiran Dokumen Unggahan:
                    </span>
                    {p.documents && p.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {p.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 rounded-lg border border-border bg-card flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="h-4 w-4 text-accent shrink-0" />
                              <div className="truncate">
                                <span className="text-xs font-medium text-foreground block truncate">
                                  {doc.fileName}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                                  {doc.type.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 text-accent cursor-pointer"
                              onClick={() => {
                                if (doc.fileUrl) {
                                  window.open(doc.fileUrl, "_blank");
                                } else {
                                  alert("Tautan berkas fisik tidak tersedia atau belum diunggah.");
                                }
                              }}
                            >
                              Lihat
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Belum ada dokumen fisik yang diunggah.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Semua Berkas Telah Terverifikasi!
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tidak ada berkas peserta yang sedang menunggu verifikasi saat ini. Seluruh peserta terverifikasi sudah berhak dinilai oleh dewan juri.
            </p>
          </div>
        )}

        {/* Modal Tolak Berkas */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tolak Berkas Pendaftaran</DialogTitle>
              <DialogDescription>
                Tuliskan alasan penolakan secara jelas agar peserta dapat memperbaiki dan mengunggah ulang berkas persyaratan.
              </DialogDescription>
            </DialogHeader>

            <Textarea
              label="Catatan Alasan Penolakan *"
              placeholder="Contoh: Kartu Pelajar buram / tidak menyertakan surat rekomendasi kepala sekolah..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              required
            />

            <DialogFooter>
              <Button
                variant="outline"
                disabled={!!processingId}
                onClick={() => setRejectModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectionReason.trim() || !!processingId}
                onClick={handleConfirmReject}
                className="gap-1.5 cursor-pointer"
              >
                {processingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{processingId ? "Menyimpan..." : "Konfirmasi Tolak Berkas"}</span>
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
