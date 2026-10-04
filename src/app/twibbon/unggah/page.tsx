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
} from "lucide-react";
import { getActiveTwibbonTemplates, type TwibbonTemplate } from "@/app/actions/twibbon-template";
import { uploadPublicFile } from "@/lib/supabase/storage";
import { submitTwibbon } from "@/app/actions/twibbon";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mergePhotoWithTemplate(
  photoDataUrl: string,
  templateUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject("Canvas tidak didukung.");

    const photo = new Image();
    photo.crossOrigin = "anonymous";
    photo.onload = () => {
      // Draw foto user sebagai background (crop ke kotak)
      const minDim = Math.min(photo.width, photo.height);
      const sx = (photo.width - minDim) / 2;
      const sy = (photo.height - minDim) / 2;
      ctx.drawImage(photo, sx, sy, minDim, minDim, 0, 0, size, size);

      // Overlay template di atas
      const template = new Image();
      template.crossOrigin = "anonymous";
      template.onload = () => {
        ctx.drawImage(template, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      template.onerror = () => reject("Gagal memuat gambar template.");
      template.src = templateUrl;
    };
    photo.onerror = () => reject("Gagal memuat foto.");
    photo.src = photoDataUrl;
  });
}

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
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

  // Photo
  const [userPhoto, setUserPhoto] = React.useState<string | null>(null);
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
    setUserPhoto(null);
  };

  // ── Step: Upload Foto ───────────────────────────────────────────────────────
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMergeError("Ukuran foto melebihi batas 5MB.");
      return;
    }
    setMergeError("");

    const reader = new FileReader();
    reader.onloadend = async () => {
      const photoDataUrl = reader.result as string;
      setUserPhoto(photoDataUrl);

      if (selectedTemplate) {
        // Merge langsung saat foto dipilih
        setMerging(true);
        try {
          const merged = await mergePhotoWithTemplate(photoDataUrl, selectedTemplate.image_url);
          setMergedPhoto(merged);
        } catch (err) {
          setMergeError(typeof err === "string" ? err : "Gagal menggabungkan foto dengan template.");
        } finally {
          setMerging(false);
        }
      } else {
        setMergedPhoto(photoDataUrl);
      }
    };
    reader.readAsDataURL(file);
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
      // Upload merged photo
      const file = dataURLtoFile(mergedPhoto, `twibbon-${Date.now()}.jpg`);
      const path = `uploads/${Date.now()}-${fullName.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      const { url, error: uploadErr } = await uploadPublicFile("twibbon", path, file);

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
    setUserPhoto(null);
    setMergedPhoto(null);
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
                        Unggah Foto Kamu
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedTemplate
                          ? `Foto akan digabungkan dengan template "${selectedTemplate.name}" secara otomatis.`
                          : "Foto akan diunggah tanpa template bingkai."}
                      </p>
                    </div>

                    {/* Upload Zone */}
                    <div className="border-2 border-dashed border-border hover:border-accent rounded-xl p-6 text-center space-y-3 cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {merging ? (
                        <div className="py-8 flex flex-col items-center gap-3 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin text-accent" />
                          <p className="text-xs font-semibold">Menggabungkan foto dengan template...</p>
                        </div>
                      ) : mergedPhoto ? (
                        <div className="space-y-2">
                          <img
                            src={mergedPhoto}
                            alt="Preview twibbon"
                            className="h-48 w-48 object-cover rounded-xl mx-auto border border-border shadow"
                          />
                          <p className="text-xs text-accent font-semibold">Klik untuk mengganti foto</p>
                          {mergeError && (
                            <p className="text-xs text-danger">{mergeError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 py-6">
                          <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-xs font-semibold text-foreground">
                            Klik atau seret file foto ke sini
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            JPG / PNG / WebP — Maks. 5MB — Rasio 1:1 direkomendasikan
                          </p>
                        </div>
                      )}
                    </div>

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

                    {mergeError && !mergedPhoto && (
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
                        disabled={!mergedPhoto}
                        onClick={() => setStep("form")}
                      >
                        Lanjut <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
