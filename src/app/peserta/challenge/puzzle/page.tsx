"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Puzzle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  RotateCcw,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  getActivePuzzleItems,
  submitPuzzleAnswers,
  getMyPuzzleAttempts,
  type PuzzleAttemptResult,
} from "@/app/actions/puzzle";
import { cn } from "@/lib/utils";

type GamePhase = "loading" | "ready" | "playing" | "result";

interface CostumeData {
  id: string;
  costumeName: string;
  costumeImageUrl: string | null;
  hint: string | null;
}

interface AnswerDetail {
  itemId: string;
  costumeName: string;
  selectedRegion: string;
  correctRegion: string;
  isCorrect: boolean;
}

export default function PesertaPuzzlePage() {
  const { participant } = useCurrentParticipant();
  const [phase, setPhase] = React.useState<GamePhase>("loading");
  const [costumes, setCostumes] = React.useState<CostumeData[]>([]);
  const [regions, setRegions] = React.useState<string[]>([]);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [timer, setTimer] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Result state
  const [resultDetails, setResultDetails] = React.useState<AnswerDetail[]>([]);
  const [resultScore, setResultScore] = React.useState(0);
  const [resultCorrect, setResultCorrect] = React.useState(0);
  const [resultTotal, setResultTotal] = React.useState(0);

  // History
  const [history, setHistory] = React.useState<PuzzleAttemptResult[]>([]);

  // Drag state
  const [draggedRegion, setDraggedRegion] = React.useState<string | null>(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);

  const loadPuzzle = React.useCallback(async () => {
    setPhase("loading");
    try {
      const res = await getActivePuzzleItems();
      if (res.success && res.costumes.length > 0) {
        setCostumes(res.costumes);
        setRegions(res.regions);
        setPhase("ready");
      } else {
        setCostumes([]);
        setRegions([]);
        setPhase("ready");
      }
    } catch {
      setPhase("ready");
    }
  }, []);

  const loadHistory = React.useCallback(async () => {
    if (!participant?.participantRowId) return;
    try {
      const res = await getMyPuzzleAttempts(participant.participantRowId);
      if (res.success) setHistory(res.attempts);
    } catch {
      // ignore
    }
  }, [participant?.participantRowId]);

  React.useEffect(() => {
    loadPuzzle();
  }, [loadPuzzle]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const startGame = () => {
    setAnswers({});
    setTimer(0);
    setPhase("playing");
    timerRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => stopTimer();
  }, []);

  const handleSelectRegion = (costumeId: string, region: string) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      // Jika region ini sudah dipilih oleh costume lain, tukar
      const existingKey = Object.entries(updated).find(
        ([, v]) => v === region
      )?.[0];
      if (existingKey && existingKey !== costumeId) {
        // Tukar: costume lain ambil region lama costume ini (jika ada)
        const oldVal = updated[costumeId];
        if (oldVal) {
          updated[existingKey] = oldVal;
        } else {
          delete updated[existingKey];
        }
      }
      updated[costumeId] = region;
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!participant?.participantRowId) {
      alert("Data peserta tidak ditemukan. Pastikan Anda sudah login.");
      return;
    }

    stopTimer();
    setSubmitting(true);

    try {
      const submissionAnswers = costumes.map((c) => ({
        itemId: c.id,
        selectedRegion: answers[c.id] || "",
      }));

      const res = await submitPuzzleAnswers({
        participantId: participant.participantRowId,
        answers: submissionAnswers,
        timeSeconds: timer,
      });

      if (res.success && res.details) {
        setResultDetails(res.details);
        setResultScore(res.pointsAwarded || 0);
        setResultCorrect(res.result?.correctCount || 0);
        setResultTotal(res.result?.totalItems || 0);
        setPhase("result");
        await loadHistory();
      } else {
        alert(res.error || "Gagal mengirim jawaban.");
        // Restart timer jika gagal
        timerRef.current = setInterval(() => {
          setTimer((prev) => prev + 1);
        }, 1000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    loadPuzzle();
  };

  // Drag handlers
  const handleDragStart = (region: string) => {
    setDraggedRegion(region);
  };

  const handleDragOver = (e: React.DragEvent, costumeId: string) => {
    e.preventDefault();
    setDropTarget(costumeId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (costumeId: string) => {
    if (draggedRegion) {
      handleSelectRegion(costumeId, draggedRegion);
    }
    setDraggedRegion(null);
    setDropTarget(null);
  };

  const allAnswered = costumes.length > 0 && Object.keys(answers).length === costumes.length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Region yang belum dipakai
  const usedRegions = new Set(Object.values(answers));
  const availableRegions = regions.filter((r) => !usedRegions.has(r));

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/peserta/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <Puzzle className="h-7 w-7 text-accent" />
                <span>Puzzle Baju Daerah</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Cocokkan nama baju daerah dengan nama daerahnya! Setiap jawaban benar bernilai <strong className="text-accent">10 poin</strong>.
              </p>
            </div>
            {phase === "playing" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card shadow-xs">
                <Clock className="h-4 w-4 text-accent" />
                <span className="font-mono text-lg font-bold text-foreground">
                  {formatTime(timer)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ============ PHASE: LOADING ============ */}
        {phase === "loading" && (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-xs">Memuat soal puzzle...</p>
          </div>
        )}

        {/* ============ PHASE: READY ============ */}
        {phase === "ready" && costumes.length > 0 && (
          <Card className="p-8 text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
              <Puzzle className="h-8 w-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Siap Bermain Puzzle?
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Anda akan mencocokkan <strong>{costumes.length} baju daerah</strong> dengan nama daerah yang tepat.
                Seret nama daerah ke baju yang sesuai, atau klik untuk memilih. Jawaban benar = <strong className="text-accent">10 poin</strong>.
              </p>
            </div>
            <Button onClick={startGame} size="lg" className="text-sm gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4" />
              <span>Mulai Challenge!</span>
            </Button>
          </Card>
        )}

        {phase === "ready" && costumes.length === 0 && (
          <div className="text-center py-16 p-8 border border-dashed border-border rounded-xl bg-card space-y-2">
            <Puzzle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">Challenge Puzzle Belum Tersedia</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Panitia belum mengaktifkan soal puzzle. Silakan cek kembali nanti.
            </p>
          </div>
        )}

        {/* ============ PHASE: PLAYING ============ */}
        {phase === "playing" && (
          <div className="space-y-6">
            {/* Region Bank (draggable) */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pilih & Seret Nama Daerah ke Baju yang Sesuai:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableRegions.map((region) => (
                  <div
                    key={region}
                    draggable
                    onDragStart={() => handleDragStart(region)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-grab active:cursor-grabbing transition-all select-none",
                      "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:shadow-xs",
                      draggedRegion === region && "opacity-50 scale-95"
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <GripVertical className="h-3 w-3 opacity-50" />
                      {region}
                    </span>
                  </div>
                ))}
                {availableRegions.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    Semua daerah sudah dipasangkan ✓
                  </span>
                )}
              </div>
            </Card>

            {/* Puzzle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {costumes.map((costume) => {
                const selectedRegion = answers[costume.id];
                const isDragOver = dropTarget === costume.id;

                return (
                  <Card
                    key={costume.id}
                    className={cn(
                      "p-5 space-y-3 transition-all",
                      isDragOver && "ring-2 ring-accent border-accent bg-accent/5",
                      selectedRegion && "border-accent/50"
                    )}
                    onDragOver={(e) => handleDragOver(e, costume.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={() => handleDrop(costume.id)}
                  >
                    {/* Costume info */}
                    <div className="flex items-start gap-3">
                      {costume.costumeImageUrl ? (
                        <div className="w-16 h-16 rounded-lg bg-muted border border-border overflow-hidden flex-shrink-0">
                          <img
                            src={costume.costumeImageUrl}
                            alt={costume.costumeName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                          <Puzzle className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading text-base font-bold text-foreground">
                          {costume.costumeName}
                        </h3>
                        {costume.hint && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            💡 {costume.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Drop zone / answer */}
                    <div
                      className={cn(
                        "min-h-[40px] rounded-lg border-2 border-dashed flex items-center justify-center text-xs font-medium transition-all",
                        selectedRegion
                          ? "border-accent/50 bg-accent/5 text-accent"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {selectedRegion ? (
                        <span className="flex items-center gap-2 py-1.5 px-3">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {selectedRegion}
                          <button
                            onClick={() =>
                              setAnswers((prev) => {
                                const updated = { ...prev };
                                delete updated[costume.id];
                                return updated;
                              })
                            }
                            className="ml-1 text-muted-foreground hover:text-danger cursor-pointer"
                            title="Batalkan pilihan"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ) : (
                        <span className="py-2">Seret nama daerah ke sini...</span>
                      )}
                    </div>

                    {/* Alternative: click to select */}
                    {!selectedRegion && availableRegions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {availableRegions.map((region) => (
                          <button
                            key={region}
                            onClick={() => handleSelectRegion(costume.id, region)}
                            className="px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            {region}
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Submit button */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitting}
                size="lg"
                variant="accent"
                className="text-sm gap-2 cursor-pointer min-w-[200px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memeriksa...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Kirim Jawaban ({Object.keys(answers).length}/{costumes.length})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ============ PHASE: RESULT ============ */}
        {phase === "result" && (
          <div className="space-y-6">
            {/* Score summary */}
            <Card className="p-8 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <Trophy className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-1">
                <h2 className="font-heading text-2xl font-bold text-foreground">
                  Hasil Challenge Puzzle
                </h2>
                <p className="text-xs text-muted-foreground">
                  Waktu pengerjaan: <strong className="text-foreground">{formatTime(timer)}</strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-accent">{resultCorrect}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Benar
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-foreground">{resultTotal}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Total
                  </p>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-accent">+{resultScore}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Poin
                  </p>
                </div>
              </div>
              <Button onClick={handleRetry} variant="outline" className="text-xs gap-1.5 cursor-pointer">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Main Lagi</span>
              </Button>
            </Card>

            {/* Answer details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resultDetails.map((detail) => (
                <Card
                  key={detail.itemId}
                  className={cn(
                    "p-4 flex items-center gap-3 border-l-4",
                    detail.isCorrect
                      ? "border-l-emerald-500 bg-emerald-500/5"
                      : "border-l-red-500 bg-red-500/5"
                  )}
                >
                  {detail.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{detail.costumeName}</p>
                    {detail.isCorrect ? (
                      <p className="text-[11px] text-emerald-600">
                        ✓ {detail.correctRegion}
                      </p>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-red-500">
                          ✗ Jawaban Anda: {detail.selectedRegion || "(kosong)"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          → Jawaban benar: <strong>{detail.correctRegion}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ============ RIWAYAT ============ */}
        {history.length > 0 && phase !== "playing" && (
          <Card className="p-5 space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Riwayat Percobaan Anda</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {history.slice(0, 6).map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-lg border border-border bg-card space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="text-[10px]">
                      {att.correctCount}/{att.totalItems} Benar
                    </Badge>
                    <span className="font-mono text-xs font-bold text-accent">
                      +{att.score} pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{att.timeSeconds ? `${att.timeSeconds}s` : "—"}</span>
                    <span>
                      {new Date(att.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
