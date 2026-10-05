"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  Building2,
  Plus,
  Edit2,
  Trash2,
  Power,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  School,
  GraduationCap,
  Building,
  Globe,
} from "lucide-react";
import {
  getAdminInstitutions,
  upsertInstitution,
  toggleInstitutionStatus,
  deleteInstitution,
  type InstitutionItem,
} from "@/app/actions/institutions";

export default function AdminInstansiPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [institutions, setInstitutions] = React.useState<InstitutionItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("semua");
  const [statusFilter, setStatusFilter] = React.useState<string>("semua");

  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InstitutionItem | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formCategory, setFormCategory] = React.useState<"sekolah" | "kampus" | "instansi" | "umum">("sekolah");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formSortOrder, setFormSortOrder] = React.useState(1);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = React.useState<InstitutionItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminInstitutions();
      if (res.success) {
        setInstitutions(res.institutions);
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal memuat data instansi." });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat memuat data master instansi." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategory("sekolah");
    setFormIsActive(true);
    setFormSortOrder(institutions.length + 1);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: InstitutionItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormIsActive(item.isActive);
    setFormSortOrder(item.sortOrder);
    setIsDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await upsertInstitution({
        id: editingItem?.id,
        name: formName,
        category: formCategory,
        isActive: formIsActive,
        sortOrder: formSortOrder,
      });

      if (res.success) {
        setIsDialogOpen(false);
        setFeedback({
          type: "success",
          message: editingItem
            ? `Berhasil memperbarui data instansi "${formName}".`
            : `Berhasil menambahkan instansi baru "${formName}".`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal menyimpan data." });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: InstitutionItem) => {
    setFeedback(null);
    try {
      const newStatus = !item.isActive;
      const res = await toggleInstitutionStatus(item.id, newStatus);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Status instansi "${item.name}" diubah menjadi ${newStatus ? "AKTIF" : "NONAKTIF"}.`,
        });
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal merubah status." });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat merubah status." });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setFeedback(null);

    try {
      const res = await deleteInstitution(deleteTarget.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Berhasil menghapus instansi "${deleteTarget.name}".`,
        });
        setDeleteTarget(null);
        await loadData();
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal menghapus data instansi." });
      }
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan saat menghapus instansi." });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInstitutions = institutions.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "semua" || item.category === categoryFilter;
    const matchStatus =
      statusFilter === "semua" ||
      (statusFilter === "aktif" && item.isActive) ||
      (statusFilter === "nonaktif" && !item.isActive);
    return matchSearch && matchCategory && matchStatus;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "sekolah":
        return <School className="h-3.5 w-3.5 text-sky-500" />;
      case "kampus":
        return <GraduationCap className="h-3.5 w-3.5 text-amber-500" />;
      case "instansi":
        return <Building className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Globe className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gold" className="text-[10px]">
                DATA MASTER DAFTAR
              </Badge>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Building2 className="h-7 w-7 text-accent" />
              <span>Kelola Asal Sekolah / Kampus / Instansi</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Atur daftar pilihan instansi untuk dropdown form pendaftaran peserta di halaman <strong>/daftar</strong>.
            </p>
          </div>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            variant="accent"
            className="text-xs gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Instansi Baru</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[11px] font-semibold hover:underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Filters & Search Bar */}
        <Card className="p-4 border-border bg-card">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama sekolah, kampus, atau instansi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-10"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-10 w-full sm:w-40"
              >
                <option value="semua">Semua Kategori</option>
                <option value="sekolah">Sekolah (SMA/SMK)</option>
                <option value="kampus">Perguruan Tinggi</option>
                <option value="instansi">Sanggar / Instansi</option>
                <option value="umum">Umum / Lainnya</option>
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs h-10 w-full sm:w-36"
              >
                <option value="semua">Semua Status</option>
                <option value="aktif">Hanya Aktif</option>
                <option value="nonaktif">Hanya Nonaktif</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Main Content Area */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat data master sekolah & instansi dari database...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Urutan</TableHead>
                    <TableHead>Nama Sekolah / Kampus / Instansi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-center">Status Dropdown</TableHead>
                    <TableHead className="text-right">Aksi Kelola</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstitutions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                        Tidak ada data instansi yang sesuai dengan pencarian / filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInstitutions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          #{item.sortOrder || 0}
                        </TableCell>
                        <TableCell>
                          <strong className="text-foreground text-xs sm:text-sm block">
                            {item.name}
                          </strong>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                            {getCategoryIcon(item.category)}
                            <span>{item.category}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={item.isActive ? "success" : "default"}
                            className="text-[10px]"
                          >
                            {item.isActive ? "AKTIF (Tampil di /daftar)" : "NONAKTIF (Disembunyikan)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(item)}
                              title={item.isActive ? "Nonaktifkan dari dropdown" : "Aktifkan di dropdown"}
                              className={`h-8 px-2 text-xs gap-1 ${
                                item.isActive
                                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              <span>{item.isActive ? "Matikan" : "Aktifkan"}</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(item)}
                              className="h-8 px-2 text-xs gap-1"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteTarget(item)}
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {filteredInstitutions.length === 0 ? (
                <Card className="p-8 text-center text-xs text-muted-foreground">
                  Tidak ada data instansi yang sesuai.
                </Card>
              ) : (
                filteredInstitutions.map((item) => (
                  <Card key={item.id} className="p-4 space-y-3 border-border bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-accent font-bold">
                            #{item.sortOrder || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                            {getCategoryIcon(item.category)}
                            <span>{item.category}</span>
                          </span>
                        </div>
                        <h3 className="font-heading text-sm font-bold text-foreground">
                          {item.name}
                        </h3>
                      </div>
                      <Badge
                        variant={item.isActive ? "success" : "default"}
                        className="text-[10px] shrink-0"
                      >
                        {item.isActive ? "AKTIF" : "NONAKTIF"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(item)}
                        className={`flex-1 text-xs h-9 gap-1 ${
                          item.isActive
                            ? "text-emerald-600 hover:text-emerald-700 bg-emerald-500/10"
                            : "text-muted-foreground hover:text-foreground bg-muted/40"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        <span>{item.isActive ? "Matikan" : "Aktifkan"}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(item)}
                        className="flex-1 text-xs h-9 gap-1"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(item)}
                        className="h-9 px-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Modal Dialog Form Tambah / Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" />
                <span>
                  {editingItem ? "Edit Data Sekolah / Instansi" : "Tambah Sekolah / Instansi Baru"}
                </span>
              </DialogTitle>
              <DialogDescription>
                Data yang diaktifkan akan langsung muncul pada pilihan dropdown form pendaftaran peserta (<strong>/daftar</strong>).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Input
                label="Nama Sekolah / Kampus / Instansi *"
                placeholder="Contoh: SMKN 3 Jakarta / Universitas Indonesia"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />

              <Select
                label="Kategori Instansi *"
                value={formCategory}
                onChange={(e) =>
                  setFormCategory(e.target.value as "sekolah" | "kampus" | "instansi" | "umum")
                }
              >
                <option value="sekolah">Sekolah (SMA/SMK/MA)</option>
                <option value="kampus">Perguruan Tinggi (Universitas/Institut/STT)</option>
                <option value="instansi">Sanggar Seni / Lembaga / Instansi</option>
                <option value="umum">Umum / Lainnya</option>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Urutan Tampil (Sort Order)"
                  type="number"
                  min={1}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                />

                <Select
                  label="Status Dropdown *"
                  value={formIsActive ? "1" : "0"}
                  onChange={(e) => setFormIsActive(e.target.value === "1")}
                >
                  <option value="1">Aktif (Tampil di /daftar)</option>
                  <option value="0">Nonaktif (Sembunyikan)</option>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" variant="accent" disabled={saving || !formName.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{editingItem ? "Simpan Perubahan" : "Tambah Instansi"}</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Dialog Konfirmasi Hapus */}
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
        >
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <span>Hapus Data Instansi</span>
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus data instansi <strong>&quot;{deleteTarget?.name}&quot;</strong> dari data master? Pilihan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  "Ya, Hapus Data"
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
