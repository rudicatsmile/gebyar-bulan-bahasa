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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Loader2,
  Trophy,
  Users,
  CheckCircle2,
  ImageIcon,
  Upload,
  X,
  Clock,
} from "lucide-react";
import {
  getAdminPuzzleItems,
  createPuzzleItem,
  updatePuzzleItem,
  deletePuzzleItem,
  togglePuzzleItemActive,
  getAdminPuzzleAttempts,
  uploadPuzzleCostumeImage,
  getPuzzleConfig,
  updatePuzzleConfig,
  type PuzzleItem,
} from "@/app/actions/puzzle";
import { cn } from "@/lib/utils";

interface AttemptRow {
  id: string;
  participantName: string;
  institution: string;
  totalItems: number;
  correctCount: number;
  score: number;
  timeSeconds: number | null;
  createdAt: string;
}

export default function DashboardPuzzlePage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<PuzzleItem[]>([]);
  const [attempts, setAttempts] = React.useState<AttemptRow[]>([]);
  const [tab, setTab] = React.useState<"items" | "attempts">("items");

  // Configuration (Time limit) states
  const [timeLimit, setTimeLimit] = React.useState<number>(60);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [configSavedMessage, setConfigSavedMessage] = React.useState<string | null>(null);

  // Dialog states
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PuzzleItem | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form states
  const [formCostume, setFormCostume] = React.useState("");
  const [formRegion, setFormRegion] = React.useState("");
  const [formImage, setFormImage] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formHint, setFormHint] = React.useState("");
  const [formOrder, setFormOrder] = React.useState("0");
  const [formActive, setFormActive] = React.useState(true);
  const [editId, setEditId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, attemptsRes, configRes] = await Promise.all([
        getAdminPuzzleItems(),
        getAdminPuzzleAttempts(),
        getPuzzleConfig(),
      ]);
      if (itemsRes.success) setItems(itemsRes.items);
      if (attemptsRes.success) setAttempts(attemptsRes.attempts);
      if (configRes.success && configRes.timeLimitSeconds !== undefined) {
        setTimeLimit(configRes.timeLimitSeconds);
      }
    } catch (err) {
      console.error("Gagal memuat data puzzle:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await updatePuzzleConfig(timeLimit);
      if (res.success) {
        setConfigSavedMessage("Batas waktu berhasil disimpan!");
        setTimeout(() => setConfigSavedMessage(null), 3500);
      }
    } catch (err) {
      console.error("Gagal menyimpan batas waktu:", err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Ukuran berkas melebihi batas maksimal 5MB.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setImageError("Format gambar harus berupa JPG, PNG, atau WEBP.");
      return;
    }

    setImageError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setFormImage("");
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFormCostume("");
    setFormRegion("");
    setFormImage("");
    setSelectedFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormHint("");
    setFormOrder("0");
    setFormActive(true);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogMode("create");
  };

  const openEdit = (item: PuzzleItem) => {
    setFormCostume(item.costumeName);
    setFormRegion(item.regionName);
    setFormImage(item.costumeImageUrl || "");
    setImagePreview(item.costumeImageUrl || null);
    setSelectedFile(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFormHint(item.hint || "");
    setFormOrder(String(item.sortOrder));
    setFormActive(item.isActive);
    setEditId(item.id);
    setDialogMode("edit");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalImageUrl: string | null = formImage || null;

      // Jika user memilih file gambar baru, lakukan upload terlebih dahulu
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await uploadPuzzleCostumeImage(formData);
        if (!uploadRes.success || !uploadRes.url) {
          alert(uploadRes.error || "Gagal mengunggah berkas gambar baju daerah.");
          setSaving(false);
          return;
        }
        finalImageUrl = uploadRes.url;
      }

      if (dialogMode === "create") {
        const res = await createPuzzleItem({
          costumeName: formCostume,
          regionName: formRegion,
          costumeImageUrl: finalImageUrl || undefined,
          hint: formHint || undefined,
          sortOrder: parseInt(formOrder) || 0,
          isActive: formActive,
        });
        if (!res.success) {
          alert(res.error || "Gagal menambah soal.");
          return;
        }
      } else if (dialogMode === "edit" && editId) {
        const res = await updatePuzzleItem({
          id: editId,
          costumeName: formCostume,
          regionName: formRegion,
          costumeImageUrl: finalImageUrl,
          hint: formHint || undefined,
          sortOrder: parseInt(formOrder) || 0,
          isActive: formActive,
        });
        if (!res.success) {
          alert(res.error || "Gagal memperbarui soal.");
          return;
        }
      }
      setDialogMode(null);
      resetForm();
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await deletePuzzleItem(deleteTarget.id);
      if (!res.success) {
        alert(res.error || "Gagal menghapus soal.");
        return;
      }
      setDeleteTarget(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: PuzzleItem) => {
    await togglePuzzleItemActive(item.id, !item.isActive);
    await loadData();
  };

  const activeCount = items.filter((i) => i.isActive).length;
  const totalAttempts = attempts.length;

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Puzzle className="h-7 w-7 text-accent" />
                <span>Challenge Puzzle: Baju Daerah</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kelola soal puzzle mencocokkan baju daerah dengan nama daerah, dan pantau hasil percobaan peserta.
              </p>
            </div>
            <Button onClick={openCreate} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Tambah Soal Puzzle</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Total Soal
            </span>
            <p className="font-heading text-2xl font-bold text-foreground">{items.length}</p>
          </Card>
          <Card className="p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Soal Aktif
            </span>
            <p className="font-heading text-2xl font-bold text-accent">{activeCount}</p>
          </Card>
          <Card className="p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Total Percobaan
            </span>
            <p className="font-heading text-2xl font-bold text-foreground">{totalAttempts}</p>
          </Card>
          <Card className="p-4 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">
              Skor Tertinggi
            </span>
            <p className="font-heading text-2xl font-bold text-accent">
              {attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0}
            </p>
          </Card>
        </div>

        {/* Time Limit Setting Card */}
        <Card className="p-4 sm:p-5 border border-border/80 bg-card/60 backdrop-blur-xs">
          <form onSubmit={handleSaveConfig} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Batas Waktu Pengerjaan Puzzle
                </h3>
                <Badge variant={timeLimit > 0 ? "gold" : "default"} className="text-[10px]">
                  {timeLimit > 0 ? `${timeLimit} Detik` : "Tanpa Batas (Unlimited)"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Tentukan durasi pengerjaan bagi peserta. Masukkan <strong>0</strong> untuk mode tanpa batas waktu (unlimited).
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative w-36">
                <Input
                  type="number"
                  min={0}
                  max={3600}
                  step={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center font-mono font-bold pr-12 text-sm h-9"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  detik
                </span>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={savingConfig}
                className="text-xs gap-1.5 cursor-pointer shrink-0"
              >
                {savingConfig ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{savingConfig ? "Menyimpan..." : "Simpan Durasi"}</span>
              </Button>
            </div>
          </form>
          {configSavedMessage && (
            <p className="text-xs text-emerald-500 font-medium mt-2.5 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{configSavedMessage}</span>
            </p>
          )}
        </Card>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setTab("items")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
              tab === "items"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Puzzle className="h-3.5 w-3.5" />
              Daftar Soal ({items.length})
            </span>
          </button>
          <button
            onClick={() => setTab("attempts")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer",
              tab === "attempts"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Percobaan Peserta ({totalAttempts})
            </span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat data puzzle...</p>
          </div>
        ) : tab === "items" ? (
          /* ============ TAB: DAFTAR SOAL ============ */
          items.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">#</TableHead>
                    <TableHead>Baju Daerah</TableHead>
                    <TableHead>Daerah (Jawaban)</TableHead>
                    <TableHead className="text-center">Gambar</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-mono text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {item.costumeName}
                        </strong>
                        {item.hint && (
                          <span className="text-[11px] text-muted-foreground">
                            Hint: {item.hint}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {item.regionName}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.costumeImageUrl ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <img
                              src={item.costumeImageUrl}
                              alt={item.costumeName}
                              className="w-7 h-7 rounded-md object-cover border border-border shadow-2xs"
                            />
                            <Badge variant="success" className="text-[10px]">
                              Ada
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            Belum
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggle(item)}
                          className="cursor-pointer"
                          title={item.isActive ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                        >
                          {item.isActive ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <ToggleRight className="h-3 w-3" />
                              AKTIF
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px] gap-1">
                              <ToggleLeft className="h-3 w-3" />
                              NONAKTIF
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="h-7 w-7 p-0 text-danger hover:text-danger cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
              <Puzzle className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Belum Ada Soal Puzzle</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Klik tombol &quot;Tambah Soal Puzzle&quot; untuk menambahkan pasangan baju daerah dan nama daerah.
              </p>
            </div>
          )
        ) : (
          /* ============ TAB: PERCOBAAN PESERTA ============ */
          attempts.length > 0 ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Peserta</TableHead>
                    <TableHead className="text-center">Benar / Total</TableHead>
                    <TableHead className="text-center">Skor</TableHead>
                    <TableHead className="text-center">Waktu</TableHead>
                    <TableHead className="text-right">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((att, idx) => (
                    <TableRow key={att.id}>
                      <TableCell className="text-center font-mono text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {att.participantName}
                        </strong>
                        <span className="text-[11px] text-muted-foreground">
                          {att.institution}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        <span className="text-accent font-bold">{att.correctCount}</span>
                        <span className="text-muted-foreground"> / {att.totalItems}</span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-accent text-sm">
                        {att.score}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {att.timeSeconds ? `${att.timeSeconds}s` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(att.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
              <Users className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">Belum Ada Percobaan</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Belum ada peserta yang mengerjakan challenge puzzle.
              </p>
            </div>
          )
        )}
      </div>

      {/* ============ DIALOG: CREATE / EDIT ============ */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setDialogMode(null);
            resetForm();
          }
        }}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Tambah Soal Puzzle Baru" : "Edit Soal Puzzle"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Tambahkan pasangan baju daerah dan nama daerah sebagai soal puzzle."
                : "Perbarui data pasangan baju daerah dan nama daerah."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nama Baju Daerah *"
              placeholder="Contoh: Kebaya"
              value={formCostume}
              onChange={(e) => setFormCostume(e.target.value)}
              required
            />
            <Input
              label="Nama Daerah (Jawaban Benar) *"
              placeholder="Contoh: Jawa Barat"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
              required
            />
          </div>

          {/* Upload File Gambar Baju Daerah */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gambar Baju Daerah
              </label>
              <span className="text-[11px] text-muted-foreground">
                Opsional • PNG, JPG, WEBP (Maks 5MB)
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={handleFileSelect}
            />

            {imagePreview ? (
              <div className="relative flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden border border-border bg-muted/30">
                  <img
                    src={imagePreview}
                    alt="Preview Baju Daerah"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                      {selectedFile ? selectedFile.name : "Gambar Baju Daerah"}
                    </p>
                    {selectedFile ? (
                      <Badge variant="warning" className="text-[10px] shrink-0">
                        File Baru
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] shrink-0">
                        Tersimpan
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : "Gambar sudah tersimpan di database"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs cursor-pointer"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Ganti Gambar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="h-7 text-xs text-destructive hover:text-destructive cursor-pointer hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-muted/30 cursor-pointer transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs sm:text-sm font-medium text-foreground">
                  Pilih file gambar dari perangkat
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Klik untuk menelusuri berkas (JPG, PNG, atau WEBP hingga 5MB)
                </p>
              </div>
            )}

            {imageError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1 font-medium">
                <span>⚠️</span> {imageError}
              </p>
            )}
          </div>

          <Textarea
            label="Petunjuk / Hint"
            placeholder="Contoh: Pakaian ini sering dikenakan dalam upacara adat Jawa..."
            value={formHint}
            onChange={(e) => setFormHint(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Urutan Tampil"
              type="number"
              value={formOrder}
              onChange={(e) => setFormOrder(e.target.value)}
            />
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </label>
              <select
                value={formActive ? "true" : "false"}
                onChange={(e) => setFormActive(e.target.value === "true")}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogMode(null);
                resetForm();
              }}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isMounted ? saving : false}
              suppressHydrationWarning
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : dialogMode === "create" ? (
                "Tambah Soal"
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ============ DIALOG: DELETE CONFIRM ============ */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleteTarget(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>Hapus Soal Puzzle</DialogTitle>
          <DialogDescription>
            Apakah Anda yakin ingin menghapus soal puzzle{" "}
            <strong>&quot;{deleteTarget?.costumeName}&quot;</strong> ↔{" "}
            <strong>&quot;{deleteTarget?.regionName}&quot;</strong>? Aksi ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={saving}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isMounted ? saving : false}
            suppressHydrationWarning
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>Menghapus...</span>
              </>
            ) : (
              "Hapus Soal"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </DashboardLayout>
  );
}
