"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getEventSettings, saveEventSettings } from "@/app/actions/settings";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";

export default function DashboardPengaturanPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventTheme, setEventTheme] = React.useState(
    "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
  );
  const [eventYear, setEventYear] = React.useState("2025");
  const [scoreGapThreshold, setScoreGapThreshold] = React.useState("20");
  const [maxCompetitions, setMaxCompetitions] = React.useState("3");
  const [rotationInterval, setRotationInterval] = React.useState("15");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load data awal dari Supabase tabel event_settings
  const loadSettings = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getEventSettings();
      if (res.success && res.settings) {
        setEventName(res.settings.eventName);
        setEventTheme(res.settings.eventTheme);
        setEventYear(res.settings.eventYear);
        setScoreGapThreshold(res.settings.scoreGapThreshold);
        setMaxCompetitions(res.settings.maxCompetitions);
        setRotationInterval(res.settings.rotationInterval);
      }
    } catch (err) {
      console.error("Gagal load settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await saveEventSettings({
        eventName,
        eventTheme,
        eventYear,
        scoreGapThreshold: Number(scoreGapThreshold),
        maxCompetitions: Number(maxCompetitions),
        rotationInterval: Number(rotationInterval),
      });

      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan pengaturan acara.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Pengaturan acara berhasil disimpan ke database dan langsung disinkronkan ke seluruh sistem!",
      });

      // Auto dismiss success feedback after 4 seconds
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 4000);
    } catch (err: unknown) {
      console.error("Gagal simpan pengaturan:", err);
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat menyimpan pengaturan.";
      setFeedback({
        type: "error",
        message: msg,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Settings className="h-7 w-7 text-accent" />
              <span>Pengaturan & Konfigurasi Acara</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sesuaikan parameter operasional sistem, tema perhelatan, ambang batas peringatan penilaian, dan durasi monitor lapangan.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSettings}
            disabled={isLoading || isSaving}
            className="text-xs gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </Button>
        </div>

        {/* Feedback Alert di Atas */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <Card className="p-6 sm:p-8">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat konfigurasi dari database...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bagian 1 */}
              <div className="space-y-4">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>1. Identitas & Tema Resmi Acara</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: general)</span>
                </h3>
                <Input
                  label="Nama Acara *"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Contoh: Gebyar Bulan Bahasa dan Kebudayaan"
                  required
                />
                <Textarea
                  label="Tema Peringatan Sumpah Pemuda *"
                  value={eventTheme}
                  onChange={(e) => setEventTheme(e.target.value)}
                  rows={2}
                  placeholder="Tema resmi festival bahasa"
                  required
                />
                <Input
                  label="Tahun Penyelenggaraan *"
                  value={eventYear}
                  onChange={(e) => setEventYear(e.target.value)}
                  placeholder="2025"
                  required
                />
              </div>

              {/* Bagian 2 */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>2. Aturan Penjurian & Partisipasi Peserta</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: registration)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ambang Batas Selisih Skor Juri (Poin Alert) *"
                    type="number"
                    min={1}
                    max={100}
                    value={scoreGapThreshold}
                    onChange={(e) => setScoreGapThreshold(e.target.value)}
                    helperText="Sistem menandai 'Perlu Peninjauan' jika selisih nilai juri melebihi angka ini."
                    required
                  />
                  <Input
                    label="Batas Maksimal Lomba per Peserta *"
                    type="number"
                    min={1}
                    max={10}
                    value={maxCompetitions}
                    onChange={(e) => setMaxCompetitions(e.target.value)}
                    helperText="Jumlah cabang lomba individu maksimal yang boleh diikuti 1 peserta."
                    required
                  />
                </div>
              </div>

              {/* Bagian 3 */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>3. Layar Monitor Lapangan Venue</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings & monitor_displays (key: monitor)</span>
                </h3>
                <Input
                  label="Durasi Rotasi Normal Modul Monitor (Detik) *"
                  type="number"
                  min={5}
                  max={120}
                  value={rotationInterval}
                  onChange={(e) => setRotationInterval(e.target.value)}
                  helperText="Waktu jeda per modul tayangan (Jadwal, Skor, Pemenang, Twibbon, Leaderboard)."
                  required
                />
              </div>

              {/* Action Button & Bottom Feedback */}
              <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving || isLoading}
                  className="text-xs font-semibold gap-2 min-w-[200px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span>Menyimpan Seluruh Pengaturan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Simpan Seluruh Pengaturan</span>
                    </>
                  )}
                </Button>

                {feedback?.type === "success" && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Perubahan tersimpan ke database</span>
                  </span>
                )}
              </div>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
