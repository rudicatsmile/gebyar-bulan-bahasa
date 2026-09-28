"use client";

import * as React from "react";
import Link from "next/link";
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
import { JUDGES, COMPETITIONS } from "@/lib/dummy-data";
import {
  getJudgeAssignmentData,
  saveJudgeAssignmentMatrix,
} from "@/app/actions/competitions";
import {
  DUMMY_TO_COMP_ID,
  DUMMY_TO_JUDGE_ID,
  type MatrixAssignmentItem,
} from "@/lib/constants";
import { ArrowLeft, ShieldCheck, Check, Save, Loader2, AlertCircle } from "lucide-react";

interface DisplayJudge {
  id: string;
  fullName: string;
  expertise: string;
}

interface DisplayCompetition {
  id: string;
  shortName: string;
  name: string;
  category: string;
  slug: string;
}

export default function DashboardPenugasanJuriPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState(false);
  const [errorNotice, setErrorNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const [judges, setJudges] = React.useState<DisplayJudge[]>(() =>
    JUDGES.map((j) => ({
      id: DUMMY_TO_JUDGE_ID[j.id] || j.id,
      fullName: j.fullName,
      expertise: j.expertise,
    }))
  );

  const [competitions, setCompetitions] = React.useState<DisplayCompetition[]>(() =>
    COMPETITIONS.map((c) => ({
      id: DUMMY_TO_COMP_ID[c.id] || c.id,
      shortName: c.shortName,
      name: c.name,
      category: c.category,
      slug: c.slug,
    }))
  );

  // Matriks penugasan: Record<judgeId, string[] (competitionIds)>
  const [assignments, setAssignments] = React.useState<Record<string, string[]>>({});

  // Chief judge mapping: Record<competitionId, judgeId>
  const [chiefJudges, setChiefJudges] = React.useState<Record<string, string>>({});

  // Load data nyata dari database Supabase
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await getJudgeAssignmentData();

      if (res.success) {
        if (res.judges.length > 0) {
          setJudges(
            res.judges.map((j) => ({
              id: j.id,
              fullName: j.fullName,
              expertise: j.expertise || "Dewan Juri Ahli",
            }))
          );
        }

        if (res.competitions.length > 0) {
          setCompetitions(
            res.competitions.map((c) => ({
              id: c.id,
              shortName: c.shortName,
              name: c.name,
              category: c.category,
              slug: c.slug,
            }))
          );
        }

        // Susun matriks assignments & chiefJudges
        const newAssignments: Record<string, string[]> = {};
        const newChiefs: Record<string, string> = {};

        if (res.assignments.length > 0) {
          res.assignments.forEach((a) => {
            if (!newAssignments[a.judgeId]) {
              newAssignments[a.judgeId] = [];
            }
            if (!newAssignments[a.judgeId].includes(a.competitionId)) {
              newAssignments[a.judgeId].push(a.competitionId);
            }
            if (a.isChiefJudge) {
              newChiefs[a.competitionId] = a.judgeId;
            }
          });
        } else {
          // Default mapping awal jika tabel competition_judges masih kosong di DB
          JUDGES.forEach((j) => {
            const resolvedJId = DUMMY_TO_JUDGE_ID[j.id] || j.id;
            const resolvedCompIds = j.assignedCompetitionIds.map(
              (cid) => DUMMY_TO_COMP_ID[cid] || cid
            );
            newAssignments[resolvedJId] = resolvedCompIds;
          });

          const defaultChiefMap: Record<string, string> = {
            "comp-1": "judge-1",
            "comp-2": "judge-2",
            "comp-3": "judge-3",
            "comp-4": "judge-4",
            "comp-5": "judge-5",
            "comp-6": "judge-3",
            "comp-7": "judge-6",
            "comp-8": "judge-7",
          };
          Object.entries(defaultChiefMap).forEach(([cid, jid]) => {
            const resolvedC = DUMMY_TO_COMP_ID[cid] || cid;
            const resolvedJ = DUMMY_TO_JUDGE_ID[jid] || jid;
            newChiefs[resolvedC] = resolvedJ;
          });
        }

        setAssignments(newAssignments);
        setChiefJudges(newChiefs);
      }
    } catch (err) {
      console.error("Gagal memuat matriks penugasan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAssignment = (judgeId: string, compId: string) => {
    setAssignments((prev) => {
      const current = prev[judgeId] || [];
      const exists = current.includes(compId);
      const updated = exists ? current.filter((id) => id !== compId) : [...current, compId];

      // Jika dibatalkan dan tadinya juri utama, bersihkan juri utama
      if (exists && chiefJudges[compId] === judgeId) {
        setChiefJudges((cPrev) => {
          const cNext = { ...cPrev };
          delete cNext[compId];
          return cNext;
        });
      }

      return { ...prev, [judgeId]: updated };
    });
  };

  const handleSetChief = (compId: string, judgeId: string) => {
    setChiefJudges((prev) => ({ ...prev, [compId]: judgeId }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorNotice(null);

      // Kumpulkan semua penugasan ke format MatrixAssignmentItem[]
      const payload: MatrixAssignmentItem[] = [];

      Object.entries(assignments).forEach(([jId, compList]) => {
        (compList || []).forEach((cId) => {
          const isChief = chiefJudges[cId] === jId;
          payload.push({
            judgeId: jId,
            competitionId: cId,
            isChiefJudge: isChief,
          });
        });
      });

      const res = await saveJudgeAssignmentMatrix(payload);

      if (res.success) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3500);
      } else {
        setErrorNotice(res.error || "Gagal menyimpan ke database.");
      }
    } catch (err: unknown) {
      setErrorNotice(err instanceof Error ? err.message : "Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
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

            <Button
              onClick={handleSave}
              disabled={isMounted ? (isSaving || loading) : false}
              suppressHydrationWarning
              size="sm"
              className="text-xs gap-1.5 cursor-pointer min-w-44"
            >
              {isMounted && isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan ke DB...</span>
                </>
              ) : isMounted && savedNotice ? (
                <>
                  <Check className="h-3.5 w-3.5 text-accent" />
                  <span>Penugasan Disimpan!</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan Matriks Penugasan</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-lg bg-success/15 border border-success/30 text-success text-xs flex items-center gap-2 animate-in fade-in">
            <Check className="h-4 w-4 shrink-0" />
            <span>Perubahan penugasan juri berhasil disimpan dan langsung disinkronkan ke akun dewan juri di database.</span>
          </div>
        )}

        {errorNotice && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Gagal menyimpan penugasan: {errorNotice}</span>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64 sticky left-0 bg-card z-10">Dewan Juri</TableHead>
                {competitions.map((c) => (
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
              {judges.map((j) => {
                const assignedList = assignments[j.id] || [];
                return (
                  <TableRow key={j.id}>
                    <TableCell className="sticky left-0 bg-card z-10 border-r border-border">
                      <div className="font-semibold text-foreground text-xs sm:text-sm">
                        {j.fullName}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{j.expertise}</span>
                    </TableCell>

                    {competitions.map((c) => {
                      const isAssigned = assignedList.includes(c.id);
                      const isChief = chiefJudges[c.id] === j.id;

                      return (
                        <TableCell key={c.id} className="text-center p-2">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleAssignment(j.id, c.id)}
                              disabled={isMounted ? isSaving : false}
                              suppressHydrationWarning
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
                                disabled={isMounted ? isSaving : false}
                                suppressHydrationWarning
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
          <span>Validasi: Tersimpan permanen ke database Supabase (tabel <code>competition_judges</code>).</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
