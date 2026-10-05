"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Search, RotateCcw, Loader2, CheckCircle2,
  AlertCircle, Pencil, Trash2, UserPlus, Eye, EyeOff, TriangleAlert,
} from "lucide-react";
import { getAllUsers, updateUserRole, toggleUserActive } from "@/app/actions/users";
import type { AppUser } from "@/app/actions/users";
import { UserRole } from "@/types/database.types";

interface EditForm { fullName: string; institution: string; phone: string; role: UserRole; isActive: boolean; newPassword: string; }
interface CreateForm { email: string; password: string; fullName: string; role: UserRole; institution: string; phone: string; }

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "seksi_acara", label: "Seksi Acara" },
  { value: "juri", label: "Dewan Juri" },
  { value: "media_center", label: "Media Center" },
  { value: "peserta", label: "Peserta" },
];

const EMPTY_CREATE: CreateForm = { email: "", password: "", fullName: "", role: "peserta", institution: "", phone: "" };

export default function DashboardKelolaPenggunaPage() {
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterRole, setFilterRole] = React.useState<string>("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editTarget, setEditTarget] = React.useState<AppUser | null>(null);
  const [editForm, setEditForm] = React.useState<EditForm | null>(null);
  const [showEditPw, setShowEditPw] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<AppUser | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateForm>(EMPTY_CREATE);
  const [showCreatePw, setShowCreatePw] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    if (type === "success") setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) { setUsers(data.users); setIsLoading(false); return; }
      }
      const actionRes = await getAllUsers();
      if (actionRes.success && actionRes.users) {
        setUsers(actionRes.users);
      } else {
        throw new Error(actionRes.error || "Gagal mengambil data profil.");
      }
    } catch (err: unknown) {
      try { const a = await getAllUsers(); if (a.success && a.users) setUsers(a.users); } catch { /* ignore */ }
      showFeedback("error", err instanceof Error ? err.message : "Terjadi kendala saat memuat data.");
    } finally { setIsLoading(false); }
  }, []);

  React.useEffect(() => { setIsMounted(true); fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setUpdatingId(id);
    const newActive = !currentActive;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: newActive } : u)));
    try {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, isActive: newActive }) });
      if (!res.ok) { const r = await toggleUserActive(id, newActive); if (!r.success) throw new Error(r.error); }
      showFeedback("success", `Status berhasil diubah menjadi ${newActive ? "Aktif" : "Nonaktif"}.`);
    } catch (err: unknown) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: currentActive } : u)));
      showFeedback("error", err instanceof Error ? err.message : "Gagal memperbarui status.");
    } finally { setUpdatingId(null); }
  };

  const handleChangeRole = async (id: string, newRole: UserRole) => {
    setUpdatingId(id);
    const prevRole = users.find((u) => u.id === id)?.role;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    try {
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, role: newRole }) });
      if (!res.ok) { const r = await updateUserRole(id, newRole); if (!r.success) throw new Error(r.error); }
      showFeedback("success", `Role berhasil diperbarui menjadi ${newRole.replace(/_/g, " ")}.`);
    } catch (err: unknown) {
      if (prevRole) setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: prevRole } : u)));
      showFeedback("error", err instanceof Error ? err.message : "Gagal memperbarui role.");
    } finally { setUpdatingId(null); }
  };

  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    setEditForm({ fullName: u.fullName, institution: u.institution, phone: u.phone || "", role: u.role, isActive: u.isActive, newPassword: "" });
    setShowEditPw(false);
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editForm) return;
    if (!editForm.fullName.trim()) { showFeedback("error", "Nama lengkap tidak boleh kosong."); return; }
    if (editForm.newPassword && editForm.newPassword.length < 6) { showFeedback("error", "Password baru minimal 6 karakter."); return; }
    setIsSavingEdit(true);
    try {
      const payload: Record<string, string | boolean | undefined> = {
        userId: editTarget.id, fullName: editForm.fullName.trim(), institution: editForm.institution.trim(),
        phone: editForm.phone.trim(), role: editForm.role, isActive: editForm.isActive,
      };
      if (editForm.newPassword) payload.newPassword = editForm.newPassword;
      const res = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan perubahan.");
      setUsers((prev) => prev.map((u) => u.id === editTarget.id ? {
        ...u, fullName: editForm.fullName.trim(), institution: editForm.institution.trim() || "Umum",
        phone: editForm.phone.trim() || null, role: editForm.role, isActive: editForm.isActive,
      } : u));
      setEditTarget(null); setEditForm(null);
      showFeedback("success", "Profil pengguna berhasil diperbarui.");
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally { setIsSavingEdit(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: deleteTarget.id }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal menghapus akun.");
      if (data.softDeleted) {
        setUsers((prev) => prev.map((u) => (u.id === deleteTarget.id ? { ...u, isActive: false } : u)));
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      }
      showFeedback("success", data.message);
      setDeleteTarget(null);
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Gagal menghapus akun.");
    } finally { setIsDeleting(false); }
  };

  const handleCreate = async () => {
    if (!createForm.email.trim() || !createForm.password || !createForm.fullName.trim()) {
      showFeedback("error", "Email, password, dan nama lengkap wajib diisi."); return;
    }
    if (createForm.password.length < 6) { showFeedback("error", "Password minimal 6 karakter."); return; }
    setIsCreating(true);
    try {
      const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: createForm.email.trim(), password: createForm.password, fullName: createForm.fullName.trim(), role: createForm.role, institution: createForm.institution.trim(), phone: createForm.phone.trim() }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal membuat akun.");
      setShowCreate(false); setCreateForm(EMPTY_CREATE);
      showFeedback("success", "Akun pengguna baru berhasil dibuat!");
      await fetchUsers();
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Gagal membuat akun.");
    } finally { setIsCreating(false); }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.institution.toLowerCase().includes(q)) && (filterRole === "all" || u.role === filterRole);
  });

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-accent" />
              <span>Kelola Pengguna &amp; Hak Akses</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Kelola seluruh akun terdaftar: tambah, edit profil, ubah role, dan hapus akun.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="gold" className="text-xs font-mono" suppressHydrationWarning>
              Total {users.length} Akun
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={fetchUsers}
              disabled={isMounted ? isLoading : false} suppressHydrationWarning className="text-xs gap-1.5 cursor-pointer">
              <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </Button>
            <Button type="button" size="sm" onClick={() => { setCreateForm(EMPTY_CREATE); setShowCreate(true); }} className="text-xs gap-1.5 cursor-pointer">
              <UserPlus className="h-3.5 w-3.5" />
              <span>Tambah Pengguna</span>
            </Button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in-50 ${feedback.type === "success" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
            {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Cari berdasarkan nama, email, atau instansi..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full pl-9 pr-4 rounded-lg border border-border bg-card text-xs sm:text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors" />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold focus:outline-none focus:border-accent text-foreground cursor-pointer">
            <option value="all">Semua Peran</option>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Daftar mobile (card list) */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-border bg-card py-14 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat daftar pengguna dari database...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground space-y-1">
              <Users className="h-8 w-8 mx-auto opacity-50" />
              <p className="text-sm font-semibold">Tidak ada pengguna yang cocok</p>
              <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter peran.</p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isRowUpdating = updatingId === u.id;
              return (
                <div key={u.id} className={`rounded-xl border border-border bg-card p-4 space-y-3 ${isRowUpdating ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{u.fullName}</p>
                      <p className="text-[11px] font-mono text-muted-foreground break-all">{u.email}</p>
                    </div>
                    <Badge variant={u.isActive ? "success" : "danger"} className="text-[10px] shrink-0">{u.isActive ? "AKTIF" : "NONAKTIF"}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>{u.institution}</p>
                    <p>{u.createdAt}{u.phone ? ` • ${u.phone}` : ""}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Peran (Role)</label>
                    <select value={u.role} disabled={isRowUpdating} onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50">
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Button size="sm" variant={u.isActive ? "outline" : "default"} disabled={isRowUpdating} onClick={() => handleToggleActive(u.id, u.isActive)}
                      className="text-xs h-8 px-2.5 cursor-pointer" title={u.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}>
                      {isRowUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : u.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={isRowUpdating} onClick={() => openEdit(u)}
                      className="text-xs h-8 px-2.5 gap-1 cursor-pointer text-muted-foreground hover:text-foreground" title="Edit profil">
                      <Pencil className="h-3.5 w-3.5" /><span>Edit</span>
                    </Button>
                    <Button size="sm" variant="outline" disabled={isRowUpdating} onClick={() => setDeleteTarget(u)}
                      className="text-xs h-8 px-2.5 gap-1 cursor-pointer text-muted-foreground hover:text-danger hover:border-danger/50" title="Hapus akun">
                      <Trash2 className="h-3.5 w-3.5" /><span>Hapus</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table (desktop) */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat daftar pengguna dari database...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <p className="text-sm font-semibold">Tidak ada pengguna yang cocok</p>
              <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter peran.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Nama &amp; Email</TableHead>
                  <TableHead className="hidden md:table-cell">Instansi</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right pr-4">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u, idx) => {
                  const roleBadgeVariant = u.role === "super_admin" || u.role === "seksi_acara" ? "warning" : u.role === "juri" ? "gold" : u.role === "media_center" ? "info" : "default";
                  const isRowUpdating = updatingId === u.id;
                  return (
                    <TableRow key={u.id} className={isRowUpdating ? "opacity-60" : ""}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">{u.fullName}</strong>
                        <span className="text-[11px] font-mono text-muted-foreground block">{u.email}</span>
                        <span className="text-[10px] text-muted-foreground/60 block mt-0.5">{u.createdAt}{u.phone ? ` • ${u.phone}` : ""}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{u.institution}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select value={u.role} disabled={isRowUpdating} onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50">
                            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <Badge variant={roleBadgeVariant} className="text-[9px] hidden xl:inline-flex uppercase">{u.role.replace(/_/g, " ")}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={u.isActive ? "success" : "danger"} className="text-[10px]">{u.isActive ? "AKTIF" : "NONAKTIF"}</Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant={u.isActive ? "outline" : "default"} disabled={isRowUpdating} onClick={() => handleToggleActive(u.id, u.isActive)}
                            className="text-xs h-7 px-2.5 cursor-pointer" title={u.isActive ? "Nonaktifkan akun" : "Aktifkan akun"}>
                            {isRowUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : u.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={isRowUpdating} onClick={() => openEdit(u)}
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground" title="Edit profil pengguna">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" disabled={isRowUpdating} onClick={() => setDeleteTarget(u)}
                            className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-danger hover:border-danger/50" title="Hapus akun">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Modal: Edit Pengguna */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditForm(null); } }}>
        <DialogHeader>
          <DialogTitle>Edit Profil Pengguna</DialogTitle>
          <DialogDescription>Perbarui data akun <strong>{editTarget?.email}</strong>. Password Baru bersifat opsional.</DialogDescription>
        </DialogHeader>
        {editForm && (
          <div className="space-y-4 my-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nama Lengkap <span className="text-danger">*</span></label>
                <Input value={editForm.fullName} onChange={(e) => setEditForm((f) => f ? { ...f, fullName: e.target.value } : f)} placeholder="Nama lengkap" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Instansi / Sekolah</label>
                <Input value={editForm.institution} onChange={(e) => setEditForm((f) => f ? { ...f, institution: e.target.value } : f)} placeholder="Nama instansi" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">No. HP / WhatsApp</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)} placeholder="08xxxxxxxxxx" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Peran (Role)</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => f ? { ...f, role: e.target.value as UserRole } : f)}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer">
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-xs font-semibold text-foreground">Status Akun:</span>
              <button type="button" onClick={() => setEditForm((f) => f ? { ...f, isActive: !f.isActive } : f)}
                className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editForm.isActive ? "bg-success" : "bg-muted-foreground/30"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${editForm.isActive ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <span className={`text-xs font-semibold ${editForm.isActive ? "text-success" : "text-muted-foreground"}`}>{editForm.isActive ? "Aktif" : "Nonaktif"}</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Password Baru <span className="text-muted-foreground font-normal">(opsional, min 6 karakter)</span></label>
              <div className="relative">
                <Input type={showEditPw ? "text" : "password"} value={editForm.newPassword} onChange={(e) => setEditForm((f) => f ? { ...f, newPassword: e.target.value } : f)} placeholder="Kosongkan jika tidak ingin mengubah" className="h-9 text-xs pr-10" />
                <button type="button" onClick={() => setShowEditPw(!showEditPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showEditPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => { setEditTarget(null); setEditForm(null); }} disabled={isSavingEdit} className="text-xs cursor-pointer">Batal</Button>
          <Button type="button" size="sm" onClick={handleSaveEdit} disabled={isSavingEdit} className="text-xs cursor-pointer gap-1.5">
            {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: Konfirmasi Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <TriangleAlert className="h-5 w-5" />
            Konfirmasi Hapus Akun
          </DialogTitle>
          <DialogDescription>Anda akan menghapus akun pengguna berikut:</DialogDescription>
        </DialogHeader>
        {deleteTarget && (
          <div className="my-2 space-y-3">
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-1">
              <p className="text-sm font-bold text-foreground">{deleteTarget.fullName}</p>
              <p className="text-xs font-mono text-muted-foreground">{deleteTarget.email}</p>
              <p className="text-xs text-muted-foreground">{deleteTarget.institution}</p>
              <Badge variant={deleteTarget.isActive ? "success" : "danger"} className="text-[10px] mt-1">{deleteTarget.isActive ? "AKTIF" : "NONAKTIF"}</Badge>
            </div>
            <div className="p-3 rounded-lg border border-accent/30 bg-accent/5 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-accent">Catatan Penting:</p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                <li>Jika akun memiliki riwayat data penilaian/peserta, akun hanya akan <strong>dinonaktifkan</strong>.</li>
                <li>Jika akun bersih, akun akan <strong>dihapus permanen</strong> dari database.</li>
                <li>Akun <strong>Super Admin</strong> tidak dapat dihapus.</li>
              </ul>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="text-xs cursor-pointer">Batal</Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="text-xs cursor-pointer gap-1.5">
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Ya, Hapus Akun
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal: Tambah Pengguna Baru */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setCreateForm(EMPTY_CREATE); } }}>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>Buat akun baru langsung aktif. Password awal ditentukan oleh Admin.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 my-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Email <span className="text-danger">*</span></label>
              <Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="nama@email.com" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Password Awal <span className="text-danger">*</span> <span className="text-muted-foreground font-normal">(min 6 karakter)</span></label>
              <div className="relative">
                <Input type={showCreatePw ? "text" : "password"} value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Minimal 6 karakter" className="h-9 text-xs pr-10" />
                <button type="button" onClick={() => setShowCreatePw(!showCreatePw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showCreatePw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">Nama Lengkap <span className="text-danger">*</span></label>
              <Input value={createForm.fullName} onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap pengguna" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Peran (Role)</label>
              <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer">
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Instansi / Sekolah</label>
              <Input value={createForm.institution} onChange={(e) => setCreateForm((f) => ({ ...f, institution: e.target.value }))} placeholder="Nama instansi" className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">No. HP / WhatsApp</label>
              <Input value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className="h-9 text-xs" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); }} disabled={isCreating} className="text-xs cursor-pointer">Batal</Button>
          <Button type="button" size="sm" onClick={handleCreate} disabled={isCreating} className="text-xs cursor-pointer gap-1.5">
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Buat Akun
          </Button>
        </DialogFooter>
      </Dialog>
    </DashboardLayout>
  );
}
