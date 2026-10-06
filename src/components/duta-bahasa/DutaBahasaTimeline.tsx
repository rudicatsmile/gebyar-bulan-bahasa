"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  Crown,
  Sparkles,
  ChevronRight,
  Users,
  ShieldCheck,
  Flame,
} from "lucide-react";
import type {
  DutaBahasaStage,
  DutaBahasaParticipantInfo,
  DutaBahasaParticipantStatus,
} from "@/app/actions/duta-bahasa";

interface DutaBahasaTimelineProps {
  currentParticipantId?: string;
  showParticipantsList?: boolean;
}

const stageStatusBadge: Record<DutaBahasaStage["status"], string> = {
  upcoming: "bg-muted text-muted-foreground border-border",
  active: "bg-amber-500/15 text-amber-500 border-amber-500/30 animate-pulse",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

const stageStatusLabel: Record<DutaBahasaStage["status"], string> = {
  upcoming: "Akan Datang",
  active: "Sedang Berlangsung",
  completed: "Selesai",
};

const statusBadge: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  lolos: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  tidak_lolos: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  menunggu: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

const statusLabel: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "Terdaftar",
  lolos: "Lolos Tahap Ini",
  tidak_lolos: "Gugur / Tereliminasi",
  menunggu: "Dalam Penilaian",
};

export function DutaBahasaTimeline({
  currentParticipantId,
  showParticipantsList = true,
}: DutaBahasaTimelineProps) {
  const [stages, setStages] = React.useState<DutaBahasaStage[]>([]);
  const [participants, setParticipants] = React.useState<DutaBahasaParticipantInfo[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/duta-bahasa");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setStages(json.stages || []);
            setParticipants(json.participants || []);
            if (json.stages?.length > 0) {
              const active = json.stages.find((s: DutaBahasaStage) => s.status === "active");
              setSelectedStageId(active ? active.id : json.stages[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat data Duta Bahasa:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const myProgress = React.useMemo(() => {
    if (!currentParticipantId) return null;
    return participants.find((p) => p.participantId === currentParticipantId) || null;
  }, [participants, currentParticipantId]);

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  const stageParticipants = React.useMemo(() => {
    if (!selectedStage) return [];
    return participants.filter((p) => {
      const prog = p.progress[selectedStage.id];
      return !!prog;
    });
  }, [participants, selectedStage]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-accent/20 bg-card space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-20 bg-muted/50 rounded-xl" />
      </div>
    );
  }

  if (stages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
              Tahapan &amp; Alur Lomba Duta Bahasa
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kompetisi bertahap resmi dari tahap administrasi, minat bakat, hingga Grand Final.
          </p>
        </div>
        <Badge variant="gold" className="self-start sm:self-auto text-xs px-3 py-1 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sistem Gugur Bertingkat</span>
        </Badge>
      </div>

      {/* Participant Personal Banner if logged in as participant */}
      {myProgress && (
        <div className="p-5 rounded-xl border border-accent/40 bg-accent/10 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <span className="font-heading text-sm sm:text-base font-bold text-foreground">
                Status Anda: {myProgress.fullName} ({myProgress.registrationNumber})
              </span>
            </div>
            <Badge
              className={
                myProgress.overallStatus === "pemenang"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : myProgress.overallStatus === "tereliminasi"
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              }
            >
              {myProgress.overallStatus === "pemenang"
                ? "🏆 Duta Bahasa Terpilih"
                : myProgress.overallStatus === "finalis"
                ? "⭐ Finalis 3 Besar"
                : myProgress.overallStatus === "tereliminasi"
                ? "Tereliminasi"
                : "Sedang Berkompetisi"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Anda berada pada tahap ke-{myProgress.currentStageOrder}:{" "}
            <strong className="text-foreground">
              {stages.find((s) => s.id === myProgress.currentStageId)?.title}
            </strong>
          </p>
        </div>
      )}

      {/* Timeline Steps Bar */}
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {stages.map((stg, idx) => {
            const isSelected = selectedStage?.id === stg.id;
            return (
              <div
                key={stg.id}
                onClick={() => setSelectedStageId(stg.id)}
                className={`relative cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "border-accent bg-accent/10 shadow-md ring-1 ring-accent/30"
                    : "border-border bg-card hover:border-accent/40 hover:bg-muted/30"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent text-xs font-mono font-bold">
                      {idx + 1}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        stageStatusBadge[stg.status]
                      }`}
                    >
                      {stageStatusLabel[stg.status]}
                    </span>
                  </div>
                  <h4 className="font-heading text-xs sm:text-sm font-bold text-foreground line-clamp-2">
                    {stg.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-accent shrink-0" />
                  <span className="truncate">{stg.stageDayLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Card */}
      {selectedStage && (
        <Card className="p-5 sm:p-6 border-accent/30 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-accent font-bold">
                Tahap {selectedStage.stageOrder} dari {stages.length}
              </span>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                {selectedStage.title}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={stageStatusBadge[selectedStage.status]}>
                {stageStatusLabel[selectedStage.status]}
              </Badge>
              <Badge variant="default" className="text-xs font-normal border border-border">
                {selectedStage.stageDayLabel}
              </Badge>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {selectedStage.description}
          </p>

          {/* Participant List for This Stage */}
          {showParticipantsList && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Peserta di Tahap Ini ({stageParticipants.length})</span>
                </h4>
              </div>

              {stageParticipants.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                  Belum ada peserta yang mencapai tahap ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {stageParticipants.map((p) => {
                    const prog = p.progress[selectedStage.id];
                    const isPassed = prog?.status === "lolos";
                    return (
                      <div
                        key={p.participantId}
                        className={`p-3 rounded-lg border text-xs flex flex-col justify-between space-y-2 ${
                          isPassed
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : prog?.status === "tidak_lolos"
                            ? "border-rose-500/30 bg-rose-500/5"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {p.registrationNumber}
                            </span>
                            {prog && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                                  statusBadge[prog.status]
                                }`}
                              >
                                {statusLabel[prog.status]}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-foreground truncate">{p.fullName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.institution}
                          </p>
                        </div>

                        {prog?.score !== null && prog?.score !== undefined && (
                          <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Nilai:</span>
                            <span className="font-mono font-bold text-accent">
                              {prog.score} / 100
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
