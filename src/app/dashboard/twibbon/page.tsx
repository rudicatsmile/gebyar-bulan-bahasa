"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TwibbonItem } from "@/lib/dummy-data";
import { moderateTwibbon, getTwibbonsForModeration } from "@/app/actions/twibbon";
import { Camera, CheckCircle2, XCircle, Sparkles, Tv, Loader2, LayoutTemplate, AlertCircle } from "lucide-react";

type StatusFilter = "semua" | "menunggu" | "disetujui" | "ditolak";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "semua", label: "Semua" },
  { value: "menunggu", label: "Menunggu" },
  { value: "disetujui", label: "Disetujui" },
  { value: "ditolak", label: "Ditolak" },
];

export default function DashboardModerasiTwibbonPage() {
  const [twibbons, setTwibbons] = React.useState<TwibbonItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [actionError, setActionError] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("semua");

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
    try {
      const result = await moderateTwibbon({
        twibbonId: id,
        status: "disetujui",
        isFeatured: item?.isFeatured || false,
      });
      if (!result.success) {
        setActionError(result.error || "Gagal menyetujui twibbon.");
        await refresh();
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
    try {
      const result = await moderateTwibbon({
        twibbonId: id,
        status: "ditolak",
        isFeatured: item?.isFeatured || false,
      });
      if (!result.success) {
        setActionError(result.error || "Gagal menolak twibbon.");
        await refresh();
      }
    } catch (e) {
      console.error("Gagal reject twibbon:", e);
      setActionError("Gagal menolak twibbon. Silakan coba lagi.");
      await refresh();
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

  const pendingCount = countByStatus("menunggu");

  const filteredTwibbons =
    statusFilter === "semua"
      ? twibbons
      : twibbons.filter((t) => t.status === statusFilter);

  const statusLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "Semua";

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Camera className="h-7 w-7 text-accent" />
              <span>Moderasi Twibbon Acara</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Setujui atau tolak unggahan twibbon peserta dan tandai sebagai &quot;Unggulan&quot; untuk prioritas tayang pada Layar Monitor Lapangan venue.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/twibbon/template">
              <Button variant="outline" size="sm" className="text-xs">
                <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                Kelola Template
              </Button>
            </Link>
            <Badge variant={pendingCount > 0 ? "warning" : "success"} className="text-xs">
              {pendingCount} Foto Menunggu Moderasi
            </Badge>
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
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
            <p className="text-xs">Memuat data twibbon...</p>
          </div>
        ) : twibbons.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2">
            <Camera className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Belum Ada Twibbon yang Diunggah
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Foto twibbon yang diunggah oleh peserta akan muncul di sini untuk proses moderasi dan persetujuan penayangan.
            </p>
          </Card>
        ) : filteredTwibbons.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Tidak Ada Foto berstatus &ldquo;{statusLabel}&rdquo;
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Semua unggahan sudah ditangani. Pilih status lain untuk melihat riwayat moderasi, atau
              tunggu kiriman peserta berikutnya.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTwibbons.map((item) => (
              <Card key={item.id} className="overflow-hidden flex flex-col justify-between">
                <div className="relative aspect-square w-full bg-muted overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.uploaderName}
                    className="h-full w-full object-cover"
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
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-heading text-sm font-bold text-foreground">
                      {item.uploaderName}
                    </h4>
                    <p className="text-xs text-muted-foreground">{item.institution}</p>
                    <p className="text-xs text-foreground/80 line-clamp-2 italic pt-1">
                      &ldquo;{item.caption}&rdquo;
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
                      <div className="grid grid-cols-2 gap-2 pt-1">
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
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
