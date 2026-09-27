"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPETITIONS } from "@/lib/dummy-data";
import {
  MapPin,
  Calendar,
  Users,
  ChevronRight,
  Filter,
  CheckCircle,
} from "lucide-react";

export default function LombaPage() {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("semua");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("semua");

  const filteredCompetitions = COMPETITIONS.filter((comp) => {
    const matchCategory =
      selectedCategory === "semua" || comp.category === selectedCategory;
    const matchStatus =
      selectedStatus === "semua" || comp.status === selectedStatus;
    return matchCategory && matchStatus;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <Badge variant="gold" className="text-xs">
              Katalog Perlombaan Resmi
            </Badge>
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              8 Cabang Lomba Kebudayaan & Sastra
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Jelajahi petunjuk teknis, susunan dewan juri ahli, kriteria penilaian berbobot 100%, serta papan skor peserta secara terbuka dan transparan.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
            {/* Filter Kategori */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-2 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Kategori:
              </span>
              {["semua", "individu", "kelompok"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat === "semua" ? "Semua Kategori" : cat}
                </button>
              ))}
            </div>

            {/* Filter Status */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-2">Status:</span>
              {["semua", "berlangsung", "terjadwal", "selesai"].map((stat) => (
                <button
                  key={stat}
                  onClick={() => setSelectedStatus(stat)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedStatus === stat
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {stat === "semua" ? "Semua Status" : stat}
                </button>
              ))}
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
                          : "TERJADWAL"}
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
                        <span>{comp.currentParticipantsCount} Peserta Terdaftar</span>
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
      </main>

      <PublicFooter />
    </div>
  );
}
