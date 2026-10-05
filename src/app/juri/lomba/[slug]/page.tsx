"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
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
  getJudgeCompetitionRoster,
  JudgeRosterParticipant,
} from "@/app/actions/assessments";
import { ArrowLeft, Edit3, Loader2, MapPin, UserCheck } from "lucide-react";

export default function JuriLombaPesertaPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [loading, setLoading] = React.useState(true);
  const [notFoundState, setNotFoundState] = React.useState(false);
  const [competition, setCompetition] = React.useState<{
    id: string;
    name: string;
    slug: string;
    category: string;
    stageName?: string | null;
    status: string;
    rules?: string | null;
  } | null>(null);
  const [participants, setParticipants] = React.useState<JudgeRosterParticipant[]>([]);
  const [judgeName, setJudgeName] = React.useState<string>("");

  const loadData = React.useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await getJudgeCompetitionRoster(slug);
      if (!res.success || !res.competition) {
        setNotFoundState(true);
      } else {
        setCompetition(res.competition);
        setParticipants(res.participants);
        if (res.judge?.name) {
          setJudgeName(res.judge.name);
        }
      }
    } catch {
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (notFoundState) {
    return notFound();
  }

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6">
        <div>
          <Link
            href="/juri"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Lomba Saya</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  ROSTER PESERTA RESMI
                </Badge>
                {competition && (
                  <>
                    <span className="text-xs font-mono text-muted-foreground uppercase">
                      {competition.category}
                    </span>
                    {competition.stageName && (
                      <span className="inline-flex items-center gap-1 text-xs text-accent font-medium">
                        <MapPin className="h-3 w-3" />
                        {competition.stageName}
                      </span>
                    )}
                  </>
                )}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Penilaian: {competition?.name || (loading ? "Memuat Lomba..." : "Cabang Lomba")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Pilih peserta di bawah untuk membuka lembar penilaian digital per kriteria.
              </p>
            </div>

            {judgeName && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/80 text-xs text-muted-foreground shrink-0 self-start sm:self-auto">
                <UserCheck className="h-4 w-4 text-accent" />
                <span>
                  Juri Penilai: <strong className="text-foreground">{judgeName}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">No. Registrasi</TableHead>
                <TableHead>Nama Peserta</TableHead>
                <TableHead>Sekolah / Instansi</TableHead>
                <TableHead className="text-center">Status Penilaian Anda</TableHead>
                <TableHead className="text-right">Aksi Form Penilaian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                      <span>Memuat daftar peserta resmi dari database...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : participants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    Belum ada peserta yang terdaftar pada cabang lomba ini.
                  </TableCell>
                </TableRow>
              ) : (
                participants.map((p) => {
                  const isSent = p.status === "terkirim" || p.status === "final";
                  const isDraft = p.status === "draft";

                  return (
                    <TableRow key={p.registrationId}>
                      <TableCell className="font-mono text-xs font-bold text-accent">
                        {p.registrationNumber}
                      </TableCell>
                      <TableCell>
                        <strong className="text-foreground text-xs sm:text-sm block">
                          {p.fullName}
                        </strong>
                        {p.teamName && (
                          <span className="text-[11px] text-muted-foreground">{p.teamName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.institution}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSent ? (
                          <Badge variant="success" className="text-[10px]">
                            ✓ TERKIRIM {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                          </Badge>
                        ) : isDraft ? (
                          <Badge variant="warning" className="text-[10px]">
                            DRAFT DISIMPAN {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px]">
                            BELUM DINILAI
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/juri/penilaian/${p.registrationId}`}>
                          <Button
                            size="sm"
                            variant={isSent ? "outline" : "default"}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>
                              {isSent
                                ? "Lihat / Ubah Nilai"
                                : isDraft
                                ? "Lanjutkan Menilai"
                                : "Buka Form Nilai"}
                            </span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span>Memuat daftar peserta...</span>
              </div>
            </div>
          ) : participants.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-xl bg-card">
              Belum ada peserta yang terdaftar pada cabang lomba ini.
            </div>
          ) : (
            participants.map((p) => {
              const isSent = p.status === "terkirim" || p.status === "final";
              const isDraft = p.status === "draft";

              return (
                <div key={p.registrationId} className="p-4 rounded-xl border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-accent">
                      {p.registrationNumber}
                    </span>
                    {isSent ? (
                      <Badge variant="success" className="text-[10px]">
                        ✓ TERKIRIM {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                      </Badge>
                    ) : isDraft ? (
                      <Badge variant="warning" className="text-[10px]">
                        DRAFT {p.weightedScore !== null ? `(${p.weightedScore.toFixed(2)})` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px]">
                        BELUM DINILAI
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {p.fullName}
                    </h3>
                    {p.teamName && (
                      <p className="text-xs text-accent">{p.teamName}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{p.institution}</p>
                  </div>

                  <Link href={`/juri/penilaian/${p.registrationId}`} className="block">
                    <Button
                      size="sm"
                      variant={isSent ? "outline" : "default"}
                      className="w-full text-xs h-10 gap-1.5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>
                        {isSent
                          ? "Lihat / Ubah Nilai"
                          : isDraft
                          ? "Lanjutkan Menilai"
                          : "Buka Form Nilai"}
                      </span>
                    </Button>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
