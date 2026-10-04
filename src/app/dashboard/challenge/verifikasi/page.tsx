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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Eye,
  FileVideo,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  User,
  Building,
  Calendar,
} from "lucide-react";
import {
  getChallengeSubmissions,
  verifyChallengeSubmissionAction,
  type ChallengeSubmissionItem,
} from "@/app/actions/challenges";

export default function DashboardVerifikasiChallengePage() {
  const [submissions, setSubmissions] = React.useState<ChallengeSubmissionItem[]>([]);
  const [stats, setStats] = React.useState({
    menunggu: 0,
    disetujui: 0,
    ditolak: 0,
    total: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"menunggu" | "disetujui" | "ditolak" | "semua">("menunggu");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal Dialog States
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] = React.useState<ChallengeSubmissionItem | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [previewModalItem, setPreviewModalItem] = React.useState<ChallengeSubmissionItem | null>(null);
  const [actionMessage, setActionMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = React.useCallback(async (statusTab: "menunggu" | "disetujui" | "ditolak" | "semua") => {
    setLoading(true);
    try {
      const res = await getChallengeSubmissions(statusTab);
      if (res.success) {
        setSubmissions(res.submissions);
        setStats(res.stats);
      } else {
        setActionMessage({ type: "error", text: res.error || "Gagal memuat data verifikasi." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  // Handler: Setujui Bukti
  const handleApprove = async (sub: ChallengeSubmissionItem) => {
    setProcessingId(sub.id);
    setActionMessage(null);
    try {
      const res = await verifyChallengeSubmissionAction({
        submissionId: sub.id,
        status: "disetujui",
      });

      if (res.success) {
        setActionMessage({
          type: "success",
          text: `Bukti ${sub.participantName} berhasil disetujui! +${sub.challengePoints} Poin telah ditambahkan ke akun peserta.`,
        });
        await loadData(activeTab);
      } else {
        setActionMessage({ type: "error", text: res.error || "Gagal menyetujui bukti." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Terjadi kesalahan sistem saat memproses." });
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Konfirmasi Tolak Bukti
  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setProcessingId(rejectModalItem.id);
    setActionMessage(null);
    try {
      const res = await verifyChallengeSubmissionAction({
        submissionId: rejectModalItem.id,
        status: "ditolak",
        note: rejectReason.trim() || "Bukti belum memenuhi kriteria challenge.",
      });

      if (res.success) {
        setActionMessage({
          type: "success",
          text: `Bukti dari ${rejectModalItem.participantName} telah ditolak.`,
        });
        setRejectModalItem(null);
        setRejectReason("");
        await loadData(activeTab);
      } else {
        setActionMessage({ type: "error", text: res.error || "Gagal menolak bukti." });
      }
    } catch {
      setActionMessage({ type: "error", text: "Terjadi kesalahan saat memproses penolakan." });
    } finally {
      setProcessingId(null);
    }
  };

  // Filter pencarian
  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.toLowerCase();
    return (
      sub.participantName.toLowerCase().includes(q) ||
      sub.challengeTitle.toLowerCase().includes(q) ||
      sub.institution.toLowerCase().includes(q) ||
      (sub.description && sub.description.toLowerCase().includes(q))
    );
  });

  const getProofIcon = (type: string) => {
    switch (type) {
      case "video":
        return <FileVideo className="h-4 w-4 text-blue-500" />;
      case "foto":
        return <ImageIcon className="h-4 w-4 text-emerald-500" />;
      case "tautan":
        return <ExternalLink className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header Navigation */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Verifikasi Bukti Challenge Peserta</span>
                <ShieldCheck className="h-6 w-6 text-accent" />
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Moderasi bukti unggahan foto, video, dan tautan misi festival. Poin reward otomatis dicairkan saat disetujui.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(activeTab)}
              disabled={loading}
              className="gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </div>

        {/* Action Alert Message */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
              actionMessage.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs & Search */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            {/* Filter Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: "menunggu", label: "Menunggu", count: stats.menunggu, variant: "warning" },
                { id: "disetujui", label: "Disetujui", count: stats.disetujui, variant: "success" },
                { id: "ditolak", label: "Ditolak", count: stats.ditolak, variant: "destructive" },
                { id: "semua", label: "Semua Kiriman", count: stats.total, variant: "secondary" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeTab === tab.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari peserta / challenge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-8.5 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat data verifikasi challenge dari database...</p>
          </div>
        ) : filteredSubmissions.length > 0 ? (
          <div className="space-y-4">
            {filteredSubmissions.map((sub) => {
              const isPending = sub.status === "menunggu";
              const isApproved = sub.status === "disetujui";
              const isRejected = sub.status === "ditolak";
              const isProcessing = processingId === sub.id;

              return (
                <Card
                  key={sub.id}
                  className={`p-5 space-y-4 transition-all ${
                    isPending
                      ? "border-accent/40 bg-accent/5 hover:border-accent"
                      : isApproved
                      ? "border-success/30 bg-card"
                      : "border-border bg-card opacity-85"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Submission Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isPending && (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Menunggu Verifikasi</span>
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Disetujui (+{sub.pointsAwarded} Poin)</span>
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="danger" className="text-[10px] gap-1">
                            <XCircle className="h-3 w-3" />
                            <span>Ditolak</span>
                          </Badge>
                        )}

                        <Badge variant="gold" className="text-[10px] gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>+{sub.challengePoints} Poin Reward</span>
                        </Badge>

                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 uppercase">
                          {getProofIcon(sub.proofType)}
                          <span>Tipe: {sub.proofType}</span>
                        </span>
                      </div>

                      <h3 className="font-heading text-base sm:text-lg font-bold text-foreground">
                        {sub.challengeTitle}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-accent shrink-0" />
                          {sub.participantName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 shrink-0" />
                          {sub.institution}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {new Date(sub.submittedAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })} WIB
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Tombol Preview Bukti */}
                      {sub.proofUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewModalItem(sub)}
                          className="text-xs gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-accent" />
                          <span>Lihat Bukti</span>
                        </Button>
                      )}

                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectModalItem(sub);
                              setRejectReason("");
                            }}
                            disabled={isProcessing}
                            className="text-xs gap-1 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Tolak</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(sub)}
                            disabled={isProcessing}
                            className="text-xs gap-1.5 cursor-pointer shadow-xs"
                          >
                            {isProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Setujui (+{sub.challengePoints} Pts)</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Catatan / Keterangan Peserta */}
                  {sub.description && (
                    <div className="p-3.5 rounded-lg border border-border bg-card text-xs text-foreground/90 leading-relaxed space-y-1">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold block">
                        Keterangan dari Peserta:
                      </span>
                      <p className="italic">&ldquo;{sub.description}&rdquo;</p>
                    </div>
                  )}

                  {/* Catatan Verifikator jika sudah ditinjau */}
                  {!isPending && sub.verifiedAt && (
                    <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>
                        Diverifikasi oleh: <strong>{sub.verifiedByName || "Panitia"}</strong> pada{" "}
                        {new Date(sub.verifiedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })} WIB
                      </span>
                      {sub.note && (
                        <span className="italic text-foreground/80">
                          Catatan Panitia: &ldquo;{sub.note}&rdquo;
                        </span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-2xl bg-card space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto opacity-80" />
            <h3 className="font-heading text-base font-bold text-foreground">
              {activeTab === "menunggu"
                ? "Semua Bukti Challenge Telah Terverifikasi!"
                : "Tidak ada kiriman bukti pada kategori ini."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {activeTab === "menunggu"
                ? "Tidak ada kiriman bukti baru yang sedang menunggu moderasi."
                : "Silakan pilih tab lain atau gunakan kata kunci pencarian berbeda."}
            </p>
          </div>
        )}

        {/* Dialog: Preview Bukti */}
        <Dialog open={!!previewModalItem} onOpenChange={(open) => !open && setPreviewModalItem(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Eye className="h-4 w-4 text-accent" />
              <span>Pratinjau Bukti: {previewModalItem?.challengeTitle}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pengunggah: <strong>{previewModalItem?.participantName}</strong> ({previewModalItem?.institution})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {previewModalItem?.proofType === "foto" && previewModalItem.proofUrl && (
              <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[420px]">
                <img
                  src={previewModalItem.proofUrl}
                  alt="Bukti Foto"
                  className="max-h-[420px] w-auto object-contain rounded-lg"
                />
              </div>
            )}

            {previewModalItem?.proofType === "video" && previewModalItem.proofUrl && (
              <div className="rounded-xl overflow-hidden border border-border bg-black/10">
                {previewModalItem.proofUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video src={previewModalItem.proofUrl} controls className="w-full max-h-[380px] rounded-lg" />
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <FileVideo className="h-12 w-12 text-blue-500 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Tautan Video Eksternal (YouTube / Drive / Reel)
                    </p>
                    <a
                      href={previewModalItem.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-bold underline"
                    >
                      <span>Buka Tautan Video</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {previewModalItem?.proofType === "tautan" && previewModalItem.proofUrl && (
              <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                <p className="text-xs font-semibold text-foreground">Tautan Eksternal:</p>
                <a
                  href={previewModalItem.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent underline break-all flex items-center gap-1.5"
                >
                  <span>{previewModalItem.proofUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
            )}

            {previewModalItem?.description && (
              <div className="p-3.5 rounded-lg border border-border bg-card text-xs text-foreground leading-relaxed">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold block mb-1">
                  Catatan Peserta:
                </span>
                <p>&ldquo;{previewModalItem.description}&rdquo;</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            {previewModalItem?.proofUrl && (
              <a
                href={previewModalItem.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Buka di Tab Baru</span>
              </a>
            )}
            <Button size="sm" variant="outline" onClick={() => setPreviewModalItem(null)} className="text-xs cursor-pointer">
              Tutup
            </Button>
          </DialogFooter>
        </Dialog>

        {/* Dialog: Konfirmasi Penolakan Bukti */}
        <Dialog open={!!rejectModalItem} onOpenChange={(open) => !open && setRejectModalItem(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-danger">
              <XCircle className="h-5 w-5" />
              <span>Tolak Bukti Challenge</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Anda akan menolak bukti dari <strong>{rejectModalItem?.participantName}</strong> untuk challenge{" "}
              <strong>{rejectModalItem?.challengeTitle}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs font-semibold text-foreground block">
              Alasan / Catatan Penolakan (Opsional):
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Foto tidak terlihat jelas, video tidak sesuai tema ikrar sastra, atau tautan tidak dapat diakses."
              rows={3}
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-danger"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectModalItem(null)}
              disabled={!!processingId}
              className="text-xs cursor-pointer"
            >
              Batal
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!!processingId}
              className="text-xs gap-1 cursor-pointer"
            >
              {processingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>Konfirmasi Tolak</span>
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
