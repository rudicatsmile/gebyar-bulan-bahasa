"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Mail,
  Phone,
  School,
  FileText,
  Coins,
  Trophy,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function DashboardPesertaDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [participant, setParticipant] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const fetchParticipant = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/participants/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.participant) {
          setParticipant(data.participant);
        }
      }
    } catch (e) {
      console.error("Failed fetch participant", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  if (loading) {
    return (
      <DashboardLayout role="seksi_acara">
        <div className="flex items-center justify-center py-20 text-foreground">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!participant) return notFound();

  const statusVariant =
    participant.status === "terverifikasi"
      ? "success"
      : participant.status === "menunggu_verifikasi"
      ? "warning"
      : "danger";

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={statusVariant} className="text-xs">
                  {participant.status.replace(/_/g, " ").toUpperCase()}
                </Badge>
                <span className="font-mono text-xs font-bold text-accent">
                  {participant.registrationNumber}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {participant.fullName}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/peserta/verifikasi">
                <Button size="sm" variant="outline" className="text-xs">
                  Antrean Verifikasi Berkas
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Biodata Card */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground">
                Biodata & Kontak Peserta
              </h3>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <School className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Instansi Asal:</strong>
                    <span>{participant.institution}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Email:</strong>
                    <span>{participant.email}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Telepon / WhatsApp:</strong>
                    <span>{participant.phone}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-2 border-accent/40 bg-accent/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold block">
                Total Poin Challenge
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-3xl font-bold text-accent">{participant.totalPoints}</span>
                <span className="text-xs text-muted-foreground">Poin</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-2 border-t border-accent/20">
                Poin terkumpul dari kunjungan 8 stand & challenge non-lomba.
              </p>
            </Card>
          </div>

          {/* Lomba & Dokumen Card */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <span>Pendaftaran Cabang Lomba</span>
              </h3>
              <div className="p-4 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h4 className="font-heading text-base font-bold text-foreground">
                    {participant.competitionName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Kategori: {participant.category.toUpperCase()}{" "}
                    {participant.teamName && `• Tim: ${participant.teamName}`}
                  </p>
                </div>
                <Badge variant={statusVariant} className="text-xs">
                  {participant.status.replace(/_/g, " ")}
                </Badge>
              </div>

              {participant.teamMembers && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-foreground">
                    Anggota Rombongan / Tim:
                  </span>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {participant.teamMembers.map((m, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <span>Berkas Persyaratan yang Diunggah</span>
              </h3>
              <div className="space-y-3">
                {participant.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-lg border border-border bg-card flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-foreground block truncate">
                          {doc.fileName}
                        </span>
                        <span className="text-[11px] text-muted-foreground uppercase font-mono">
                          Tipe: {doc.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={doc.status === "valid" ? "success" : "warning"}
                        className="text-[10px]"
                      >
                        {doc.status.toUpperCase()}
                      </Badge>
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        Pratinjau
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
