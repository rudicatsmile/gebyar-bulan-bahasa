"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TwibbonItem } from "@/lib/dummy-data";
import { getApprovedTwibbons } from "@/lib/supabase/queries";
import { Camera, Heart, Search, Upload, Sparkles, X, Loader2 } from "lucide-react";

export default function GaleriTwibbonPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventYear, setEventYear] = React.useState("2026");
  const [twibbons, setTwibbons] = React.useState<TwibbonItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [likes, setLikes] = React.useState<Record<string, number>>({});
  const [activeItem, setActiveItem] = React.useState<TwibbonItem | null>(null);

  React.useEffect(() => {
    // Sinkronisasi pengaturan acara
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.eventName) {
            setEventName(data.settings.eventName);
          }
          if (data.settings.eventYear) {
            setEventYear(String(data.settings.eventYear));
          }
        }
      })
      .catch(() => {});

    async function loadTwibbons() {
      try {
        setLoading(true);
        const data = await getApprovedTwibbons();
        setTwibbons(data);
        const initLikes: Record<string, number> = {};
        data.forEach((t) => {
          initLikes[t.id] = t.likesCount;
        });
        setLikes(initLikes);
      } catch (err) {
        console.error("Gagal memuat galeri twibbon:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTwibbons();
  }, []);

  const approvedTwibbons = twibbons.filter(
    (t) =>
      t.uploaderName.toLowerCase().includes(search.toLowerCase()) ||
      t.institution.toLowerCase().includes(search.toLowerCase())
  );

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikes((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <Badge variant="gold" className="text-xs">
                Dokumentasi & Semarak Pemuda
              </Badge>
              <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                Galeri Twibbon {eventName}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Koleksi foto peserta dan pegiat kebudayaan yang mengibarkan semangat {eventName} {eventYear}. Foto terkurasi tayang pada Layar Monitor Lapangan venue.
              </p>
            </div>

            <Link href="/twibbon/unggah">
              <Button size="lg" className="text-xs gap-2 shrink-0">
                <Upload className="h-4 w-4" />
                <span>Unggah Twibbon Saya</span>
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card max-w-md">
            <Search className="h-4 w-4 text-muted-foreground ml-2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama peserta atau asal sekolah..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Twibbon Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-xs">Memuat galeri twibbon...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {approvedTwibbons.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveItem(item)}
                    className="group rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-accent hover:shadow-xs cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.uploaderName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {item.isFeatured && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground uppercase flex items-center gap-1 shadow-xs">
                          <Sparkles className="h-3 w-3" /> Unggulan
                        </span>
                      )}
                      <button
                        onClick={(e) => handleLike(item.id, e)}
                        className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-xs text-foreground text-xs font-mono font-semibold flex items-center gap-1.5 hover:text-danger transition-colors cursor-pointer"
                      >
                        <Heart className="h-3.5 w-3.5 fill-danger text-danger" />
                        <span>{likes[item.id] || item.likesCount}</span>
                      </button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h4 className="font-heading text-sm font-bold text-foreground truncate">
                          {item.uploaderName}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.institution}
                        </p>
                      </div>
                      <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                        &ldquo;{item.caption}&rdquo;
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/60 block">
                        {item.uploadedAt}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {approvedTwibbons.length === 0 && (
                <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl space-y-2">
                  <Camera className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Tidak ada twibbon ditemukan</p>
                  <p className="text-xs text-muted-foreground">
                    {search
                      ? "Coba kata kunci pencarian yang lain."
                      : "Belum ada twibbon yang disetujui. Jadilah yang pertama mengunggah!"}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Lightbox Modal */}
          {activeItem && (
            <Dialog open={!!activeItem} onOpenChange={() => setActiveItem(null)}>
              <div className="space-y-4">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
                  <img
                    src={activeItem.imageUrl}
                    alt={activeItem.uploaderName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">
                        {activeItem.uploaderName}
                      </h3>
                      <p className="text-xs text-muted-foreground">{activeItem.institution}</p>
                    </div>
                    {activeItem.participantNumber && (
                      <Badge variant="gold" className="text-xs font-mono">
                        {activeItem.participantNumber}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 italic border-l-2 border-accent pl-3 py-1">
                    &ldquo;{activeItem.caption}&rdquo;
                  </p>
                  <span className="text-[11px] font-mono text-muted-foreground block pt-2">
                    Diunggah pada: {activeItem.uploadedAt}
                  </span>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
