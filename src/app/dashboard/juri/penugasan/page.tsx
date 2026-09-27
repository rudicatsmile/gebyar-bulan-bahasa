"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
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
import { JUDGES, COMPETITIONS } from "@/lib/dummy-data";
import { ArrowLeft, ShieldCheck, Check, Save, UserCheck } from "lucide-react";

export default function DashboardPenugasanJuriPage() {
  // Matriks penugasan: Record<judgeId, string[] (competitionIds)>
  const [assignments, setAssignments] = React.useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    JUDGES.forEach((j) => {
      init[j.id] = [...j.assignedCompetitionIds];
    });
    return init;
  });

  // Chief judge mapping: Record<competitionId, judgeId>
  const [chiefJudges, setChiefJudges] = React.useState<Record<string, string>>({
    "comp-1": "judge-1", // Puisi: Siti Nurhaliza
    "comp-2": "judge-2", // Film: Bimo Aryanto
    "comp-3": "judge-3", // Pidato: Rina Kartika
    "comp-4": "judge-4", // Melukis: Yudi Permana
    "comp-5": "judge-5", // Monolog: Hendra Gunawan
    "comp-6": "judge-3", // MC: Rina Kartika
    "comp-7": "judge-6", // Palang Pintu: Bang Jali Mansur
    "comp-8": "judge-7", // Vokal Grup: Dewi Anggraini
  });

  const [savedNotice, setSavedNotice] = React.useState(false);

  const toggleAssignment = (judgeId: string, compId: string) => {
    setAssignments((prev) => {
      const current = prev[judgeId] || [];
      const exists = current.includes(compId);
      const updated = exists ? current.filter((id) => id !== compId) : [...current, compId];
      return { ...prev, [judgeId]: updated };
    });
  };

  const handleSetChief = (compId: string, judgeId: string) => {
    setChiefJudges((prev) => ({ ...prev, [compId]: judgeId }));
  };

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/juri"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Manajemen Juri</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <ShieldCheck className="h-7 w-7 text-accent" />
                <span>Matriks Penugasan Juri × 8 Cabang Lomba</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tentukan dewan penilai untuk tiap cabang lomba. Satu lomba wajib memiliki minimal 1 juri dan 1 Juri Utama.
              </p>
            </div>

            <Button onClick={handleSave} size="sm" className="text-xs gap-1.5 cursor-pointer">
              <Save className="h-3.5 w-3.5" />
              <span>{savedNotice ? "Penugasan Disimpan!" : "Simpan Matriks Penugasan"}</span>
            </Button>
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Perubahan penugasan juri berhasil disimpan dan langsung disinkronkan ke akun dewan juri.</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64 sticky left-0 bg-card z-10">Dewan Juri</TableHead>
                {COMPETITIONS.map((c) => (
                  <TableHead key={c.id} className="text-center min-w-24">
                    <span className="font-heading font-bold text-foreground text-xs block">
                      {c.shortName}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      {c.category}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {JUDGES.map((j) => {
                const assignedList = assignments[j.id] || [];
                return (
                  <TableRow key={j.id}>
                    <TableCell className="sticky left-0 bg-card z-10 border-r border-border">
                      <div className="font-semibold text-foreground text-xs sm:text-sm">
                        {j.fullName}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{j.expertise}</span>
                    </TableCell>

                    {COMPETITIONS.map((c) => {
                      const isAssigned = assignedList.includes(c.id);
                      const isChief = chiefJudges[c.id] === j.id;

                      return (
                        <TableCell key={c.id} className="text-center p-2">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleAssignment(j.id, c.id)}
                              className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                isAssigned
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                              title={isAssigned ? "Klik untuk membatalkan tugas" : "Klik untuk menugaskan"}
                            >
                              {isAssigned ? <Check className="h-4 w-4 text-accent" /> : null}
                            </button>

                            {isAssigned && (
                              <button
                                type="button"
                                onClick={() => handleSetChief(c.id, j.id)}
                                className={`text-[9px] font-mono px-1 py-0.5 rounded uppercase font-bold transition-colors cursor-pointer ${
                                  isChief
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                                title="Klik untuk jadikan Juri Utama"
                              >
                                {isChief ? "★ Utama" : "Jadikan Utama"}
                              </button>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Info Legend */}
        <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-4 w-4 rounded bg-primary text-accent flex items-center justify-center text-[10px] font-bold">✓</span>
              <span>Juri Ditugaskan</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 rounded bg-accent text-accent-foreground font-mono text-[9px] font-bold">★ Utama</span>
              <span>Juri Utama (Chief Judge)</span>
            </span>
          </div>
          <span>Validasi: Mencegah penugasan bentrok pada jadwal dan panggung yang sama.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
