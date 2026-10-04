"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAllTwibbonTemplates,
  createTwibbonTemplate,
  updateTwibbonTemplate,
  deleteTwibbonTemplate,
  toggleTwibbonTemplateStatus,
  uploadTemplateFile,
  type TwibbonTemplate,
} from "@/app/actions/twibbon-template";
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  GripVertical,
} from "lucide-react";

export default function KelolaTemplateTwibbonPage() {
  const [templates, setTemplates] = React.useState<TwibbonTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formImageFile, setFormImageFile] = React.useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = React.useState<string | null>(null);
  const [formSortOrder, setFormSortOrder] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadTemplates = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAllTwibbonTemplates();
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        setError(result.error || "Gagal memuat template.");
      }
    } catch {
      setError("Gagal memuat template.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file melebihi 5MB.");
      return;
    }
    setFormError("");
    setFormImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFormImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Nama template wajib diisi.");
      return;
    }
    if (!formImageFile) {
      setFormError("Silakan unggah file gambar template.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      // 1. Baca file sebagai base64, lalu upload via server action (service_role)
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(formImageFile);
      });

      const filePath = `templates/${Date.now()}-${formImageFile.name.replace(/\s+/g, "-")}`;
      const { url, error: uploadError } = await uploadTemplateFile(
        filePath,
        fileBase64,
        formImageFile.type
      );

      if (uploadError || !url) {
        setFormError(uploadError || "Gagal mengunggah gambar.");
        setSubmitting(false);
        return;
      }

      // 2. Simpan ke database
      const result = await createTwibbonTemplate({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        imageUrl: url,
        isActive: true,
        sortOrder: formSortOrder,
      });

      if (!result.success) {
        setFormError(result.error || "Gagal menyimpan template.");
        setSubmitting(false);
        return;
      }

      // 3. Reset form & reload
      setFormName("");
      setFormDescription("");
      setFormImageFile(null);
      setFormImagePreview(null);
      setFormSortOrder(0);
      setShowForm(false);
      setSuccessMsg("Template berhasil ditambahkan!");
      setTimeout(() => setSuccessMsg(""), 4000);
      await loadTemplates();
    } catch {
      setFormError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
    );
    const result = await toggleTwibbonTemplateStatus(id, !current);
    if (!result.success) {
      // Revert
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: current } : t))
      );
      setError(result.error || "Gagal mengubah status.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus template "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    setTemplates((prev) => prev.filter((t) => t.id !== id));
    const result = await deleteTwibbonTemplate(id);
    if (!result.success) {
      setError(result.error || "Gagal menghapus template.");
      await loadTemplates();
    } else {
      setSuccessMsg("Template berhasil dihapus.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const activeCount = templates.filter((t) => t.is_active).length;

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <LayoutTemplate className="h-7 w-7 text-accent" />
              <span>Kelola Template Twibbon</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Upload dan kelola template bingkai twibbon resmi yang bisa dipilih peserta.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={activeCount > 0 ? "success" : "default"} className="text-xs">
              {activeCount} Template Aktif
            </Badge>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => {
                setShowForm(!showForm);
                setFormError("");
              }}
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4 mr-1" /> Batal
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" /> Tambah Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Success & Error banners */}
        {successMsg && (
          <div className="p-3.5 rounded-lg border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="p-3.5 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Form Tambah Template */}
        {showForm && (
          <Card className="p-6 border-accent/30 bg-accent/5">
            <h2 className="font-heading text-base font-bold text-foreground mb-4">
              Tambah Template Baru
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Upload Area */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  File Template (PNG/WebP dengan transparansi, Maks. 5MB) *
                </label>
                <div
                  className="border-2 border-dashed border-border hover:border-accent rounded-xl p-6 text-center cursor-pointer transition-colors relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {formImagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={formImagePreview}
                        alt="Preview template"
                        className="h-40 w-40 object-contain rounded-lg mx-auto border border-border bg-[url('/checker.svg')] bg-center"
                        style={{ background: "repeating-conic-gradient(#00000015 0% 25%, transparent 0% 50%) 0 0 / 16px 16px" }}
                      />
                      <p className="text-xs text-accent font-semibold">Klik untuk mengganti gambar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">
                        Klik untuk pilih file template
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Gunakan PNG dengan latar transparan agar bisa di-overlay dengan foto user
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Template *"
                  placeholder="Contoh: Bingkai Emas 2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Urutan Tampil
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/60"
                  />
                </div>
              </div>

              <Textarea
                label="Deskripsi (Opsional)"
                placeholder="Deskripsi singkat tentang template ini..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setShowForm(false);
                    setFormError("");
                    setFormImageFile(null);
                    setFormImagePreview(null);
                    setFormName("");
                    setFormDescription("");
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Simpan Template
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* List Templates */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat data template...</p>
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center space-y-3 border-dashed border-2">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Belum Ada Template
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tambahkan template bingkai twibbon pertama agar peserta bisa memilih template saat mengunggah foto twibbon.
            </p>
            <Button
              size="sm"
              className="text-xs mx-auto"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Template Pertama
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className={`overflow-hidden flex flex-col ${!template.is_active ? "opacity-60" : ""}`}>
                {/* Preview Gambar */}
                <div className="relative aspect-square w-full bg-muted overflow-hidden"
                  style={{ background: "repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 0 0 / 20px 20px" }}
                >
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={template.is_active ? "success" : "default"}
                      className="text-[10px]"
                    >
                      {template.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] bg-background/80 rounded px-1.5 py-0.5 text-muted-foreground font-mono">
                      #{template.sort_order}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-heading text-sm font-bold text-foreground leading-tight">
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      {new Date(template.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-[11px] h-8"
                      onClick={() => handleToggle(template.id, template.is_active)}
                    >
                      {template.is_active ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Nonaktifkan
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Aktifkan
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(template.id, template.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info panel */}
        {templates.length > 0 && (
          <Card className="p-4 bg-muted/40 border-border/60">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <GripVertical className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <strong className="text-foreground">Tips:</strong> Template PNG dengan latar transparan paling ideal karena bisa di-overlay langsung di atas foto user tanpa menyembunyikan bagian wajah. Gunakan format rasio <strong className="text-foreground">1:1 (kotak)</strong> agar tampil konsisten.
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
