"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminStands,
  upsertStand,
  deleteStand,
  toggleStandStatus,
  type AdminStandItem,
} from "@/app/actions/stands";
import {
  ArrowLeft,
  QrCode,
  Store,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Coins,
} from "lucide-react";
import { QRCodeCard } from "@/components/qrcode/QRCodeGenerator";

export default function DashboardKelolaStandPage() {
  const [stands, setStands] = React.useState<AdminStandItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [previewStand, setPreviewStand] = React.useState<AdminStandItem | null>(null);
  const [selectedStand, setSelectedStand] = React.useState<AdminStandItem | null>(null);

  // Clipboard state
  const [copiedCode, setCopiedCode] = React.useState("");

  // Feedback state
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [points, setPoints] = React.useState("10");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);

  // Load stands from database
  const loadStands = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminStands();
      if (res.success) {
        setStands(res.stands);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal memuat data stand dari database",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data";
      setFeedback({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadStands();
  }, [loadStands]);

  const handleCopy = (standCode: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(standCode);
      setCopiedCode(standCode);
      setTimeout(() => setCopiedCode(""), 2000);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedStand(null);
    setName("");
    setCode("");
    setLocation("");
    setPoints("10");
    setDescription("");
    setIsActive(true);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (stand: AdminStandItem) => {
    setIsEditing(true);
    setSelectedStand(stand);
    setName(stand.name);
    setCode(stand.code);
    setLocation(stand.location);
    setPoints(String(stand.points));
    setDescription(stand.description || "");
    setIsActive(stand.isActive);
    setDialogOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (stand: AdminStandItem) => {
    setSelectedStand(stand);
    setDeleteDialogOpen(true);
  };

  // Submit Create or Edit Stand
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await upsertStand({
        id: isEditing && selectedStand ? selectedStand.id : undefined,
        name,
        code,
        location,
        points: parseInt(points) || 10,
        description,
        qrToken: isEditing && selectedStand ? selectedStand.qrToken : undefined,
        isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: isEditing
            ? `Data stand "${name}" berhasil diperbarui.`
            : `Stand "${name}" berhasil ditambahkan ke database.`,
        });
        setDialogOpen(false);
        await loadStands();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan stand.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Stand
  const handleConfirmDelete = async () => {
    if (!selectedStand) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await deleteStand(selectedStand.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Stand "${selectedStand.name}" berhasil dihapus dari database.`,
        });
        setDeleteDialogOpen(false);
        setSelectedStand(null);
        await loadStands();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menghapus stand.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (stand: AdminStandItem) => {
    const newStatus = !stand.isActive;
    try {
      const res = await toggleStandStatus(stand.id, newStatus);
      if (res.success) {
        setStands((prev) =>
          prev.map((s) => (s.id === stand.id ? { ...s, isActive: newStatus } : s))
        );
      }
    } catch (err) {
      console.error("Gagal mengubah status stand:", err);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Top Navigation & Header */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Store className="h-7 w-7 text-accent" />
                <span>Kelola Stand Pameran & QR Token</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Konfigurasi kode unik stand, token QR cetak stiker, perolehan poin kunjungan, dan status operasional booth.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleOpenCreate}
                size="sm"
                className="text-xs gap-1.5 cursor-pointer font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Stand Baru</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
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
              className="text-xs hover:underline cursor-pointer font-bold"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Tabel Stand Pameran */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Stand Pameran</TableHead>
                <TableHead className="text-center">Kode Unik</TableHead>
                <TableHead>Lokasi Booth</TableHead>
                <TableHead className="text-center">Poin / Kunjungan</TableHead>
                <TableHead className="text-center">Total Kunjungan</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi & QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-accent" />
                    <span className="text-xs">Memuat data stand dari database...</span>
                  </TableCell>
                </TableRow>
              ) : stands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <span className="text-sm font-semibold block text-foreground">
                      Belum Ada Stand Pameran Terdaftar
                    </span>
                    <span className="text-xs block mt-1">
                      Klik tombol &ldquo;Tambah Stand Baru&rdquo; untuk mendaftarkan stand budaya.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                stands.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <strong className="text-foreground text-xs sm:text-sm block">
                        {s.name}
                      </strong>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">
                        {s.description || "Stand edukasi pameran kebudayaan."}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-accent text-sm">
                      <span className="px-2.5 py-1 rounded bg-primary text-accent tracking-wider">
                        {s.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>{s.location}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                      +{s.points} Pts
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {s.visitCount} Kali
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className="cursor-pointer"
                        title="Klik untuk ubah status aktif/nonaktif"
                      >
                        <Badge
                          variant={s.isActive ? "success" : "default"}
                          className="text-[10px] hover:opacity-80 transition-opacity"
                        >
                          {s.isActive ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Salin Kode */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(s.code)}
                          className="text-xs h-8 px-2.5 gap-1 cursor-pointer"
                          title="Salin Kode Stand"
                        >
                          {copiedCode === s.code ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>{copiedCode === s.code ? "Disalin" : "Salin"}</span>
                        </Button>

                        {/* Tombol Lihat & Cetak QR */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewStand(s)}
                          className="text-xs h-8 px-2.5 gap-1 border-accent/30 text-accent hover:bg-accent/10 cursor-pointer"
                          title="Lihat & Cetak QR Code"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>QR</span>
                        </Button>

                        {/* Tombol EDIT */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(s)}
                          className="text-xs h-8 px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                          title="Edit Stand"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>

                        {/* Tombol DELETE */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleOpenDelete(s)}
                          className="text-xs h-8 px-2.5 gap-1 font-semibold cursor-pointer"
                          title="Hapus Stand"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Modal Buat / Ubah Data Stand */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Ubah Data Stand Pameran" : "Tambah Stand Pameran Baru"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Perbarui informasi stand, lokasi booth, kode unik, dan reward poin."
                  : "Daftarkan stand pameran budaya baru untuk tantangan keliling stand peserta."}
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Nama Stand Pameran *"
              placeholder="Contoh: Stand Membaca Puisi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Kode Unik Stand (6 Karakter) *"
                placeholder="Contoh: PUISI01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />

              <Input
                label="Poin Kunjungan *"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
                min={1}
              />
            </div>

            <Input
              label="Lokasi Booth / Selasar *"
              placeholder="Contoh: Selasar Barat No. 01 (Gedung C)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <Textarea
              label="Deskripsi Stand & Aktivitas Pengunjung"
              placeholder="Jelaskan aktivitas atau informasi menarik yang disajikan di stand ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Operasional Stand *
              </label>
              <select
                value={isActive ? "aktif" : "nonaktif"}
                onChange={(e) => setIsActive(e.target.value === "aktif")}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="aktif">Aktif (Dapat Dikunjungi & Diklaim Poin)</option>
                <option value="nonaktif">Nonaktif (Tutup / Ditutup Sementara)</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="font-bold gap-1.5">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEditing ? "Simpan Perubahan" : "Simpan Stand"}</span>
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Konfirmasi Hapus Stand */}
        {selectedStand && (
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-danger flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Konfirmasi Hapus Stand Pameran</span>
                </DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus stand{" "}
                  <strong className="text-foreground">&ldquo;{selectedStand.name}&rdquo;</strong> (Kode:{" "}
                  <strong className="text-accent font-mono">{selectedStand.code}</strong>)?
                  Tindakan ini permanen.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger space-y-1">
                <div className="flex justify-between">
                  <span>Lokasi:</span>
                  <strong>{selectedStand.location}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Poin per Kunjungan:</span>
                  <strong>+{selectedStand.points} Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Kunjungan Tercatat:</span>
                  <strong>{selectedStand.visitCount} Kali</strong>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="font-bold gap-1.5"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Hapus Permanen</span>
                </Button>
              </DialogFooter>
            </div>
          </Dialog>
        )}

        {/* Modal Pratinjau QR Stand Siap Cetak */}
        {previewStand && (
          <Dialog open={!!previewStand} onOpenChange={() => setPreviewStand(null)}>
            <div className="space-y-4 text-center p-4">
              <DialogHeader>
                <DialogTitle>{previewStand.name}</DialogTitle>
                <DialogDescription>
                  Kode QR token resmi untuk dicetak dan ditempel di meja stand pameran.
                </DialogDescription>
              </DialogHeader>

              <div className="py-2">
                <QRCodeCard
                  standName={previewStand.name}
                  standCode={previewStand.code}
                  qrToken={previewStand.qrToken}
                  location={previewStand.location}
                  points={previewStand.points}
                />
              </div>
            </div>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
