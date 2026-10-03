"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tv, Play, Radio, ExternalLink, RefreshCw, AlertTriangle, Layers } from "lucide-react";
import { useEventSettings } from "@/lib/hooks/useEventSettings";
import { renderBrandText } from "@/components/ui/BrandText";

export default function MediaMonitorControlPage() {
  const { settings } = useEventSettings();
  const [currentModule, setCurrentModule] = React.useState("Jadwal & Agenda Berlangsung (LIVE)");
  const [rotationSeconds, setRotationSeconds] = React.useState("15");
  const [emergencyAlert, setEmergencyAlert] = React.useState("");
  const [alertNotice, setAlertNotice] = React.useState(false);

  const handleForceBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyAlert) return;
    setAlertNotice(true);
    setTimeout(() => {
      setAlertNotice(false);
      setEmergencyAlert("");
    }, 4000);
  };

  return (
    <DashboardLayout role="media_center">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Tv className="h-7 w-7 text-accent" />
              <span>Konsol Kendali Layar Monitor TV Lapangan</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kontrol status penayangan layar TV panggung, durasi rotasi modul, dan pengalihan siaran mendesak secara real-time.
            </p>
          </div>

          <Link href="/monitor" target="_blank">
            <Button size="sm" variant="accent" className="text-xs gap-1.5 shadow-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka Layar Monitor TV (Fullscreen)</span>
            </Button>
          </Link>
        </div>

        {alertNotice && (
          <div className="p-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2 animate-in fade-in-50">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>
              Pesan darurat telah dikirimkan ke layar monitor! Rotasi otomatis dijeda selama 20 detik untuk penayangan darurat.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pratinjau Mini Layar Monitor */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Radio className="h-4 w-4 text-success animate-pulse" />
                <span>Pratinjau Live Tayangan Monitor TV (Kanal Utama)</span>
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                Resolusi Adaptif 16:9
              </span>
            </div>

            {/* Simulated TV Screen Frame */}
            <div className="aspect-video w-full rounded-2xl bg-[hsl(226,18%,10%)] text-white p-6 flex flex-col justify-between border-4 border-muted shadow-md overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-accent text-[hsl(226,18%,10%)] flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <span className="font-heading text-sm font-bold text-white">
                    {renderBrandText(settings.eventShortName)}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-accent">
                  <span className="h-2 w-2 rounded-full bg-success animate-ping" />
                  <span>LIVE BROADCAST</span>
                </div>
              </div>

              {/* Center Screen Preview */}
              <div className="text-center space-y-3 py-6">
                <Badge variant="gold" className="text-xs">
                  MODUL SEDANG TAYANG
                </Badge>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {currentModule}
                </h3>
                <p className="text-xs text-white/60 max-w-md mx-auto">
                  Menampilkan data sinkron otomatis dari database Supabase PostgreSQL & Realtime channel.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-white/40 font-mono">
                <span>Rotasi Modul: {rotationSeconds} Detik</span>
                <span>Panggung Utama & Area Selasar</span>
              </div>
            </div>

            {/* Quick Switch Module buttons */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Alihkan Modul Manual Sekarang:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Jadwal & Agenda Berlangsung (LIVE)",
                  "Papan Skor Sementara (5 Besar)",
                  "Penganugerahan Juara Resmi",
                  "Galeri Foto Twibbon Peserta",
                  "Klasemen Poin Challenge Stand",
                ].map((mod) => (
                  <Button
                    key={mod}
                    size="sm"
                    variant={currentModule === mod ? "accent" : "outline"}
                    onClick={() => setCurrentModule(mod)}
                    className="text-xs"
                  >
                    {mod}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Kontrol Durasi & Pengalihan Mendesak */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground">
                Pengaturan Rotasi
              </h3>
              <Input
                label="Durasi Pergantian Modul (Detik) *"
                type="number"
                value={rotationSeconds}
                onChange={(e) => setRotationSeconds(e.target.value)}
                helperText="Waktu tunggu sebelum modul berpindah otomatis."
              />
              <Button size="sm" className="w-full text-xs">
                Terapkan Durasi Baru
              </Button>
            </Card>

            <Card className="p-6 space-y-4 border-danger/40">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-1.5 text-danger">
                <AlertTriangle className="h-4 w-4" />
                <span>Tayangkan Pengumuman Mendesak</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ketikkan pesan singkat untuk langsung mengambil alih layar TV selama 20 detik tanpa menunggu siklus rotasi.
              </p>

              <form onSubmit={handleForceBroadcast} className="space-y-3">
                <Input
                  placeholder="Contoh: Seluruh peserta MC segera ke ruang briefing..."
                  value={emergencyAlert}
                  onChange={(e) => setEmergencyAlert(e.target.value)}
                  required
                />
                <Button type="submit" size="sm" variant="destructive" className="w-full text-xs">
                  Tayangkan Mendesak Sekarang
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
