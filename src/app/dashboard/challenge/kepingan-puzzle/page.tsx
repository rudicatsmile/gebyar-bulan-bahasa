"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Puzzle,
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  ImageIcon,
  Upload,
  Trophy,
  Clock,
  Grid,
  Users,
  RotateCcw,
  Sparkles,
  Layers,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  getAdminJigsawConfigs,
  saveJigsawConfig,
  uploadJigsawImage,
  getAdminJigsawAttempts,
  resetParticipantJigsawAttempt,
  type JigsawConfig,
  type JigsawAttempt,
} from "@/app/actions/kepingan-puzzle";

const JIGSAW_PRESET_IMAGES = [
  {
    id: "preset-wayang",
    title: "Wayang Kulit & Ornamen Nusantara",
    url: "/uploads/puzzle/puzzle-wayang.jpg",
    description: "Seni pertunjukan wayang kulit dengan latar ornamen batik emas dan bunga teratai.",
  },
  {
    id: "preset-tari",
    title: "Pentas Tari Tradisional Nusantara",
    url: "/uploads/puzzle/puzzle-tari.jpg",
    description: "Pesona gerak anggun penari adat dengan hiasan mahkota emas yang memukau.",
  },
];

const PIECE_OPTIONS = [
  { count: 4, grid: 2, label: "4 Keping (2x2)", desc: "Sangat Mudah / Pemula", badge: "2x2" },
  { count: 9, grid: 3, label: "9 Keping (3x3)", desc: "Standar / Direkomendasikan", badge: "3x3" },
  { count: 16, grid: 4, label: "16 Keping (4x4)", desc: "Menantang / Cukup Sulit", badge: "4x4" },
  { count: 25, grid: 5, label: "25 Keping (5x5)", desc: "Tingkat Ahli / Sangat Sulit", badge: "5x5" },
];

export default function DashboardKepinganPuzzlePage() {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"config" | "attempts">("config");

  // Config Form State
  const [configId, setConfigId] = React.useState<string>("");
  const [title, setTitle] = React.useState("Mahakarya Wayang & Ornamen Nusantara");
  const [description, setDescription] = React.useState(
    "Susun kembali kepingan mahakarya wayang kulit dan ornamen batik nusantara hingga menjadi gambar utuh untuk membuktikan ketangkasan visual Anda!"
  );
  const [imageUrl, setImageUrl] = React.useState("/uploads/puzzle/puzzle-wayang.jpg");
  const [piecesCount, setPiecesCount] = React.useState<number>(9);
  const [pointsReward, setPointsReward] = React.useState<number>(100);
  const [timeLimitSeconds, setTimeLimitSeconds] = React.useState<number>(120);
  const [isActive, setIsActive] = React.useState<boolean>(true);

  // Upload state
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Saving state & feedback
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Attempts state
  const [attempts, setAttempts] = React.useState<JigsawAttempt[]>([]);
  const [resettingId, setResettingId] = React.useState<string | null>(null);

  // Grid calculation
  const currentGridSize = Math.round(Math.sqrt(piecesCount));

  // Load Initial Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, attemptsRes] = await Promise.all([
        getAdminJigsawConfigs(),
        getAdminJigsawAttempts(),
      ]);

      if (configRes.success && configRes.configs.length > 0) {
        const primary = configRes.configs.find((c) => c.isActive) || configRes.configs[0];
        setConfigId(primary.id);
        setTitle(primary.title);
        setDescription(primary.description || "");
        setImageUrl(primary.imageUrl);
        setPiecesCount(primary.piecesCount);
        setPointsReward(primary.pointsReward);
        setTimeLimitSeconds(primary.timeLimitSeconds);
        setIsActive(primary.isActive);
      }

      if (attemptsRes.success) {
        setAttempts(attemptsRes.attempts);
      }
    } catch (err) {
      console.error("Gagal memuat data game kepingan puzzle:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadJigsawImage(formData);

      if (res.success && res.url) {
        setImageUrl(res.url);
        setFeedback({
          type: "success",
          message: "Gambar puzzle berhasil diunggah! Jangan lupa klik Simpan Pengaturan di bawah.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengunggah berkas gambar.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat mengunggah gambar." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Save Config
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      setFeedback({ type: "error", message: "Judul dan gambar puzzle wajib diisi." });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await saveJigsawConfig({
        id: configId || undefined,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        piecesCount,
        pointsReward: Number(pointsReward) || 0,
        timeLimitSeconds: Number(timeLimitSeconds) || 0,
        isActive,
      });

      if (res.success && res.config) {
        setConfigId(res.config.id);
        setFeedback({
          type: "success",
          message: "Konfigurasi Game Kepingan Puzzle berhasil disimpan dan langsung diterapkan!",
        });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal menyimpan konfigurasi puzzle." });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan koneksi saat menyimpan puzzle." });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset Attempt
  const handleResetAttempt = async (participantId: string, participantName: string) => {
    if (!confirm(`Yakin ingin mereset kesempatan bermain untuk ${participantName}? Peserta akan dapat bermain kembali.`)) {
      return;
    }

    setResettingId(participantId);
    try {
      const res = await resetParticipantJigsawAttempt(participantId, configId || undefined);
      if (res.success) {
        setAttempts((prev) => prev.filter((a) => a.participantId !== participantId));
      } else {
        alert(res.error || "Gagal mereset kesempatan peserta.");
      }
    } catch {
      alert("Terjadi kendala saat mereset.");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Puzzle className="h-7 w-7 text-accent" />
                <span>Pengelolaan Game Kepingan Puzzle</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Atur gambar, jumlah kepingan (4, 9, 16, 25), poin reward peserta, dan pantau leaderboard penyelesaian.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "config" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("config")}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Konfigurasi Puzzle</span>
              </Button>
              <Button
                variant={activeTab === "attempts" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("attempts")}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Riwayat Peserta ({attempts.length})</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="text-sm">Memuat konfigurasi Game Kepingan Puzzle...</span>
          </div>
        ) : activeTab === "config" ? (
          /* ============================================================= */
          /* TAB 1: FORM KONFIGURASI PUZZLE & PREVIEW */
          /* ============================================================= */
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Form Input (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Status & Informasi Utama */}
              <Card className="p-5 sm:p-6 space-y-5 border-border">
                {/* Toggle Aktif/Nonaktif */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                        Status Challenge Kepingan Puzzle
                      </span>
                      <Badge variant={isActive ? "success" : "warning"} className="text-[10px]">
                        {isActive ? "AKTIF (Bisa Dimainkan)" : "NONAKTIF (Ditutup)"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Bila aktif, game kepingan puzzle akan muncul di menu tantangan peserta dan peserta dapat bermain untuk memperoleh poin.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                      isActive ? "bg-accent" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className="sr-only">Toggle Status Puzzle</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <Input
                    name="title"
                    label="Judul Challenge Puzzle *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Mahakarya Wayang & Ornamen Nusantara"
                    helperText="Judul game yang tampil pada kartu tantangan peserta."
                    required
                  />

                  <Textarea
                    name="description"
                    label="Deskripsi / Petunjuk untuk Peserta *"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Instruksi cara bermain untuk peserta..."
                    helperText="Penjelasan ringkas cara menyusun kepingan dan tema gambar."
                    required
                  />
                </div>
              </Card>

              {/* Card 2: Pemilihan Gambar Puzzle */}
              <Card className="p-5 sm:p-6 space-y-4 border-border">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-accent" />
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Pilihan Gambar Puzzle
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">Rasio Persegi (1:1) Ideal</span>
                </div>

                {/* Preset Galeri Budaya */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pilih Preset Gambar Budaya Nusantara:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {JIGSAW_PRESET_IMAGES.map((preset) => {
                      const isSelected = imageUrl === preset.url;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setImageUrl(preset.url)}
                          className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                              : "border-border bg-card/40 hover:border-accent/40 hover:bg-card"
                          }`}
                        >
                          <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border border-border bg-black/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-foreground truncate">
                              {preset.title}
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {preset.description}
                            </p>
                            {isSelected && (
                              <span className="text-[10px] text-accent font-semibold flex items-center gap-1 mt-1">
                                <CheckCircle2 className="h-3 w-3" /> Dipilih
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upload Gambar Kustom */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Atau Unggah Gambar Kustom Sendiri:
                    </label>
                    <span className="text-[10px] text-muted-foreground">Maks 5MB (JPG, PNG, WEBP)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-xs gap-1.5 cursor-pointer"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{isUploading ? "Mengunggah..." : "Pilih Berkas Gambar"}</span>
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="text-[11px] font-mono text-muted-foreground truncate flex-1">
                      URL Saat ini: {imageUrl}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 3: Pengaturan Gameplay (Jumlah Kepingan, Poin, Batas Waktu) */}
              <Card className="p-5 sm:p-6 space-y-5 border-border">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Grid className="h-5 w-5 text-accent" />
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Aturan Gameplay & Pembagian Kepingan
                  </h3>
                </div>

                {/* Pilihan Jumlah Kepingan */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Jumlah Kepingan Puzzle (Grid Pemotongan) *:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PIECE_OPTIONS.map((opt) => {
                      const isSelected = piecesCount === opt.count;
                      return (
                        <button
                          key={opt.count}
                          type="button"
                          onClick={() => setPiecesCount(opt.count)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? "border-accent bg-accent/15 ring-2 ring-accent/30 shadow-xs"
                              : "border-border bg-card/40 hover:border-border hover:bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-lg font-black text-foreground">
                              {opt.count}
                            </span>
                            <Badge
                              variant={isSelected ? "gold" : "default"}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {opt.badge}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-foreground">{opt.label}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                              {opt.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Poin Reward & Waktu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Input
                    name="pointsReward"
                    label="Poin Reward Penyelesaian *"
                    type="number"
                    min={0}
                    max={1000}
                    value={pointsReward}
                    onChange={(e) => setPointsReward(Number(e.target.value))}
                    helperText="Poin yang otomatis ditambahkan ke saldo peserta saat puzzle selesai."
                    required
                  />

                  <Input
                    name="timeLimitSeconds"
                    label="Batas Waktu Pengerjaan (Detik) *"
                    type="number"
                    min={0}
                    max={600}
                    value={timeLimitSeconds}
                    onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                    helperText="Contoh: 120 detik (2 menit). Isi 0 untuk santai tanpa batas waktu."
                    required
                  />
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving}
                  className="text-xs font-semibold gap-2 min-w-[200px] cursor-pointer shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span>Menyimpan Konfigurasi...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Simpan Seluruh Pengaturan</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Kolom Kanan: Live Simulator Preview (5 cols) */}
            <div className="lg:col-span-5 sticky top-20 space-y-4">
              <Card className="p-5 sm:p-6 border-accent/30 bg-accent/5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      Live Preview Kisi Kepingan ({piecesCount} Keping)
                    </h3>
                  </div>
                  <Badge variant="gold" className="text-[10px]">
                    {currentGridSize} x {currentGridSize}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Berikut tampilan simulasi gambar puzzle yang akan dipecah menjadi{" "}
                  <strong>{piecesCount} kepingan</strong> dan diacak untuk disusun peserta:
                </p>

                {/* Box Preview Grid Gambar */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border-2 border-accent/40 bg-black/60 shadow-lg select-none">
                  {/* Grid Lines Overlay */}
                  <div
                    className="absolute inset-0 grid z-10 pointer-events-none"
                    style={{
                      gridTemplateColumns: `repeat(${currentGridSize}, 1fr)`,
                      gridTemplateRows: `repeat(${currentGridSize}, 1fr)`,
                    }}
                  >
                    {Array.from({ length: piecesCount }).map((_, i) => (
                      <div
                        key={i}
                        className="border border-white/40 flex items-center justify-center p-1 relative backdrop-blur-[0.5px]"
                      >
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/60 text-accent/90 shadow-xs">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Gambar Asli di Belakang */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Preview Puzzle"
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Ringkasan Parameter */}
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Poin Reward:</span>
                    <span className="font-mono font-bold text-accent">+{pointsReward} Poin</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Batas Waktu:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {timeLimitSeconds > 0 ? `${timeLimitSeconds} Detik` : "Tanpa Batas"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mekanisme Bermain:</span>
                    <span className="text-foreground font-medium">Tap-to-Swap / Tukar Posisi</span>
                  </div>
                </div>
              </Card>
            </div>
          </form>
        ) : (
          /* ============================================================= */
          /* TAB 2: RIWAYAT PENYELESAIAN PESERTA */
          /* ============================================================= */
          <Card className="p-5 sm:p-6 space-y-4 border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <span>Daftar Peserta yang Telah Menyelesaikan Puzzle</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total {attempts.length} penyelesaian tercatat. Setiap peserta hanya memperoleh 1x poin reward.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="text-xs gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Segarkan Data</span>
              </Button>
            </div>

            {attempts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Puzzle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <div className="text-sm font-semibold">Belum Ada Peserta yang Menyelesaikan</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Riwayat penyelesaian dan skor peserta akan otomatis muncul di sini begitu peserta menyusun puzzle di menu peserta.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Nama Peserta</TableHead>
                      <TableHead>Instansi / Sekolah</TableHead>
                      <TableHead className="text-center">Waktu Pengerjaan</TableHead>
                      <TableHead className="text-center">Jumlah Swap</TableHead>
                      <TableHead className="text-center">Poin Diperoleh</TableHead>
                      <TableHead className="text-center">Waktu Selesai</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((att, idx) => (
                      <TableRow key={att.id}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          {att.participantName || "Peserta"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {att.institution || "-"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-accent">
                          {att.timeSeconds !== null ? `${att.timeSeconds}s` : "-"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {att.movesCount} langkah
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="gold" className="text-xs font-mono font-bold">
                            +{att.score} Poin
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-[11px] text-muted-foreground">
                          {new Date(att.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={resettingId === att.participantId}
                            onClick={() =>
                              handleResetAttempt(att.participantId, att.participantName || "Peserta")
                            }
                            className="text-[11px] h-7 px-2 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            title="Reset kesempatan agar peserta bisa bermain ulang"
                          >
                            {resettingId === att.participantId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span>Reset Kesempatan</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
