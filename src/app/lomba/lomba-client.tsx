"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { useDashboardRole } from "@/lib/hooks/useDashboardRole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Competition } from "@/lib/dummy-data";
import {
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Filter,
  ArrowLeft,
} from "lucide-react";

interface LombaClientProps {
  initialCompetitions: Competition[];
}

export function LombaClient({ initialCompetitions }: LombaClientProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("semua");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("semua");
  const { role, loading: roleLoading } = useDashboardRole();

  const filteredCompetitions = initialCompetitions.filter((comp) => {
    const matchCategory =
      selectedCategory === "semua" || comp.category === selectedCategory;
    const matchStatus =
      selectedStatus === "semua" || comp.status === selectedStatus;
    return matchCategory && matchStatus;
  });

  const isDashboard = !roleLoading && role !== null;

  /* Konten katalog (dipakai bersama oleh layout publik maupun dashboard) */
  const catalogContent = (
    <div className="space-y-10">
          <div className="space-y-4 max-w-3xl">
            <Badge variant="gold" className="text-xs">
              Katalog Perlombaan Resmi
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              {initialCompetitions.length} Cabang Lomba Kebudayaan & Sastra
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Jelajahi petunjuk teknis, susunan dewan juri ahli, kriteria penilaian berbobot 100%, serta papan skor peserta secara terbuka dan transparan.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-border bg-card/95 backdrop-blur-xs shadow-xs space-y-3.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-6">
            {/* Filter Kategori */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                <Filter className="h-3.5 w-3.5 text-accent" />
                <span>Kategori:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
                {["semua", "individu", "kelompok"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground font-bold shadow-xs ring-1 ring-primary/20"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    {cat === "semua" ? "Semua" : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden lg:block h-6 w-px bg-border/60 shrink-0" />

            {/* Filter Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 pt-2.5 sm:pt-0 border-t border-border/50 sm:border-t-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                <span className="h-2 w-2 rounded-full bg-accent inline-block" />
                <span>Status:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
                {["semua", "berlangsung", "pendaftaran", "selesai"].map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setSelectedStatus(stat)}
                    className={`whitespace-nowrap px-3 py-1.5 sm:py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95 touch-manipulation ${
                      selectedStatus === stat
                        ? "bg-primary text-primary-foreground font-bold shadow-xs ring-1 ring-primary/20"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                    }`}
                  >
                    {stat === "semua" ? "Semua" : stat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Lomba */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompetitions.map((comp) => {
              const statusVariant =
                comp.status === "berlangsung"
                  ? "live"
                  : comp.status === "selesai"
                  ? "success"
                  : "default";

              return (
                <Card
                  key={comp.id}
                  className="flex flex-col justify-between hover:border-accent/60 transition-all hover:shadow-xs group"
                >
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={statusVariant} className="text-[10px]">
                        {comp.status === "berlangsung"
                          ? "LIVE SEKARANG"
                          : comp.status === "selesai"
                          ? "SELESAI"
                          : "PENDAFTARAN DIBUKA"}
                      </Badge>
                      <span className="text-[11px] font-mono uppercase text-muted-foreground">
                        {comp.category}
                      </span>
                    </div>

                    <CardTitle className="text-xl group-hover:text-accent transition-colors">
                      {comp.name}
                    </CardTitle>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {comp.description}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span className="font-medium text-foreground">{comp.venue}</span>
                        <span>({comp.stage})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{comp.date} • {comp.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          {comp.currentParticipantsCount > 0
                            ? `${comp.currentParticipantsCount} Peserta Terdaftar`
                            : "Belum Ada Peserta Terdaftar"}
                        </span>
                      </div>
                    </div>

                    {/* Kriteria Highlights */}
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold block">
                        Kriteria Utama ({comp.criteria.length} kriteria berbobot 100%):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {comp.criteria.map((c) => (
                          <span
                            key={c.id}
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-background border border-border text-foreground font-medium"
                          >
                            {c.name} ({c.weight}%)
                          </span>
                        ))}
                      </div>
                    </div>

                    <Link href={`/lomba/${comp.slug}`} className="block">
                      <Button className="w-full text-xs gap-1.5" size="sm">
                        <span>Buka Detail & Skor</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredCompetitions.length === 0 && (
            <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl space-y-2">
              <p className="text-sm font-semibold text-foreground">Tidak ada lomba yang sesuai filter</p>
              <p className="text-xs text-muted-foreground">Coba ubah kombinasi filter kategori atau status.</p>
            </div>
          )}
    </div>
  );

  /* User login: tetap pakai DashboardLayout agar sidebar konsisten */
  if (isDashboard && role) {
    return (
      <DashboardLayout role={role}>
        <div className="space-y-6">
          <Link
            href={role === "peserta" ? "/peserta/pendaftaran" : `/${role === "seksi_acara" ? "dashboard" : role}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Link>
          {catalogContent}
        </div>
      </DashboardLayout>
    );
  }

  /* Pengunjung publik: layout navbar + footer seperti semula */
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {catalogContent}
        </div>
      </main>

      <PublicFooter competitionsCount={initialCompetitions.length} />
    </div>
  );
}
