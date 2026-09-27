"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PARTICIPANTS, COMPETITIONS } from "@/lib/dummy-data";
import { Trophy, CheckCircle2, FileText, ArrowLeft, MapPin, Calendar } from "lucide-react";

export default function PesertaPendaftaranStatusPage() {
  const participant = PARTICIPANTS[0];
  const comp = COMPETITIONS.find((c) => c.id === participant.competitionId);

  return (
    <DashboardLayout role="peserta">
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
            <Badge variant="success" className="text-xs font-mono">
              STATUS: TERVERIFIKASI
            </Badge>
          </div>
        </div>

        {/* Lomba Card */}
        {comp && (
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
                  {participant.registrationNumber}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {comp.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-success/20 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span>Venue: <strong>{comp.venue} ({comp.stage})</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Jadwal Tampil: <strong>{comp.date} • {comp.time}</strong></span>
              </div>
            </div>
          </Card>
        )}

        {/* Dokumen Unggahan */}
        <Card className="p-6 space-y-4">
          <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <span>Dokumen Persyaratan Terverifikasi</span>
          </h3>

          <div className="space-y-3">
            {participant.documents.map((doc) => (
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
      </div>
    </DashboardLayout>
  );
}
