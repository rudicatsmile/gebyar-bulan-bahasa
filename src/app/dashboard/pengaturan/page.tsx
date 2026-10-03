"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getEventSettings, saveEventSettings, uploadHeroImageAction } from "@/app/actions/settings";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ImageIcon,
  Upload,
  Trash2,
} from "lucide-react";

export default function DashboardPengaturanPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventTheme, setEventTheme] = React.useState(
    "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
  );
  const [eventDate, setEventDate] = React.useState("28 Oktober 2026");
  const [eventYear, setEventYear] = React.useState("2026");
  const [heroImageUrl, setHeroImageUrl] = React.useState("");
  const [isUploadingHero, setIsUploadingHero] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [scoreGapThreshold, setScoreGapThreshold] = React.useState("20");
  const [maxCompetitions, setMaxCompetitions] = React.useState("3");
  const [rotationInterval, setRotationInterval] = React.useState("15");

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load data awal dari API / Database
  const loadSettings = React.useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      // Prioritaskan direct API route
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setEventName(data.settings.eventName);
          setEventTheme(data.settings.eventTheme);
          setEventDate(data.settings.eventDate || "28 Oktober 2026");
          setEventYear(data.settings.eventYear);
          setHeroImageUrl(data.settings.heroImageUrl || "");
          setScoreGapThreshold(String(data.settings.scoreGapThreshold));
          setMaxCompetitions(String(data.settings.maxCompetitions));
          setRotationInterval(String(data.settings.rotationInterval));
          setIsLoading(false);
          return;
        }
      }

      // Fallback via Server Action
      const actionRes = await getEventSettings();
      if (actionRes.success && actionRes.settings) {
        setEventName(actionRes.settings.eventName);
        setEventTheme(actionRes.settings.eventTheme);
        setEventDate(actionRes.settings.eventDate || "28 Oktober 2026");
        setEventYear(actionRes.settings.eventYear);
        setHeroImageUrl(actionRes.settings.heroImageUrl || "");
        setScoreGapThreshold(String(actionRes.settings.scoreGapThreshold));
        setMaxCompetitions(String(actionRes.settings.maxCompetitions));
        setRotationInterval(String(actionRes.settings.rotationInterval));
      }
    } catch (err) {
      console.error("Gagal load settings:", err);
      try {
        const actionRes = await getEventSettings();
        if (actionRes.success && actionRes.settings) {
          setEventName(actionRes.settings.eventName);
          setEventTheme(actionRes.settings.eventTheme);
          setEventDate(actionRes.settings.eventDate || "28 Oktober 2026");
          setEventYear(actionRes.settings.eventYear);
          setHeroImageUrl(actionRes.settings.heroImageUrl || "");
          setScoreGapThreshold(String(actionRes.settings.scoreGapThreshold));
          setMaxCompetitions(String(actionRes.settings.maxCompetitions));
          setRotationInterval(String(actionRes.settings.rotationInterval));
        }
      } catch (fallbackErr) {
        console.error("Fallback load failed:", fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Ukuran berkas melebihi batas 5MB. Silakan pilih berkas yang lebih kecil.",
      });
      return;
    }

    try {
      setIsUploadingHero(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadHeroImageAction(formData);
      if (res.success && res.url) {
        setHeroImageUrl(res.url);
        setFeedback({
          type: "success",
          message: "Gambar hero berhasil diunggah! Klik 'Simpan Seluruh Pengaturan' untuk menerapkan ke database.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengunggah berkas gambar hero.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kendala saat mengunggah gambar hero.",
      });
    } finally {
      setIsUploadingHero(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!eventName.trim() || !eventTheme.trim() || !eventDate.trim()) {
      setFeedback({
        type: "error",
        message: "Nama acara, tema acara, dan tanggal acara wajib diisi.",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const payload = {
      eventName: eventName.trim(),
      eventTheme: eventTheme.trim(),
      eventDate: eventDate.trim(),
      eventYear: String(eventYear).trim(),
      heroImageUrl: heroImageUrl.trim(),
      scoreGapThreshold: Number(scoreGapThreshold) || 20,
      maxCompetitions: Number(maxCompetitions) || 3,
      rotationInterval: Number(rotationInterval) || 15,
    };

    try {
      // 1. Coba simpan via API Route /api/settings (REST, paling andal)
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFeedback({
            type: "success",
            message: "Pengaturan acara berhasil disimpan ke tabel event_settings dan langsung diterapkan!",
          });
          setIsSaving(false);
          setTimeout(() => {
            setFeedback((prev) => (prev?.type === "success" ? null : prev));
          }, 4500);
          return;
        } else {
          throw new Error(data.error || "Gagal menyimpan pengaturan.");
        }
      }

      // 2. Fallback via Server Action
      const actionRes = await saveEventSettings(payload);
      if (!actionRes.success) {
        setFeedback({
          type: "error",
          message: actionRes.error || "Gagal menyimpan ke tabel event_settings.",
        });
        setIsSaving(false);
        return;
      }

      setFeedback({
        type: "success",
        message: "Pengaturan acara berhasil disimpan ke tabel event_settings dan langsung diterapkan!",
      });

      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 4500);
    } catch (err: unknown) {
      console.error("Gagal simpan pengaturan:", err);
      try {
        const actionRes = await saveEventSettings(payload);
        if (actionRes.success) {
          setFeedback({
            type: "success",
            message: "Pengaturan acara berhasil disimpan ke tabel event_settings!",
          });
          setIsSaving(false);
          return;
        }
      } catch {
        // Abaikan
      }

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
            className="text-xs gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </Button>
        </div>

        {/* Feedback Alert di Atas */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in-50 ${feedback.type === "success"
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
              <p className="text-xs">Memuat konfigurasi dari database event_settings...</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-6"
            >
              {/* Bagian 1 */}
              <div className="space-y-4">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>1. Identitas & Tema Resmi Acara</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: general)</span>
                </h3>
                <Input
                  name="eventName"
                  label="Nama Acara *"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Contoh: Gebyar Bulan Bahasa dan Kebudayaan"
                  required
                />
                <Textarea
                  name="eventTheme"
                  label="Tema Peringatan  *"
                  value={eventTheme}
                  onChange={(e) => setEventTheme(e.target.value)}
                  rows={2}
                  placeholder="Tema resmi festival bahasa"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="eventDate"
                    label="Tanggal Acara *"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="Contoh: 28 Oktober 2026 atau 27 - 28 Oktober 2026"
                    helperText="Tanggal pelaksanaan acara yang tampil pada hitung mundur beranda."
                    required
                  />
                  <Input
                    name="eventYear"
                    label="Tahun Penyelenggaraan *"
                    value={eventYear}
                    onChange={(e) => setEventYear(e.target.value)}
                    placeholder="2026"
                    required
                  />
                </div>

                {/* Upload Image Hero Acara */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Gambar / Banner Hero Acara (Halaman Beranda)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Maksimal 5MB (JPG, PNG, WEBP)</span>
                  </label>

                  {heroImageUrl ? (
                    <div className="space-y-3 p-4 rounded-xl border border-accent/30 bg-accent/5">
                      <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full max-h-60 rounded-lg overflow-hidden border border-border bg-background">
                        <img
                          src={heroImageUrl}
                          alt="Preview Banner Hero"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setHeroImageUrl("")}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer"
                          title="Hapus gambar hero"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground truncate max-w-md font-mono text-[11px]">{heroImageUrl}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingHero}
                          className="text-xs gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Ganti Gambar</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-accent/60 rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 rounded-full bg-accent/10 text-accent">
                          {isUploadingHero ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <ImageIcon className="h-6 w-6" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-foreground">
                          {isUploadingHero ? "Sedang mengunggah berkas..." : "Klik untuk unggah gambar hero beranda"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Rekomendasi rasio lanskap 16:9 atau panorama (Full HD 1920x1080)
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleHeroFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Bagian 2 */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>2. Aturan Penjurian & Partisipasi Peserta</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: registration)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="scoreGapThreshold"
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
                    name="maxCompetitions"
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
                  name="rotationInterval"
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
                  id="btn-simpan-pengaturan"
                  type="button"
                  onClick={handleSave}
                  size="lg"
                  disabled={isSaving || isLoading}
                  className="text-xs font-semibold gap-2 min-w-[220px] cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span>Menyimpan Pengaturan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Simpan Seluruh Pengaturan</span>
                    </>
                  )}
                </Button>

                {/* Feedback Langsung di Samping Tombol */}
                {feedback && (
                  <div className="flex items-center gap-2">
                    {feedback.type === "success" ? (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium animate-in fade-in-50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Tersimpan ke tabel event_settings!</span>
                      </span>
                    ) : (
                      <span className="text-xs text-destructive flex items-center gap-1.5 font-medium animate-in fade-in-50">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>{feedback.message}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
