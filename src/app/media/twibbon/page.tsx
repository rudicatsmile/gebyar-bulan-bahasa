"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TwibbonItem } from "@/lib/dummy-data";
import { moderateTwibbon, getTwibbonsForModeration, deleteTwibbon } from "@/app/actions/twibbon";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type StatusFilter = "semua" | "menunggu" | "disetujui" | "ditolak";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "menunggu", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
];

export default function MediaTwibbonPage() {
  const [twibbons, setTwibbons] = React.useState<TwibbonItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionError, setActionError] = React.useState("");
  const [actionSuccess, setActionSuccess] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("semua");
  const [deleteTarget, setDeleteTarget] = React.useState<TwibbonItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Baca lewat Server Action (mengecek role staff di server) — bukan publicClient
  // (anon) yang membuat kiriman berstatus `menunggu` tersembunyi oleh RLS.
  const refresh = React.useCallback(async () => {
    try {
      const data = await getTwibbonsForModeration();
      setTwibbons(data);
    } catch (err) {
      console.error("Gagal memuat twibbon:", err);
    } finally {
      // `loading` sudah true pada render awal; tidak perlu setState sinkron di sini.
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleApprove = async (id: string) => {
    const item = twibbons.find((t) => t.id === id);
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "disetujui" } : t))
    );
    setActionError("");
    setActionSuccess("");
    try {
      const result = await moderateTwibbon({
        twibbonId: id,
        status: "disetujui",
        isFeatured: item?.isFeatured || false,
      });
      if (!result.success) {
        setActionError(result.error || "Gagal menyetujui twibbon.");
        await refresh();
      } else {
        setActionSuccess(`Twibbon milik "${item?.uploaderName || "peserta"}" disetujui.`);
      }
    } catch (e) {
      console.error("Gagal approve twibbon:", e);
      setActionError("Gagal menyetujui twibbon. Silakan coba lagi.");
      await refresh();
    }
  };

  const handleReject = async (id: string) => {
    const item = twibbons.find((t) => t.id === id);
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "ditolak" } : t))
    );
    setActionError("");
    setActionSuccess("");
    try {
      const result = await moderateTwibbon({
        twibbonId: id,
        status: "ditolak",
        isFeatured: item?.isFeatured || false,
      });
      if (!result.success) {
        setActionError(result.error || "Gagal menolak twibbon.");
        await refresh();
      } else {
        setActionSuccess(`Twibbon milik "${item?.uploaderName || "peserta"}" ditolak.`);
      }
    } catch (e) {
      console.error("Gagal reject twibbon:", e);
      setActionError("Gagal menolak twibbon. Silakan coba lagi.");
      await refresh();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetName = deleteTarget.uploaderName;
    setIsDeleting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const result = await deleteTwibbon(targetId);
      if (result.success) {
        setTwibbons((prev) => prev.filter((t) => t.id !== targetId));
        setActionSuccess(`Data twibbon milik "${targetName}" dan berkas gambarnya berhasil dihapus permanen.`);
        setDeleteTarget(null);
        await refresh();
      } else {
        setActionError(result.error || "Gagal menghapus data twibbon.");
      }
    } catch (err) {
      console.error("Gagal menghapus twibbon:", err);
      setActionError("Terjadi kesalahan sistem saat menghapus twibbon.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFeatured = async (id: string) => {
    const item = twibbons.find((t) => t.id === id);
    const newFeatured = !item?.isFeatured;
    setTwibbons((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFeatured: newFeatured } : t))
    );
    setActionError("");
    if (item && item.status !== "menunggu") {
      try {
        const result = await moderateTwibbon({
          twibbonId: id,
          status: item.status as "disetujui" | "ditolak",
          isFeatured: newFeatured,
        });
        if (!result.success) {
          setActionError(result.error || "Gagal memperbarui twibbon unggulan.");
          await refresh();
        }
      } catch (e) {
        console.error("Gagal update featured twibbon:", e);
        setActionError("Gagal memperbarui twibbon unggulan.");
        await refresh();
      }
    }
  };

  const countByStatus = (status: string) =>
    twibbons.filter((t) => t.status === status).length;

  const filteredTwibbons =
    statusFilter === "semua"
      ? twibbons
      : twibbons.filter((t) => t.status === statusFilter);

  const statusLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "Semua";

  return (
    <DashboardLayout role="media_center">
      <div className="space-y-6">
        <div>
          <Link
            href="/media"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Ringkasan Media</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Camera className="h-7 w-7 text-accent" />
                <span>Antrean Moderasi Twibbon Masuk</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Verifikasi kesesuaian bingkai dan konten unggahan foto twibbon peserta sebelum tayang di rotasi monitor venue.
              </p>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError("")}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess("")}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {!loading && twibbons.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-card">
            <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
            {STATUS_FILTERS.map((f) => {
              const count = f.value === "semua" ? twibbons.length : countByStatus(f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
            <span className="text-[11px] text-muted-foreground ml-auto">
              Menampilkan {filteredTwibbons.length} dari {twibbons.length} foto
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat antrean twibbon...</p>
          </div>
        ) : twibbons.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2">
            <Camera className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Belum Ada Twibbon yang Masuk
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Unggahan twibbon peserta akan tampil di sini untuk ditinjau oleh tim Media Center.
            </p>
          </Card>
        ) : filteredTwibbons.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Tidak Ada Foto berstatus &ldquo;{statusLabel}&rdquo;
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Antrean pada status ini sedang kosong. Pilih status lain untuk meninjau riwayat moderasi.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTwibbons.map((item) => (
              <Card key={item.id} className="overflow-hidden flex flex-col justify-between group">
                <div className="relative aspect-square w-full bg-muted overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.uploaderName}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge
                      variant={
                        item.status === "disetujui"
                          ? "success"
                          : item.status === "menunggu"
                          ? "warning"
                          : "danger"
                      }
                      className="text-[10px]"
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      title="Hapus Twibbon Ini"
                      className="p-1.5 rounded-full bg-background/80 backdrop-blur-xs text-muted-foreground hover:text-danger hover:bg-background transition-all shadow-sm cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Hapus Twibbon</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-heading text-sm font-bold text-foreground truncate">
                      {item.uploaderName}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{item.institution}</p>
                    <p className="text-xs text-foreground/80 line-clamp-2 italic pt-1">
                      &ldquo;{item.caption || "Tanpa keterangan"}&rdquo;
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => toggleFeatured(item.id)}
                        className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          item.isFeatured ? "text-accent" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{item.isFeatured ? "★ Unggulan" : "Jadikan Unggulan"}</span>
                      </button>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {item.likesCount} suka
                      </span>
                    </div>

                    {item.status === "menunggu" && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(item.id)}
                            className="text-xs h-8"
                          >
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApprove(item.id)}
                            className="text-xs h-8"
                          >
                            Setujui
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(item)}
                          className="w-full text-xs h-7 text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Hapus Permanen
                        </Button>
                      </div>
                    )}

                    {(item.status === "disetujui" || item.status === "ditolak") && (
                      <div className="pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(item)}
                          className="w-full text-xs h-7 text-danger hover:text-danger hover:bg-danger/10 border-danger/30"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Hapus Twibbon
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Konfirmasi Hapus Twibbon */}
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
        >
          {deleteTarget && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-danger">
                  <AlertCircle className="h-5 w-5" />
                  <DialogTitle>Konfirmasi Hapus Twibbon</DialogTitle>
                </div>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus data twibbon ini? Tindakan ini tidak dapat dibatalkan.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-3 p-3 rounded-lg border border-border bg-muted/40 items-center">
                <img
                  src={deleteTarget.imageUrl}
                  alt={deleteTarget.uploaderName}
                  className="h-16 w-16 object-cover rounded-md border border-border shrink-0"
                />
                <div className="space-y-1 min-w-0 text-xs">
                  <p className="font-semibold text-foreground truncate">
                    {deleteTarget.uploaderName}
                  </p>
                  <p className="text-muted-foreground truncate">{deleteTarget.institution}</p>
                  <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant={
                        deleteTarget.status === "disetujui"
                          ? "success"
                          : deleteTarget.status === "menunggu"
                          ? "warning"
                          : "danger"
                      }
                      className="text-[10px]"
                    >
                      {deleteTarget.status.toUpperCase()}
                    </Badge>
                    {deleteTarget.isFeatured && (
                      <Badge variant="gold" className="text-[10px]">
                        UNGGULAN
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {deleteTarget.status === "disetujui" && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Penyesuaian Poin Otomatis:
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Twibbon ini berstatus <strong>Disetujui</strong>. Jika dihapus dan peserta tidak memiliki twibbon lain yang disetujui, reward poin (+20) yang telah diberikan akan otomatis ditarik kembali di sistem agar data poin dan leaderboard tetap konsisten.
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 pl-1">
                <p>• Data twibbon akan dihapus permanen dari database.</p>
                <p>• Berkas foto di storage penyimpanan akan ikut dibersihkan.</p>
              </div>

              <DialogFooter className="flex-row justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Ya, Hapus Permanen
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
