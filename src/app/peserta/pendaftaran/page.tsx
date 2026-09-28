"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { COMPETITIONS, PARTICIPANTS } from "@/lib/dummy-data";
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
} from "lucide-react";

export default function PesertaPendaftaranStatusPage() {
  const { participant, loading } = useCurrentParticipant();

  // Find competition details if registered
  const comp = participant?.competitionId
    ? COMPETITIONS.find((c) => c.id === participant.competitionId)
    : null;

  // Documents fallback
  const demoDocs = PARTICIPANTS[0]?.documents || [];

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
                Informasi verifikasi berkas persyaratan dan nomor urut tampil resmi perlombaan Anda.
              </p>
            </div>
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
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat status pendaftaran lomba...</p>
          </div>
        ) : comp ? (
          /* Jika sudah terdaftar lomba */
          <>
            <Card className="p-6 sm:p-8 space-y-4 border-success/40 bg-success/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-accent uppercase font-bold tracking-wider">
                    Cabang {comp.category}
                  </span>
                  <h3 className="font-heading text-2xl font-bold text-foreground">
                    {comp.name}
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    Nomor Registrasi Anda:
                  </span>
                  <span className="font-mono text-xl font-bold text-accent">
                    {participant?.registrationNumber}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {comp.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-success/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  <span>
                    Venue: <strong>{comp.venue} ({comp.stage})</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Jadwal Tampil: <strong>{comp.date} • {comp.time}</strong>
                  </span>
                </div>
              </div>
            </Card>

            {/* Dokumen Unggahan */}
            <Card className="p-6 space-y-4">
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <span>Dokumen Persyaratan Terverifikasi</span>
              </h3>

              <div className="space-y-3">
                {demoDocs.map((doc) => (
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
          </>
        ) : (
          /* Jika belum mendaftar cabang lomba (User baru) */
          <Card className="p-8 text-center space-y-4 border-dashed border-2 border-border">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Belum Terdaftar di Cabang Lomba
              </h3>
              <p className="text-xs text-muted-foreground">
                Akun peserta Anda telah terverifikasi dengan nomor registrasi{" "}
                <strong className="text-accent font-mono">{participant?.registrationNumber}</strong>.
                Silakan pilih dan daftarkan diri pada salah satu dari 8 cabang perlombaan Gebyar Bulan Bahasa 2025.
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
      </div>
    </DashboardLayout>
  );
}
