"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  ArrowLeft,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Camera,
  MapPin,
  Send,
  HelpCircle,
  Delete,
  Shuffle,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import {
  getActiveQrChallenge,
  getParticipantCollectedLetters,
  scanQrLetterToken,
  submitWordArrangement,
  getMyQrSubmissions,
  type CollectedLetter,
} from "@/app/actions/qr-huruf";
import { cn } from "@/lib/utils";

interface ActiveChallengeState {
  id: string;
  title: string;
  description: string | null;
  pointsReward: number;
  totalLetters: number;
  wordLengths: number[];
}

export default function PesertaQrHurufPage() {
  const { participant, refetch: refetchParticipant } = useCurrentParticipant();
  const [loading, setLoading] = React.useState(true);

  // Challenge data
  const [challenge, setChallenge] = React.useState<ActiveChallengeState | null>(null);
  const [collectedLetters, setCollectedLetters] = React.useState<CollectedLetter[]>([]);
  const [submissionsHistory, setSubmissionsHistory] = React.useState<
    Array<{
      id: string;
      submittedPhrase: string;
      isCorrect: boolean;
      score: number;
      timeSeconds: number | null;
      submittedAt: string;
    }>
  >([]);

  // Scan input state
  const [inputToken, setInputToken] = React.useState("");
  const [scanning, setScanning] = React.useState(false);
  const [scanFeedback, setScanFeedback] = React.useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // Live Camera Modal Scanner State
  const [cameraModalOpen, setCameraModalOpen] = React.useState(false);
  const [cameraStatus, setCameraStatus] = React.useState<"idle" | "requesting" | "active" | "denied" | "error">("idle");
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [cameraErrorMsg, setCameraErrorMsg] = React.useState("");
  
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Construction board state
  // letters placed into the formed sentence
  const [placedTokens, setPlacedTokens] = React.useState<
    Array<{ scanId: string; letter: string }>
  >([]);

  // Submit state
  const [submitting, setSubmitting] = React.useState(false);
  const [submitResult, setSubmitResult] = React.useState<{
    isCorrect: boolean;
    pointsAwarded?: number;
    message: string;
  } | null>(null);

  // Timer
  const [timer, setTimer] = React.useState(0);
  const [timerRunning, setTimerRunning] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const pId = participant?.participantRowId || participant?.id || "11111111-1111-1111-1111-111111111111";

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [chalRes, lettersRes, subsRes] = await Promise.all([
        getActiveQrChallenge(),
        getParticipantCollectedLetters(pId),
        getMyQrSubmissions(pId),
      ]);

      if (chalRes.success && chalRes.challenge) {
        setChallenge(chalRes.challenge);
      }
      if (lettersRes.success) {
        setCollectedLetters(lettersRes.letters);
        if (lettersRes.letters.length > 0) {
          setTimerRunning(true);
        }
      }
      if (subsRes.success) {
        setSubmissionsHistory(subsRes.submissions);
      }
    } finally {
      setLoading(false);
    }
  }, [pId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Scan / Manual Token Input
  const handleScanSubmit = async (tokenToScan?: string) => {
    const rawToken = tokenToScan || inputToken;
    const cleanToken = rawToken.trim().toUpperCase();
    if (!cleanToken) return;

    setScanning(true);
    setScanFeedback(null);

    try {
      const res = await scanQrLetterToken({
        participantId: pId,
        qrToken: cleanToken,
      });

      if (res.success) {
        if (res.alreadyScanned) {
          setScanFeedback({
            type: "info",
            message: `Huruf "${res.letter}" di ${res.locationHint || "lokasi ini"} sudah pernah Anda scan sebelumnya!`,
          });
        } else {
          setScanFeedback({
            type: "success",
            message: `🎉 Berhasil! Anda menemukan huruf "${res.letter}" di ${res.locationHint || "lokasi rahasia"}! (${res.totalCollected}/${res.totalNeeded} terkumpul)`,
          });
          if (!timerRunning) setTimerRunning(true);
        }
        setInputToken("");
        await loadData();
      } else {
        setScanFeedback({
          type: "error",
          message: res.error || "Kode QR tidak valid atau tidak terdaftar.",
        });
      }
    } finally {
      setScanning(false);
    }
  };

  // Letters available in inventory (not yet placed into sentence)
  const placedScanIds = new Set(placedTokens.map((p) => p.scanId));
  const availableLetters = collectedLetters.filter((l) => !placedScanIds.has(l.scanId));

  // Word building actions
  const handlePickLetter = (item: CollectedLetter) => {
    setPlacedTokens((prev) => [...prev, { scanId: item.scanId, letter: item.letter }]);
  };

  const handleRemovePlaced = (index: number) => {
    setPlacedTokens((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSpace = () => {
    setPlacedTokens((prev) => [
      ...prev,
      { scanId: `space-${Date.now()}-${Math.random()}`, letter: " " },
    ]);
  };

  const handleClearPlaced = () => {
    setPlacedTokens([]);
  };

  const handleBackspace = () => {
    setPlacedTokens((prev) => prev.slice(0, -1));
  };

  // Formed sentence string
  const formedSentence = placedTokens.map((p) => p.letter).join("");

  // Submit word arrangement
  const handleSubmitPhrase = async () => {
    if (!challenge) return;
    if (!formedSentence.trim()) {
      alert("Susun huruf terlebih dahulu menjadi kata atau kalimat!");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await submitWordArrangement({
        participantId: pId,
        challengeId: challenge.id,
        submittedPhrase: formedSentence,
        timeSeconds: timer,
      });

      if (res.success) {
        setSubmitResult({
          isCorrect: !!res.isCorrect,
          pointsAwarded: res.pointsAwarded,
          message: res.message || "",
        });

        if (res.isCorrect) {
          setTimerRunning(false);
          refetchParticipant();
        }

        await loadData();
      } else {
        alert(res.error || "Gagal mengirimkan susunan kalimat.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isCompleted = submissionsHistory.some((s) => s.isCorrect);

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Header */}
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
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px] font-bold">
                  CHALLENGE QR EXPLORER
                </Badge>
                {challenge && (
                  <Badge variant="info" className="text-[10px]">
                    +{challenge.pointsReward} POIN REWARD
                  </Badge>
                )}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <QrCode className="h-7 w-7 text-primary" />
                <span>{challenge?.title || "Jelajah Aksara QR Huruf"}</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {challenge?.description ||
                  "Cari stiker QR code yang tersebar di lokasi acara, kumpulkan semua huruf, lalu susun menjadi kalimat bermakna!"}
              </p>
            </div>

            {/* Timer & Progress Tracker */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-xl shadow-xs">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono text-sm font-bold text-foreground">
                  {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs font-bold text-primary">
                  {collectedLetters.length} / {challenge?.totalLetters || "?"} Huruf
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COMPLETED BANNER (If solved) */}
        {isCompleted && (
          <Card className="p-5 border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 via-card to-card space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-full">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">
                  Misi Tantangan QR Huruf Telah Selesai! 🎉
                </h3>
                <p className="text-xs text-muted-foreground">
                  Anda telah berhasil memecahkan teka-teki kata dan mendapatkan poin reward penuh!
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* SECTION 1: SCANNER & INPUT QR TOKEN */}
        <Card className="p-5 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">
                Klaim QR Huruf dari Lokasi
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Masukkan token pada stiker QR atau scan langsung
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScanSubmit();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Contoh kode stiker: QR-HURUF-B-01"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="w-full h-11 pl-9 pr-3 rounded-lg border border-border bg-background text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/40 uppercase"
              />
            </div>
            <Button
              type="submit"
              disabled={scanning || !inputToken.trim()}
              className="h-11 px-5 font-bold gap-2 cursor-pointer bg-primary text-primary-foreground shrink-0"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Mengecek...</span>
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4" />
                  <span>Klaim Huruf</span>
                </>
              )}
            </Button>
          </form>

          {/* Feedback Alert */}
          {scanFeedback && (
            <div
              className={cn(
                "p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200",
                scanFeedback.type === "success" &&
                  "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold",
                scanFeedback.type === "info" &&
                  "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400",
                scanFeedback.type === "error" &&
                  "bg-destructive/10 border-destructive/30 text-destructive font-medium"
              )}
            >
              {scanFeedback.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {scanFeedback.type === "info" && <HelpCircle className="h-4 w-4 shrink-0" />}
              {scanFeedback.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{scanFeedback.message}</span>
            </div>
          )}
        </Card>

        {/* SECTION 2: LETTER INVENTORY (HURUF YANG TERKUMPUL) */}
        <Card className="p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <span>Inventaris Huruf Anda</span>
                <Badge variant="default" className="text-[10px]">
                  {collectedLetters.length} Terkumpul
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground">
                Klik huruf untuk memasukkannya ke papan penyusun kalimat di bawah.
              </p>
            </div>
            {challenge?.wordLengths && (
              <span className="text-[11px] font-mono text-muted-foreground">
                Pola Kata Target: {challenge.wordLengths.join(" + ")} Huruf
              </span>
            )}
          </div>

          {collectedLetters.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-border rounded-xl space-y-2">
              <QrCode className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Anda belum mengumpulkan huruf satupun. Jelajahi area pameran, temukan stiker QR, lalu klaim kodenya di atas!
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {availableLetters.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  Semua huruf yang Anda kumpulkan telah diletakkan di papan susunan di bawah.
                </p>
              ) : (
                availableLetters.map((item) => (
                  <button
                    key={item.scanId}
                    onClick={() => handlePickLetter(item)}
                    className="group relative flex flex-col items-center justify-center w-12 h-14 rounded-xl border-2 border-primary/30 bg-card hover:bg-primary/10 hover:border-primary transition-all shadow-xs cursor-pointer active:scale-95"
                    title={`Ditemukan di: ${item.locationHint || "Area Acara"}`}
                  >
                    <span className="font-mono text-xl font-black text-foreground group-hover:text-primary">
                      {item.letter}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground flex items-center gap-0.5 line-clamp-1 px-1">
                      <MapPin className="h-2 w-2" />
                      #{item.letterIndex}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </Card>

        {/* SECTION 3: WORD ARRANGEMENT BOARD (MEJA PENYUSUN KALIMAT) */}
        <Card className="p-6 border-2 border-border bg-gradient-to-b from-card to-muted/20 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Papan Penyusun Kalimat</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Susun huruf hingga membentuk kalimat bermakna yang tepat.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                onClick={handleAddSpace}
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1"
                title="Tambahkan spasi antar kata"
              >
                <span>[ SPASI ]</span>
              </Button>
              <Button
                type="button"
                onClick={handleBackspace}
                size="sm"
                variant="outline"
                disabled={placedTokens.length === 0}
                className="text-xs h-8 gap-1"
                title="Hapus huruf terakhir"
              >
                <Delete className="h-3.5 w-3.5" />
                <span>Hapus</span>
              </Button>
              <Button
                type="button"
                onClick={handleClearPlaced}
                size="sm"
                variant="ghost"
                disabled={placedTokens.length === 0}
                className="text-xs h-8 gap-1 text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* Letter Slots */}
          <div className="min-h-24 p-4 rounded-xl border-2 border-dashed border-primary/20 bg-background/50 flex flex-wrap items-center gap-2">
            {placedTokens.length === 0 ? (
              <div className="w-full text-center py-4 text-xs text-muted-foreground">
                Klik huruf dari inventaris di atas untuk mulai menyusun kata di sini...
              </div>
            ) : (
              placedTokens.map((p, idx) => {
                if (p.letter === " ") {
                  return (
                    <button
                      key={p.scanId}
                      onClick={() => handleRemovePlaced(idx)}
                      className="w-8 h-12 rounded-lg border border-dashed border-border bg-muted/40 hover:bg-destructive/20 hover:border-destructive text-[9px] font-mono text-muted-foreground flex items-center justify-center transition-colors cursor-pointer"
                      title="Klik untuk menghapus spasi"
                    >
                      ␣
                    </button>
                  );
                }

                return (
                  <button
                    key={p.scanId}
                    onClick={() => handleRemovePlaced(idx)}
                    className="w-12 h-14 rounded-xl border-2 border-primary bg-primary/10 hover:bg-destructive/20 hover:border-destructive text-primary hover:text-destructive font-mono text-2xl font-black flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 group relative"
                    title="Klik untuk kembalikan huruf ke inventaris"
                  >
                    <span>{p.letter}</span>
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-white rounded-full text-[9px] hidden group-hover:flex items-center justify-center">
                      ×
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Formed Phrase Preview & Submit Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Tebakan Kalimat Anda:
              </span>
              <p className="font-mono text-xl font-black text-foreground tracking-widest">
                {formedSentence || "(Kosong)"}
              </p>
            </div>

            <Button
              onClick={handleSubmitPhrase}
              disabled={submitting || !formedSentence.trim()}
              size="lg"
              className="gap-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memeriksa Jawaban...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Susunan Kata</span>
                </>
              )}
            </Button>
          </div>

          {/* Submit Result Banner */}
          {submitResult && (
            <div
              className={cn(
                "p-4 rounded-xl border text-sm flex items-start gap-3 animate-in fade-in duration-200",
                submitResult.isCorrect
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/10 border-destructive/40 text-destructive"
              )}
            >
              {submitResult.isCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{submitResult.message}</p>
                {submitResult.isCorrect && (
                  <p className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{submitResult.pointsAwarded} Poin berhasil ditambahkan ke profil Anda!
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* SECTION 4: SUBMISSION HISTORY */}
        {submissionsHistory.length > 0 && (
          <Card className="p-5 space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Riwayat Pengiriman Anda</span>
            </h3>
            <div className="space-y-2">
              {submissionsHistory.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-sm text-foreground">
                      "{sub.submittedPhrase}"
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {new Date(sub.submittedAt).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.isCorrect ? (
                      <Badge variant="success" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        BENAR (+{sub.score} Poin)
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="gap-1 text-[10px]">
                        <XCircle className="h-3 w-3" />
                        SALAH
                      </Badge>
                    )}
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
