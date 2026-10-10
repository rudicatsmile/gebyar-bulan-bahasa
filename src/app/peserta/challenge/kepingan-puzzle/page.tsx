"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Puzzle,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Trophy,
  Clock,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Flame,
  Award,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  getActiveJigsawPuzzle,
  getParticipantJigsawStatus,
  submitJigsawCompletion,
  type JigsawConfig,
  type JigsawAttempt,
} from "@/app/actions/kepingan-puzzle";

type GamePhase = "loading" | "ready" | "playing" | "completed" | "inactive" | "already_done";

export default function PesertaKepinganPuzzlePage() {
  const { participant } = useCurrentParticipant();

  const [phase, setPhase] = React.useState<GamePhase>("loading");
  const [puzzle, setPuzzle] = React.useState<JigsawConfig | null>(null);
  const [pastAttempt, setPastAttempt] = React.useState<JigsawAttempt | null>(null);

  // Board state: current board is an array of tile indices
  // board[slotIndex] = tileId
  const [board, setBoard] = React.useState<number[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<number | null>(null);
  const [movesCount, setMovesCount] = React.useState<number>(0);
  const [peekImage, setPeekImage] = React.useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = React.useState<boolean>(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = React.useState<number>(120);
  const [timeElapsed, setTimeElapsed] = React.useState<number>(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Submit completion state
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [pointsEarned, setPointsEarned] = React.useState<number>(0);
  const [showVictoryModal, setShowVictoryModal] = React.useState<boolean>(false);

  // Load Puzzle & Participant Status
  const loadGame = React.useCallback(async () => {
    setPhase("loading");
    try {
      const res = await getActiveJigsawPuzzle();
      if (!res.success || !res.puzzle || !res.puzzle.isActive) {
        setPhase("inactive");
        return;
      }

      setPuzzle(res.puzzle);
      const targetPieces = res.puzzle.piecesCount;

      // Cek apakah peserta sudah pernah menyelesaikan puzzle ini
      if (participant?.participantRowId) {
        const statusRes = await getParticipantJigsawStatus(
          participant.participantRowId,
          res.puzzle.id
        );
        if (statusRes.hasCompleted && statusRes.attempt) {
          setPastAttempt(statusRes.attempt);
          setPhase("already_done");
          return;
        }
      }

      // Siapkan papan kepingan teracak (pastikan tidak tersusun rapi di awal)
      const initial = Array.from({ length: targetPieces }, (_, i) => i);
      let shuffled = [...initial].sort(() => Math.random() - 0.5);

      // Pastikan ada yang teracak
      let isSame = true;
      for (let i = 0; i < targetPieces; i++) {
        if (shuffled[i] !== initial[i]) {
          isSame = false;
          break;
        }
      }
      if (isSame && targetPieces > 1) {
        const temp = shuffled[0];
        shuffled[0] = shuffled[1];
        shuffled[1] = temp;
      }

      setBoard(shuffled);
      setMovesCount(0);
      setSelectedSlot(null);
      setTimeElapsed(0);
      setTimeRemaining(res.puzzle.timeLimitSeconds > 0 ? res.puzzle.timeLimitSeconds : 9999);
      setPhase("ready");
    } catch (err) {
      console.error("Gagal memuat puzzle:", err);
      setPhase("inactive");
    }
  }, [participant?.participantRowId]);

  React.useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Start Playing
  const handleStartGame = () => {
    setPhase("playing");
  };

  // Timer Effect
  React.useEffect(() => {
    if (phase !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
      if (puzzle && puzzle.timeLimitSeconds > 0) {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, puzzle]);

  // Handle Timeout
  const handleTimeOut = () => {
    alert("Waktu habis! Kepingan puzzle belum tersusun sempurna. Anda dapat mengacak ulang dan mencoba lagi.");
    loadGame();
  };

  // Check if Puzzle is Completed
  const checkVictory = React.useCallback(
    async (currentBoard: number[], currentMoves: number, currentElapsed: number) => {
      if (currentBoard.length === 0) return;

      const isAllCorrect = currentBoard.every((tileId, slotIdx) => tileId === slotIdx);
      if (!isAllCorrect) return;

      // PUZZLE SELESAI!
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("completed");
      setShowVictoryModal(true);
      setSubmitting(true);

      if (participant?.participantRowId && puzzle) {
        try {
          const res = await submitJigsawCompletion({
            puzzleId: puzzle.id,
            participantId: participant.participantRowId,
            timeSeconds: currentElapsed,
            movesCount: currentMoves,
          });

          if (res.success && res.pointsAwarded !== undefined) {
            setPointsEarned(res.pointsAwarded);
          } else {
            setPointsEarned(puzzle.pointsReward);
          }
        } catch (err) {
          console.error("Gagal submit completion:", err);
          setPointsEarned(puzzle.pointsReward);
        } finally {
          setSubmitting(false);
        }
      } else {
        setPointsEarned(puzzle?.pointsReward ?? 100);
        setSubmitting(false);
      }
    },
    [participant?.participantRowId, puzzle]
  );

  // Handle Tile Click / Tap-to-Swap
  const handleTileClick = (clickedSlot: number) => {
    if (phase !== "playing") return;

    if (selectedSlot === null) {
      // Pilih kepingan pertama
      setSelectedSlot(clickedSlot);
      return;
    }

    if (selectedSlot === clickedSlot) {
      // Batalkan pilihan kepingan yang sama
      setSelectedSlot(null);
      return;
    }

    // Tukar posisi slot A dan slot B!
    const newBoard = [...board];
    const temp = newBoard[selectedSlot];
    newBoard[selectedSlot] = newBoard[clickedSlot];
    newBoard[clickedSlot] = temp;

    const newMoves = movesCount + 1;
    setBoard(newBoard);
    setSelectedSlot(null);
    setMovesCount(newMoves);

    // Cek apakah langsung selesai
    checkVictory(newBoard, newMoves, timeElapsed);
  };

  // Calculate background position percentage for a given tileId
  const getTileStyle = (tileId: number, gridSize: number) => {
    const row = Math.floor(tileId / gridSize);
    const col = tileId % gridSize;

    // percentage position: col / (gridSize - 1) * 100%
    const posX = gridSize > 1 ? (col / (gridSize - 1)) * 100 : 0;
    const posY = gridSize > 1 ? (row / (gridSize - 1)) * 100 : 0;

    return {
      backgroundImage: `url(${puzzle?.imageUrl})`,
      backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
      backgroundPosition: `${posX}% ${posY}%`,
    };
  };

  const gridSize = puzzle ? puzzle.gridSize : 3;

  return (
    <DashboardLayout role="peserta">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/peserta/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Menu Challenge</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px] gap-1 px-2 py-0.5">
                  <Flame className="h-3 w-3" />
                  <span>Game Interaktif Baru</span>
                </Badge>
                {puzzle && (
                  <Badge variant="default" className="text-[10px]">
                    {puzzle.piecesCount} Keping ({gridSize}x{gridSize})
                  </Badge>
                )}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Puzzle className="h-7 w-7 text-accent" />
                <span>{puzzle?.title || "Game Kepingan Puzzle"}</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuideModal(true)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Cara Bermain</span>
              </Button>

              <Badge variant="gold" className="text-xs font-mono font-bold px-3 py-1">
                +{puzzle?.pointsReward || 100} Poin
              </Badge>
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* KONDISI 1: LOADING */}
        {/* ============================================================= */}
        {phase === "loading" && (
          <Card className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3 border-border">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <span className="text-sm">Menyiapkan kepingan puzzle...</span>
          </Card>
        )}

        {/* ============================================================= */}
        {/* KONDISI 2: CHALLENGE NONAKTIF */}
        {/* ============================================================= */}
        {phase === "inactive" && (
          <Card className="p-12 text-center space-y-4 border-border bg-card/60">
            <AlertCircle className="h-12 w-12 text-muted-foreground/60 mx-auto" />
            <div className="space-y-1">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Challenge Sedang Dinonaktifkan
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Game Kepingan Puzzle sedang ditutup atau belum diaktifkan oleh panitia acara. Silakan cek tantangan lainnya!
              </p>
            </div>
            <Link href="/peserta/challenge">
              <Button size="sm" className="text-xs cursor-pointer">
                Jelajahi Challenge Lainnya
              </Button>
            </Link>
          </Card>
        )}

        {/* ============================================================= */}
        {/* KONDISI 3: SUDAH SELESAI SEBELUMNYA (CEGAH KLAIM BERULANG) */}
        {/* ============================================================= */}
        {phase === "already_done" && puzzle && (
          <Card className="p-8 sm:p-10 text-center space-y-6 border-accent/40 bg-accent/5">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <Badge variant="success" className="text-xs px-2.5 py-0.5">
                Tantangan Sudah Diselesaikan
              </Badge>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                Anda Telah Menyelesaikan Puzzle Ini!
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hebat! Anda telah berhasil menyusun seluruh kepingan puzzle &ldquo;{puzzle.title}&rdquo; dan poin reward sudah berhasil diklaim ke saldo Anda.
              </p>
            </div>

            {/* Gambar Utuh yang Diselesaikan */}
            <div className="relative aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-accent shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={puzzle.imageUrl}
                alt={puzzle.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-semibold flex items-center justify-between">
                <span>Mahakarya Utuh</span>
                <span className="text-accent font-mono font-bold">
                  +{pastAttempt?.score || puzzle.pointsReward} Poin
                </span>
              </div>
            </div>

            {/* Statistik Catatan */}
            {pastAttempt && (
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-2 font-mono">
                {pastAttempt.timeSeconds !== null && (
                  <span>Waktu: <strong>{pastAttempt.timeSeconds}s</strong></span>
                )}
                <span>Langkah: <strong>{pastAttempt.movesCount} swap</strong></span>
                <span>Poin: <strong className="text-accent">+{pastAttempt.score} Pts</strong></span>
              </div>
            )}

            <div className="pt-2">
              <Link href="/peserta/challenge">
                <Button size="lg" className="text-xs gap-1.5 cursor-pointer shadow-xs">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Kembali ke Daftar Challenge</span>
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* ============================================================= */}
        {/* KONDISI 4: READY (LOBBY SIAP BERMAIN) */}
        {/* ============================================================= */}
        {phase === "ready" && puzzle && (
          <Card className="p-6 sm:p-8 space-y-6 border-border">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-2xl overflow-hidden shrink-0 border-2 border-accent/40 shadow-lg bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={puzzle.imageUrl}
                  alt={puzzle.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/70 text-accent">
                  {puzzle.piecesCount} Keping
                </div>
              </div>

              <div className="space-y-4 text-center sm:text-left flex-1">
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
                    Target Mahakarya
                  </span>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                    {puzzle.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {puzzle.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      Jumlah Keping
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {puzzle.piecesCount} Keping ({gridSize}x{gridSize})
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      Poin Reward
                    </span>
                    <span className="text-sm font-bold font-mono text-accent">
                      +{puzzle.pointsReward} Poin
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-card/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      Batas Waktu
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {puzzle.timeLimitSeconds > 0 ? `${puzzle.timeLimitSeconds}s` : "Santai (∞)"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={handleStartGame}
                    className="text-xs font-semibold gap-2 w-full sm:w-auto min-w-[200px] cursor-pointer shadow-md"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Mulai Menyusun Sekarang!</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ============================================================= */}
        {/* KONDISI 5: ARENA BERMAIN (PLAYING / COMPLETED) */}
        {/* ============================================================= */}
        {(phase === "playing" || phase === "completed") && puzzle && (
          <div className="space-y-4">
            {/* HUD Status Bar (Timer, Moves, Poin, Intip Gambar) */}
            <Card className="p-3.5 sm:p-4 border-border bg-card/80 backdrop-blur-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Timer */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      {puzzle.timeLimitSeconds > 0 ? "Sisa Waktu" : "Waktu"}
                    </span>
                    <span
                      className={`font-mono text-base font-bold ${
                        puzzle.timeLimitSeconds > 0 && timeRemaining <= 15
                          ? "text-destructive animate-pulse"
                          : "text-foreground"
                      }`}
                    >
                      {puzzle.timeLimitSeconds > 0 ? `${timeRemaining}s` : `${timeElapsed}s`}
                    </span>
                  </div>
                </div>

                {/* Langkah Pertukaran */}
                <div className="flex items-center gap-2 border-l border-border pl-4 sm:pl-6">
                  <RotateCcw className="h-4 w-4 text-accent" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      Langkah Swap
                    </span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {movesCount}
                    </span>
                  </div>
                </div>

                {/* Kepingan Tepat */}
                <div className="hidden sm:flex items-center gap-2 border-l border-border pl-6">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      Keping Tepat
                    </span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {board.filter((t, i) => t === i).length} / {puzzle.piecesCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Intip Gambar & Acak Ulang */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPeekImage(!peekImage)}
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                  title="Lihat gambar utuh sebagai contekan"
                >
                  {peekImage ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">
                    {peekImage ? "Sembunyikan Gambar" : "Intip Gambar Asli"}
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGame}
                  className="text-xs h-8 px-2.5 cursor-pointer"
                  title="Acak ulang kepingan"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>

            {/* Container Arena Grid Puzzle */}
            <div className="flex flex-col items-center justify-center py-2">
              {/* Petunjuk Interaksi */}
              <p className="text-xs text-muted-foreground text-center mb-3">
                {selectedSlot === null ? (
                  <>
                    Sentuh/Klik kepingan pertama yang ingin Anda pindahkan (bingkai akan menyala kuning).
                  </>
                ) : (
                  <span className="text-accent font-semibold animate-pulse">
                    Sekarang klik kepingan tujuan untuk menukar posisi!
                  </span>
                )}
              </p>

              {/* Grid Puzzle */}
              <div
                className="relative aspect-square w-full max-w-[420px] sm:max-w-[460px] rounded-2xl overflow-hidden border-4 border-border bg-black/60 shadow-2xl p-1 gap-1 select-none grid transition-all"
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                }}
              >
                {/* Peek Image Overlay */}
                {peekImage && (
                  <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-4 animate-in fade-in-50">
                    <div className="relative aspect-square w-full max-h-[90%] rounded-xl overflow-hidden border border-accent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={puzzle.imageUrl}
                        alt="Contekan Gambar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] text-accent font-mono mt-2">
                      (Klik tombol &quot;Sembunyikan Gambar&quot; untuk melanjutkan bermain)
                    </span>
                  </div>
                )}

                {/* Kepingan-Kepingan Puzzle */}
                {board.map((tileId, slotIndex) => {
                  const isSelected = selectedSlot === slotIndex;
                  const isCorrect = tileId === slotIndex;
                  const tileStyle = getTileStyle(tileId, gridSize);

                  return (
                    <button
                      key={slotIndex}
                      type="button"
                      onClick={() => handleTileClick(slotIndex)}
                      className={`relative w-full h-full rounded-lg overflow-hidden cursor-pointer transition-all duration-150 transform ${
                        isSelected
                          ? "ring-4 ring-accent scale-95 shadow-xl z-20 brightness-110"
                          : isCorrect
                          ? "ring-1 ring-emerald-500/40 hover:scale-[1.02] hover:ring-2 hover:ring-accent"
                          : "ring-1 ring-black/40 hover:scale-[1.02] hover:ring-2 hover:ring-accent"
                      }`}
                      style={tileStyle}
                    >
                      {/* Badge status tepat di sudut */}
                      {isCorrect && (
                        <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-black shadow-xs">
                          ✓
                        </span>
                      )}

                      {/* Nomor slot kepingan halus di sudut kiri bawah */}
                      <span className="absolute bottom-1 left-1 px-1 rounded text-[9px] font-mono font-bold bg-black/60 text-white/70">
                        #{slotIndex + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MODAL PANDUAN CARA BERMAIN */}
        {/* ============================================================= */}
        <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-accent" />
              <span>Cara Bermain Game Kepingan Puzzle</span>
            </DialogTitle>
            <DialogDescription>
              Ikuti aturan sederhana berikut untuk menyusun mahakarya budaya dan mengklaim poin reward:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs text-foreground py-2 leading-relaxed">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card/60">
              <span className="h-6 w-6 rounded-full bg-accent text-black font-bold font-mono flex items-center justify-center shrink-0">
                1
              </span>
              <div>
                <strong>Pilih Kepingan Pertama:</strong> Sentuh atau klik salah satu kepingan di arena grid. Kepingan tersebut akan menyala dengan bingkai kuning.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card/60">
              <span className="h-6 w-6 rounded-full bg-accent text-black font-bold font-mono flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <strong>Tukar Posisi (Tap-to-Swap):</strong> Sentuh kepingan kedua di tempat yang ingin Anda tuju. Kedua kepingan akan langsung bertukar tempat!
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card/60">
              <span className="h-6 w-6 rounded-full bg-accent text-black font-bold font-mono flex items-center justify-center shrink-0">
                3
              </span>
              <div>
                <strong>Indikator Kepingan Tepat:</strong> Kepingan yang sudah berada di posisi yang benar akan menampilkan tanda centang hijau kecil (✓) di sudutnya.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card/60">
              <span className="h-6 w-6 rounded-full bg-accent text-black font-bold font-mono flex items-center justify-center shrink-0">
                4
              </span>
              <div>
                <strong>Menyelesaikan & Klaim Poin:</strong> Begitu seluruh kepingan terpasang sempurna, sistem akan otomatis mencatat penyelesaian dan menambahkan <strong>+{puzzle?.pointsReward || 100} Poin</strong> ke saldo Anda!
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowGuideModal(false)}
              className="text-xs w-full sm:w-auto cursor-pointer"
            >
              Saya Mengerti, Mulai Main
            </Button>
          </DialogFooter>
        </Dialog>

        {/* ============================================================= */}
        {/* MODAL KEMENANGAN (VICTORY POPUP) */}
        {/* ============================================================= */}
        <Dialog open={showVictoryModal} onOpenChange={setShowVictoryModal}>
          <DialogHeader className="text-center sm:text-center">
            <div className="h-16 w-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Trophy className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-center">
              Selamat! Puzzle Berhasil Disusun!
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Mahakarya budaya berhasil Anda rangkai kembali secara sempurna.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Gambar Utuh Selesai */}
            <div className="relative aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-accent shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={puzzle?.imageUrl}
                alt="Gambar Selesai"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Poin Box */}
            <div className="p-4 rounded-xl border border-accent/40 bg-accent/10 text-center space-y-1">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">
                Reward Poin Berhasil Ditambahkan
              </span>
              <div className="text-3xl font-black font-mono text-accent">
                +{pointsEarned || puzzle?.pointsReward || 100} Poin
              </div>
            </div>

            {/* Statistik */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[10px] text-muted-foreground block font-mono">Waktu</span>
                <span className="font-bold font-mono text-foreground">{timeElapsed} Detik</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[10px] text-muted-foreground block font-mono">Gerakan Swap</span>
                <span className="font-bold font-mono text-foreground">{movesCount} Langkah</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Link href="/peserta/riwayat-poin" className="w-full sm:w-1/2">
              <Button variant="outline" className="w-full text-xs cursor-pointer">
                Lihat Buku Riwayat Poin
              </Button>
            </Link>
            <Link href="/peserta/challenge" className="w-full sm:w-1/2">
              <Button className="w-full text-xs cursor-pointer">
                Kembali ke Menu Challenge
              </Button>
            </Link>
          </DialogFooter>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
