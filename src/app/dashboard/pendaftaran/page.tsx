"use client";

import * as React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getTeamRegistrationsData,
  createTeamRegistrationAdmin,
  updateTeamRegistrationAdmin,
  deleteTeamRegistrationAdmin,
  type TeamRegistrationRow,
  type GroupCompetitionItem,
} from "@/app/actions/participants";
import { getActiveInstitutions, type InstitutionItem } from "@/app/actions/institutions";
import { UserPlus, Edit2, Trash2, Loader2, CheckCircle2, AlertCircle, Users, Plus } from "lucide-react";

interface TeamMemberInput {
  name: string;
  role: "ketua" | "anggota";
  studentId: string;
  institution: string;
}

function emptyMember(role: "ketua" | "anggota" = "anggota"): TeamMemberInput {
  return { name: "", role, studentId: "", institution: "" };
}

export default function DashboardPendaftaranPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [teams, setTeams] = React.useState<TeamRegistrationRow[]>([]);
  const [competitions, setCompetitions] = React.useState<GroupCompetitionItem[]>([]);

  // Master Instansi
  const [institutions, setInstitutions] = React.useState<InstitutionItem[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = React.useState(true);

  // Notifikasi
  const [notification, setNotification] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // State Modal Tambah
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [selectedComp, setSelectedComp] = React.useState("");
  const [teamName, setTeamName] = React.useState("");
  const [leaderName, setLeaderName] = React.useState("");
  const [institution, setInstitution] = React.useState("");
  const [members, setMembers] = React.useState<TeamMemberInput[]>([emptyMember("anggota")]);
  const [isSubmittingAdd, setIsSubmittingAdd] = React.useState(false);

  // State Modal Edit
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<TeamRegistrationRow | null>(null);
  const [editCompId, setEditCompId] = React.useState("");
  const [editTeamName, setEditTeamName] = React.useState("");
  const [editLeaderName, setEditLeaderName] = React.useState("");
  const [editInstitution, setEditInstitution] = React.useState("");
  const [editMemberNames, setEditMemberNames] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"menunggu_verifikasi" | "terverifikasi" | "ditolak">("terverifikasi");
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);

  // State Modal Hapus
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TeamRegistrationRow | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTeamRegistrationsData();
      if (res.success) {
        setTeams(res.teams);
        setCompetitions(res.competitions);
        if (res.competitions.length > 0 && !selectedComp) {
          setSelectedComp(res.competitions[0].id);
        }
      } else {
        setNotification({
          type: "error",
          message: res.error || "Gagal memuat data pendaftaran tim dari database.",
        });
      }
    } catch (err) {
      console.error("Gagal loadData pendaftaran tim:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedComp]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Master Instansi Aktif
  React.useEffect(() => {
    getActiveInstitutions().then((res) => {
      if (res.success && res.institutions.length > 0) {
        setInstitutions(res.institutions);
      }
      setLoadingInstitutions(false);
    });
  }, []);

  // Auto-dismiss notification after 4 seconds
  React.useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const resetAddForm = React.useCallback(() => {
    setTeamName("");
    setLeaderName("");
    setInstitution("");
    setMembers([emptyMember("anggota")]);
  }, []);

  const updateMember = (idx: number, patch: Partial<TeamMemberInput>) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const addMember = () => {
    setMembers((prev) => [...prev, emptyMember("anggota")]);
  };

  // Handle Tambah Tim Baru
  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    const compIdToUse = selectedComp || (competitions[0]?.id ?? "");
    if (!compIdToUse) {
      alert("Pilih cabang lomba terlebih dahulu.");
      return;
    }

    const compObj = competitions.find((c) => c.id === compIdToUse);
    const minRequired = compObj?.minMembers ?? 2;
    const maxAllowed = compObj?.maxMembers ?? 10;

    const validMembers = members.filter((m) => m.name.trim().length > 0);
    const totalTeamCount = 1 + validMembers.length; // 1 Ketua + Anggota

    if (totalTeamCount < minRequired) {
      alert(
        `Cabang lomba "${compObj?.name || "Beregu"}" memerlukan minimal ${minRequired} orang (1 Ketua + ${
          minRequired - 1
        } Anggota).`
      );
      return;
    }

    if (totalTeamCount > maxAllowed) {
      alert(
        `Cabang lomba "${compObj?.name || "Beregu"}" maksimal beranggotakan ${maxAllowed} orang.`
      );
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const res = await createTeamRegistrationAdmin({
        competitionId: compIdToUse,
        teamName,
        leaderName,
        institution,
        memberNames: validMembers.map((m) => m.name.trim()),
        members: validMembers.map((m) => ({
          name: m.name.trim(),
          role: "anggota",
          studentId: m.studentId.trim() || undefined,
          institution: m.institution.trim() || institution.trim(),
        })),
        status: "terverifikasi",
      });

      if (res.success) {
        setAddDialogOpen(false);
        resetAddForm();
        setNotification({
          type: "success",
          message: `Rombongan tim "${teamName}" berhasil didaftarkan ke database!`,
        });
        await loadData();
      } else {
        alert(res.error || "Gagal mendaftarkan tim baru.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mendaftarkan tim.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Buka Modal Edit
  const openEditModal = (t: TeamRegistrationRow) => {
    setEditTarget(t);
    setEditCompId(t.competitionId);
    setEditTeamName(t.teamName);
    setEditLeaderName(t.leaderName);
    setEditInstitution(t.institution);
    setEditStatus(t.status);

    // Filter keluar ketua dari textarea anggota agar tidak duplikat
    const otherMembers = (t.teamMembers || [])
      .filter((m) => !m.toLowerCase().includes("(ketua)") && m !== t.leaderName)
      .join("\n");
    setEditMemberNames(otherMembers);

    setEditDialogOpen(true);
  };

  // Handle Simpan Edit
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    const members = editMemberNames
      .split("\n")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    try {
      setIsSubmittingEdit(true);
      const res = await updateTeamRegistrationAdmin({
        registrationId: editTarget.registrationId,
        competitionId: editCompId,
        teamName: editTeamName,
        leaderName: editLeaderName,
        institution: editInstitution,
        memberNames: members,
        status: editStatus,
      });

      if (res.success) {
        setEditDialogOpen(false);
        setEditTarget(null);
        setNotification({
          type: "success",
          message: `Data rombongan tim "${editTeamName}" berhasil diperbarui di database!`,
        });
        await loadData();
      } else {
        alert(res.error || "Gagal memperbarui data tim.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat memperbarui data tim.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Hapus Tim
  const openDeleteModal = (t: TeamRegistrationRow) => {
    setDeleteTarget(t);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;
    try {
      setIsSubmittingDelete(true);
      const res = await deleteTeamRegistrationAdmin(deleteTarget.registrationId);
      if (res.success) {
        setDeleteDialogOpen(false);
        setNotification({
          type: "success",
          message: `Pendaftaran tim "${deleteTarget.teamName}" berhasil dihapus dari database.`,
        });
        setDeleteTarget(null);
        await loadData();
      } else {
        alert(res.error || "Gagal menghapus pendaftaran tim.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus pendaftaran tim.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-accent" />
              <span>Pendaftaran Lomba & Kelola Rombongan Tim</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola struktur anggota tim untuk cabang lomba beregu (Film Pendek, Vokal Grup, Palang Pintu Betawi).
            </p>
          </div>

          <Button
            onClick={() => {
              if (competitions.length > 0 && !selectedComp) {
                setSelectedComp(competitions[0].id);
              }
              resetAddForm();
              setAddDialogOpen(true);
            }}
            size="sm"
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
            suppressHydrationWarning
          >
            <UserPlus className="h-4 w-4" />
            <span>Daftarkan Tim Baru</span>
          </Button>
        </div>

        {notification && (
          <div
            className={`p-3.5 rounded-lg flex items-center gap-2 text-xs border animate-in fade-in-50 ${
              notification.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 border-destructive/30 text-destructive"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat data pendaftaran tim dari database...</p>
          </div>
        ) : teams.length > 0 ? (
          <div className="space-y-3">
            {/* Tampilan Mobile: Card List (Tanpa Scroll Horizontal) */}
            <div className="block md:hidden space-y-3">
              {teams.map((p) => {
                const statusVariant =
                  p.status === "terverifikasi"
                    ? "success"
                    : p.status === "ditolak"
                    ? "danger"
                    : "warning";

                return (
                  <div
                    key={p.registrationId}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-accent block">
                          {p.registrationNumber}
                        </span>
                        <strong className="text-foreground text-sm block truncate mt-0.5">
                          {p.teamName}
                        </strong>
                        <span className="text-[11px] text-muted-foreground block">
                          Ketua: {p.leaderName}
                        </span>
                      </div>
                      <Badge variant={statusVariant} className="text-[10px] shrink-0">
                        {p.status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs pt-1 border-t border-border/50">
                      <div>
                        <span className="text-[11px] text-muted-foreground">Lomba: </span>
                        <span className="font-medium text-foreground">{p.competitionName}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground">Instansi: </span>
                        <span className="text-muted-foreground">{p.institution}</span>
                      </div>
                    </div>

                    {p.teamMembers && p.teamMembers.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] text-muted-foreground block mb-1">Anggota Tim:</span>
                        <div className="flex flex-wrap gap-1">
                          {p.teamMembers.map((m, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                m.includes("(Ketua)")
                                  ? "bg-accent/15 text-accent font-semibold border border-accent/20"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(p)}
                        className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                        title="Edit Data Tim"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteModal(p)}
                        className="h-8 px-3 text-xs gap-1.5 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        title="Hapus Data Tim"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tampilan Desktop: Tabel Lengkap */}
            <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">No. Registrasi</TableHead>
                    <TableHead>Nama Tim & Ketua</TableHead>
                    <TableHead>Cabang Lomba</TableHead>
                    <TableHead>Sekolah / Sanggar</TableHead>
                    <TableHead>Daftar Anggota Tim</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((p) => (
                    <TableRow key={p.registrationId}>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {p.registrationNumber}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {p.teamName}
                        </strong>
                        <span className="text-[11px] text-muted-foreground">Ketua: {p.leaderName}</span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {p.competitionName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.institution}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {p.teamMembers?.map((m, idx) => (
                            <span
                              key={idx}
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                m.includes("(Ketua)")
                                  ? "bg-accent/15 text-accent font-semibold border border-accent/20"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            p.status === "terverifikasi"
                              ? "success"
                              : p.status === "ditolak"
                              ? "danger"
                              : "warning"
                          }
                          className="text-[10px]"
                        >
                          {p.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(p)}
                            className="h-7 px-2 text-xs gap-1 cursor-pointer"
                            title="Edit Data Tim"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteModal(p)}
                            className="h-7 px-2 text-xs gap-1 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            title="Hapus Data Tim"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
            <Users className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">Belum Ada Pendaftaran Tim</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Belum ada rombongan tim yang terdaftar di database. Anda dapat mendaftarkan tim baru melalui tombol di atas.
            </p>
          </div>
        )}

        {/* Modal Tambah Tim Baru */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <form onSubmit={handleRegisterTeam} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Daftarkan Rombongan / Tim Lomba Baru</DialogTitle>
              <DialogDescription>
                Masukkan nama tim, ketua, instansi, dan anggota rombongan lomba beregu ke database.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pilih Cabang Lomba Beregu *
              </label>
              <select
                value={selectedComp}
                onChange={(e) => setSelectedComp(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                required
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Min. {c.minMembers} - Maks. {c.maxMembers} Anggota)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Nama Tim / Rombongan *"
              placeholder="Contoh: Sanggar Sinema Mahameru"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />

            <Input
              label="Nama Ketua Tim *"
              placeholder="Nama Lengkap Ketua Tim"
              value={leaderName}
              onChange={(e) => setLeaderName(e.target.value)}
              required
            />

            <Select
              label="Asal Sekolah / Universitas / Sanggar *"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
            >
              <option value="">
                {loadingInstitutions
                  ? "-- Memuat daftar instansi... --"
                  : "-- Pilih Asal Sekolah / Universitas / Sanggar --"}
              </option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.name}
                </option>
              ))}
            </Select>

            {/* Input Anggota Tim Mengikuti Pola Lomba Kelompok */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Anggota Tim Lainnya ({members.length})
                  </span>
                  {(() => {
                    const compObj = competitions.find(
                      (c) => c.id === (selectedComp || competitions[0]?.id)
                    );
                    return compObj ? (
                      <p className="text-[11px] text-muted-foreground">
                        Total regu (Ketua + Anggota): {members.length + 1} orang (Syarat: Min.{" "}
                        {compObj.minMembers} - Maks. {compObj.maxMembers} Anggota)
                      </p>
                    ) : null;
                  })()}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 cursor-pointer"
                  onClick={addMember}
                  disabled={(() => {
                    const compObj = competitions.find(
                      (c) => c.id === (selectedComp || competitions[0]?.id)
                    );
                    return !!compObj && members.length + 1 >= compObj.maxMembers;
                  })()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Anggota</span>
                </Button>
              </div>

              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="text-[10px]">
                      ANGGOTA {idx + 1}
                    </Badge>
                    {members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => removeMember(idx)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        aria-label={`Hapus anggota ${idx + 1}`}
                        title={`Hapus anggota ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Input
                    label="Nama Lengkap *"
                    placeholder="Nama anggota tim"
                    value={member.name}
                    onChange={(e) => updateMember(idx, { name: e.target.value })}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Nomor Induk (Opsional)"
                      placeholder="NIS / NIM"
                      value={member.studentId}
                      onChange={(e) => updateMember(idx, { studentId: e.target.value })}
                    />
                    <Select
                      label="Asal Instansi (Opsional)"
                      value={member.institution}
                      onChange={(e) => updateMember(idx, { institution: e.target.value })}
                    >
                      <option value="">
                        {loadingInstitutions
                          ? "-- Memuat daftar instansi... --"
                          : "-- Sama dengan Ketua / Pilih Instansi --"}
                      </option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.name}>
                          {inst.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-1 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Belum ada anggota tambahan yang dimasukkan.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 mt-1 cursor-pointer"
                    onClick={addMember}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Anggota</span>
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmittingAdd ||
                  !teamName ||
                  !leaderName ||
                  !institution ||
                  (() => {
                    const compObj = competitions.find(
                      (c) => c.id === (selectedComp || competitions[0]?.id)
                    );
                    const validCount = 1 + members.filter((m) => m.name.trim().length > 0).length;
                    return !!compObj && validCount < compObj.minMembers;
                  })()
                }
              >
                {isSubmittingAdd ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  "Daftarkan Tim ke Database"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal EDIT Tim */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <form onSubmit={handleUpdateTeam} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Data Rombongan / Tim Lomba</DialogTitle>
              <DialogDescription>
                Perbarui identitas tim, ketua, instansi, anggota, atau status verifikasi tim.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cabang Lomba Beregu *
              </label>
              <select
                value={editCompId}
                onChange={(e) => setEditCompId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                required
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Nama Tim / Rombongan *"
              value={editTeamName}
              onChange={(e) => setEditTeamName(e.target.value)}
              required
            />

            <Input
              label="Nama Ketua Tim *"
              value={editLeaderName}
              onChange={(e) => setEditLeaderName(e.target.value)}
              required
            />

            <Select
              label="Asal Sekolah / Universitas / Sanggar *"
              value={editInstitution}
              onChange={(e) => setEditInstitution(e.target.value)}
              required
            >
              <option value="">
                {loadingInstitutions
                  ? "-- Memuat daftar instansi... --"
                  : "-- Pilih Asal Sekolah / Universitas / Sanggar --"}
              </option>
              {editInstitution && !institutions.some((inst) => inst.name === editInstitution) && (
                <option value={editInstitution}>{editInstitution}</option>
              )}
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.name}
                </option>
              ))}
            </Select>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nama Anggota Lain (1 nama per baris)
              </label>
              <textarea
                rows={3}
                value={editMemberNames}
                onChange={(e) => setEditMemberNames(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status Verifikasi Pendaftaran *
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                <option value="terverifikasi">TERVERIFIKASI</option>
                <option value="menunggu_verifikasi">MENUNGGU VERIFIKASI</option>
                <option value="ditolak">DITOLAK</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit || !editTeamName || !editLeaderName || !editInstitution}
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal Konfirmasi Hapus Tim */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                <span>Hapus Pendaftaran Tim</span>
              </DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus pendaftaran tim{" "}
                <strong className="text-foreground">{deleteTarget?.teamName}</strong> ({deleteTarget?.registrationNumber})?
                Tindakan ini akan menghapus data pendaftaran dan anggota tim secara permanen dari database.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isSubmittingDelete}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteTeam}
                disabled={isSubmittingDelete}
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  "Ya, Hapus Tim"
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
