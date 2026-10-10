"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getEventSettings,
  saveEventSettings,
  uploadHeroImageAction,
  uploadLogoImageAction,
  getMonitorScoreboardSettings,
  updateMonitorScoreboardSettings,
} from "@/app/actions/settings";
import { getCompetitions, type Competition } from "@/lib/supabase/queries";
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
  Camera,
  Trophy,
  CheckSquare,
  Square,
} from "lucide-react";

export default function DashboardPengaturanPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [eventShortName, setEventShortName] = React.useState("GebyarBulanBahasa");
  const [eventOrganizer, setEventOrganizer] = React.useState("SMK DP 2 Jakarta");
  const [eventTheme, setEventTheme] = React.useState(
    "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia."
  );
  const [eventDate, setEventDate] = React.useState("11 November 2026");
  const [eventYear, setEventYear] = React.useState("2026");
  const [heroImageUrl, setHeroImageUrl] = React.useState("");
  const [isUploadingHero, setIsUploadingHero] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [logoImageUrl, setLogoImageUrl] = React.useState("");
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);

  const [scoreGapThreshold, setScoreGapThreshold] = React.useState("20");
  const [maxCompetitions, setMaxCompetitions] = React.useState("3");
  const [rotationInterval, setRotationInterval] = React.useState("15");
  const [autoApproveTwibbon, setAutoApproveTwibbon] = React.useState(false);

  // Pengaturan modul Papan Skor Layar Monitor TV
  const [competitionsList, setCompetitionsList] = React.useState<Competition[]>([]);
  const [scoreboardEnabled, setScoreboardEnabled] = React.useState(true);
  const [selectedScoreboardCompIds, setSelectedScoreboardCompIds] = React.useState<string[]>([]);

  // Kontak & Sekretariat Panitia
  const [contactLocation, setContactLocation] = React.useState(
    "Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A."
  );
  const [contactHours, setContactHours] = React.useState(
    "07.30 - 21.00 WIB (Selama Acara Berlangsung)"
  );
  const [contactEmail, setContactEmail] = React.useState("panitia@gebyarbulanbahasa.id");
  const [contactPhone, setContactPhone] = React.useState("0812-3456-7890 (Seksi Acara)");
  const [contactStageMap, setContactStageMap] = React.useState(
    "• Panggung Utama (Stage A): Puisi, MC Formal, Vokal Grup\n• Ruang Bioskop Mini Lt. 2: Lomba Film Pendek\n• Aula Serbaguna: Pidato Bahasa Indonesia\n• Area Kreatif Selasar: Melukis Tas Kanvas\n• Ruang Teater A: Seni Teater Monolog\n• Pelataran Budaya: Seni Tradisi Palang Pintu Betawi"
  );

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  // Penanda sudah ter-hydrate di client. Menjamin render pertama di client
  // identik dengan HTML dari server sehingga menghindari hydration mismatch
  // pada atribut seperti `disabled` yang bergantung state loading.
  const [mounted, setMounted] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load data awal dari API / Database
  const loadSettings = React.useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      // Muat daftar cabang lomba & konfigurasi scoreboard monitor secara paralel
      try {
        const [comps, sbRes] = await Promise.all([
          getCompetitions(),
          getMonitorScoreboardSettings(),
        ]);
        setCompetitionsList(comps);
        if (sbRes.success && sbRes.settings) {
          setScoreboardEnabled(sbRes.settings.enabled);
          setSelectedScoreboardCompIds(sbRes.settings.selectedCompetitionIds);
        }
      } catch (errSb) {
        console.error("Gagal memuat konfigurasi scoreboard monitor:", errSb);
      }

      // Prioritaskan direct API route
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setEventName(data.settings.eventName);
          setEventShortName(data.settings.eventShortName || "GebyarBulanBahasa");
          setEventOrganizer(data.settings.eventOrganizer || "SMK DP 2 Jakarta");
          setEventTheme(data.settings.eventTheme);
          setEventDate(data.settings.eventDate || "11 November 2026");
          setEventYear(data.settings.eventYear);
          setHeroImageUrl(data.settings.heroImageUrl || "");
          setLogoImageUrl(data.settings.logoImageUrl || "");
          setScoreGapThreshold(String(data.settings.scoreGapThreshold));
          setMaxCompetitions(String(data.settings.maxCompetitions));
          setRotationInterval(String(data.settings.rotationInterval));
          if (data.settings.autoApproveTwibbon !== undefined) setAutoApproveTwibbon(Boolean(data.settings.autoApproveTwibbon));
          if (data.settings.contactLocation) setContactLocation(data.settings.contactLocation);
          if (data.settings.contactHours) setContactHours(data.settings.contactHours);
          if (data.settings.contactEmail) setContactEmail(data.settings.contactEmail);
          if (data.settings.contactPhone) setContactPhone(data.settings.contactPhone);
          if (data.settings.contactStageMap) setContactStageMap(data.settings.contactStageMap);
          setIsLoading(false);
          return;
        }
      }

      // Fallback via Server Action
      const actionRes = await getEventSettings();
      if (actionRes.success && actionRes.settings) {
        setEventName(actionRes.settings.eventName);
        setEventShortName(actionRes.settings.eventShortName || "GebyarBulanBahasa");
        setEventOrganizer(actionRes.settings.eventOrganizer || "SMK DP 2 Jakarta");
        setEventTheme(actionRes.settings.eventTheme);
        setEventDate(actionRes.settings.eventDate || "11 November 2026");
        setEventYear(actionRes.settings.eventYear);
        setHeroImageUrl(actionRes.settings.heroImageUrl || "");
        setLogoImageUrl(actionRes.settings.logoImageUrl || "");
        setScoreGapThreshold(String(actionRes.settings.scoreGapThreshold));
        setMaxCompetitions(String(actionRes.settings.maxCompetitions));
        setRotationInterval(String(actionRes.settings.rotationInterval));
        if (actionRes.settings.autoApproveTwibbon !== undefined) setAutoApproveTwibbon(Boolean(actionRes.settings.autoApproveTwibbon));
        if (actionRes.settings.contactLocation) setContactLocation(actionRes.settings.contactLocation);
        if (actionRes.settings.contactHours) setContactHours(actionRes.settings.contactHours);
        if (actionRes.settings.contactEmail) setContactEmail(actionRes.settings.contactEmail);
        if (actionRes.settings.contactPhone) setContactPhone(actionRes.settings.contactPhone);
        if (actionRes.settings.contactStageMap) setContactStageMap(actionRes.settings.contactStageMap);
      }
    } catch (err) {
      console.error("Gagal load settings:", err);
      try {
        const actionRes = await getEventSettings();
        if (actionRes.success && actionRes.settings) {
          setEventName(actionRes.settings.eventName);
          setEventShortName(actionRes.settings.eventShortName || "GebyarBulanBahasa");
          setEventOrganizer(actionRes.settings.eventOrganizer || "SMK DP 2 Jakarta");
          setEventTheme(actionRes.settings.eventTheme);
          setEventDate(actionRes.settings.eventDate || "11 November 2026");
          setEventYear(actionRes.settings.eventYear);
          setHeroImageUrl(actionRes.settings.heroImageUrl || "");
          setLogoImageUrl(actionRes.settings.logoImageUrl || "");
          setScoreGapThreshold(String(actionRes.settings.scoreGapThreshold));
          setMaxCompetitions(String(actionRes.settings.maxCompetitions));
          setRotationInterval(String(actionRes.settings.rotationInterval));
          if (actionRes.settings.autoApproveTwibbon !== undefined) setAutoApproveTwibbon(Boolean(actionRes.settings.autoApproveTwibbon));
          if (actionRes.settings.contactLocation) setContactLocation(actionRes.settings.contactLocation);
          if (actionRes.settings.contactHours) setContactHours(actionRes.settings.contactHours);
          if (actionRes.settings.contactEmail) setContactEmail(actionRes.settings.contactEmail);
          if (actionRes.settings.contactPhone) setContactPhone(actionRes.settings.contactPhone);
          if (actionRes.settings.contactStageMap) setContactStageMap(actionRes.settings.contactStageMap);
        }
      } catch (fallbackErr) {
        console.error("Fallback load failed:", fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
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

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Ukuran berkas logo melebihi batas 2MB. Silakan pilih berkas yang lebih kecil.",
      });
      return;
    }

    try {
      setIsUploadingLogo(true);
      setFeedback(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadLogoImageAction(formData);
      if (res.success && res.url) {
        setLogoImageUrl(res.url);
        setFeedback({
          type: "success",
          message: "Logo berhasil diunggah! Klik 'Simpan Seluruh Pengaturan' untuk menerapkan ke database.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengunggah berkas logo.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kendala saat mengunggah logo.",
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = "";
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
      eventShortName: eventShortName.trim(),
      eventOrganizer: eventOrganizer.trim(),
      eventTheme: eventTheme.trim(),
      eventDate: eventDate.trim(),
      eventYear: String(eventYear).trim(),
      heroImageUrl: heroImageUrl.trim(),
      logoImageUrl: logoImageUrl.trim(),
      scoreGapThreshold: Number(scoreGapThreshold) || 20,
      maxCompetitions: Number(maxCompetitions) || 3,
      rotationInterval: Number(rotationInterval) || 15,
      autoApproveTwibbon: Boolean(autoApproveTwibbon),
      contactLocation: contactLocation.trim(),
      contactHours: contactHours.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      contactStageMap: contactStageMap.trim(),
    };

    try {
      // Simpan pengaturan scoreboard monitor
      try {
        await updateMonitorScoreboardSettings({
          enabled: scoreboardEnabled,
          selectedCompetitionIds: selectedScoreboardCompIds,
        });
      } catch (sbErr) {
        console.warn("Gagal simpan updateMonitorScoreboardSettings:", sbErr);
      }

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
            disabled={mounted && (isLoading || isSaving)}
            className="text-xs gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${mounted && isLoading ? "animate-spin" : ""}`} />
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
          {!mounted || isLoading ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="eventName"
                    label="Nama Acara *"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Contoh: Gebyar Bulan Bahasa dan Kebudayaan"
                    required
                  />
                  <Input
                    name="eventShortName"
                    label="Nama Singkat / Brand Logo *"
                    value={eventShortName}
                    onChange={(e) => setEventShortName(e.target.value)}
                    placeholder="Contoh: GebyarBulanBahasa atau Gebyar Bulan Bahasa"
                    helperText="Tampil pada logo header, footer, sidebar dashboard, & monitor TV."
                    required
                  />
                </div>
                <Input
                  name="eventOrganizer"
                  label="Penyelenggara / Instansi *"
                  value={eventOrganizer}
                  onChange={(e) => setEventOrganizer(e.target.value)}
                  placeholder="Contoh: SMK DP 2 Jakarta"
                  helperText="Tampil pada header navbar di bawah nama logo acara."
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
                    placeholder="Contoh: 11 November 2026 atau 10 - 11 November 2026"
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

                {/* Upload Logo Acara */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Logo Acara (Navbar, Sidebar &amp; Monitor)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Maksimal 2MB (PNG, WEBP, SVG, JPG)</span>
                  </label>

                  {logoImageUrl ? (
                    <div className="space-y-3 p-4 rounded-xl border border-accent/30 bg-accent/5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoImageUrl}
                            alt="Preview Logo"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <span className="text-[11px] text-muted-foreground truncate font-mono">{logoImageUrl}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logoFileInputRef.current?.click()}
                              disabled={isUploadingLogo}
                              className="text-xs gap-1.5 cursor-pointer shrink-0"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span>Ganti Logo</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setLogoImageUrl("")}
                              className="text-xs gap-1.5 cursor-pointer shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Jika logo dihapus, sistem akan menampilkan ikon default.
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => logoFileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-accent/60 rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-muted/40"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="p-3 rounded-full bg-accent/10 text-accent">
                          {isUploadingLogo ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <ImageIcon className="h-6 w-6" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-foreground">
                          {isUploadingLogo ? "Sedang mengunggah logo..." : "Klik untuk unggah logo acara"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Rekomendasi gambar kotak (persegi) dengan latar transparan, mis. 512x512
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
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
                  <span>3. Moderasi & Persetujuan Twibbon Publik</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: auto_approve_twibbon)</span>
                </h3>

                <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-accent" />
                      <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                        Auto Approve Twibbon
                      </span>
                      <Badge
                        variant={autoApproveTwibbon ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {autoApproveTwibbon ? "AKTIF (Otomatis)" : "NONAKTIF (Moderasi Manual)"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {autoApproveTwibbon ? (
                        <>
                          <strong className="text-foreground">Mode Auto Approve:</strong> Setiap unggahan twibbon baru langsung disetujui otomatis oleh sistem, langsung tayang di galeri serta layar monitor publik, dan peserta yang mengunggah pertama kali langsung memperoleh reward <strong>+20 Poin</strong> tanpa menunggu review panitia.
                        </>
                      ) : (
                        <>
                          <strong className="text-foreground">Mode Moderasi Manual:</strong> Setiap unggahan twibbon baru masuk ke antrean moderasi (<span className="font-mono text-[11px]">/dashboard/twibbon</span>). Poin dan penayangan di monitor publik hanya diberikan setelah tim panitia menekan tombol <strong>Setujui</strong>.
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                      {autoApproveTwibbon ? "Otomatis" : "Manual"}
                    </span>
                    <button
                      id="toggle-auto-approve-twibbon"
                      type="button"
                      role="switch"
                      aria-checked={autoApproveTwibbon}
                      onClick={() => setAutoApproveTwibbon(!autoApproveTwibbon)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                        autoApproveTwibbon ? "bg-accent" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span className="sr-only">Toggle Auto Approve Twibbon</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          autoApproveTwibbon ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bagian 4 */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>4. Layar Monitor Lapangan Venue & Papan Skor</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings & monitor_displays (key: monitor, monitor_scoreboard_settings)</span>
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

                {/* Toggle & Checklist Papan Skor */}
                <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-accent" />
                        <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                          Tampilkan Modul Papan Skor Sementara di Layar Monitor
                        </span>
                        <Badge
                          variant={scoreboardEnabled ? "success" : "warning"}
                          className="text-[10px]"
                        >
                          {scoreboardEnabled ? "AKTIF (Ditayangkan)" : "NONAKTIF (Disembunyikan)"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Jika diaktifkan, modul <strong>Papan Skor Sementara (5 Besar Lomba Aktif)</strong> akan muncul dalam siklus rotasi layar monitor panggung (<span className="font-mono text-[11px]">/monitor</span>).
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                      <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                        {scoreboardEnabled ? "Ditayangkan" : "Disembunyikan"}
                      </span>
                      <button
                        id="toggle-scoreboard-monitor"
                        type="button"
                        role="switch"
                        aria-checked={scoreboardEnabled}
                        onClick={() => setScoreboardEnabled(!scoreboardEnabled)}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                          scoreboardEnabled ? "bg-accent" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span className="sr-only">Toggle Papan Skor Monitor</span>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            scoreboardEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {scoreboardEnabled && (
                    <div className="pt-3 border-t border-border space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Pilih Cabang Lomba yang Ditampilkan di Papan Skor
                          </label>
                          <p className="text-[11px] text-muted-foreground">
                            Layar monitor akan merotasikan papan skor 5 besar untuk cabang-cabang lomba yang dicentang.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedScoreboardCompIds(competitionsList.map((c) => c.id))}
                            className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                          >
                            <CheckSquare className="h-3 w-3" />
                            <span>Pilih Semua</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedScoreboardCompIds([])}
                            className="text-[11px] h-7 px-2.5 gap-1 cursor-pointer"
                          >
                            <Square className="h-3 w-3" />
                            <span>Kosongkan (Semua)</span>
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                        {competitionsList.map((comp) => {
                          const isChecked =
                            selectedScoreboardCompIds.length === 0 ||
                            selectedScoreboardCompIds.includes(comp.id);
                          return (
                            <label
                              key={comp.id}
                              className={`p-3 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
                                  : "border-border/60 bg-muted/10 opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (selectedScoreboardCompIds.length === 0) {
                                      if (!e.target.checked) {
                                        setSelectedScoreboardCompIds(
                                          competitionsList
                                            .filter((c) => c.id !== comp.id)
                                            .map((c) => c.id)
                                        );
                                      }
                                    } else {
                                      if (e.target.checked) {
                                        setSelectedScoreboardCompIds([
                                          ...selectedScoreboardCompIds,
                                          comp.id,
                                        ]);
                                      } else {
                                        setSelectedScoreboardCompIds(
                                          selectedScoreboardCompIds.filter((id) => id !== comp.id)
                                        );
                                      }
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-foreground truncate">
                                    {comp.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground uppercase font-mono">
                                    {comp.category} • Status: {comp.status}
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant={comp.status === "berlangsung" ? "live" : "default"}
                                className="text-[9px] uppercase px-1.5 py-0 shrink-0"
                              >
                                {comp.status === "berlangsung" ? "LIVE" : comp.status}
                              </Badge>
                            </label>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-muted-foreground italic">
                        * Catatan: Jika tidak ada lomba yang dipilih secara spesifik, sistem secara otomatis merotasikan seluruh cabang lomba yang berstatus sedang berlangsung (&apos;berlangsung&apos;).
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bagian 5 */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-heading text-base font-bold text-foreground border-b border-border pb-2 flex items-center justify-between">
                  <span>5. Informasi Kontak, Sekretariat & Denah Lomba</span>
                  <span className="text-[10px] font-mono text-muted-foreground font-normal">Tabel: event_settings (key: contact)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="contactLocation"
                    label="Lokasi Sekretariat Panitia *"
                    value={contactLocation}
                    onChange={(e) => setContactLocation(e.target.value)}
                    placeholder="Contoh: Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A."
                    helperText="Lokasi fisik sekretariat yang tampil di halaman /kontak."
                    required
                  />
                  <Input
                    name="contactHours"
                    label="Jam Layanan Operasional *"
                    value={contactHours}
                    onChange={(e) => setContactHours(e.target.value)}
                    placeholder="Contoh: 07.30 - 21.00 WIB (Selama Acara Berlangsung)"
                    helperText="Waktu operasional bantuan & sekretariat."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    name="contactEmail"
                    label="Email Resmi Panitia *"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="panitia@gebyarbulanbahasa.id"
                    helperText="Alamat email kontak panitia resmi."
                    required
                  />
                  <Input
                    name="contactPhone"
                    label="Narahubung / WhatsApp Panitia *"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="0812-3456-7890 (Seksi Acara)"
                    helperText="Nomor telepon WhatsApp narahubung."
                    required
                  />
                </div>

                <Textarea
                  name="contactStageMap"
                  label="Denah Panggung & Lokasi Lomba (1 baris per lokasi) *"
                  value={contactStageMap}
                  onChange={(e) => setContactStageMap(e.target.value)}
                  rows={6}
                  placeholder="• Panggung Utama: Lomba Puisi&#10;• Aula: Pidato..."
                  helperText="Daftar lokasi lomba panggung/ruangan yang ditampilkan pada denah mini halaman /kontak."
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
