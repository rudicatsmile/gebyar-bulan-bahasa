"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TwibbonItem } from "@/lib/dummy-data";
import { getMyTwibbons } from "@/app/actions/twibbon";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  Camera,
  ArrowLeft,
  Upload,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  Clock,
  XCircle,
  Heart,
  RefreshCw,
} from "lucide-react";

/** Tampilan badge per status moderasi. */
const STATUS_META: Record<
  TwibbonItem["status"],
  { variant: BadgeProps["variant"]; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  menunggu: { variant: "info", label: "Menunggu Moderasi Media Center", icon: Clock },
  disetujui: { variant: "success", label: "Disetujui & Tayang di Monitor", icon: CheckCircle2 },
  ditolak: { variant: "danger", label: "Ditolak oleh Media Center", icon: XCircle },
};

/** Penjelasan situasi terkini, dipakai bersama kartu utama dan daftar riwayat. */
function statusNotes(item: TwibbonItem): string[] {
  if (item.status === "disetujui") {
    return [
      "Foto Anda sudah tayang di Galeri Twibbon publik.",
      item.isFeatured
        ? "Foto Anda ditandai Unggulan sehingga diprioritaskan pada rotasi modul galeri."
        : "Foto diputar secara berkala pada Layar TV Monitor Lapangan setiap rotasi modul galeri.",
    ];
  }
  if (item.status === "ditolak") {
    return [
      "Foto belum lolos kurasi Media Center sehingga tidak ditampilkan di galeri maupun monitor.",
      "Silakan unggah ulang dengan foto lain yang sesuai ketentuan.",
    ];
  }
  return [
    "Foto sedang antre moderasi tim Media Center, estimasi waktu peninjauan < 30 menit.",
    "Setelah disetujui, foto otomatis tampil di Galeri Twibbon dan Layar Monitor Lapangan.",
  ];
}

export default function PesertaTwibbonSayaPage() {
  const { participant, loading } = useCurrentParticipant();

  const [myTwibbons, setMyTwibbons] = React.useState<TwibbonItem[]>([]);
  const [listLoading, setListLoading] = React.useState<boolean>(true);
  const [listError, setListError] = React.useState<string | null>(null);
  // Penanda sudah ter-mount. HTML hasil pre-render (server) harus identik dengan
  // render PERTAMA di klien, jadi atribut yang bergantung pada `listLoading`
  // (mis. disabled tombol) baru berlaku setelah mount untuk menghindari hydration mismatch.
  const [mounted, setMounted] = React.useState<boolean>(false);

  // Baca lewat Server Action: user_id diambil dari sesi di server, jadi halaman
  // ini hanya bisa menampilkan kiriman milik user yang sedang login.
  const loadTwibbons = React.useCallback(
    () =>
      getMyTwibbons().then((data) => {
        setMyTwibbons(data);
        setListError(null);
      }),
    []
  );

  const refresh = React.useCallback(async () => {
    try {
      await loadTwibbons();
    } catch (err) {
      console.error("Gagal memuat twibbon milik peserta:", err);
      setListError("Daftar twibbon Anda gagal dimuat. Periksa koneksi lalu coba lagi.");
    } finally {
      // `listLoading` sudah true pada render awal, jadi tidak perlu setState sinkron di sini.
      setListLoading(false);
    }
  }, [loadTwibbons]);

  React.useEffect(() => {
    loadTwibbons().catch(() => {
      setListError("Daftar twibbon Anda gagal dimuat. Periksa koneksi lalu coba lagi.");
    }).finally(() => setListLoading(false));
  }, [loadTwibbons]);

  // Set `mounted` lewat microtask (bukan setState sinkron di body effect) agar
  // render pertama klien cocok dengan HTML server lalu baru mengaktifkan status.
  React.useEffect(() => {
    Promise.resolve().then(() => setMounted(true));
  }, []);

  // getMyTwibbons sudah mengurutkan created_at DESC → index 0 = kiriman terbaru.
  const latest = myTwibbons[0] ?? null;
  const history = myTwibbons.slice(1);

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Camera className="h-7 w-7 text-accent" />
                <span>Twibbon Resmi Saya</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Status kurasi dan penayangan twibbon Anda pada Galeri Publik dan Layar Monitor Lapangan venue.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs gap-1.5"
                onClick={refresh}
                disabled={mounted && listLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${mounted && listLoading ? "animate-spin" : ""}`} />
                <span>Muat Ulang</span>
              </Button>
              <Link href="/twibbon/unggah">
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{latest ? "Unggah Ulang Foto" : "Unggah Twibbon"}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {loading || listLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat status twibbon peserta...</p>
          </div>
        ) : listError ? (
          <Card className="p-6 sm:p-8 border-danger/40 bg-danger/5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Gagal Memuat Daftar Twibbon
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{listError}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span>Coba Lagi</span>
              </Button>
              <Link href="/twibbon/unggah">
                <Button size="sm" className="text-xs">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  <span>Unggah Twibbon</span>
                </Button>
              </Link>
            </div>
          </Card>
        ) : latest ? (
          <div className="space-y-6">
            {/* ── Kiriman terbaru ─────────────────────────────────────────── */}
            <Card className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latest.imageUrl}
                    alt={latest.uploaderName}
                    className="h-full w-full object-cover"
                  />
                  {latest.isFeatured && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Unggulan
                    </span>
                  )}
                </div>

                <div className="sm:col-span-7 space-y-4">
                  <div className="space-y-2">
                    <Badge variant={STATUS_META[latest.status].variant} className="text-[10px]">
                      {STATUS_META[latest.status].label}
                    </Badge>
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      {latest.uploaderName || participant?.fullName || "Peserta"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {latest.institution || participant?.institution || "Umum"}
                    </p>
                    {latest.participantNumber && (
                      <Badge variant="gold" className="text-[10px] font-mono">
                        {latest.participantNumber}
                      </Badge>
                    )}
                  </div>

                  {latest.caption && (
                    <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground/90 italic">
                      &ldquo;{latest.caption}&rdquo;
                    </div>
                  )}

                  {latest.status === "ditolak" && latest.rejectReason && (
                    <div className="p-3.5 rounded-lg bg-danger/5 border border-danger/30 text-xs text-danger">
                      <span className="font-semibold">Alasan penolakan:</span>{" "}
                      {latest.rejectReason}
                    </div>
                  )}

                  <div className="text-[11px] text-muted-foreground space-y-1 border-t border-border pt-3">
                    <p>
                      Diunggah {latest.uploadedAt}
                      {latest.likesCount > 0 && (
                        <span className="inline-flex items-center gap-1 ml-2">
                          <Heart className="h-3 w-3 fill-danger text-danger" />
                          {latest.likesCount} suka
                        </span>
                      )}
                    </p>
                    {statusNotes(latest).map((note) => (
                      <p key={note}>• {note}</p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Riwayat kiriman sebelumnya ──────────────────────────────── */}
            {history.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-heading text-sm font-bold text-foreground">
                  Riwayat Unggahan ({history.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {history.map((item) => {
                    const Meta = STATUS_META[item.status];
                    return (
                      <Card
                        key={item.id}
                        className="overflow-hidden space-y-0 p-0 hover:border-accent/60 transition-colors"
                      >
                        <div className="relative aspect-square bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.uploaderName}
                            className="h-full w-full object-cover"
                          />
                          {item.isFeatured && (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-accent text-accent-foreground uppercase flex items-center gap-0.5">
                              <Sparkles className="h-2.5 w-2.5" /> Unggulan
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 space-y-1.5">
                          <Badge variant={Meta.variant} className="text-[9px] px-1.5 py-0">
                            {item.status.replace("_", " ")}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {item.uploadedAt}
                          </p>
                          {item.status === "ditolak" && item.rejectReason && (
                            <p className="text-[10px] text-danger leading-relaxed line-clamp-2">
                              {item.rejectReason}
                            </p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tautan ke galeri publik ─────────────────────────────────── */}
            {latest.status === "disetujui" && (
              <Link href="/galeri/twibbon" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 w-full sm:w-auto"
                >
                  <span>Lihat Posisi Saya di Galeri Publik</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <Card className="p-8 sm:p-12 text-center space-y-4 border-dashed border-2 border-border">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Camera className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading text-base font-bold text-foreground">
                Belum Ada Foto Twibbon yang Diunggah
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Halo <strong>{participant?.fullName || "Peserta"}</strong>! Ramaikan Gebyar Bulan Bahasa
                dengan mengunggah foto twibbon budaya Anda — foto yang lolos kurasi otomatis tampil
                di <strong>Galeri Twibbon publik</strong> dan <strong>Layar Monitor Lapangan</strong>.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/twibbon/unggah">
                <Button className="text-xs font-semibold gap-2">
                  <span>Unggah Twibbon Saya Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
