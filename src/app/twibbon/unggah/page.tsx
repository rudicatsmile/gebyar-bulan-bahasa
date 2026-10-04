"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  LayoutTemplate,
  Loader2,
  Download,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
} from "lucide-react";
import { getActiveTwibbonTemplates, type TwibbonTemplate } from "@/app/actions/twibbon-template";
import { submitTwibbon, uploadTwibbonImage } from "@/app/actions/twibbon";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Gambar komposisi twibbon (foto user + overlay template) ke context canvas.
 * Offset disimpan sebagai fraksi ukuran box sehingga hasil preview (kanvas
 * kecil) identik dengan hasil ekspor (kanvas 1000px).
 */
function drawComposition(
  ctx: CanvasRenderingContext2D,
  size: number,
  photo: HTMLImageElement,
  template: HTMLImageElement | null,
  zoom: number,
  offsetXNorm: number,
  offsetYNorm: number
) {
  ctx.clearRect(0, 0, size, size);

  // Skala "cover": sisi terpendek foto mengisi penuh kotak, lalu dikali zoom.
  const coverScale = size / Math.min(photo.naturalWidth, photo.naturalHeight);
  const scale = coverScale * zoom;
  const drawnW = photo.naturalWidth * scale;
  const drawnH = photo.naturalHeight * scale;
  const x = (size - drawnW) / 2 + offsetXNorm * size;
  const y = (size - drawnH) / 2 + offsetYNorm * size;
  ctx.drawImage(photo, x, y, drawnW, drawnH);

  if (template) {
    ctx.drawImage(template, 0, 0, size, size);
  }
}

// ─── Step types ───────────────────────────────────────────────────────────────
type Step = "template" | "photo" | "form" | "preview" | "done";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnggahTwibbonPage() {
  const [eventName, setEventName] = React.useState("Gebyar Bulan Bahasa dan Kebudayaan");
  const [step, setStep] = React.useState<Step>("template");

  // Templates
  const [templates, setTemplates] = React.useState<TwibbonTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(true);
  const [selectedTemplate, setSelectedTemplate] = React.useState<TwibbonTemplate | null>(null);

  // Photo — elemen gambar mentah + parameter framing (posisi & zoom)
  const [photoImg, setPhotoImg] = React.useState<HTMLImageElement | null>(null);
  const [templateImg, setTemplateImg] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);
  const [mergedPhoto, setMergedPhoto] = React.useState<string | null>(null);
  const [merging, setMerging] = React.useState(false);
  const [mergeError, setMergeError] = React.useState("");

  // Form
  const [fullName, setFullName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [regNumber, setRegNumber] = React.useState("");
  const [caption, setCaption] = React.useState("");

  // Submit
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  // Load event name & templates
  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings?.eventName) setEventName(d.settings.eventName);
      })
      .catch(() => {});

    setLoadingTemplates(true);
    getActiveTwibbonTemplates()
      .then((res) => {
        if (res.success && res.data) setTemplates(res.data);
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  // ── Step: Pilih Template ────────────────────────────────────────────────────
  const handleSelectTemplate = (t: TwibbonTemplate) => {
    setSelectedTemplate(t);
    setMergedPhoto(null);
    setPhotoImg(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // ── Step: Upload & Framing Foto ────────────────────────────────────────────
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const activePointersRef = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = React.useRef<{ startDist: number; startZoom: number } | null>(null);

  // Muat elemen gambar template saat template dipilih (untuk preview langsung).
  // setState dipanggil di callback promise, tidak di body effect.
  React.useEffect(() => {
    let cancelled = false;
    const url = selectedTemplate?.image_url;
    const task = url
      ? loadImage(url).catch(() => null as HTMLImageElement | null)
      : Promise.resolve<HTMLImageElement | null>(null);
    task.then((img) => {
      if (!cancelled) setTemplateImg(img);
    });
    return () => { cancelled = true; };
  }, [selectedTemplate]);

  // Batasi offset terhadap "slack" hasil zoom agar tidak pernah muncul celah putih
  const framedOffsets = React.useMemo(() => {
    const limit = (zoom - 1) / 2;
    return {
      x: clamp(offsetX, -limit, limit),
      y: clamp(offsetY, -limit, limit),
    };
  }, [zoom, offsetX, offsetY]);

  // Gambar ulang preview framing setiap parameter berubah
  React.useEffect(() => {
    if (step !== "photo") return;
    const canvas = previewCanvasRef.current;
    if (!canvas || !photoImg) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawComposition(
      ctx,
      canvas.width,
      photoImg,
      templateImg,
      zoom,
      framedOffsets.x,
      framedOffsets.y
    );
  }, [step, photoImg, templateImg, zoom, framedOffsets]);

  // Scroll mouse = zoom di desktop (preventDefault agar halaman tidak ikut scroll)
  React.useEffect(() => {
    if (step !== "photo") return;
    const canvas = previewCanvasRef.current;
    if (!canvas || !photoImg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z * (e.deltaY > 0 ? 0.94 : 1.06), 1, 4));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [step, photoImg]);

  // Proses file dari galeri maupun kamera — keduanya masuk ke editor framing
  const handleFile = (file: File | undefined | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMergeError("Ukuran foto melebihi batas 5MB.");
      return;
    }
    setMergeError("");
    setMergedPhoto(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      loadImage(reader.result as string)
        .then((img) => {
          setPhotoImg(img);
          setZoom(1);
          setOffsetX(0);
          setOffsetY(0);
        })
        .catch(() => setMergeError("Gagal memuat foto. Coba file lain."));
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    // Reset nilai agar file yang sama bisa dipilih ulang
    e.target.value = "";
  };

  // ── Interaksi drag (geser) & pinch (zoom) pada kanvas ──
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !photoImg) return;
    canvas.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      const pts = [...activePointersRef.current.values()];
      pinchStateRef.current = { startDist: distance(pts[0], pts[1]), startZoom: zoom };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pointers = activePointersRef.current;
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (pointers.size === 1) {
      // Geser foto (delta dinormalisasi terhadap ukuran tampilan kanvas)
      const limit = (zoom - 1) / 2;
      setOffsetX((o) => clamp(o + (cur.x - prev.x) / rect.width, -limit, limit));
      setOffsetY((o) => clamp(o + (cur.y - prev.y) / rect.height, -limit, limit));
    } else if (pointers.size === 2 && pinchStateRef.current) {
      // Pinch two-finger zoom di HP
      pointers.set(e.pointerId, cur);
      const pts = [...pointers.values()];
      const ratio = distance(pts[0], pts[1]) / (pinchStateRef.current.startDist || 1);
      setZoom(clamp(pinchStateRef.current.startZoom * ratio, 1, 4));
      return;
    }
    pointers.set(e.pointerId, cur);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchStateRef.current = null;
  };

  const resetFraming = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Komposisi final sesuai posisi & zoom terakhir, lalu lanjut ke step form
  const handleFinishEditor = async () => {
    if (!photoImg) return;
    setMerging(true);
    setMergeError("");
    try {
      let tImg = templateImg;
      if (selectedTemplate && !tImg) {
        try {
          tImg = await loadImage(selectedTemplate.image_url);
        } catch {
          tImg = null;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung browser.");
      drawComposition(ctx, 1000, photoImg, tImg, zoom, framedOffsets.x, framedOffsets.y);
      setMergedPhoto(canvas.toDataURL("image/jpeg", 0.92));
      if (selectedTemplate && !tImg) {
        setMergeError("Template gagal dimuat; foto diproses tanpa bingkai.");
      }
      setStep("form");
    } catch (err) {
      setMergeError(
        err instanceof Error
          ? `Gagal memproses foto: ${err.message}`
          : "Gagal memproses foto. Silakan coba lagi."
      );
    } finally {
      setMerging(false);
    }
  };

  const handleDownload = () => {
    if (!mergedPhoto) return;
    const a = document.createElement("a");
    a.href = mergedPhoto;
    a.download = `twibbon-${Date.now()}.jpg`;
    a.click();
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !institution || !caption) {
      setError("Silakan lengkapi seluruh kolom formulir.");
      return;
    }
    if (!mergedPhoto) {
      setError("Foto twibbon diperlukan.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Unggah hasil komposisi lewat Server Action (service role).
      // Upload langsung dari browser dengan anon key ditolak RLS storage.objects.
      const slug =
        fullName
          .replace(/[^A-Za-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase()
          .slice(0, 40) || "pengunjung";
      const filePath = `uploads/${Date.now()}-${slug}.jpg`;
      const { url, error: uploadErr } = await uploadTwibbonImage({
        filePath,
        fileBase64: mergedPhoto, // data URL, prefix Strip di server
        mimeType: "image/jpeg",
      });

      if (uploadErr || !url) {
        setError(uploadErr || "Gagal mengunggah foto.");
        setSubmitting(false);
        return;
      }

      // Submit ke database
      const result = await submitTwibbon({
        uploaderName: fullName,
        uploaderInstitution: institution,
        caption,
        imageUrl: url,
        participantNumber: regNumber || undefined,
      });

      if (!result.success) {
        setError(result.error || "Gagal mengirim twibbon.");
        setSubmitting(false);
        return;
      }

      setStep("done");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("template");
    setSelectedTemplate(null);
    setPhotoImg(null);
    setMergedPhoto(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setFullName("");
    setInstitution("");
    setRegNumber("");
    setCaption("");
    setError("");
    setMergeError("");
  };

  // ── Step labels ─────────────────────────────────────────────────────────────
  const stepLabels: { key: Step; label: string }[] = [
    { key: "template", label: "Pilih Template" },
    { key: "photo", label: "Upload Foto" },
    { key: "form", label: "Isi Data" },
    { key: "preview", label: "Preview" },
  ];
  const stepKeys: Step[] = ["template", "photo", "form", "preview"];
  const currentStepIdx = stepKeys.indexOf(step);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Back link */}
          <Link
            href="/galeri/twibbon"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Galeri Twibbon</span>
          </Link>

          {/* Page title */}
          <div className="space-y-3">
            <Badge variant="gold" className="text-xs">
              Formulir Pengajuan Publik
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Unggah Foto Twibbon
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Kirimkan foto diri terbaikmu dengan bingkai resmi {eventName}. Foto akan melalui verifikasi tim Media Center sebelum tampil di galeri publik.
            </p>
          </div>

          {/* Done State */}
          {step === "done" ? (
            <Card className="border-success/40 bg-success/5 p-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <div className="space-y-1">
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Twibbon Berhasil Diajukan!
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Terima kasih, <strong>{fullName}</strong>. Foto twibbon Anda saat ini berada dalam antrean moderasi Media Center. Estimasi waktu moderasi &lt; 30 menit.
                </p>
              </div>
              <div className="pt-4 flex justify-center gap-3 flex-wrap">
                <Link href="/galeri/twibbon">
                  <Button variant="outline" size="sm" className="text-xs">
                    Lihat Galeri Twibbon
                  </Button>
                </Link>
                <Button size="sm" className="text-xs" onClick={handleReset}>
                  Unggah Foto Lain
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Stepper */}
              <div className="flex items-center gap-0">
                {stepLabels.map((s, idx) => {
                  const isDone = idx < currentStepIdx;
                  const isActive = s.key === step;
                  return (
                    <React.Fragment key={s.key}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isDone
                              ? "bg-success text-white"
                              : isActive
                              ? "bg-accent text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] font-semibold whitespace-nowrap ${
                            isActive ? "text-accent" : isDone ? "text-success" : "text-muted-foreground"
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {idx < stepLabels.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-1 mb-4 transition-colors ${
                            idx < currentStepIdx ? "bg-success" : "bg-border"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <Card className="p-6 sm:p-8">
                {/* ── STEP 1: Pilih Template ────────────────────────────────── */}
                {step === "template" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        Pilih Template Bingkai
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pilih bingkai twibbon resmi yang ingin kamu gunakan. Foto kamu akan digabungkan otomatis dengan bingkai pilihan.
                      </p>
                    </div>

                    {loadingTemplates ? (
                      <div className="py-10 flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin text-accent" />
                        <p className="text-xs">Memuat template...</p>
                      </div>
                    ) : templates.length === 0 ? (
                      <div className="py-10 flex flex-col items-center gap-3 text-center">
                        <LayoutTemplate className="h-10 w-10 text-muted-foreground/50" />
                        <p className="text-sm font-semibold text-foreground">Belum ada template tersedia</p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Admin belum menambahkan template twibbon. Kamu tetap bisa mengunggah foto tanpa template.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs mt-2"
                          onClick={() => {
                            setSelectedTemplate(null);
                            setStep("photo");
                          }}
                        >
                          Lanjut Tanpa Template
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSelectTemplate(t)}
                              className={`relative rounded-xl overflow-hidden border-2 transition-all text-left hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/60 ${
                                selectedTemplate?.id === t.id
                                  ? "border-accent shadow-md scale-[1.02]"
                                  : "border-border hover:border-accent/50"
                              }`}
                            >
                              <div
                                className="aspect-square w-full"
                                style={{ background: "repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 0 0 / 14px 14px" }}
                              >
                                <img
                                  src={t.image_url}
                                  alt={t.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="p-2 bg-card">
                                <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                                {t.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
                                )}
                              </div>
                              {selectedTemplate?.id === t.id && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="border-t border-border pt-4 flex items-center justify-between flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                            onClick={() => {
                              setSelectedTemplate(null);
                              setStep("photo");
                            }}
                          >
                            Lewati — tidak pakai template
                          </button>
                          <Button
                            size="sm"
                            className="text-xs"
                            disabled={!selectedTemplate}
                            onClick={() => setStep("photo")}
                          >
                            Lanjut <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── STEP 2: Upload Foto ───────────────────────────────────── */}
                {step === "photo" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        Unggah & Atur Posisi Foto
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTemplate
                          ? `Pilih atau ambil foto, lalu geser dan zoom agar wajah pas dengan bingkai "${selectedTemplate.name}".`
                          : "Pilih atau ambil foto, lalu atur posisi dan zoom sesuai selera Anda."}
                      </p>
                    </div>

                    {/* Input tersembunyi: galeri (tanpa capture) & kamera (selfie) */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoInputChange}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoInputChange}
                      className="hidden"
                    />

                    {!photoImg ? (
                      /* Pilih sumber foto */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => galleryInputRef.current?.click()}
                            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-accent bg-card p-6 text-center transition-colors active:scale-[0.98]"
                          >
                            <Upload className="h-7 w-7 text-accent" />
                            <span className="text-xs font-semibold text-foreground">Pilih dari Galeri</span>
                            <span className="text-[10px] text-muted-foreground">Foto yang sudah ada di HP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-accent bg-card p-6 text-center transition-colors active:scale-[0.98]"
                          >
                            <Camera className="h-7 w-7 text-accent" />
                            <span className="text-xs font-semibold text-foreground">Ambil Foto</span>
                            <span className="text-[10px] text-muted-foreground">Kamera depan / selfie</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground text-center">
                          JPG / PNG / WebP — Maks. 5MB — Rasio 1:1 direkomendasikan
                        </p>
                      </div>
                    ) : (
                      /* Editor framing: geser & zoom foto di dalam bingkai */
                      <div className="space-y-4">
                        <div className="relative w-full max-w-sm mx-auto">
                          <canvas
                            ref={previewCanvasRef}
                            width={600}
                            height={600}
                            className="block w-full aspect-square rounded-xl border-2 border-accent/40 bg-black touch-none select-none cursor-grab active:cursor-grabbing"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerEnd}
                            onPointerCancel={handlePointerEnd}
                          />
                          {zoom === 1 && (
                            <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white whitespace-nowrap">
                              <Move className="h-3 w-3" /> Geser foto agar pas dengan bingkai
                            </div>
                          )}
                        </div>

                        {/* Kontrol zoom */}
                        <div className="flex items-center gap-3 max-w-sm mx-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            aria-label="Perkecil foto"
                            onClick={() => setZoom((z) => clamp(z - 0.15, 1, 4))}
                          >
                            <ZoomOut className="h-4 w-4" />
                          </Button>
                          <input
                            type="range"
                            min={1}
                            max={4}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 cursor-pointer"
                            aria-label="Zoom foto"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            aria-label="Perbesar foto"
                            onClick={() => setZoom((z) => clamp(z + 0.15, 1, 4))}
                          >
                            <ZoomIn className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-[11px] text-muted-foreground text-center">
                          Seret satu jari untuk memindahkan foto • cubit dua jari / scroll untuk zoom
                        </p>

                        {/* Aksi cepat */}
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={resetFraming}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Pusatkan Ulang
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => galleryInputRef.current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5 mr-1" /> Ganti dari Galeri
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => cameraInputRef.current?.click()}
                          >
                            <Camera className="h-3.5 w-3.5 mr-1" /> Foto Ulang
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Template info */}
                    {selectedTemplate && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <img
                          src={selectedTemplate.image_url}
                          alt={selectedTemplate.name}
                          className="h-10 w-10 object-contain rounded border border-border"
                          style={{ background: "repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 0 0 / 8px 8px" }}
                        />
                        <div>
                          <p className="text-xs font-semibold text-foreground">{selectedTemplate.name}</p>
                          <p className="text-[10px] text-muted-foreground">Template yang dipilih</p>
                        </div>
                        <button
                          type="button"
                          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground underline"
                          onClick={() => setStep("template")}
                        >
                          Ganti
                        </button>
                      </div>
                    )}

                    {mergeError && (
                      <div className="p-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{mergeError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setStep("template")}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        disabled={!photoImg || merging}
                        onClick={handleFinishEditor}
                      >
                        {merging ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Memproses...
                          </>
                        ) : (
                          <>
                            Lanjut <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Isi Form ──────────────────────────────────────── */}
                {step === "form" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        Isi Data Pengunggah
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Data ini akan ditampilkan bersama foto twibbon kamu di galeri.
                      </p>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Input
                      label="Nama Lengkap Pengunggah *"
                      placeholder="Contoh: Ahmad Fauzan Ramadhan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    <Input
                      label="Asal Sekolah / Instansi / Kampus *"
                      placeholder="Contoh: SMK Dinamika Pembangunan 2 Jakarta"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      required
                    />
                    <Input
                      label="Nomor Registrasi Peserta (Bila Mengikuti Lomba)"
                      placeholder="Contoh: GBB-PUI-014 (Opsional)"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      helperText="Kosongkan bila Anda pengunjung / penonton umum."
                    />
                    <Textarea
                      label="Pesan / Caption *"
                      placeholder="Tuliskan ucapan atau kutipan semangat pemuda Anda..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      rows={3}
                      required
                    />

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setStep("photo")}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs"
                        disabled={!fullName || !institution || !caption}
                        onClick={() => { setError(""); setStep("preview"); }}
                      >
                        Lanjut ke Preview <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Preview & Submit ──────────────────────────────── */}
                {step === "preview" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-foreground">
                        Preview & Kirim
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Periksa hasil twibbon kamu sebelum dikirimkan untuk moderasi.
                      </p>
                    </div>

                    {/* Preview merged photo */}
                    <div className="flex flex-col items-center gap-3">
                      {mergedPhoto && (
                        <img
                          src={mergedPhoto}
                          alt="Preview twibbon"
                          className="w-64 h-64 object-cover rounded-xl border border-border shadow-lg"
                        />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleDownload}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Unduh Foto Twibbon
                      </Button>
                    </div>

                    {/* Data ringkasan */}
                    <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border text-xs">
                      {[
                        { label: "Nama", value: fullName },
                        { label: "Instansi", value: institution },
                        { label: "No. Registrasi", value: regNumber || "—" },
                        { label: "Caption", value: caption },
                        { label: "Template", value: selectedTemplate?.name || "Tanpa template" },
                      ].map((row) => (
                        <div key={row.label} className="flex gap-2 px-4 py-2.5">
                          <span className="w-28 shrink-0 text-muted-foreground font-semibold">{row.label}</span>
                          <span className="text-foreground">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setStep("form")}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                      </Button>
                      <form onSubmit={handleSubmit}>
                        <Button
                          type="submit"
                          size="sm"
                          className="text-xs font-semibold"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Mengirim...
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              Kirimkan Twibbon
                            </>
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
