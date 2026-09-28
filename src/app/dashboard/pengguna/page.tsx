"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getAllUsers, updateUserRole, toggleUserActive, AppUser } from "@/app/actions/users";
import { UserRole } from "@/types/database.types";

export default function DashboardKelolaPenggunaPage() {
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterRole, setFilterRole] = React.useState<string>("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load daftar profil pengguna dari database (API / Server Action)
  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      // 1. Coba ambil dari endpoint REST /api/users
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback via Server Action
      const actionRes = await getAllUsers();
      if (actionRes.success && actionRes.users) {
        setUsers(actionRes.users);
      } else {
        throw new Error(actionRes.error || "Gagal mengambil data profil.");
      }
    } catch (err: unknown) {
      console.error("Gagal load users:", err);
      try {
        const actionRes = await getAllUsers();
        if (actionRes.success && actionRes.users) {
          setUsers(actionRes.users);
        }
      } catch (e) {
        console.error("Fallback getAllUsers failed:", e);
      }
      const msg = err instanceof Error ? err.message : "Terjadi kendala saat memuat data pengguna.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Toggle status keaktifan user
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setUpdatingId(id);
    const newActive = !currentActive;

    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: newActive } : u))
      );

      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, isActive: newActive }),
      });

      if (!res.ok) {
        // Fallback action
        const actionRes = await toggleUserActive(id, newActive);
        if (!actionRes.success) throw new Error(actionRes.error);
      }

      setFeedback({
        type: "success",
        message: `Status keaktifan pengguna berhasil diubah menjadi ${newActive ? "Aktif" : "Nonaktif"}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      console.error("Gagal toggle active:", err);
      // Revert optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: currentActive } : u))
      );
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memperbarui status keaktifan.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Ubah role pengguna
  const handleChangeRole = async (id: string, newRole: UserRole) => {
    setUpdatingId(id);
    const prevUser = users.find((u) => u.id === id);
    const prevRole = prevUser?.role;

    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );

      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, role: newRole }),
      });

      if (!res.ok) {
        // Fallback action
        const actionRes = await updateUserRole(id, newRole);
        if (!actionRes.success) throw new Error(actionRes.error);
      }

      setFeedback({
        type: "success",
        message: `Peran hak akses berhasil diperbarui menjadi ${newRole.replace(/_/g, " ")}.`,
      });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      console.error("Gagal change role:", err);
      if (prevRole) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, role: prevRole } : u))
        );
      }
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memperbarui peran pengguna.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter & Search users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.institution.toLowerCase().includes(searchQuery.toLowerCase());

    const matchRole = filterRole === "all" || u.role === filterRole;

    return matchSearch && matchRole;
  });

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-accent" />
              <span>Kelola Pengguna & Hak Akses (RBAC)</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Daftar seluruh profil akun terdaftar di sistem database, pengelolaan peran hak akses (Seksi Acara, Juri, Media Center, Peserta), dan status keaktifan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="gold" className="text-xs font-mono">
              Total {users.length} Akun Terdaftar
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
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

        {/* Search & Role Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, email, atau asal instansi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full pl-9 pr-4 rounded-lg border border-border bg-card text-xs sm:text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs font-semibold focus:outline-none focus:border-accent text-foreground cursor-pointer"
          >
            <option value="all">Semua Peran (All Roles)</option>
            <option value="super_admin">Super Admin</option>
            <option value="seksi_acara">Seksi Acara</option>
            <option value="juri">Dewan Juri</option>
            <option value="media_center">Media Center</option>
            <option value="peserta">Peserta</option>
          </select>
        </div>

        {/* Table of Users */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs">Memuat daftar seluruh pengguna dari database profiles...</p>
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
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nama Lengkap & Email</TableHead>
                  <TableHead>Instansi</TableHead>
                  <TableHead>Peran Pengguna (Role)</TableHead>
                  <TableHead className="text-center">Status Akun</TableHead>
                  <TableHead className="text-right">Aksi Keaktifan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u, idx) => {
                  const roleBadgeVariant =
                    u.role === "super_admin" || u.role === "seksi_acara"
                      ? "warning"
                      : u.role === "juri"
                      ? "gold"
                      : u.role === "media_center"
                      ? "info"
                      : "default";

                  const isRowUpdating = updatingId === u.id;

                  return (
                    <TableRow key={u.id} className={isRowUpdating ? "opacity-60" : ""}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {u.fullName}
                        </strong>
                        <span className="text-[11px] font-mono text-muted-foreground block">
                          {u.email}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 block mt-0.5">
                          Terdaftar: {u.createdAt} {u.phone ? `• ${u.phone}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.institution}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={isRowUpdating}
                            onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                            className="h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold focus:outline-none focus:border-accent cursor-pointer"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="seksi_acara">Seksi Acara</option>
                            <option value="juri">Dewan Juri</option>
                            <option value="media_center">Media Center</option>
                            <option value="peserta">Peserta</option>
                          </select>
                          <Badge variant={roleBadgeVariant} className="text-[9px] hidden lg:inline-flex uppercase">
                            {u.role.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={u.isActive ? "success" : "danger"}
                          className="text-[10px]"
                        >
                          {u.isActive ? "AKTIF" : "NONAKTIF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={u.isActive ? "outline" : "default"}
                          disabled={isRowUpdating}
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className="text-xs h-7 cursor-pointer"
                        >
                          {isRowUpdating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : u.isActive ? (
                            "Nonaktifkan"
                          ) : (
                            "Aktifkan"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
