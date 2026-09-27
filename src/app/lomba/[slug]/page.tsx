import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
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
import { getCompetitionBySlug } from "@/lib/supabase/queries";
import {
  PARTICIPANTS,
  JUDGES,
  SCORING_RECAPS,
} from "@/lib/dummy-data";
import {
  MapPin,
  Calendar,
  Users,
  Award,
  ArrowLeft,
  Sliders,
  CheckCircle,
  FileText,
  UserCheck,
  Flame,
} from "lucide-react";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LombaDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const competition = await getCompetitionBySlug(slug);
  if (!competition) {
    return notFound();
  }

  // Peserta terdaftar pada lomba ini (fallback/live)
  const participants = PARTICIPANTS.filter((p) => p.competitionId === competition.id || p.competitionName.toLowerCase().includes(competition.shortName.toLowerCase()));

  // Juri yang ditugaskan
  const assignedJudges = JUDGES.filter((j) =>
    j.assignedCompetitionIds.includes(competition.id) || j.expertise.toLowerCase().includes(competition.shortName.toLowerCase())
  );

  // Rekap penilaian untuk lomba ini (jika ada)
  const scoringData = SCORING_RECAPS[competition.id] || SCORING_RECAPS["comp-1"] || [];

  const statusVariant =
    competition.status === "berlangsung"
      ? "live"
      : competition.status === "selesai"
      ? "success"
      : "default";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
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
              {competition.status === "berlangsung"
                ? "SEDANG BERLANGSUNG"
                : competition.status === "selesai"
                ? "SELESAI"
                : "PENDAFTARAN DIBUKA"}
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
                    <div className="h-12 w-12 rounded-full overflow-hidden shrink-0 border border-border bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                      {judge.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] font-mono uppercase text-accent font-bold block">
                        {judge.isChiefJudge ? "Juri Utama" : "Anggota Juri"}
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

          {/* CTA Daftar / Informasi */}
          <div className="p-6 rounded-xl border border-accent/40 bg-accent/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Tertarik Mengikuti {competition.name}?
              </h3>
              <p className="text-xs text-muted-foreground">
                Pendaftaran terbuka untuk pelajar dan mahasiswa se-Indonesia.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/daftar?lomba=${competition.slug}`}>
                <Button className="text-xs font-semibold">
                  <span>Daftar Lomba Ini</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
