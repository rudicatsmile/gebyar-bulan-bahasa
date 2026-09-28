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
import { FileCheck, CheckCircle2, XCircle, FileText, ArrowLeft, Loader2 } from "lucide-react";

export default function DashboardVerifikasiBerkasPage() {
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedParticipant, setSelectedParticipant] = React.useState<Participant | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

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
    fetchParticipants();
  }, [fetchParticipants]);

  const pendingList = participants.filter((p) => p.status === "menunggu_verifikasi");

  const handleApprove = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "terverifikasi" } : p))
    );
  };

  const openRejectModal = (p: Participant) => {
    setSelectedParticipant(p);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedParticipant || !rejectionReason) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === selectedParticipant.id
          ? { ...p, status: "ditolak", rejectionReason }
          : p
      )
    );
    setRejectModalOpen(false);
    setSelectedParticipant(null);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Antrean Verifikasi Berkas Peserta
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Periksa keabsahan kartu pelajar, surat izin sekolah, dan naskah/karya peserta sebelum dinilai oleh juri.
              </p>
            </div>
            <Badge variant="warning" className="text-xs">
              {pendingList.length} Berkas Menunggu
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
            <p className="text-xs text-muted-foreground">Memuat berkas peserta...</p>
          </div>
        ) : pendingList.length > 0 ? (
          <div className="space-y-4">
            {pendingList.map((p) => (
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
                      className="text-xs gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Tolak Berkas</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleApprove(p.id)}
                      className="text-xs gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Setujui Berkas</span>
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
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-accent">
                            Lihat
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Belum ada berkas yang diunggah.</p>
                  )}
                </div>
              </Card>
            ))}
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
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleConfirmReject}>
                Konfirmasi Tolak Berkas
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
