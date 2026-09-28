"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useDashboardRole } from "@/lib/hooks/useDashboardRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  JUDGES,
  SCORING_RECAPS,
  type Competition,
} from "@/lib/dummy-data";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  Sliders,
  CheckCircle,
  FileText,
  UserCheck,
  Flame,
  Clock,
  Lock,
  Ban,
  Trophy,
  Loader2,
} from "lucide-react";

export interface PublicJudgeItem {
  id: string;
  fullName: string;
  expertise: string;
  avatarUrl: string;
  isChiefJudge: boolean;
}

interface LombaDetailClientProps {
  competition: Competition;
  initialJudges?: PublicJudgeItem[];
}

/* Pemeta status lomba -> konfigurasi CTA pendaftaran */
type RegistrationCta = {
  mode: "open" | "upcoming" | "closed" | "finished" | "cancelled";
  label: string;
  headline: string;
  note: string;
  panelClass: string;
  /** Aksi alternatif saat pendaftaran tak mungkin dilakukan (mis. lihat papan skor) */
  altHref?: string;
  altLabel?: string;
};

function resolveRegistrationCta(status: Competition["status"]): RegistrationCta {
  switch (status) {
    case "pendaftaran":
      return {
        mode: "open",
        label: "Daftar Sekarang",
        headline: "Tertarik Mengikuti {name}?",
        note: "Pendaftaran sedang dibuka untuk pelajar dan mahasiswa se-Indonesia.",
        panelClass: "border-accent/40 bg-accent/5",
      };
    case "draft":
    case "terjadwal":
      return {
        mode: "upcoming",
        label: "Pendaftaran Belum Dibuka",
        headline: "{name} Belum Dibuka",
        note: "Cabang lomba ini masih dijadwalkan. Nantikan pengumuman pembukaan pendaftaran dari panitia.",
        panelClass: "border-border bg-muted/40",
      };
    case "berlangsung":
      return {
        mode: "closed",
        label: "Pendaftaran Ditutup",
        headline: "{name} Sedang Berlangsung",
        note: "Lomba sedang berlangsung dan pendaftaran telah ditutup. Pantau nilai realtime pada papan skor.",
        panelClass: "border-border bg-muted/40",
        altHref: "/papan-skor",
        altLabel: "Lihat Papan Skor",
      };
    case "selesai":
      return {
        mode: "finished",
        label: "Lomba Telah Selesai",
        headline: "{name} Telah Selesai",
        note: "Terima kasih telah berpartisipasi. Hasil resmi tersedia di papan skor.",
        panelClass: "border-success/40 bg-success/5",
        altHref: "/papan-skor",
        altLabel: "Lihat Papan Skor",
      };
    case "dibatalkan":
      return {
        mode: "cancelled",
        label: "Lomba Dibatalkan",
        headline: "{name} Dibatalkan",
        note: "Cabang lomba ini dibatalkan oleh panitia. Pendaftaran tidak dibuka untuk cabang ini.",
        panelClass: "border-danger/40 bg-danger/5",
      };
    default:
      return {
        mode: "closed",
        label: "Pendaftaran Tidak Tersedia",
        headline: "{name} Tidak Tersedia",
        note: "Pendaftaran untuk cabang lomba ini tidak tersedia saat ini.",
        panelClass: "border-border bg-muted/40",
      };
  }
}

export function LombaDetailClient({ competition, initialJudges }: LombaDetailClientProps) {
  const { role, loading: roleLoading } = useDashboardRole();
  const { participant, loading: participantLoading } = useCurrentParticipant();
  const cta = resolveRegistrationCta(competition.status);

  // Periksa apakah peserta aktif saat ini sudah terdaftar di cabang lomba ini
  const userEnrollment = React.useMemo(() => {
    if (!participant?.enrollments) return null;
    return (
      participant.enrollments.find(
        (enr) =>
          enr.competitionId === competition.id ||
          (enr.competitionSlug && enr.competitionSlug === competition.slug) ||
          (enr.competitionName && enr.competitionName.toLowerCase() === competition.name.toLowerCase())
      ) || null
    );
  }, [participant, competition]);

  const isAlreadyRegistered = Boolean(userEnrollment);

  // Guest (role === null) diarahkan ke pembuatan akun peserta lebih dulu,
  // peserta login diarahkan langsung ke formulir pendaftaran lomba.
  const isGuest = !roleLoading && role === null;
  const canRegister = isGuest || role === "peserta";
  const registerHref =
    role === "peserta"
      ? `/peserta/pendaftaran?lomba=${competition.slug}`
      : `/daftar?lomba=${competition.slug}`;

  // Juri yang ditugaskan (prioritaskan dari database competition_judges)
  const assignedJudges =
    initialJudges && initialJudges.length > 0
      ? initialJudges
      : JUDGES.filter((j) => j.assignedCompetitionIds.includes(competition.id));

  // Rekap penilaian untuk lomba ini (jika ada)
  const scoringData = SCORING_RECAPS[competition.id] || SCORING_RECAPS["comp-1"] || [];

  const statusVariant =
    competition.status === "berlangsung"
      ? "live"
      : competition.status === "selesai"
      ? "success"
      : competition.status === "dibatalkan"
      ? "danger"
      : competition.status === "pendaftaran"
      ? "gold"
      : "warning";

  const statusLabel =
    competition.status === "berlangsung"
      ? "SEDANG BERLANGSUNG"
      : competition.status === "selesai"
      ? "SELESAI"
      : competition.status === "pendaftaran"
      ? "PENDAFTARAN DIBUKA"
      : competition.status === "dibatalkan"
      ? "DIBATALKAN"
      : competition.status === "terjadwal"
      ? "TERJADWAL"
      : "BELUM DIBUKA";

  const isDashboard = !roleLoading && role !== null;

  /* Konten detail (dipakai bersama oleh layout publik maupun dashboard) */
  const detailContent = (
    <div className="space-y-10">
      {/* Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/lomba"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Katalog Lomba</span>
        </Link>
        <Badge variant={statusVariant} className="text-xs">
          {statusLabel}
        </Badge>
      </div>

      {/* Title Header */}
      <div className="space-y-4 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold tracking-widest text-accent uppercase">
            Cabang Lomba {competition.category}
          </span>
          <span>•</span>
          <span className="text-xs font-mono text-muted-foreground uppercase">
            Agregasi: {competition.aggregation.replace(/_/g, " ")}
          </span>
        </div>
        <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
          {competition.name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          {competition.description}
        </p>

        {/* Quick Metadata Bar */}
        <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-accent" />
            <span className="font-medium text-foreground">{competition.venue}</span>
            <span>({competition.stage})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{competition.date} • {competition.time}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Maks. {competition.maxParticipants} Peserta</span>
          </div>
        </div>
      </div>

      {/* Kriteria Penilaian Berbobot (Tabel Kriteria) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Sliders className="h-5 w-5 text-accent" />
              <span>Kriteria Penilaian Dewan Juri</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Seluruh penilaian menggunakan kriteria berbobot baku dengan total tepat 100%.
            </p>
          </div>
          <Badge variant="gold" className="text-xs">
            Total Bobot: 100%
          </Badge>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Kriteria Penilaian</TableHead>
                <TableHead>Deskripsi & Indikator Penilaian</TableHead>
                <TableHead className="text-center w-28">Skor Maks</TableHead>
                <TableHead className="text-right w-24">Bobot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competition.criteria.map((crit, idx) => (
                <TableRow key={crit.id}>
                  <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                    {crit.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {crit.description}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">
                    {crit.maxScore}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-accent text-xs">
                    {crit.weight}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dewan Juri Ditugaskan */}
      {assignedJudges.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            <span>Dewan Juri yang Ditugaskan</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {assignedJudges.map((judge) => (
              <Card key={judge.id} className="p-4 flex items-center gap-3">
                {judge.avatarUrl ? (
                  <img
                    src={judge.avatarUrl}
                    alt={judge.fullName}
                    className="h-12 w-12 rounded-full object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                    {judge.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <span className="text-[10px] font-mono uppercase text-accent font-bold block">
                    {judge.isChiefJudge ? "★ Juri Utama" : "Anggota Dewan Juri"}
                  </span>
                  <h4 className="font-heading text-sm font-bold text-foreground truncate">
                    {judge.fullName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">{judge.expertise}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Petunjuk Teknis & Peraturan */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          <span>Petunjuk Teknis & Peraturan Lomba</span>
        </h2>
        <div className="p-6 rounded-xl border border-border bg-card space-y-3">
          <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
            {competition.rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Papan Skor Sementara / Rekap Jika Tersedia */}
      {scoringData.length > 0 && competition.status === "berlangsung" && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Flame className="h-5 w-5 text-danger animate-pulse" />
              <span>Papan Skor Sementara (Agregat Digital)</span>
            </h2>
            <Badge variant="warning" className="text-xs">
              Nilai Realtime
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Peringkat</TableHead>
                  <TableHead>Nama Peserta</TableHead>
                  <TableHead>Asal Instansi</TableHead>
                  <TableHead className="text-center">Juri Dinilai</TableHead>
                  <TableHead className="text-right">Skor Rata-Rata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scoringData.map((sc) => (
                  <TableRow key={sc.registrationId}>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-mono text-xs font-bold ${
                        sc.rank === 1
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {sc.rank}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm">
                      {sc.participantName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sc.institution}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {sc.scoresPerJudge.length} Juri
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-accent text-sm sm:text-base">
                      {sc.finalAverageScore.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* CTA Daftar / Informasi — perilaku mengikuti status pendaftaran peserta */}
      {isAlreadyRegistered ? (
        <div className="p-6 rounded-xl border border-success/40 bg-success/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Badge variant="success" className="text-[10px]">
                SUDAH TERDAFTAR
              </Badge>
              {participant?.registrationNumber && (
                <span className="text-xs font-mono text-muted-foreground">
                  No. Registrasi: <strong className="text-accent">{participant.registrationNumber}</strong>
                </span>
              )}
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Anda Telah Terdaftar di Cabang {competition.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              Status pendaftaran Anda saat ini:{" "}
              <strong className={userEnrollment?.isConfirmed ? "text-success font-semibold" : "text-amber-500 font-semibold"}>
                {userEnrollment?.isConfirmed ? "Terkonfirmasi" : "Menunggu Verifikasi Berkas"}
              </strong>
              {userEnrollment?.teamName ? ` • Nama Tim: ${userEnrollment.teamName}` : ""}.
              Formulir dan berkas Anda telah tercatat di sistem panitia.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/peserta/pendaftaran">
              <Button className="text-xs font-semibold gap-1.5 bg-success text-success-foreground hover:bg-success/90">
                <CheckCircle className="h-4 w-4" />
                <span>Lihat Status Pendaftaran Saya</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className={`p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cta.panelClass}`}>
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-heading text-lg font-bold text-foreground">
              {cta.headline.replace("{name}", competition.name)}
            </h3>
            <p id="cta-registration-note" className="text-xs text-muted-foreground">
              {cta.note}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {cta.mode === "open" && (roleLoading || participantLoading) && (
              <Button disabled className="text-xs font-semibold gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memeriksa Akun...</span>
              </Button>
            )}

            {cta.mode === "open" && !roleLoading && !participantLoading && canRegister && (
              <Link href={registerHref}>
                <Button className="text-xs font-semibold gap-1.5">
                  <Trophy className="h-4 w-4" />
                  <span>{isGuest ? "Daftar & Masuk Dulu" : cta.label}</span>
                </Button>
              </Link>
            )}

            {/* Peran non-peserta hanya boleh memantau; jangan tawarkan aksi yang pasti gagal */}
            {cta.mode === "open" && !roleLoading && !participantLoading && !canRegister && (
              <p className="text-xs text-muted-foreground max-w-[15rem] text-center sm:text-right">
                Halaman ini bersifat informasional untuk peran {role}. Pendaftaran hanya tersedia untuk akun peserta.
              </p>
            )}

            {(cta.mode === "upcoming" || cta.mode === "closed" || cta.mode === "cancelled") && (
              <Button disabled aria-describedby="cta-registration-note" className="text-xs font-semibold gap-1.5">
                {cta.mode === "upcoming" ? (
                  <Clock className="h-4 w-4" />
                ) : cta.mode === "cancelled" ? (
                  <Ban className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                <span>{cta.label}</span>
              </Button>
            )}

            {/* Aksi alternatif: tetap beri jalan keluar saat pendaftaran sudah tidak mungkin */}
            {cta.mode !== "open" && cta.altHref && (
              <Link href={cta.altHref}>
                <Button variant="outline" className="text-xs font-semibold gap-1.5">
                  <Trophy className="h-4 w-4" />
                  <span>{cta.altLabel}</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* User login: tetap pakai DashboardLayout agar sidebar konsisten */
  if (isDashboard && role) {
    return (
      <DashboardLayout role={role}>
        <div className="max-w-6xl mx-auto">{detailContent}</div>
      </DashboardLayout>
    );
  }

  /* Pengunjung publik: layout navbar + footer seperti semula */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {detailContent}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
