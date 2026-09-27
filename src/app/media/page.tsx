"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TWIBBONS } from "@/lib/dummy-data";
import { Tv, Camera, PlaySquare, Megaphone, Sliders, ArrowRight, Radio } from "lucide-react";

export default function DashboardMediaCenterPage() {
  const pendingTwibbonCount = TWIBBONS.filter((t) => t.status === "menunggu").length;

  return (
    <DashboardLayout role="media_center">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Tv className="h-7 w-7 text-accent" />
              <span>Media Center & Kendali Layar Monitor</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pusat publikasi konten festival, kurasi moderasi twibbon, dan pengatur playlist modul tayangan monitor lapangan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/media/monitor">
              <Button size="sm" variant="accent" className="text-xs gap-1.5 shadow-xs">
                <Tv className="h-3.5 w-3.5" />
                <span>Konsol Kendali Monitor</span>
              </Button>
            </Link>
            <Link href="/monitor" target="_blank">
              <Button size="sm" variant="outline" className="text-xs">
                Layar TV Utama →
              </Button>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Status Layar Monitor</span>
              <Radio className="h-4 w-4 text-success animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-success">
                ONLINE
              </span>
              <span className="text-xs text-muted-foreground">Rotasi 15s</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              Terhubung ke kanal siaran venue utama
            </p>
          </Card>

          <Card className="p-5 space-y-2 border-accent/40 bg-accent/5">
            <div className="flex items-center justify-between text-accent text-xs">
              <span className="font-semibold uppercase tracking-wider">Twibbon Menunggu</span>
              <Camera className="h-4 w-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-accent">
                {pendingTwibbonCount}
              </span>
              <span className="text-xs text-muted-foreground">Foto Antre</span>
            </div>
            <Link
              href="/media/twibbon"
              className="text-[11px] font-semibold text-accent hover:underline block pt-1 border-t border-accent/20"
            >
              Moderasi Twibbon Sekarang →
            </Link>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Modul Playlist Aktif</span>
              <Sliders className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-foreground">5</span>
              <span className="text-xs text-muted-foreground">Modul Siar</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              Jadwal, Skor, Pemenang, Twibbon, Poin
            </p>
          </Card>

          <Card className="p-5 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span className="font-semibold uppercase tracking-wider">Dokumentasi Media</span>
              <PlaySquare className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-foreground">24</span>
              <span className="text-xs text-muted-foreground">Item Media</span>
            </div>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border">
              Poster, video reels, dan rilis berita
            </p>
          </Card>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 hover:border-accent transition-colors">
            <Camera className="h-6 w-6 text-accent" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Moderasi Galeri Twibbon
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tinjau foto twibbon peserta sebelum tampil di galeri publik dan pilih foto-foto unggulan untuk layar monitor.
            </p>
            <Link href="/media/twibbon" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                <span>Buka Panel Twibbon</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 space-y-3 hover:border-accent transition-colors">
            <Sliders className="h-6 w-6 text-accent" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Susun Playlist Monitor TV
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Atur urutan penayangan rotasi modul (Jadwal Live, Papan Skor 5 Besar, Warta Pemenang, Leaderboard Challenge).
            </p>
            <Link href="/media/konten-monitor" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                <span>Atur Playlist Monitor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>

          <Card className="p-6 space-y-3 hover:border-accent transition-colors">
            <PlaySquare className="h-6 w-6 text-accent" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Kelola Konten & Galeri Foto
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unggah poster resmi lomba, rilis siaran pers, dan dokumentasi foto sorotan pentas festival budaya.
            </p>
            <Link href="/media/konten" className="block pt-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                <span>Kelola Berita & Poster</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
