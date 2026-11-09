"use client";

import * as React from "react";
import QRCode from "qrcode";
import type { TwibbonItem } from "@/lib/supabase/queries";
import {
  Camera,
  Heart,
  Sparkles,
  Smartphone,
  Star,
  QrCode,
  Flame,
  Award,
  ChevronRight,
  Maximize2,
} from "lucide-react";

interface MonitorTwibbonShowcaseProps {
  twibbons: TwibbonItem[];
  isDedicated?: boolean;
}

export function MonitorTwibbonShowcase({
  twibbons,
  isDedicated = false,
}: MonitorTwibbonShowcaseProps) {
  // Sortir foto secara cerdas: Featured pertama, lalu likes terbanyak, lalu terbaru
  const sortedTwibbons = React.useMemo(() => {
    return [...twibbons].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      if ((b.likesCount || 0) !== (a.likesCount || 0)) {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return 0;
    });
  }, [twibbons]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [qrDataUrl, setQrDataUrl] = React.useState<string>("");

  // Buat QR Code dinamis langsung ke halaman /twibbon publik
  React.useEffect(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://bulanbahasa.smkdp2jkt.sch.id";
    const uploadUrl = `${origin}/twibbon`;

    QRCode.toDataURL(uploadUrl, {
      width: 250,
      margin: 1,
      color: {
        dark: "#0a0a0c",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Gagal membuat QR Twibbon:", err));
  }, []);

  // Rotasi otomatis foto spotlight setiap 7 detik jika ada lebih dari 1 foto
  React.useEffect(() => {
    if (sortedTwibbons.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sortedTwibbons.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [sortedTwibbons.length]);

  // Jika index aktif melampaui jumlah twibbon (karena update data realtime)
  React.useEffect(() => {
    if (activeIndex >= sortedTwibbons.length && sortedTwibbons.length > 0) {
      setActiveIndex(0);
    }
  }, [sortedTwibbons.length, activeIndex]);

  if (sortedTwibbons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-14 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md max-w-2xl mx-auto text-center space-y-6 shadow-2xl animate-in fade-in-50 duration-300">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent mx-auto animate-pulse">
            <Camera className="h-10 w-10" />
          </div>
          <Sparkles className="h-6 w-6 text-accent absolute -top-2 -right-2 animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading tracking-tight">
            Galeri Semarak Twibbon Masih Terbuka
          </h3>
          <p className="text-white/70 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Belum ada foto twibbon yang disetujui panitia. Jadilah yang pertama
            mengabadikan momen keseruan acara dan tampil di layar panggung ini!
          </p>
        </div>

        {qrDataUrl && (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/15 inline-flex items-center gap-4 text-left shadow-lg">
            <img
              src={qrDataUrl}
              alt="Scan untuk pasang twibbon"
              className="w-24 h-24 rounded-xl bg-white p-1 shrink-0"
            />
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent text-black uppercase tracking-wider">
                <Smartphone className="h-3 w-3" /> Scan Sekarang
              </span>
              <p className="text-xs font-semibold text-white">
                Buka Kamera HP &amp; Arahkan ke QR Code
              </p>
              <p className="text-[11px] text-white/60">
                Pilih foto terbaikmu dan bagikan kebanggaanmu!
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const active = sortedTwibbons[activeIndex] || sortedTwibbons[0];
  const galleryItems = isDedicated
    ? sortedTwibbons.slice(0, 8)
    : sortedTwibbons.slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/40 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-spin" /> LIVE FESTIVAL SHOWCASE
            </span>
            <span className="text-xs font-mono text-white/50">
              Rotasi Otomatis (7s)
            </span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-1 flex items-center gap-2.5">
            <Camera className="h-7 w-7 text-accent shrink-0" />
            <span>Semarak Galeri Twibbon Peserta &amp; Pengunjung</span>
          </h2>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/80">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="font-bold text-accent">{sortedTwibbons.length}</span> Foto
          Telah Disetujui
        </div>
      </div>

      {/* Main Grid: Spotlight (Kiri) & Live Wall + QR Code (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ========================================================= */}
        {/* KOLOM KIRI (SPOTLIGHT UTAMA) - 7 / 12 kolom               */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between rounded-3xl border-2 border-accent/30 bg-gradient-to-b from-white/10 to-black/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

          {/* Badge Status */}
          <div className="flex items-center justify-between gap-2 z-10 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {active.isFeatured && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent text-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Star className="h-3.5 w-3.5 fill-black" />
                  Foto Pilihan Panitia
                </span>
              )}
              {active.likesCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  {active.likesCount} Apresiasi
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono text-white/60 bg-black/40 border border-white/10">
                Foto {activeIndex + 1} dari {sortedTwibbons.length}
              </span>
            </div>

            <span className="text-[11px] font-mono text-white/50 hidden sm:inline">
              {active.uploadedAt}
            </span>
          </div>

          {/* Wadah Foto Besar (Aspect 4:3 atau Square) */}
          <div className="relative aspect-4/3 sm:aspect-16/10 w-full rounded-2xl overflow-hidden bg-black/60 border border-white/15 shadow-inner">
            <img
              key={active.id}
              src={active.imageUrl}
              alt={active.uploaderName}
              className="w-full h-full object-cover transition-all duration-700 ease-out transform group-hover:scale-102 animate-in fade-in zoom-in-95"
            />
            {/* Gradien gelap bagian bawah foto agar teks caption terbaca kontras */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
          </div>

          {/* Info Pengunggah & Caption */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2 z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {active.uploaderName}
                </h3>
                <p className="text-xs sm:text-sm font-mono text-accent">
                  {active.institution || "Keluarga Besar Gebyar Bulan Bahasa"}
                </p>
              </div>

              {/* Countdown Progress Mini */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/50 self-start sm:self-auto">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Sedang Disorot</span>
              </div>
            </div>

            {active.caption ? (
              <blockquote className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white/90 italic line-clamp-2 sm:line-clamp-3">
                &ldquo;{active.caption}&rdquo;
              </blockquote>
            ) : (
              <p className="text-xs text-white/50 italic">
                Turut memeriahkan dan menyukseskan Gebyar Bulan Bahasa!
              </p>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* KOLOM KANAN: LIVE WALL & DEDICATED QR CODE - 5 / 12 kolom */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between space-y-6">
          {/* 1. Dinding Galeri Mini (Live Wall Grid) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-white/60">
              <span className="uppercase tracking-wider font-bold text-white flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-accent" /> Galeri Pengunjung
              </span>
              <span>Klik kartu untuk sorot</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryItems.map((item, idx) => {
                const isSelected = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    type="button"
                    className={`group text-left rounded-xl p-2 transition-all relative overflow-hidden border cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/15 ring-2 ring-accent/40 shadow-lg scale-102"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 relative mb-2">
                      <img
                        src={item.imageUrl}
                        alt={item.uploaderName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.isFeatured && (
                        <span className="absolute top-1 left-1 p-1 rounded-md bg-accent text-black text-[9px] font-bold">
                          <Star className="h-2.5 w-2.5 fill-black" />
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-accent/20 border-2 border-accent rounded-lg flex items-center justify-center">
                          <span className="px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono font-bold text-accent">
                            Aktif
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="font-heading text-xs font-bold text-white truncate">
                        {item.uploaderName}
                      </h5>
                      <p className="text-[10px] font-mono text-white/60 truncate">
                        {item.institution || "Umum"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Dedicated Interactive QR Code Card */}
          <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-white/10 via-black/40 to-black/70 p-4 sm:p-5 shadow-xl backdrop-blur-md flex items-center gap-4 sm:gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

            {/* QR Code Container */}
            <div className="p-2 sm:p-2.5 rounded-2xl bg-white shadow-xl shrink-0 border border-white">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan QR untuk pasang twibbon"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-slate-100 flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-slate-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* CTA Message */}
            <div className="space-y-2 z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent text-black uppercase tracking-wider shadow-sm">
                <Smartphone className="h-3 w-3" /> Abadikan Momenmu
              </span>

              <h4 className="font-heading text-base sm:text-lg font-bold text-white leading-tight">
                Scan &amp; Pasang Twibbon Sekarang!
              </h4>

              <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed">
                Arahkan kamera HP ke QR Code, unggah fotomu, dan saksikan fotomu
                tayang langsung di panggung layar ini.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

