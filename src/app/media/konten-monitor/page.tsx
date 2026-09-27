"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sliders, ArrowLeft, ArrowUp, ArrowDown, Tv, Save, Check } from "lucide-react";

interface PlaylistItem {
  id: string;
  moduleKey: string;
  name: string;
  description: string;
  durationSeconds: number;
  isActive: boolean;
}

const INITIAL_PLAYLIST: PlaylistItem[] = [
  { id: "mod-1", moduleKey: "jadwal", name: "Jadwal & Agenda Berlangsung (LIVE)", description: "Daftar panggung, jam, dan penanda LIVE denyut acara hari ini.", durationSeconds: 15, isActive: true },
  { id: "mod-2", moduleKey: "papan_skor", name: "Papan Skor Sementara (5 Besar)", description: "Skor agregat 5 besar cabang lomba yang sedang berjalan.", durationSeconds: 15, isActive: true },
  { id: "mod-3", moduleKey: "pengumuman", name: "Warta Resmi & Pengumuman Penting", description: "Pesan prioritas, nomor urut tampil, dan arahan seksi acara.", durationSeconds: 15, isActive: true },
  { id: "mod-4", moduleKey: "pemenang", name: "Penganugerahan Juara Resmi", description: "Podium juara 1, 2, dan 3 cabang lomba yang telah final.", durationSeconds: 15, isActive: true },
  { id: "mod-5", moduleKey: "twibbon", name: "Galeri Foto Twibbon Peserta", description: "Rotasi foto-foto unggulan peserta dan pengunjung festival.", durationSeconds: 15, isActive: true },
  { id: "mod-6", moduleKey: "leaderboard", name: "Klasemen Poin Challenge Stand", description: "10 besar perolehan poin keliling 8 stand pameran.", durationSeconds: 15, isActive: true },
];

export default function MediaKontenMonitorPage() {
  const [playlist, setPlaylist] = React.useState<PlaylistItem[]>(INITIAL_PLAYLIST);
  const [saved, setSaved] = React.useState(false);

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;
    const newItems = [...playlist];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setPlaylist(newItems);
  };

  const toggleActive = (id: string) => {
    setPlaylist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
                <Sliders className="h-7 w-7 text-accent" />
                <span>Susun Playlist Modul Layar Monitor TV</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Urutkan urutan penayangan modul otomatis dan aktifkan/nonaktifkan modul siar sesuai kebutuhan panggung.
              </p>
            </div>

            <Button onClick={handleSave} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              <span>{saved ? "Playlist Disimpan!" : "Simpan Urutan Playlist"}</span>
            </Button>
          </div>
        </div>

        {saved && (
          <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Urutan playlist monitor berhasil disimpan! Layar TV akan mengikuti urutan rotasi baru pada siklus berikutnya.</span>
          </div>
        )}

        <div className="space-y-3">
          {playlist.map((item, idx) => (
            <Card
              key={item.id}
              className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.isActive ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                    title="Geser ke Atas"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, "down")}
                    disabled={idx === playlist.length - 1}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                    title="Geser ke Bawah"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <span className="font-mono text-xl font-bold text-accent w-8 text-center">
                  #{idx + 1}
                </span>

                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {item.name}
                    </h3>
                    <Badge variant={item.isActive ? "success" : "default"} className="text-[10px]">
                      {item.isActive ? "AKTIF" : "NONAKTIF"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0 justify-between sm:justify-end">
                <span className="font-mono text-xs text-muted-foreground">
                  Durasi: <strong>{item.durationSeconds} Detik</strong>
                </span>

                <Button
                  size="sm"
                  variant={item.isActive ? "outline" : "default"}
                  onClick={() => toggleActive(item.id)}
                  className="text-xs h-8"
                >
                  {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
