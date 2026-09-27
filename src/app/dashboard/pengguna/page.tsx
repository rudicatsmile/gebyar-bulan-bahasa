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
import { Users, ShieldCheck, UserCheck, Tv, User } from "lucide-react";

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: "super_admin" | "seksi_acara" | "juri" | "media_center" | "peserta";
  institution: string;
  isActive: boolean;
  createdAt: string;
}

const INITIAL_USERS: AppUser[] = [
  { id: "usr-1", email: "admin@gebyarbulanbahasa.id", fullName: "Dra. Hj. Pebriani M.Pd.", role: "super_admin", institution: "Panitia Pelaksana", isActive: true, createdAt: "10 Okt 2025" },
  { id: "usr-2", email: "acara@gebyarbulanbahasa.id", fullName: "Rahmat Hidayat S.Pd.", role: "seksi_acara", institution: "Seksi Acara", isActive: true, createdAt: "11 Okt 2025" },
  { id: "usr-3", email: "juri.siti@gebyarbulanbahasa.id", fullName: "Dr. Siti Nurhaliza M.Pd.", role: "juri", institution: "Dewan Juri Puisi", isActive: true, createdAt: "12 Okt 2025" },
  { id: "usr-4", email: "juri.bimo@gebyarbulanbahasa.id", fullName: "Bimo Aryanto S.Sn.", role: "juri", institution: "Dewan Juri Film", isActive: true, createdAt: "12 Okt 2025" },
  { id: "usr-5", email: "media@gebyarbulanbahasa.id", fullName: "Bima Arya Prasetya", role: "media_center", institution: "Media Center", isActive: true, createdAt: "12 Okt 2025" },
  { id: "usr-6", email: "ahmad.fauzan@sman1bdg.sch.id", fullName: "Ahmad Fauzan Ramadhan", role: "peserta", institution: "SMAN 1 Bandung", isActive: true, createdAt: "15 Okt 2025" },
  { id: "usr-7", email: "bagas.prasetyo@ui.ac.id", fullName: "Bagas Prasetyo Wibowo", role: "peserta", institution: "Universitas Indonesia", isActive: true, createdAt: "14 Okt 2025" },
];

export default function DashboardKelolaPenggunaPage() {
  const [users, setUsers] = React.useState<AppUser[]>(INITIAL_USERS);

  const toggleActive = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
  };

  const changeRole = (id: string, newRole: AppUser["role"]) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-accent" />
            <span>Kelola Pengguna & Hak Akses (RBAC)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Daftar seluruh akun terdaftar, pengelolaan peran akses (Seksi Acara, Juri, Media Center, Peserta), dan status keaktifan.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Lengkap & Email</TableHead>
                <TableHead>Instansi</TableHead>
                <TableHead>Peran Pengguna (Role)</TableHead>
                <TableHead className="text-center">Status Akun</TableHead>
                <TableHead className="text-right">Aksi Keaktifan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const roleBadgeVariant =
                  u.role === "super_admin" || u.role === "seksi_acara"
                    ? "warning"
                    : u.role === "juri"
                    ? "gold"
                    : u.role === "media_center"
                    ? "info"
                    : "default";

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <strong className="text-foreground text-xs sm:text-sm block">
                        {u.fullName}
                      </strong>
                      <span className="text-[11px] font-mono text-muted-foreground">{u.email}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.institution}</TableCell>
                    <TableCell>
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value as any)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold focus:outline-none"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="seksi_acara">Seksi Acara</option>
                        <option value="juri">Dewan Juri</option>
                        <option value="media_center">Media Center</option>
                        <option value="peserta">Peserta</option>
                      </select>
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
                        onClick={() => toggleActive(u.id)}
                        className="text-xs h-7"
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
