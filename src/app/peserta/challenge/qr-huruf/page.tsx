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
import jsQR from "jsqr";

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
  
  // Real-time in-modal feedback
  const [modalFeedback, setModalFeedback] = React.useState<{
    status: "scanning" | "processing" | "success" | "info" | "error";
    letter?: string;
    message: string;
  }>({ status: "scanning", message: "Arahkan kamera ke stiker QR" });

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const barcodeDetectorRef = React.useRef<any>(null);
  const isProcessingFrameRef = React.useRef<boolean>(false);
  const lastScanTimestampRef = React.useRef<number>(0);

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

  // Sound and haptic feedback
  const triggerScanFeedback = React.useCallback(() => {
    if (typeof window !== "undefined") {
      if (navigator.vibrate) {
        try {
          navigator.vibrate([70, 40, 70]);
        } catch {}
      }
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }
      } catch {}
    }
  }, []);

  // Helper to extract clean token from any scanned payload format (JSON, URL, plain token)
  const extractToken = React.useCallback((raw: string): string => {
    let val = raw.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).trim();
    }
    // If JSON payload (from QRLetterCard)
    if (val.startsWith("{") && val.endsWith("}")) {
      try {
        const parsed = JSON.parse(val);
        if (parsed.token) return String(parsed.token).trim();
        if (parsed.qrToken) return String(parsed.qrToken).trim();
        if (parsed.code) return String(parsed.code).trim();
        if (parsed.letter) return String(parsed.letter).trim();
      } catch {}
    }
    // If URL payload
    if (val.includes("http://") || val.includes("https://") || val.includes("HTTP://") || val.includes("HTTPS://")) {
      try {
        const url = new URL(val);
        const codeParam = url.searchParams.get("token") || url.searchParams.get("code") || url.searchParams.get("letter");
        if (codeParam) return codeParam.trim();
      } catch {}
    }
    return val.toUpperCase();
  }, []);

  // Stop Live Camera
  const stopCamera = React.useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("idle");
    isProcessingFrameRef.current = false;
  }, []);

  // Start Live Camera
  const startCamera = React.useCallback(async () => {
    stopCamera();
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      setCameraErrorMsg("Browser tidak mendukung akses kamera langsung.");
      return;
    }

    setCameraStatus("requesting");
    setCameraErrorMsg("");
    setModalFeedback({ status: "scanning", message: "Membuka kamera..." });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus("active");
      setModalFeedback({ status: "scanning", message: "Arahkan kamera ke stiker QR" });
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraErrorMsg("Izin kamera ditolak. Silakan izinkan akses kamera di setelan browser HP Anda.");
      } else {
        setCameraStatus("error");
        setCameraErrorMsg(err.message || "Gagal membuka kamera perangkat.");
      }
    }
  }, [facingMode, stopCamera]);

  // Keep video element attached to stream whenever modal is open
  React.useEffect(() => {
    if (cameraModalOpen && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraModalOpen, cameraStatus]);

  // Initialize BarcodeDetector once if available
  React.useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window && !barcodeDetectorRef.current) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {}
    }
  }, []);

  const openCameraModal = () => {
    setModalFeedback({ status: "scanning", message: "Arahkan kamera ke stiker QR" });
    setCameraModalOpen(true);
    startCamera();
  };

  const closeCameraModal = React.useCallback(() => {
    stopCamera();
    setCameraModalOpen(false);
    setModalFeedback({ status: "scanning", message: "Arahkan kamera ke stiker QR" });
  }, [stopCamera]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Auto-Scan Handler (Instant detection without pressing buttons)
  const handleAutoScan = React.useCallback(
    async (rawCode: string) => {
      const cleanToken = extractToken(rawCode);
      if (!cleanToken) return;

      // Trigger instant beep & haptic feedback
      triggerScanFeedback();

      // Visual feedback in modal: DETECTED!
      setModalFeedback({
        status: "processing",
        message: "QR Terdeteksi! Memverifikasi token...",
      });

      try {
        const res = await scanQrLetterToken({
          participantId: pId,
          qrToken: cleanToken,
        });

        if (res.success) {
          if (res.alreadyScanned) {
            setModalFeedback({
              status: "info",
              letter: res.letter,
              message: `Huruf "${res.letter}" di ${res.locationHint || "lokasi ini"} sudah pernah Anda scan sebelumnya!`,
            });
            setScanFeedback({
              type: "info",
              message: `Huruf "${res.letter}" di ${res.locationHint || "lokasi ini"} sudah pernah Anda scan sebelumnya!`,
            });
            setTimeout(() => {
              closeCameraModal();
            }, 1800);
          } else {
            setModalFeedback({
              status: "success",
              letter: res.letter,
              message: `🎉 Berhasil! Menemukan huruf "${res.letter}" di ${res.locationHint || "lokasi rahasia"}!`,
            });
            setScanFeedback({
              type: "success",
              message: `🎉 Berhasil! Anda menemukan huruf "${res.letter}" di ${res.locationHint || "lokasi rahasia"}! (${res.totalCollected}/${res.totalNeeded} terkumpul)`,
            });
            if (!timerRunning) setTimerRunning(true);
            await loadData();
            setTimeout(() => {
              closeCameraModal();
            }, 1300);
          }
        } else {
          setModalFeedback({
            status: "error",
            message: res.error || "Kode QR tidak valid atau tidak terdaftar.",
          });
          setScanFeedback({
            type: "error",
            message: res.error || "Kode QR tidak valid atau tidak terdaftar.",
          });
          // Auto resume scanning after 2 seconds
          setTimeout(() => {
            setModalFeedback({
              status: "scanning",
              message: "Arahkan kamera ke stiker QR",
            });
            isProcessingFrameRef.current = false;
          }, 2000);
        }
      } catch {
        setModalFeedback({
          status: "error",
          message: "Gagal memproses pemindaian.",
        });
        setTimeout(() => {
          setModalFeedback({
            status: "scanning",
            message: "Arahkan kamera ke stiker QR",
          });
          isProcessingFrameRef.current = false;
        }, 2000);
      }
    },
    [pId, timerRunning, loadData, closeCameraModal, extractToken, triggerScanFeedback]
  );

  // Continuous High-Performance Scanner Loop (Native BarcodeDetector + jsQR Fallback)
  React.useEffect(() => {
    if (!cameraModalOpen || cameraStatus !== "active") return;

    let isScanningActive = true;

    const detectFrame = async (timestamp: number) => {
      if (!isScanningActive || !videoRef.current) return;
      const videoEl = videoRef.current;

      // Throttle scanning to every 100ms and avoid concurrent frame decoding
      if (
        !isProcessingFrameRef.current &&
        timestamp - lastScanTimestampRef.current >= 100 &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0
      ) {
        lastScanTimestampRef.current = timestamp;
        isProcessingFrameRef.current = true;

        try {
          let detectedValue: string | null = null;

          // Engine 1: Native BarcodeDetector (Chrome / Chromium Android / Edge)
          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(videoEl);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedValue = barcodes[0].rawValue;
              }
            } catch {}
          }

          // Engine 2: High-Speed Canvas jsQR Fallback (iOS Safari / Firefox / older Android)
          if (!detectedValue) {
            try {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement("canvas");
              }
              const canvas = canvasRef.current;
              // Downscale to max 480px for lightning-fast JS decode (10-20ms)
              const maxDim = 480;
              const scale = Math.min(1, maxDim / Math.max(videoEl.videoWidth, videoEl.videoHeight));
              const w = Math.round(videoEl.videoWidth * scale);
              const h = Math.round(videoEl.videoHeight * scale);

              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
              }

              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(videoEl, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                const code = jsQR(imageData.data, w, h, {
                  inversionAttempts: "dontInvert",
                });
                if (code && code.data) {
                  detectedValue = code.data;
                }
              }
            } catch {}
          }

          if (detectedValue && isScanningActive) {
            isScanningActive = false; // Stop further frame capture
            await handleAutoScan(detectedValue);
            return;
          }
        } finally {
          isProcessingFrameRef.current = false;
        }
      }

      if (isScanningActive) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isScanningActive = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraModalOpen, cameraStatus, handleAutoScan]);

  // Handle Manual Token Input
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = extractToken(inputToken);
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-foreground">
                Klaim QR Huruf dari Lokasi Pameran
              </h2>
            </div>
            <Button
              type="button"
              onClick={openCameraModal}
              className="text-xs h-9 px-4 gap-2 font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm shrink-0"
            >
              <Camera className="h-4 w-4" />
              <span>Buka Kamera Pemindai HP</span>
            </Button>
          </div>

          <form
            onSubmit={handleManualSubmit}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Atau ketik manual token stiker (contoh: GBB-LET-A1)"
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

        {/* MODAL POPUP KAMERA PEMINDAI LANGSUNG */}
        {cameraModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-amber-500" />
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Memindai QR Stiker Huruf
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  {cameraStatus === "active" && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded bg-muted/60"
                      title="Ganti Kamera Depan/Belakang"
                    >
                      🔄 Putar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCameraModal}
                    className="text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-1"
                  >
                    ✕ Tutup
                  </button>
                </div>
              </div>

              {/* Viewfinder Box */}
              <div className="relative aspect-square rounded-xl bg-black overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                  className={`w-full h-full object-cover ${cameraStatus === "active" ? "block" : "hidden"}`}
                />

                {/* Status Overlays */}
                {cameraStatus === "active" && (
                  <>
                    {/* Viewfinder Target Border */}
                    <div
                      className={cn(
                        "absolute inset-6 border-2 rounded-lg pointer-events-none flex flex-col justify-between p-2 transition-colors duration-200",
                        modalFeedback.status === "scanning" && "border-amber-400",
                        modalFeedback.status === "processing" && "border-emerald-400 bg-emerald-500/10",
                        modalFeedback.status === "success" && "border-emerald-500 bg-emerald-500/20",
                        modalFeedback.status === "info" && "border-blue-400 bg-blue-500/20",
                        modalFeedback.status === "error" && "border-rose-500 bg-rose-500/20"
                      )}
                    >
                      <div className="flex justify-between">
                        <span className={cn("h-4 w-4 border-t-2 border-l-2", modalFeedback.status === "scanning" ? "border-amber-400" : modalFeedback.status === "error" ? "border-rose-500" : "border-emerald-400")} />
                        <span className={cn("h-4 w-4 border-t-2 border-r-2", modalFeedback.status === "scanning" ? "border-amber-400" : modalFeedback.status === "error" ? "border-rose-500" : "border-emerald-400")} />
                      </div>

                      {/* Scanning Laser Line */}
                      {modalFeedback.status === "scanning" && (
                        <div className="w-full h-0.5 bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                      )}

                      {/* Processing / Success Banner in Center */}
                      {modalFeedback.status === "processing" && (
                        <div className="self-center flex items-center gap-1.5 px-3 py-1 bg-black/80 rounded-full text-emerald-400 text-xs font-semibold">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>QR Terdeteksi!</span>
                        </div>
                      )}

                      {modalFeedback.status === "success" && (
                        <div className="self-center text-center space-y-1">
                          <div className="h-14 w-14 mx-auto rounded-xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black font-mono shadow-lg animate-bounce">
                            {modalFeedback.letter}
                          </div>
                          <div className="text-[11px] font-bold text-white bg-emerald-600/90 px-2 py-0.5 rounded-full">
                            Terkumpul!
                          </div>
                        </div>
                      )}

                      {modalFeedback.status === "info" && (
                        <div className="self-center text-center space-y-1">
                          <div className="h-12 w-12 mx-auto rounded-xl bg-blue-500 text-white flex items-center justify-center text-xl font-bold font-mono shadow-lg">
                            {modalFeedback.letter}
                          </div>
                          <div className="text-[10px] font-bold text-white bg-blue-600/90 px-2 py-0.5 rounded-full">
                            Sudah Ada
                          </div>
                        </div>
                      )}

                      {modalFeedback.status === "error" && (
                        <div className="self-center text-center px-2 py-1 bg-rose-600/90 text-white text-xs font-bold rounded-lg">
                          Tidak Dikenali
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className={cn("h-4 w-4 border-b-2 border-l-2", modalFeedback.status === "scanning" ? "border-amber-400" : modalFeedback.status === "error" ? "border-rose-500" : "border-emerald-400")} />
                        <span className={cn("h-4 w-4 border-b-2 border-r-2", modalFeedback.status === "scanning" ? "border-amber-400" : modalFeedback.status === "error" ? "border-rose-500" : "border-emerald-400")} />
                      </div>
                    </div>
                  </>
                )}

                {cameraStatus === "requesting" && (
                  <div className="p-6 text-center space-y-2 text-white">
                    <Loader2 className="h-7 w-7 animate-spin text-amber-400 mx-auto" />
                    <p className="text-xs">Meminta izin kamera HP...</p>
                  </div>
                )}

                {(cameraStatus === "denied" || cameraStatus === "error") && (
                  <div className="p-6 text-center space-y-2 text-white bg-black/90">
                    <XCircle className="h-8 w-8 text-rose-500 mx-auto" />
                    <p className="text-xs font-semibold">Kamera Tidak Dapat Dibuka</p>
                    <p className="text-[10px] text-white/70">{cameraErrorMsg}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startCamera}
                      className="text-xs gap-1 border-white/30 text-white"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Coba Lagi</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Real-time Status Feedback Bar */}
              <div
                className={cn(
                  "p-2.5 rounded-xl text-center text-xs font-medium transition-all",
                  modalFeedback.status === "scanning" && "bg-muted text-muted-foreground",
                  modalFeedback.status === "processing" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold animate-pulse",
                  modalFeedback.status === "success" && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold",
                  modalFeedback.status === "info" && "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold",
                  modalFeedback.status === "error" && "bg-destructive/15 text-destructive font-semibold"
                )}
              >
                {modalFeedback.message}
              </div>

              <Button
                variant="outline"
                onClick={closeCameraModal}
                className="w-full text-xs"
              >
                Tutup & Gunakan Input Kode Manual
              </Button>
            </div>
          </div>
        )}

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
