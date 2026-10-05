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
import {
  getJudgeAssignmentData,
  saveJudgeAssignmentMatrix,
} from "@/app/actions/competitions";
import { type MatrixAssignmentItem } from "@/lib/constants";
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
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sumber data tunggal: DB (profiles role='juri', competitions, competition_judges).
  // Tidak ada seed dummy — kalau DB kosong, tampilkan empty state.
  const [judges, setJudges] = React.useState<DisplayJudge[]>([]);
  const [competitions, setCompetitions] = React.useState<DisplayCompetition[]>([]);

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
        // Sumber data: DB. Kalau kosong, biarkan kosong (empty state).
        setJudges(
          res.judges.map((j) => ({
            id: j.id,
            fullName: j.fullName,
            expertise: j.expertise || "Dewan Juri Ahli",
          }))
        );
        setCompetitions(
          res.competitions.map((c) => ({
            id: c.id,
            shortName: c.shortName,
            name: c.name,
            category: c.category,
            slug: c.slug,
          }))
        );

        // Susun matriks assignments & chiefJudges dari data nyata.
        const newAssignments: Record<string, string[]> = {};
        const newChiefs: Record<string, string> = {};
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

        setAssignments(newAssignments);
        setChiefJudges(newChiefs);
        setLoadError(null);
      } else {
        setJudges([]);
        setCompetitions([]);
        setAssignments({});
        setChiefJudges({});
        setLoadError(res.error || "Data penugasan gagal dimuat.");
      }
    } catch (err) {
      console.error("Gagal memuat matriks penugasan:", err);
      setJudges([]);
      setCompetitions([]);
      setAssignments({});
      setChiefJudges({});
      setLoadError("Data penugasan gagal dimuat. Periksa koneksi lalu coba lagi.");
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
    // Guard: cegah penghapusan massal tak sengaja (saveJudgeAssignmentMatrix bersifat
    // delete-all) saat data gagal dimuat atau belum ada juri/lomba untuk ditugaskan.
    if (loadError) {
      setErrorNotice(
        "Data gagal dimuat. Muat ulang halaman sebelum menyimpan agar penugasan lama tidak terhapus."
      );
      return;
    }
    if (judges.length === 0 || competitions.length === 0) {
      setErrorNotice(
        "Belum ada juri atau lomba untuk ditugaskan. Tambahkan datanya terlebih dahulu."
      );
      return;
    }
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
              disabled={
                isMounted
                  ? isSaving || loading || !!loadError || judges.length === 0 || competitions.length === 0
                  : false
              }
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

        {loadError && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={competitions.length + 1} className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memuat data penugasan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={competitions.length + 1} className="py-10 text-center">
                    <p className="text-sm text-destructive">{loadError}</p>
                  </TableCell>
                </TableRow>
              ) : judges.length === 0 || competitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={competitions.length + 1} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 opacity-60" />
                      <p className="text-sm font-semibold text-foreground">Belum ada yang bisa ditugaskan</p>
                      <p className="text-xs max-w-md">
                        {judges.length === 0
                          ? "Tambahkan dewan juri di halaman Manajemen Juri terlebih dahulu."
                          : "Tambahkan lomba di modul Lomba terlebih dahulu."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                judges.map((j) => {
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
                })
              )}
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
