"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCurrentParticipant, Enrollment } from "@/lib/hooks/useCurrentParticipant";
import { enrollCompetition } from "@/app/actions/participants";
import { createClient } from "@/lib/supabase/client";
import { COMPETITIONS, PARTICIPANTS } from "@/lib/dummy-data";
import { BerkasUploadSection } from "@/components/peserta/BerkasUploadSection";
import type { CompetitionStatus, CompetitionType } from "@/types/database.types";
import {
  Trophy,
  CheckCircle2,
  FileText,
  ArrowLeft,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  Loader2,
  UserPlus,
  Plus,
  Trash2,
  Info,
} from "lucide-react";

/** Batas cabang lomba per peserta — selaras dengan guard di actions/participants.ts */
const MAX_LOMBA = Number(process.env.NEXT_PUBLIC_MAX_COMPETITION_PER_PARTICIPANT || 3);

/** registrations.participant_id adalah FK ke public.participants.id, jadi id fallback
 *  (profiles.id / user.id / id demo "part-1") tidak boleh dikirim ke server action. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TargetCompetition {
  id: string;
  name: string;
  slug: string;
  status: CompetitionStatus;
  type: CompetitionType;
  min_team_members: number;
  max_team_members: number;
  max_participants: number | null;
}

interface TeamMemberRow {
  name: string;
  role: "ketua" | "anggota";
  studentId: string;
  institution: string;
}

function emptyMember(role: "ketua" | "anggota" = "anggota"): TeamMemberRow {
  return { name: "", role, studentId: "", institution: "" };
}

export function PesertaPendaftaranClient() {
  const { participant, loading, refetch } = useCurrentParticipant();
  const searchParams = useSearchParams();
  const lombaSlug = searchParams.get("lomba");
  const autoParam = searchParams.get("auto");

  /* Kondisi lomba tujuan disimpan dalam satu objek yang ter-key slug, sehingga
     pergantian ?lomba= tidak pernah menampilkan data slug sebelumnya dan tidak
     memerlukan reset state di dalam effect. */
  const [targetState, setTargetState] = React.useState<{
    slug: string | null;
    data: TargetCompetition | null;
    error: string | null;
    loading: boolean;
  }>({ slug: null, data: null, error: null, loading: false });

  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);
  const [teamName, setTeamName] = React.useState("");
  const [members, setMembers] = React.useState<TeamMemberRow[]>([emptyMember("ketua")]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const enrollments: Enrollment[] = participant?.enrollments ?? [];
  const isEnrolledIn = (competitionId: string) =>
    enrollments.some((e) => e.competitionId === competitionId);

  const target = targetState.slug === lombaSlug ? targetState.data : null;
  const targetError = targetState.slug === lombaSlug ? targetState.error : null;
  const targetLoading = !!lombaSlug && (targetState.slug !== lombaSlug || targetState.loading);

  // Ambil data lomba tujuan dari slug agar id yang dikirim adalah UUID kompetisi asli
  React.useEffect(() => {
    if (!lombaSlug) return;

    let cancelled = false;

    const loadTarget = async () => {
      setTargetState({ slug: lombaSlug, data: null, error: null, loading: true });
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("competitions")
          .select("id, name, slug, status, type, min_team_members, max_team_members, max_participants")
          .eq("slug", lombaSlug)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setTargetState({ slug: lombaSlug, data: null, error: error.message, loading: false });
        } else if (!data) {
          setTargetState({
            slug: lombaSlug,
            data: null,
            error: "Cabang lomba yang Anda cari tidak ditemukan.",
            loading: false,
          });
        } else {
          setTargetState({
            slug: lombaSlug,
            data: data as unknown as TargetCompetition,
            error: null,
            loading: false,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setTargetState({
            slug: lombaSlug,
            data: null,
            error: err instanceof Error ? err.message : "Gagal memuat data lomba.",
            loading: false,
          });
        }
      }
    };

    loadTarget();
    return () => {
      cancelled = true;
    };
  }, [lombaSlug]);

  const resetForm = React.useCallback(() => {
    setTeamName("");
    setMembers([emptyMember("ketua")]);
    setErrorMsg(null);
    setIsSubmitting(false);
  }, []);

  const handleOpenForm = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    if (!participant?.participantRowId || !UUID_RE.test(participant.participantRowId)) {
      setErrorMsg(
        "Data peserta Anda belum tersinkron di sistem panitia. Buka Profil Peserta lalu simpan ulang data Anda."
      );
      return;
    }

    const isTeam = target.type === "kelompok";
    const validMembers = isTeam ? members.filter((m) => m.name.trim().length >= 2) : [];

    if (isTeam && teamName.trim().length < 2) {
      setErrorMsg("Nama tim wajib diisi (minimal 2 karakter).");
      return;
    }
    if (isTeam && validMembers.length < target.min_team_members) {
      setErrorMsg(`Tim membutuhkan minimal ${target.min_team_members} anggota dengan nama yang valid.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await enrollCompetition({
      participantId: participant.participantRowId,
      competitionId: target.id,
      teamName: isTeam ? teamName.trim() : undefined,
      teamMembers: isTeam
        ? validMembers.map((m, idx) => ({
            name: m.name.trim(),
            // Ketua tim = baris pertama, sesuai kebutuhan panitia memanggil urutan tampil
            role: idx === 0 ? ("ketua" as const) : ("anggota" as const),
            studentId: m.studentId.trim() || undefined,
            institution: m.institution.trim() || undefined,
          }))
        : undefined,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Gagal mendaftar lomba. Silakan coba lagi.");
      return;
    }

    setDialogOpen(false);
    resetForm();
    setSuccessMsg(
      `Pendaftaran pada "${target.name}" berhasil dikirim dan menunggu verifikasi panitia.`
    );
    await refetch();
  };

  const updateMember = (idx: number, patch: Partial<TeamMemberRow>) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const quotaFull = enrollments.length >= MAX_LOMBA;
  const canEnrollTarget =
    !!target &&
    target.status === "pendaftaran" &&
    !isEnrolledIn(target.id) &&
    !quotaFull &&
    !!participant?.participantRowId &&
    !participant?.isDemoFallback;

  const docsToShow = participant?.isDemoFallback ? PARTICIPANTS[0]?.documents || [] : [];

  const statusBadge = (
    <Badge
      variant={
        participant?.status === "ditolak"
          ? "danger"
          : participant?.status === "menunggu_verifikasi"
          ? "warning"
          : "success"
      }
      className="text-xs font-mono uppercase"
    >
      STATUS: {participant?.status || "TERVERIFIKASI"}
    </Badge>
  );

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trophy className="h-7 w-7 text-accent" />
                <span>Status Pendaftaran Cabang Lomba</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Daftar lomba pilihan Anda dan pantau status verifikasi berkas persyaratan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {statusBadge}
              <Badge variant="default" className="text-xs font-mono">
                {enrollments.length}/{MAX_LOMBA} CABANG
              </Badge>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat status pendaftaran lomba...</p>
          </div>
        ) : (
          <>
            {/* Notifikasi sukses pengajuan */}
            {successMsg && (
              <div className="p-4 rounded-xl border border-success/40 bg-success/5 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">{successMsg}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Nomor urut tampil akan muncul setelah panitia mengonfirmasi pendaftaran Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Peringatan blockers akun */}
            {participant?.isDemoFallback && (
              <div className="p-4 rounded-xl border border-accent/40 bg-accent/5 flex items-start gap-3">
                <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Anda sedang melihat <strong className="text-foreground">mode demo</strong> dengan data
                  contoh. Pendaftaran lomba asli tidak dapat dikirim dari akun ini.
                </p>
              </div>
            )}

            {!loading && !participant?.isDemoFallback && !participant?.participantRowId && (
              <div className="p-4 rounded-xl border border-accent/40 bg-accent/5 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    Entitas peserta Anda belum tersedia
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Sistem belum menemukan data peserta yang tertaut ke akun ini, sehingga pendaftaran
                    lomba belum dapat diproses. Simpan ulang profil Anda untuk membuat data tersebut.
                  </p>
                  <Link
                    href="/peserta/profil"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                  >
                    <span>Lengkapi Profil Peserta</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {quotaFull && (
              <div className="p-4 rounded-xl border border-border bg-muted/40 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Anda telah mencapai batas maksimal <strong>{MAX_LOMBA}</strong> cabang lomba per
                  peserta. Batalkan salah satu pendaftaran untuk mengganti cabang lomba.
                </p>
              </div>
            )}

            {/* Cabang lomba yang sudah diikuti */}
            {enrollments.length > 0 ? (
              <div className="space-y-3">
                <h2 className="font-heading text-lg font-bold text-foreground">
                  Cabang Lomba yang Anda Ikuti
                </h2>
                {enrollments.map((enr) => {
                  const dummy = COMPETITIONS.find(
                    (c) => c.id === enr.competitionId || (enr.competitionSlug && c.slug === enr.competitionSlug)
                  );
                  const targetSlug = enr.competitionSlug || dummy?.slug || enr.competitionId;
                  return (
                    <Card key={enr.registrationId} className="p-5 sm:p-6 space-y-3 border-success/40 bg-success/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider">
                            Cabang {dummy?.category || "perlombaan"}
                          </span>
                          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground truncate">
                            {enr.competitionName || dummy?.name || "Cabang Lomba"}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={enr.isConfirmed ? "success" : "warning"} className="text-[10px]">
                            {enr.isConfirmed ? "TERKONFIRMASI" : "MENUNGGU VERIFIKASI"}
                          </Badge>
                          {enr.teamName && (
                            <Badge variant="default" className="text-[10px]">
                              TIM: {enr.teamName}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono">
                        Nomor Registrasi Anda:{" "}
                        <strong className="text-accent">{participant?.registrationNumber}</strong>
                      </div>

                      {dummy && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-success/20 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-accent" />
                            <span>
                              Venue: <strong>{dummy.venue} ({dummy.stage})</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Jadwal Tampil: <strong>{dummy.date} • {dummy.time}</strong>
                            </span>
                          </div>
                        </div>
                      )}

                      <Link
                        href={`/lomba/${targetSlug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                      >
                        <span>Lihat Detail & Kriteria Lomba</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center space-y-4 border-dashed border-2 border-border">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
                  <Trophy className="h-6 w-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Belum Terdaftar di Cabang Lomba
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Akun peserta Anda memiliki nomor registrasi{" "}
                    <strong className="text-accent font-mono">{participant?.registrationNumber}</strong>.
                    Silakan pilih dan daftarkan diri pada salah satu cabang perlombaan Gebyar Bulan Bahasa
                    (maks. {MAX_LOMBA} cabang per peserta).
                  </p>
                </div>
                <div className="pt-2">
                  <Link href="/lomba">
                    <Button className="text-xs font-semibold gap-2">
                      <span>Lihat Katalog Cabang Lomba</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Bagian Unggah Berkas Persyaratan */}
            {participant?.participantRowId && (
              <div className="pt-2">
                <BerkasUploadSection
                  participantId={participant.participantRowId}
                  onUploadSuccess={refetch}
                />
              </div>
            )}

            {/* Panel pendaftaran lomba tujuan (dari ?lomba=slug) */}
            {lombaSlug && (
              <div className="space-y-3">
                {targetLoading ? (
                  <Card className="p-6 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <p className="text-xs text-muted-foreground">Memuat data cabang lomba...</p>
                  </Card>
                ) : targetError ? (
                  <div className="p-4 rounded-xl border border-danger/40 bg-danger/5 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{targetError}</p>
                  </div>
                ) : target ? (
                  <Card className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider">
                          Pendaftaran {target.type === "kelompok" ? "Tim" : "Individu"}
                        </span>
                        <h2 className="font-heading text-lg font-bold text-foreground truncate">
                          {target.name}
                        </h2>
                      </div>
                      <Badge
                        variant={target.status === "pendaftaran" ? "gold" : "warning"}
                        className="text-[10px]"
                      >
                        {target.status.toUpperCase()}
                      </Badge>
                    </div>

                    {isEnrolledIn(target.id) ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span>Anda sudah terdaftar pada cabang lomba ini.</span>
                      </p>
                    ) : target.status !== "pendaftaran" ? (
                      <p className="text-xs text-muted-foreground">
                        Pendaftaran cabang lomba ini sedang tidak dibuka (status:{" "}
                        <strong className="text-foreground">{target.status}</strong>). Pembaruan status
                        diumumkan melalui halaman pengumuman panitia.
                      </p>
                    ) : quotaFull ? (
                      <p className="text-xs text-muted-foreground">
                        Kuota pendaftaran Anda penuh ({MAX_LOMBA} cabang lomba).
                      </p>
                    ) : (
                      <Button
                        onClick={handleOpenForm}
                        disabled={!canEnrollTarget}
                        className="text-xs font-semibold gap-1.5"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Daftar Cabang Lomba Ini</span>
                      </Button>
                    )}

                    {/* Arahkan lanjutan bagi peserta yang baru saja membuat akun */}
                    {autoParam === "1" && canEnrollTarget && (
                      <p className="text-[11px] text-muted-foreground">
                        Akun peserta Anda baru saja dibuat. Klik tombol di atas untuk menyelesaikan
                        pendaftaran pada cabang lomba ini.
                      </p>
                    )}
                  </Card>
                ) : null}
              </div>
            )}

            {/* Dokumen persyaratan (hanya tersedia pada akun demo) */}
            {docsToShow.length > 0 && (
              <Card className="p-6 space-y-4">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <span>Dokumen Persyaratan Terverifikasi</span>
                </h3>

                <div className="space-y-3">
                  {docsToShow.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-border bg-card flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                        <div>
                          <span className="text-xs font-semibold text-foreground block">
                            {doc.fileName}
                          </span>
                          <span className="text-[11px] text-muted-foreground uppercase font-mono">
                            Tipe: {doc.type.replace(/_/g, " ")} • Status Valid
                          </span>
                        </div>
                      </div>

                      <Badge variant="success" className="text-[10px]">
                        TERVERIFIKASI
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Form pengajuan pendaftaran lomba */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogHeader>
          <DialogTitle>Daftar: {target?.name}</DialogTitle>
          <DialogDescription>
            {target?.type === "kelompok"
              ? `Isi nama tim dan anggota (minimal ${target.min_team_members}, maksimal ${target.max_team_members} orang). Ketua tim berada pada baris pertama.`
              : "Konfirmasi data Anda untuk mengajukan pendaftaran cabang lomba ini."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-lg border border-border bg-muted/40 text-[11px] text-muted-foreground space-y-0.5">
            <p>
              Peserta: <strong className="text-foreground">{participant?.fullName}</strong>
            </p>
            <p>
              Instansi: <strong className="text-foreground">{participant?.institution}</strong> • No.
              Registrasi:{" "}
              <strong className="text-foreground font-mono">{participant?.registrationNumber}</strong>
            </p>
          </div>

          {target?.type === "kelompok" && (
            <>
              <Input
                label="Nama Tim *"
                placeholder="Contoh: Sastra Nusantara"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Anggota Tim ({members.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] gap-1.5"
                    onClick={() => setMembers((prev) => [...prev, emptyMember()])}
                    disabled={!!target.max_team_members && members.length >= target.max_team_members}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Anggota</span>
                  </Button>
                </div>

                {members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-border bg-card space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={idx === 0 ? "gold" : "default"} className="text-[10px]">
                        {idx === 0 ? "KETUA TIM" : `ANGGOTA ${idx + 1}`}
                      </Badge>
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          aria-label={`Hapus anggota ${idx + 1}`}
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
                      required={idx < (target?.min_team_members ?? 1)}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Nomor Induk (Opsional)"
                        placeholder="NIS / NIM"
                        value={member.studentId}
                        onChange={(e) => updateMember(idx, { studentId: e.target.value })}
                      />
                      <Input
                        label="Asal Instansi (Opsional)"
                        placeholder="SMA / Universitas"
                        value={member.institution}
                        onChange={(e) => updateMember(idx, { institution: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
              className="text-xs font-semibold"
            >
              <span>Batal</span>
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs font-semibold gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengajukan Pendaftaran...</span>
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  <span>Kirim Pendaftaran</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </DashboardLayout>
  );
}
