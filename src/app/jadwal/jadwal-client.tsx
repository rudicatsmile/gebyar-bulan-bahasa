"use client";

import * as React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layouts/PublicNavbar";
import { PublicFooter } from "@/components/layouts/PublicFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ScheduleItem, Competition } from "@/lib/dummy-data";
import {
  Clock,
  MapPin,
  User,
  Radio,
  ArrowRight,
  Flame,
} from "lucide-react";

interface JadwalClientProps {
  initialSchedules: ScheduleItem[];
  competitions: Competition[];
}

export function JadwalClient({ initialSchedules, competitions }: JadwalClientProps) {
  const [selectedDay, setSelectedDay] = React.useState<number>(2); // Default Hari 2 (Hari Ini)

  const daySchedules = initialSchedules.filter((s) => s.day === selectedDay);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <Badge variant="gold" className="text-xs">
              Rangkaian Acara 2 Hari
            </Badge>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Jadwal Lengkap & Agenda Panggung
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Pantau jalannya 8 cabang lomba dan festival budaya secara langsung. Jadwal diperbarui secara real-time dengan status pelaksanaan tiap panggung.
            </p>
          </div>

          {/* Day Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl border border-border bg-card">
            {[
              { day: 1, date: "10 Nov 2026", label: "Hari 1: Pembukaan & Lomba Budaya" },
              { day: 2, date: "11 Nov 2026", label: "Hari 2: Lomba Lanjutan & Malam Penganugerahan", isToday: true },
            ].map((d) => (
              <button
                key={d.day}
                onClick={() => setSelectedDay(d.day)}
                className={`p-3 rounded-lg text-left transition-all cursor-pointer ${
                  selectedDay === d.day
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold uppercase">
                    Hari ke-{d.day}
                  </span>
                  {d.isToday && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent text-accent-foreground">
                      HARI INI
                    </span>
                  )}
                </div>
                <div className="font-heading text-xs sm:text-sm font-semibold truncate">
                  {d.date}
                </div>
                <div className="text-[11px] opacity-75 truncate hidden sm:block">
                  {d.label}
                </div>
              </button>
            ))}
          </div>

          {/* Timeline List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-2">
              <span>Menampilkan {daySchedules.length} Agenda untuk Hari ke-{selectedDay}</span>
              <span className="flex items-center gap-1.5 text-danger font-medium">
                <Radio className="h-3 w-3 animate-pulse" />
                Live Sync Realtime
              </span>
            </div>

            <div className="space-y-4">
              {daySchedules.map((sch) => {
                const isLive = sch.status === "berlangsung";
                const isFinished = sch.status === "selesai";
                const matchedComp = competitions.find(
                  (c) => c.id === sch.competitionId || sch.title.toLowerCase().includes(c.shortName.toLowerCase())
                );

                return (
                  <Card
                    key={sch.id}
                    className={`transition-all ${
                      isLive
                        ? "border-danger/60 bg-danger/5 shadow-xs"
                        : "hover:border-accent/40"
                    }`}
                  >
                    <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Time & Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {sch.time}
                          </span>
                          {isLive ? (
                            <Badge variant="live" className="text-[10px]">
                              Sedang Berlangsung (LIVE)
                            </Badge>
                          ) : isFinished ? (
                            <Badge variant="success" className="text-[10px]">
                              Selesai
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[10px]">
                              Terjadwal
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                          {sch.title}
                        </h3>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-accent" />
                            <span className="font-medium text-foreground">{sch.venue}</span>
                            <span>({sch.stage})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            <span>Pemandu: {sch.host}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="sm:shrink-0 flex items-center gap-2">
                        {matchedComp && (
                          <Link href={`/lomba/${matchedComp.slug}`}>
                            <Button variant="outline" size="sm" className="text-xs gap-1.5">
                              <span>Detail Lomba</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {isLive && (
                          <Link href="/papan-skor">
                            <Button variant="accent" size="sm" className="text-xs gap-1.5">
                              <Flame className="h-3.5 w-3.5" />
                              <span>Lihat Skor Live</span>
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
