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
  MapPin,
  Shirt,
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
  
  // Mapping: key = costumeId, value = selectedRegion
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  
  const [timer, setTimer] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Drag & Tap-to-Place state
  const [draggedCostumeId, setDraggedCostumeId] = React.useState<string | null>(null);
  const [selectedCostumeId, setSelectedCostumeId] = React.useState<string | null>(null);
  const [dropTargetRegion, setDropTargetRegion] = React.useState<string | null>(null);

  // Result state
  const [resultDetails, setResultDetails] = React.useState<AnswerDetail[]>([]);
  const [resultScore, setResultScore] = React.useState(0);
  const [resultCorrect, setResultCorrect] = React.useState(0);
  const [resultTotal, setResultTotal] = React.useState(0);

  // History
  const [history, setHistory] = React.useState<PuzzleAttemptResult[]>([]);

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
    setSelectedCostumeId(null);
    setDraggedCostumeId(null);
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

  // Helper: Pasangkan baju (costumeId) ke region tertentu
  const handleAssignCostumeToRegion = (costumeId: string, regionName: string) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      // Jika region ini sudah diisi baju lain, lepaskan baju terdahulu
      Object.keys(updated).forEach((cId) => {
        if (updated[cId] === regionName) {
          delete updated[cId];
        }
      });
      updated[costumeId] = regionName;
      return updated;
    });
    setSelectedCostumeId(null);
  };

  // Helper: Lepas baju dari pasangannya
  const handleUnassignCostume = (costumeId: string) => {
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[costumeId];
      return updated;
    });
  };

  // Drag handlers
  const handleDragStart = (costumeId: string) => {
    setDraggedCostumeId(costumeId);
  };

  const handleDragOver = (e: React.DragEvent, regionName: string) => {
    e.preventDefault();
    setDropTargetRegion(regionName);
  };

  const handleDragLeave = () => {
    setDropTargetRegion(null);
  };

  const handleDropToRegion = (regionName: string) => {
    if (draggedCostumeId) {
      handleAssignCostumeToRegion(draggedCostumeId, regionName);
    }
    setDraggedCostumeId(null);
    setDropTargetRegion(null);
  };

  // Tap-to-Place handlers
  const handleCostumeClick = (costumeId: string) => {
    if (selectedCostumeId === costumeId) {
      setSelectedCostumeId(null);
    } else {
      setSelectedCostumeId(costumeId);
    }
  };

  const handleRegionSlotClick = (regionName: string) => {
    if (selectedCostumeId) {
      handleAssignCostumeToRegion(selectedCostumeId, regionName);
    } else {
      const assigned = getCostumeForRegion(regionName);
      if (assigned) {
        handleUnassignCostume(assigned.id);
      }
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Helper pencarian baju yang terpasang di suatu daerah
  const getCostumeForRegion = (regionName: string) => {
    const costumeId = Object.keys(answers).find((cId) => answers[cId] === regionName);
    return costumes.find((c) => c.id === costumeId) || null;
  };

  // Baju yang belum dipasangkan
  const availableCostumes = costumes.filter((c) => !answers[c.id]);
  const activeSelectedCostume = costumes.find((c) => c.id === selectedCostumeId);

  const totalAnswered = Object.keys(answers).length;
  const allAnswered = costumes.length > 0 && totalAnswered === costumes.length;

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 pb-24 md:pb-8">
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
                Cocokkan objek baju daerah dengan daerah asalnya! Setiap jawaban benar bernilai <strong className="text-accent">10 poin</strong>.
              </p>
            </div>
            {phase === "playing" && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card shadow-xs">
                  <Clock className="h-4 w-4 text-accent" />
                  <span className="font-mono text-base font-bold text-foreground">
                    {formatTime(timer)}
                  </span>
                </div>
                <Badge variant={allAnswered ? "success" : "gold"} className="text-xs">
                  {totalAnswered}/{costumes.length} Terpasang
                </Badge>
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
              <Shirt className="h-8 w-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Siap Bermain Puzzle Baju Daerah?
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Anda akan mencocokkan <strong>{costumes.length} objek baju daerah</strong> ke lokasi daerah yang tepat.
                Di HP, cukup tap kartu baju lalu tap nama daerah target, atau seret langsung!
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
            {/* Top Info Bar & Progress (Mobile & Desktop) */}
            <div className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Progres Pemasangan:</span>
                <div className="w-32 sm:w-48 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${(totalAnswered / (costumes.length || 1)) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-accent font-bold">
                  {totalAnswered}/{costumes.length}
                </span>
              </div>
              {totalAnswered > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSelectedCostumeId(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-danger cursor-pointer self-end sm:self-auto"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Kosongkan Semua Pasangan</span>
                </button>
              )}
            </div>

            {/* Layout Grid: Desktop 2-Column, Mobile Stacked */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* DESKTOP LEFT COLUMN: Bank Baju Daerah */}
              <div className="hidden md:block md:col-span-5 space-y-4 sticky top-20">
                <Card className="p-4 space-y-3 border-accent/30">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                      <Shirt className="h-4 w-4 text-accent" />
                      <span>Koleksi Baju Daerah</span>
                    </h3>
                    <Badge variant={availableCostumes.length > 0 ? "gold" : "success"} className="text-[10px]">
                      {availableCostumes.length} Belum Dipasang
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Seret baju di bawah atau klik baju lalu klik daerah target di sebelah kanan.
                  </p>

                  <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                    {availableCostumes.map((costume) => {
                      const isSelected = selectedCostumeId === costume.id;
                      const isDragging = draggedCostumeId === costume.id;

                      return (
                        <div
                          key={costume.id}
                          draggable
                          onDragStart={() => handleDragStart(costume.id)}
                          onClick={() => handleCostumeClick(costume.id)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none flex items-center gap-3",
                            "bg-card hover:border-accent/60 hover:shadow-xs",
                            isSelected && "border-accent ring-2 ring-accent/30 bg-accent/5",
                            isDragging && "opacity-50 scale-95"
                          )}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                          
                          {costume.costumeImageUrl ? (
                            <div className="w-12 h-12 rounded-lg bg-muted border border-border overflow-hidden shrink-0">
                              <img
                                src={costume.costumeImageUrl}
                                alt={costume.costumeName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                              <Shirt className="h-6 w-6 text-accent" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading text-xs font-bold text-foreground truncate">
                              {costume.costumeName}
                            </h4>
                            {costume.hint && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                💡 {costume.hint}
                              </p>
                            )}
                          </div>

                          {isSelected && (
                            <Badge variant="gold" className="text-[9px] shrink-0">
                              Terpilih
                            </Badge>
                          )}
                        </div>
                      );
                    })}

                    {availableCostumes.length === 0 && (
                      <div className="p-6 text-center border border-dashed border-success/40 bg-success/5 rounded-xl space-y-1">
                        <CheckCircle2 className="h-6 w-6 text-success mx-auto" />
                        <p className="text-xs font-semibold text-foreground">Semua Baju Berhasil Dipasangkan!</p>
                        <p className="text-[11px] text-muted-foreground">Silakan periksa pasangan Anda dan klik tombol Kirim Jawaban.</p>
                      </div>
                    )}
                  </div>

                  {/* Desktop Submit Button */}
                  <div className="pt-2 border-t border-border">
                    <Button
                      onClick={handleSubmit}
                      disabled={!allAnswered || submitting}
                      variant="accent"
                      className="w-full text-xs font-semibold gap-2 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Memeriksa Jawaban...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Kirim Jawaban ({totalAnswered}/{costumes.length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>

              {/* RIGHT COLUMN / MAIN MOBILE AREA: Target Region Slots */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <MapPin className="h-4.5 w-4.5 text-accent" />
                    <span>Kotak Target Nama Daerah</span>
                  </h3>
                  {activeSelectedCostume && (
                    <span className="text-[11px] font-semibold text-accent animate-pulse">
                      Tap daerah untuk memasang: {activeSelectedCostume.costumeName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {regions.map((region) => {
                    const assignedCostume = getCostumeForRegion(region);
                    const isDragOver = dropTargetRegion === region;
                    const isTargetForSelected = Boolean(selectedCostumeId);

                    return (
                      <Card
                        key={region}
                        onClick={() => handleRegionSlotClick(region)}
                        onDragOver={(e) => handleDragOver(e, region)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDropToRegion(region)}
                        className={cn(
                          "p-4 space-y-3 transition-all cursor-pointer",
                          isDragOver && "ring-2 ring-accent border-accent bg-accent/10 scale-[1.01]",
                          isTargetForSelected && !assignedCostume && "border-accent/50 bg-accent/5 hover:border-accent",
                          assignedCostume && "border-accent/40 bg-card"
                        )}
                      >
                        {/* Region Header */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <span className="font-heading text-xs font-bold text-foreground flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-accent" />
                            {region}
                          </span>
                          {assignedCostume ? (
                            <Badge variant="success" className="text-[9px]">
                              TERISI
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-[9px] text-muted-foreground">
                              KOSONG
                            </Badge>
                          )}
                        </div>

                        {/* Slot Drop Area */}
                        {assignedCostume ? (
                          <div className="p-2.5 rounded-lg border border-accent/30 bg-accent/5 flex items-center gap-2.5 relative group">
                            {assignedCostume.costumeImageUrl ? (
                              <div className="w-10 h-10 rounded-md bg-muted border border-border overflow-hidden shrink-0">
                                <img
                                  src={assignedCostume.costumeImageUrl}
                                  alt={assignedCostume.costumeName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
                                <Shirt className="h-5 w-5 text-accent" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="font-heading text-xs font-bold text-foreground truncate">
                                {assignedCostume.costumeName}
                              </p>
                              {assignedCostume.hint && (
                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                  💡 {assignedCostume.hint}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnassignCostume(assignedCostume.id);
                              }}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
                              title="Lepas Baju ini"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "min-h-[52px] rounded-lg border-2 border-dashed flex items-center justify-center p-2 text-center transition-all",
                              isTargetForSelected
                                ? "border-accent bg-accent/10 text-accent font-semibold text-xs animate-pulse"
                                : "border-border text-muted-foreground text-xs"
                            )}
                          >
                            {selectedCostumeId ? (
                              <span>Tap di sini untuk memasang <strong>{activeSelectedCostume?.costumeName}</strong></span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                Seret atau Tap Baju di bawah ke sini
                              </span>
                            )}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Mobile Submit Button (at bottom of region grid) */}
                <div className="pt-4 md:hidden">
                  <Button
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    variant="accent"
                    className="w-full text-xs font-semibold gap-2 cursor-pointer h-11"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memeriksa Jawaban...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Kirim Jawaban ({totalAnswered}/{costumes.length})</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

            </div>

            {/* STICKY MOBILE BOTTOM DOCK (Thumb Zone Friendly) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-2xl p-3 md:hidden">
              <div className="max-w-md mx-auto space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Shirt className="h-3.5 w-3.5 text-accent" />
                    {activeSelectedCostume ? (
                      <span className="text-accent font-bold">
                        Baju Terpilih: {activeSelectedCostume.costumeName}
                      </span>
                    ) : (
                      <span>Baju Belum Dipasang ({availableCostumes.length})</span>
                    )}
                  </span>
                  {activeSelectedCostume && (
                    <button
                      onClick={() => setSelectedCostumeId(null)}
                      className="text-muted-foreground hover:text-foreground text-[10px] font-semibold underline"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>

                {/* Horizontal Scrollable Costume Chips for Mobile Thumb Zone */}
                {availableCostumes.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
                    {availableCostumes.map((costume) => {
                      const isSelected = selectedCostumeId === costume.id;

                      return (
                        <div
                          key={costume.id}
                          draggable
                          onDragStart={() => handleDragStart(costume.id)}
                          onClick={() => handleCostumeClick(costume.id)}
                          className={cn(
                            "px-3 py-2 rounded-xl border shrink-0 text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 cursor-pointer select-none",
                            "bg-card border-border shadow-xs",
                            isSelected && "border-accent ring-2 ring-accent bg-accent/10"
                          )}
                        >
                          {costume.costumeImageUrl ? (
                            <img
                              src={costume.costumeImageUrl}
                              alt={costume.costumeName}
                              className="w-6 h-6 rounded-md object-cover border border-border"
                            />
                          ) : (
                            <Shirt className="h-4 w-4 text-accent shrink-0" />
                          )}
                          <span className="text-foreground text-xs whitespace-nowrap">
                            {costume.costumeName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Semua Baju Terpasang!
                    </span>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting}
                      size="sm"
                      variant="accent"
                      className="text-xs h-8 gap-1"
                    >
                      {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      <span>Kirim Sekarang</span>
                    </Button>
                  </div>
                )}
              </div>
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
                      <p className="text-[11px] text-emerald-600 font-medium">
                        ✓ Daerah: {detail.correctRegion}
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
