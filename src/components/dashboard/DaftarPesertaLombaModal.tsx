"use client";

import * as React from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  adminEnrollParticipant,
  getAvailableParticipantsForAdmin,
  getAvailableCompetitionsForAdmin,
  type AdminParticipantOption,
  type AdminCompetitionOption,
} from "@/app/actions/admin-registration";
import { getActiveInstitutions, type InstitutionItem } from "@/app/actions/institutions";
import {
  Trophy,
  Users,
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronDown,
} from "lucide-react";

export interface DaftarPesertaLombaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialParticipant?: {
    id: string;
    fullName: string;
    institution: string;
    registrationNumber?: string;
  } | null;
  onSuccess?: () => void;
}

interface TeamMemberInput {
  name: string;
  role: "anggota" | "ketua";
  institution: string;
}

export function DaftarPesertaLombaModal({
  open,
  onOpenChange,
  initialParticipant,
  onSuccess,
}: DaftarPesertaLombaModalProps) {
  const [participants, setParticipants] = React.useState<AdminParticipantOption[]>([]);
  const [competitions, setCompetitions] = React.useState<AdminCompetitionOption[]>([]);
  const [institutions, setInstitutions] = React.useState<InstitutionItem[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  // Form states
  const [mode, setMode] = React.useState<"existing" | "new">("existing");
  const [selectedParticipantId, setSelectedParticipantId] = React.useState<string>("");
  const [participantSearch, setParticipantSearch] = React.useState<string>("");

  // Data peserta baru
  const [newFullName, setNewFullName] = React.useState("");
  const [newInstitution, setNewInstitution] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");

  // Lomba & Tim
  const [selectedCompetitionId, setSelectedCompetitionId] = React.useState<string>("");
  const [teamName, setTeamName] = React.useState("");
  const [teamMembers, setTeamMembers] = React.useState<TeamMemberInput[]>([]);
  const [status, setStatus] = React.useState<"terverifikasi" | "menunggu_verifikasi">("terverifikasi");
  const [notes, setNotes] = React.useState("");

  // Feedback states
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Load data ketika dialog terbuka
  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setLoadingData(true);

      Promise.all([
        getAvailableParticipantsForAdmin(),
        getAvailableCompetitionsForAdmin(),
        getActiveInstitutions(),
      ])
        .then(([partRes, compRes, instRes]) => {
          if (partRes.success) setParticipants(partRes.participants);
          if (compRes.success) {
            setCompetitions(compRes.competitions);
            if (compRes.competitions.length > 0 && !selectedCompetitionId) {
              setSelectedCompetitionId(compRes.competitions[0].id);
            }
          }
          if (instRes.success) setInstitutions(instRes.institutions);
        })
        .finally(() => {
          setLoadingData(false);
        });

      if (initialParticipant) {
        setMode("existing");
        setSelectedParticipantId(initialParticipant.id);
        setParticipantSearch(initialParticipant.fullName);
      } else {
        setSelectedParticipantId("");
        setParticipantSearch("");
      }
    }
  }, [open, initialParticipant]);

  const selectedComp = competitions.find((c) => c.id === selectedCompetitionId);
  const isKelompok = selectedComp?.type === "kelompok";

  // Filter peserta berdasarkan pencarian
  const filteredParticipants = React.useMemo(() => {
    if (!participantSearch.trim()) return participants.slice(0, 50);
    const q = participantSearch.toLowerCase();
    return participants.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q) ||
        p.registrationNumber.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [participants, participantSearch]);

  const handleAddMember = () => {
    setTeamMembers((prev) => [
      ...prev,
      {
        name: "",
        role: "anggota",
        institution:
          mode === "new"
            ? newInstitution
            : participants.find((p) => p.id === selectedParticipantId)?.institution || "",
      },
    ]);
  };

  const handleUpdateMember = (index: number, patch: Partial<TeamMemberInput>) => {
    setTeamMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  };

  const handleRemoveMember = (index: number) => {
    setTeamMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedCompetitionId) {
      setErrorMsg("Pilih cabang lomba terlebih dahulu.");
      return;
    }

    if (mode === "existing" && !selectedParticipantId) {
      setErrorMsg("Pilih salah satu peserta yang terdaftar.");
      return;
    }

    if (mode === "new") {
      if (!newFullName.trim()) {
        setErrorMsg("Nama lengkap peserta wajib diisi.");
        return;
      }
      if (!newInstitution.trim()) {
        setErrorMsg("Asal instansi / sekolah peserta wajib diisi.");
        return;
      }
    }

    if (isKelompok) {
      if (!teamName.trim()) {
        setErrorMsg("Nama tim wajib diisi untuk cabang lomba beregu / kelompok.");
        return;
      }
      const totalMembers = 1 + teamMembers.filter((m) => m.name.trim()).length;
      if (selectedComp?.minMembers && totalMembers < selectedComp.minMembers) {
        setErrorMsg(
          `Cabang lomba "${selectedComp.name}" memerlukan minimal ${selectedComp.minMembers} anggota tim (1 ketua + ${
            selectedComp.minMembers - 1
          } anggota).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await adminEnrollParticipant({
        participantMode: mode,
        participantId: mode === "existing" ? selectedParticipantId : undefined,
        newParticipant:
          mode === "new"
            ? {
                fullName: newFullName.trim(),
                institution: newInstitution.trim(),
                email: newEmail.trim() || undefined,
                phone: newPhone.trim() || undefined,
              }
            : undefined,
        competitionId: selectedCompetitionId,
        teamName: isKelompok ? teamName.trim() : undefined,
        teamMembers: isKelompok
          ? teamMembers
              .filter((m) => m.name.trim())
              .map((m) => ({
                name: m.name.trim(),
                role: m.role,
                institution: m.institution.trim() || undefined,
              }))
          : undefined,
        status,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg("Peserta berhasil didaftarkan ke cabang lomba!");
        setTimeout(() => {
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Gagal mendaftarkan peserta ke lomba.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="p-5 border-b border-border flex items-start justify-between bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-accent/15 text-accent border border-accent/20">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-foreground">
                    Daftarkan Peserta ke Lomba
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Admin dan Seksi Acara dapat mendaftarkan peserta langsung ke cabang lomba.
                  </DialogDescription>
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Pilihan Mode Peserta */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Pilih atau Buat Peserta *
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mode === "existing"
                      ? "bg-card text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Peserta Terdaftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    mode === "new"
                      ? "bg-card text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Input Peserta Baru</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Pilih Peserta Terdaftar */}
            {mode === "existing" ? (
              <div className="space-y-2 p-4 rounded-xl border border-border bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Cari Peserta Terdaftar</span>
                  <span className="text-[11px] text-muted-foreground">
                    Total: {participants.length} peserta
                  </span>
                </div>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Ketik nama, instansi, atau no. registrasi..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1 pt-1 border-t border-border/60">
                  {loadingData ? (
                    <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memuat peserta...</span>
                    </div>
                  ) : filteredParticipants.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Tidak ditemukan peserta dengan kata kunci tersebut.
                    </div>
                  ) : (
                    filteredParticipants.map((p) => {
                      const isSelected = selectedParticipantId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedParticipantId(p.id);
                            setParticipantSearch(p.fullName);
                          }}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? "border-accent bg-accent/10 text-foreground font-semibold"
                              : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{p.fullName}</span>
                              <span className="font-mono text-[10px] text-accent">
                                {p.registrationNumber}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate block">
                              {p.institution}
                              {p.enrolledCompetitions.length > 0
                                ? ` • Sudah ikut: ${p.enrolledCompetitions.join(", ")}`
                                : " • Belum ikut lomba"}
                            </span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-accent shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Mode 2: Input Peserta Baru */
              <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
                <span className="text-xs font-semibold text-foreground block">
                  Data Identitas Peserta Baru
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nama Lengkap Peserta *"
                    placeholder="Contoh: Muhammad Farhan"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    required
                  />
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Asal Instansi / Sekolah *
                    </label>
                    <input
                      list="instansi-datalist"
                      placeholder="Pilih atau ketik instansi..."
                      value={newInstitution}
                      onChange={(e) => setNewInstitution(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-accent"
                      required
                    />
                    <datalist id="instansi-datalist">
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Email Peserta (Opsional)"
                    type="email"
                    placeholder="peserta@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    helperText="Jika kosong, sistem akan membuatkan email sistem otomatis."
                  />
                  <Input
                    label="Nomor WhatsApp / HP (Opsional)"
                    placeholder="081234567890"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Pilih Cabang Lomba */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Cabang Lomba yang Diikuti *
                </label>
                {selectedComp && (
                  <Badge variant={selectedComp.type === "kelompok" ? "info" : "gold"} className="text-[10px]">
                    {selectedComp.type === "kelompok" ? "Lomba Beregu / Kelompok" : "Lomba Individu"}
                  </Badge>
                )}
              </div>

              <select
                value={selectedCompetitionId}
                onChange={(e) => setSelectedCompetitionId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                required
              >
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — [{c.type === "kelompok" ? "Kelompok" : "Individu"}]
                    {c.maxParticipants ? ` (Kuota: ${c.currentCount}/${c.maxParticipants})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Bidang Khusus Lomba Kelompok / Beregu */}
            {isKelompok && (
              <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-3.5 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      Pengaturan Regu / Kelompok
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Minimal {selectedComp.minMembers} anggota tim (1 Ketua + {selectedComp.minMembers - 1} Anggota).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                    className="h-8 text-xs gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Tambah Anggota</span>
                  </Button>
                </div>

                <Input
                  label="Nama Tim / Regu *"
                  placeholder="Contoh: Tim Lentera Budaya"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />

                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground block">
                    Daftar Anggota Tim (Selain Ketua):
                  </span>
                  {teamMembers.length === 0 ? (
                    <div className="p-3 text-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                      Belum ada anggota tambahan. Klik tombol <strong>&ldquo;Tambah Anggota&rdquo;</strong> jika tim memiliki anggota lain.
                    </div>
                  ) : (
                    teamMembers.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Nama Anggota #${idx + 1}`}
                          value={m.name}
                          onChange={(e) => handleUpdateMember(idx, { name: e.target.value })}
                          className="flex-1 h-9 text-xs"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(idx)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris anggota"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Status & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Status Verifikasi Pendaftaran
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="terverifikasi">Terverifikasi (Langsung Sah Ikut Lomba)</option>
                  <option value="menunggu_verifikasi">Menunggu Verifikasi Berkas</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Catatan Panitia (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Didaftarkan atas rekomendasi guru pembimbing"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-card px-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{isSubmitting ? "Mendaftarkan..." : "Daftarkan Peserta Sekarang"}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}

