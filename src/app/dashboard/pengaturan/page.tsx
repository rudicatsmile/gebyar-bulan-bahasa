"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, CheckCircle2 } from "lucide-react";

export default function DashboardPengaturanPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventTheme, setEventTheme] = React.useState(
    "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
  );
  const [eventYear, setEventYear] = React.useState("2025");
  const [scoreGapThreshold, setScoreGapThreshold] = React.useState("20");
  const [maxCompetitions, setMaxCompetitions] = React.useState("3");
  const [rotationInterval, setRotationInterval] = React.useState("15");
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-accent" />
            <span>Pengaturan & Konfigurasi Acara</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sesuaikan parameter operasional sistem, tema perhelatan, ambang batas peringatan penilaian, dan durasi monitor lapangan.
          </p>
        </div>

        {saved && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Pengaturan acara berhasil disimpan dan langsung diterapkan ke seluruh sistem!</span>
          </div>
        )}

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2">
                1. Identitas & Tema Resmi Acara
              </h3>
              <Input
                label="Nama Acara *"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
              <Textarea
                label="Tema Peringatan Sumpah Pemuda *"
                value={eventTheme}
                onChange={(e) => setEventTheme(e.target.value)}
                rows={2}
                required
              />
              <Input
                label="Tahun Penyelenggaraan *"
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
                required
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2">
                2. Aturan Penjurian & Partisipasi Peserta
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Ambang Batas Selisih Skor Juri (Poin Alert) *"
                  type="number"
                  value={scoreGapThreshold}
                  onChange={(e) => setScoreGapThreshold(e.target.value)}
                  helperText="Sistem menandai 'Perlu Peninjauan' jika selisih nilai juri melebihi angka ini."
                  required
                />
                <Input
                  label="Batas Maksimal Lomba per Peserta *"
                  type="number"
                  value={maxCompetitions}
                  onChange={(e) => setMaxCompetitions(e.target.value)}
                  helperText="Jumlah cabang lomba individu maksimal yang boleh diikuti 1 peserta."
                  required
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2">
                3. Layar Monitor Lapangan Venue
              </h3>
              <Input
                label="Durasi Rotasi Normal Modul Monitor (Detik) *"
                type="number"
                value={rotationInterval}
                onChange={(e) => setRotationInterval(e.target.value)}
                helperText="Waktu jeda per modul tayangan (Jadwal, Skor, Pemenang, Twibbon, Leaderboard)."
                required
              />
            </div>

            <Button type="submit" size="lg" className="text-xs font-semibold gap-2">
              <Save className="h-4 w-4" />
              <span>Simpan Seluruh Pengaturan</span>
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
