"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  RotateCcw,
  Loader2,
  VideoOff,
  Gift,
  Trophy,
  Sparkles,
  Copy,
  Check,
  Clock,
  LogOut,
  MapPin,
  CheckCheck,
  Hourglass,
  QrCode,
  KeyRound,
  ShieldAlert,
} from "lucide-react";
import {
  getParticipantStandSession,
  checkInStandSession,
  checkOutStandSession,
  cancelStandSession,
  type StandViewerSession,
} from "@/app/actions/stand-rewards";
import { createClient } from "@/lib/supabase/client";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";

function PesertaScanContent() {
  const isDev = process.env.NODE_ENV === "development";
  const searchParams = useSearchParams();
  const urlCode = searchParams?.get("code") || searchParams?.get("stand") || searchParams?.get("token") || "";

  const { participant, refetch } = useCurrentParticipant();

  // Session & Stand Data
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [activeSession, setActiveSession] = React.useState<StandViewerSession | null>(null);
  const [standsCompletedCount, setStandsCompletedCount] = React.useState(0);
  const [totalActiveStands, setTotalActiveStands] = React.useState(0);
  const [activeStandsList, setActiveStandsList] = React.useState<
    Array<{
      id: string;
      name: string;
      code: string;
      location: string;
      isCompleted: boolean;
      checkoutCode: string;
    }>
  >([]);
  const [allCompleted, setAllCompleted] = React.useState(false);
  const [rewardConfig, setRewardConfig] = React.useState<{
    quota: number;
    rewardName: string;
    minDurationMinutes: number;
    validationMode: "both" | "qr" | "code";
  }>({
    quota: 50,
    rewardName: "Paket Merchandise Gebyar Bahasa",
    minDurationMinutes: 15,
    validationMode: "both",
  });
  const [remainingRewardQuota, setRemainingRewardQuota] = React.useState(50);
  const [existingRecipient, setExistingRecipient] = React.useState<any>(null);

  // Timer Realtime State
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [requiredSeconds, setRequiredSeconds] = React.useState(15 * 60);
  const [remainingSeconds, setRemainingSeconds] = React.useState(15 * 60);
  const [isDurationMet, setIsDurationMet] = React.useState(false);
  const [progressPercent, setProgressPercent] = React.useState(0);

  // Action & Form states
  const [manualCode, setManualCode] = React.useState("");
  const [checkoutCodeInput, setCheckoutCodeInput] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successInfo, setSuccessInfo] = React.useState<{
    type: "checkin" | "checkout";
    standName: string;
    message: string;
  } | null>(null);

  // Special Reward Result Banner
  const [specialRewardResult, setSpecialRewardResult] = React.useState<{
    alreadyProcessed?: boolean;
    qualified: boolean;
    granted: boolean;
    rank: number;
    quota: number;
    rewardName: string;
    pickupCode: string | null;
    message: string;
  } | null>(null);

  const [copiedPickupCode, setCopiedPickupCode] = React.useState(false);
  const [checkoutMode, setCheckoutMode] = React.useState<"qr" | "code">("qr");

  // Status komputasi penyelesaian seluruh stand
  const totalStandsTarget = totalActiveStands > 0 ? totalActiveStands : activeStandsList.length;
  const isAllStandsCompleted = Boolean(
    allCompleted || (totalStandsTarget > 0 && standsCompletedCount >= totalStandsTarget)
  );
  const showCompletionRewardBanner = Boolean(
    isAllStandsCompleted && ((specialRewardResult && specialRewardResult.qualified) || existingRecipient)
  );

  // Camera & QR Scanner States
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const barcodeDetectorRef = React.useRef<any>(null);
  const isProcessingFrameRef = React.useRef<boolean>(false);
  const lastScanTimestampRef = React.useRef<number>(0);

  const [cameraStatus, setCameraStatus] = React.useState<
    "idle" | "requesting" | "active" | "denied" | "error" | "unsupported"
  >("idle");
  const [cameraErrorDetail, setCameraErrorDetail] = React.useState("");
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);

  // Viewfinder live status
  const [scanStatus, setScanStatus] = React.useState<{
    status: "scanning" | "processing" | "success" | "info" | "error";
    message: string;
  }>({ status: "scanning", message: "Arahkan kamera ke stiker QR stand" });

  // Helper to retrieve active participant UUID
  const resolveParticipantId = React.useCallback(async (): Promise<string> => {
    if (participant?.id) return participant.id;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: part } = await supabase
          .from("participants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (part?.id) return part.id;
      }
    } catch {
      // Fallback
    }
    return "11111111-1111-1111-1111-111111111111";
  }, [participant?.id]);

  // Load Session Data from Server
  const loadSessionData = React.useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setSessionLoading(true);
        const participantId = await resolveParticipantId();
        const res = await getParticipantStandSession(participantId);

        if (res.success) {
          setActiveSession(res.activeSession);
          setStandsCompletedCount(res.standsCompletedCount);
          setTotalActiveStands(res.totalActiveStands);
          setActiveStandsList(res.activeStandsList || []);
          setAllCompleted(res.allCompleted);
          setRemainingRewardQuota(res.remainingQuota);
          setExistingRecipient(res.existingRecipient);

          const isFullyDone = Boolean(
            res.allCompleted ||
            (res.totalActiveStands > 0 && res.standsCompletedCount >= res.totalActiveStands)
          );
          if (!isFullyDone) {
            setSpecialRewardResult(null);
          }

          if (res.config) {
            setRewardConfig({
              quota: res.config.quota,
              rewardName: res.config.rewardName,
              minDurationMinutes: res.config.minDurationMinutes || 15,
              validationMode: res.config.validationMode || "both",
            });
          }

          if (res.sessionTiming) {
            setElapsedSeconds(res.sessionTiming.elapsedSeconds);
            setRequiredSeconds(res.sessionTiming.requiredSeconds);
            setRemainingSeconds(res.sessionTiming.remainingSeconds);
            setIsDurationMet(res.sessionTiming.isDurationMet);
            setProgressPercent(res.sessionTiming.progressPercent);
          } else {
            setIsDurationMet(false);
            setProgressPercent(0);
          }
        }
      } catch (err) {
        console.error("Gagal memuat sesi stand:", err);
      } finally {
        if (showLoading) setSessionLoading(false);
      }
    },
    [resolveParticipantId]
  );

  // Initial session load
  React.useEffect(() => {
    loadSessionData(true);
  }, [loadSessionData]);

  // Realtime Supabase Listener for Stand Updates
  React.useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const channel = supabase
      .channel("peserta-stand-channel")
      .on("broadcast", { event: "stand_updated" }, () => {
        if (isMounted) loadSessionData(false);
      })
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "event_settings" },
        () => {
          if (isMounted) loadSessionData(false);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [loadSessionData]);

  // Realtime 1-Second Tick for Active Watching Session
  React.useEffect(() => {
    if (!activeSession) return;

    const timer = setInterval(() => {
      const startedAtTime = new Date(activeSession.startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startedAtTime) / 1000));
      const required = (activeSession.minDurationMinutes || rewardConfig.minDurationMinutes || 15) * 60;
      const remaining = Math.max(0, required - elapsed);
      const met = elapsed >= required;
      const pct = Math.min(100, Math.floor((elapsed / required) * 100));

      setElapsedSeconds(elapsed);
      setRequiredSeconds(required);
      setRemainingSeconds(remaining);
      setIsDurationMet(met);
      setProgressPercent(pct);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSession, rewardConfig.minDurationMinutes]);

  // Sound and haptic feedback
  const triggerScanFeedback = React.useCallback(() => {
    if (typeof window !== "undefined") {
      if (navigator.vibrate) {
        try {
          navigator.vibrate([80, 50, 80]);
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

  // Process Scanned Code String
  const processCodeString = React.useCallback((rawText: string): string => {
    let clean = rawText.trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    // If it's a JSON string
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.checkoutCode) return String(parsed.checkoutCode).trim().toUpperCase();
        if (parsed.code) return String(parsed.code).trim().toUpperCase();
        if (parsed.token) return String(parsed.token).trim().toUpperCase();
        if (parsed.standCode) return String(parsed.standCode).trim().toUpperCase();
      } catch {}
    }
    // If it's a URL
    if (clean.includes("http://") || clean.includes("https://")) {
      try {
        const parsedUrl = new URL(clean);
        const codeParam =
          parsedUrl.searchParams.get("checkout") ||
          parsedUrl.searchParams.get("code") ||
          parsedUrl.searchParams.get("stand") ||
          parsedUrl.searchParams.get("token");
        if (codeParam) return codeParam.trim().toUpperCase();
      } catch {}
    }

    return clean.toUpperCase();
  }, []);

  // Helper format seconds to MM:SS
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Stop Camera Stream
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

  // Start Real Camera Stream
  const startCamera = React.useCallback(async () => {
    stopCamera();

    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraErrorDetail("Peramban web tidak mendukung akses kamera langsung.");
      return;
    }

    setCameraStatus("requesting");
    setCameraErrorDetail("");
    setScanStatus({ status: "scanning", message: "Membuka kamera..." });

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraStatus("active");
      setScanStatus({
        status: "scanning",
        message: activeSession
          ? "Arahkan kamera ke QR Checkout di dalam stand"
          : "Arahkan kamera ke QR Pintu Masuk Stand",
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraErrorDetail("Izin kamera ditolak. Izinkan akses kamera di peramban web.");
      } else {
        setCameraStatus("error");
        setCameraErrorDetail(err.message || "Gagal membuka kamera perangkat.");
      }
    }
  }, [facingMode, stopCamera, activeSession]);

  // Keep video attached
  React.useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraStatus]);

  // Initialize Native BarcodeDetector if available
  React.useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  const toggleFacingMode = React.useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const toggleTorch = React.useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const newTorch = !torchOn;
      (track as any)
        .applyConstraints({
          advanced: [{ torch: newTorch }],
        })
        .then(() => setTorchOn(newTorch))
        .catch(() => {});
    }
  }, [torchOn]);

  // Handle Check-in Action
  const handleCheckIn = React.useCallback(
    async (codeString: string) => {
      const cleanCode = processCodeString(codeString);
      if (!cleanCode) return;

      triggerScanFeedback();
      setActionLoading(true);
      setErrorMsg("");
      setScanStatus({
        status: "processing",
        message: "Memverifikasi QR Masuk Stand...",
      });

      try {
        const participantId = await resolveParticipantId();
        const res = await checkInStandSession({
          participantId,
          standInput: cleanCode,
        });

        if (res.success && res.session) {
          setSuccessInfo({
            type: "checkin",
            standName: res.session.standName,
            message: `Check-in berhasil! Sesi menonton ${res.session.minDurationMinutes} menit di ${res.session.standName} telah dimulai.`,
          });
          setScanStatus({
            status: "success",
            message: `✅ Check-in berhasil di ${res.session.standName}!`,
          });
          setManualCode("");
          await loadSessionData(false);
          refetch();
          stopCamera();
        } else {
          setScanStatus({
            status: "error",
            message: res.error || "Gagal melakukan check-in.",
          });
          setErrorMsg(res.error || "Gagal melakukan check-in.");
          setTimeout(() => {
            setScanStatus({
              status: "scanning",
              message: "Arahkan kamera ke stiker QR stand",
            });
            setLastScannedCode(null);
            isProcessingFrameRef.current = false;
          }, 2500);
        }
      } catch (err: any) {
        setScanStatus({
          status: "error",
          message: err.message || "Gagal melakukan check-in.",
        });
        setErrorMsg(err.message || "Gagal melakukan check-in.");
        setTimeout(() => {
          setScanStatus({
            status: "scanning",
            message: "Arahkan kamera ke stiker QR stand",
          });
          setLastScannedCode(null);
          isProcessingFrameRef.current = false;
        }, 2500);
      } finally {
        setActionLoading(false);
      }
    },
    [processCodeString, triggerScanFeedback, resolveParticipantId, loadSessionData, refetch, stopCamera]
  );

  // Handle Checkout Action
  const handleCheckOut = React.useCallback(
    async (validationCodeString: string) => {
      const cleanCode = processCodeString(validationCodeString);
      if (!cleanCode) return;

      triggerScanFeedback();
      setActionLoading(true);
      setErrorMsg("");
      setScanStatus({
        status: "processing",
        message: "Memvalidasi checkout di dalam stand...",
      });

      try {
        const participantId = await resolveParticipantId();
        const res = await checkOutStandSession({
          participantId,
          validationInput: cleanCode,
        });

        if (res.success) {
          const completedCount = res.standsCompletedCount ?? (standsCompletedCount + 1);
          const totalStands = res.totalActiveStands ?? totalActiveStands;
          const isFinishedAll = Boolean(res.allCompleted || (totalStands > 0 && completedCount >= totalStands));

          setSuccessInfo({
            type: "checkout",
            standName: res.standName || "Stand Lomba",
            message: isFinishedAll
              ? `🎉 Luar biasa! Stand ${res.standName} selesai dan Anda telah menuntaskan seluruh ${totalStands} stand pameran budaya!`
              : `Stand ${res.standName} selesai ditonton. Progres: ${completedCount}/${totalStands} stand diselesaikan. Silakan lanjutkan ke stand berikutnya!`,
          });
          setScanStatus({
            status: "success",
            message: isFinishedAll
              ? `🎉 Seluruh ${totalStands} Stand Selesai!`
              : `🎉 Stand ${res.standName} Selesai!`,
          });
          setCheckoutCodeInput("");

          if (isFinishedAll && res.specialReward?.qualified) {
            setSpecialRewardResult(res.specialReward);
          } else {
            setSpecialRewardResult(null);
          }

          await loadSessionData(false);
          refetch();
          stopCamera();
        } else {
          setScanStatus({
            status: "error",
            message: res.error || "Gagal validasi checkout.",
          });
          setErrorMsg(res.error || "Gagal validasi checkout.");
          setTimeout(() => {
            setScanStatus({
              status: "scanning",
              message: "Arahkan kamera ke QR Checkout di dalam stand",
            });
            setLastScannedCode(null);
            isProcessingFrameRef.current = false;
          }, 2500);
        }
      } catch (err: any) {
        setScanStatus({
          status: "error",
          message: err.message || "Gagal validasi checkout.",
        });
        setErrorMsg(err.message || "Gagal validasi checkout.");
        setTimeout(() => {
          setScanStatus({
            status: "scanning",
            message: "Arahkan kamera ke QR Checkout di dalam stand",
          });
          setLastScannedCode(null);
          isProcessingFrameRef.current = false;
        }, 2500);
      } finally {
        setActionLoading(false);
      }
    },
    [processCodeString, triggerScanFeedback, resolveParticipantId, loadSessionData, refetch, stopCamera]
  );

  // Handle Cancel Active Session
  const handleCancelSession = async () => {
    if (!activeSession) return;
    const confirmCancel = window.confirm(
      `Apakah Anda yakin ingin membatalkan sesi menonton di ${activeSession.standName}? Waktu menonton yang sudah berjalan akan direset.`
    );
    if (!confirmCancel) return;

    setActionLoading(true);
    setErrorMsg("");
    try {
      const participantId = await resolveParticipantId();
      const res = await cancelStandSession(participantId);
      if (res.success) {
        setSuccessInfo(null);
        await loadSessionData(false);
        startCamera();
      } else {
        setErrorMsg(res.error || "Gagal membatalkan sesi.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membatalkan sesi.");
    } finally {
      setActionLoading(false);
    }
  };

  // General Scan Processor (Checkin vs Checkout)
  const handleUniversalScan = React.useCallback(
    async (code: string) => {
      if (activeSession) {
        // Sedang menonton: apakah sudah memenuhi waktu?
        if (!isDurationMet) {
          setErrorMsg(
            `Durasi menonton minimal ${activeSession.minDurationMinutes} menit belum terpenuhi. Sisa waktu: ${formatSeconds(
              remainingSeconds
            )}. Harap tetap berada di dalam stand!`
          );
          return;
        }
        await handleCheckOut(code);
      } else {
        // Belum ada sesi: lakukan check-in
        await handleCheckIn(code);
      }
    },
    [activeSession, isDurationMet, remainingSeconds, handleCheckOut, handleCheckIn]
  );

  // Auto handle URL code parameter
  React.useEffect(() => {
    if (urlCode && urlCode !== lastScannedCode && !sessionLoading) {
      setLastScannedCode(urlCode);
      handleUniversalScan(urlCode);
    }
  }, [urlCode, lastScannedCode, sessionLoading, handleUniversalScan]);

  // Start Camera when appropriate
  React.useEffect(() => {
    // Jalankan kamera jika:
    // 1. Belum ada sesi aktif (mode scan check-in pintu masuk)
    // 2. ATAU sedang ada sesi aktif, durasi minimal sudah terpenuhi, dan mode checkout adalah "qr"
    const shouldCameraRun = !activeSession || (isDurationMet && checkoutMode === "qr");
    if (shouldCameraRun) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeSession, isDurationMet, checkoutMode, startCamera, stopCamera]);

  // QR Scanning Loop
  React.useEffect(() => {
    if (cameraStatus !== "active") return;

    let isScanningActive = true;

    const detectFrame = async (timestamp: number) => {
      if (!isScanningActive || !videoRef.current) return;
      const videoEl = videoRef.current;

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

          if (barcodeDetectorRef.current) {
            try {
              const barcodes = await barcodeDetectorRef.current.detect(videoEl);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedValue = barcodes[0].rawValue;
              }
            } catch {}
          }

          if (!detectedValue) {
            try {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement("canvas");
              }
              const canvas = canvasRef.current;
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

          if (detectedValue && isScanningActive && detectedValue !== lastScannedCode) {
            isScanningActive = false;
            setLastScannedCode(detectedValue);
            await handleUniversalScan(detectedValue);
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
  }, [cameraStatus, lastScannedCode, handleUniversalScan]);

  const handleCopyPickupCode = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(code);
      setCopiedPickupCode(true);
      setTimeout(() => setCopiedPickupCode(false), 2000);
    }
  };

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-xl mx-auto pb-10">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="space-y-1.5 text-center">
            <Badge variant="gold" className="text-xs">
              Misi Eksplorasi Budaya
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Challenge Keliling Stand Lomba
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Check-in di pintu masuk → Tonton lomba di dalam stand min. <strong>{rewardConfig.minDurationMinutes} menit</strong> →
              Validasi checkout di dalam stand → Tuntaskan seluruh stand untuk mendapatkan hadiah khusus!
            </p>
          </div>
        </div>

        {/* Info Banner Aturan Utama */}
        <div className="p-3 rounded-xl border border-border bg-card/60 flex items-start gap-2.5 text-xs text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-snug">
            <span className="font-semibold text-foreground block">
              Aturan Penting Challenge Stand:
            </span>
            <span>
              Menyelesaikan 1 stand <strong>tidak memberikan poin</strong>. Reward merchandise khusus hanya terbuka setelah Anda menuntaskan <strong>seluruh {totalStandsTarget > 0 ? `${totalStandsTarget} stand` : "stand"}</strong>.
            </span>
          </div>
        </div>

        {/* Stand Progress Bar Card */}
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-accent" />
              <span>Progres Stand Lomba:</span>
            </span>
            <span className="font-mono font-bold text-accent text-sm">
              {standsCompletedCount} / {totalActiveStands} Stand Selesai
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-accent h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (standsCompletedCount / Math.max(1, totalActiveStands)) * 100)}%`,
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5 gap-2">
            <span>
              {allCompleted
                ? "🎉 Seluruh stand aktif telah selesai Anda tonton!"
                : `Tuntaskan ${Math.max(0, totalActiveStands - standsCompletedCount)} stand lagi untuk membuka reward.`}
            </span>
            <span className="text-accent font-medium">
              Sisa Kuota Reward: {remainingRewardQuota} / {rewardConfig.quota}
            </span>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Pemberitahuan:</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Modal / Banner */}
        {successInfo && (
          <div className="p-5 rounded-2xl border border-success/40 bg-success/10 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <div className="space-y-1">
              <h3 className="font-heading text-base font-bold text-foreground">
                {successInfo.type === "checkin" ? "Check-in Stand Berhasil!" : "Stand Selesai Ditonton!"}
              </h3>
              <p className="text-xs text-muted-foreground">{successInfo.message}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSuccessInfo(null)}
              className="text-xs font-semibold"
            >
              Tutup Pesan
            </Button>
          </div>
        )}

        {/* Special Reward Feedback Box (HANYA Ditampilkan Saat SELURUH Stand Selesai) */}
        {showCompletionRewardBanner && (
          <div className="p-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 space-y-3 shadow-md animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
              <Trophy className="h-4 w-4" />
              <span>Reward Khusus Jelajah Seluruh Stand!</span>
              <Badge variant="gold" className="text-[10px] ml-auto">
                Penerima #{specialRewardResult?.rank || existingRecipient?.rank || 1}
              </Badge>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              🎉 Luar biasa! Anda telah berhasil menuntaskan seluruh <strong>{totalStandsTarget} stand pameran budaya</strong>!
            </p>

            {(specialRewardResult?.granted || existingRecipient?.status === "diterima") && (
              <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Hadiah Eksklusif:</span>
                  <strong className="text-xs text-foreground">
                    {specialRewardResult?.rewardName || existingRecipient?.rewardName || rewardConfig.rewardName}
                  </strong>
                </div>
                {(specialRewardResult?.pickupCode || existingRecipient?.pickupCode) && (
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Kode Klaim:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-accent text-sm">
                        {specialRewardResult?.pickupCode || existingRecipient?.pickupCode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyPickupCode(
                            specialRewardResult?.pickupCode || existingRecipient?.pickupCode
                          )
                        }
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Salin Kode Voucher"
                      >
                        {copiedPickupCode ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground italic">
              * Tunjukkan kode pengambilan di atas kepada panitia stand untuk mengambil hadiah Anda.
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* KONDISI 1: PESERTA SEDANG MEMILIKI SESI MENONTON AKTIF                    */}
        {/* ========================================================================= */}
        {activeSession ? (
          <Card className="p-5 sm:p-6 rounded-2xl border-2 border-amber-500/40 bg-card shadow-lg space-y-5 animate-in slide-in-from-bottom-2">
            {/* Session Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="gold" className="text-[11px] animate-pulse">
                    SEDANG MENONTON LOMBA
                  </Badge>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Kode: {activeSession.standCode}
                  </span>
                </div>
                <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                  {activeSession.standName}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>{activeSession.location || "Area Pameran Kebudayaan"}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelSession}
                disabled={actionLoading}
                className="text-xs h-8 px-2.5 gap-1 text-muted-foreground hover:text-danger hover:border-danger/40 cursor-pointer"
                title="Batalkan Sesi Menonton"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Batal Sesi</span>
              </Button>
            </div>

            {/* Live Server Timer Display */}
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Clock className="h-4 w-4 text-accent" />
                <span>Waktu Menonton (Server-Side)</span>
              </div>

              <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                {isDurationMet ? (
                  <span className="text-success animate-bounce">00:00</span>
                ) : (
                  formatSeconds(remainingSeconds)
                )}
              </div>

              {/* Progress Bar Durasi */}
              <div className="space-y-1.5">
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={cn(
                      "h-3 rounded-full transition-all duration-300",
                      isDurationMet ? "bg-success" : "bg-accent"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Mulai: {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{isDurationMet ? "Waktu Tercapai" : `${progressPercent}% Terpenuhi`}</span>
                  <span>Min: {activeSession.minDurationMinutes || 15} Menit</span>
                </div>
              </div>
            </div>

            {/* Condition 1A: Durasi BELUM Terpenuhi */}
            {!isDurationMet ? (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <Hourglass className="h-4 w-4 animate-spin" />
                  <span>Harap tetap berada di dalam stand dan nikmati jalannya lomba!</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Sebelum <strong>{formatSeconds(remainingSeconds)}</strong> selesai, Anda belum dapat melakukan checkout. Validasi checkout di dalam stand akan terbuka otomatis setelah timer habis.
                </p>
              </div>
            ) : (
              /* Condition 1B: Durasi SUDAH Terpenuhi -> Siap Checkout */
              <div className="space-y-4 pt-1">
                <div className="p-4 rounded-xl border border-success/40 bg-success/10 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-success text-sm">
                    <CheckCheck className="h-4.5 w-4.5" />
                    <span>Waktu Menonton {activeSession.minDurationMinutes || 15} Menit Terpenuhi!</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Silakan lakukan validasi kehadiran di dalam stand dengan <strong>memindai QR Checkout</strong> atau <strong>memasukkan kode yang terpajang di panggung/area dalam stand</strong>.
                  </p>
                </div>

                {/* Tab Switcher: Scan QR Checkout vs Input Kode Manual */}
                {rewardConfig.validationMode !== "code" && (
                  <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border gap-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("qr")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        checkoutMode === "qr"
                          ? "bg-card text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Camera className="h-4 w-4 text-accent" />
                      <span>Scan QR Checkout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("code")}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        checkoutMode === "code"
                          ? "bg-card text-foreground shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <KeyRound className="h-4 w-4 text-accent" />
                      <span>Ketik Kode Manual</span>
                    </button>
                  </div>
                )}

                {/* Pilihan 1: Scanner Kamera QR Checkout (Ukuran Penuh & Kualitas Setara Check-in) */}
                {checkoutMode === "qr" && rewardConfig.validationMode !== "code" ? (
                  <div className="space-y-3">
                    <Card className="overflow-hidden border-2 border-dashed border-accent/50 p-4 text-center space-y-3 bg-muted/20 shadow-xs">
                      <div className="relative aspect-square max-w-xs mx-auto rounded-xl bg-black flex flex-col items-center justify-center text-white overflow-hidden shadow-inner">
                        {/* HTML5 Live Video Stream */}
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className={`w-full h-full object-cover ${cameraStatus === "active" ? "block" : "hidden"}`}
                        />

                        {/* Viewfinder Target Framing Overlay */}
                        {cameraStatus === "active" && (
                          <div
                            className={cn(
                              "absolute inset-6 border-2 rounded-lg pointer-events-none flex flex-col justify-between p-2 shadow-2xl transition-all duration-300",
                              scanStatus.status === "success" && "border-emerald-500 bg-emerald-500/10",
                              scanStatus.status === "processing" && "border-amber-400 bg-amber-500/10",
                              scanStatus.status === "info" && "border-amber-500 bg-amber-500/10",
                              scanStatus.status === "error" && "border-rose-500 bg-rose-500/10",
                              scanStatus.status === "scanning" && "border-accent/70"
                            )}
                          >
                            <div className="flex justify-between">
                              <span className="h-5 w-5 border-t-2 border-l-2 border-accent" />
                              <span className="h-5 w-5 border-t-2 border-r-2 border-accent" />
                            </div>

                            {scanStatus.status === "processing" ? (
                              <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-sm animate-pulse border border-amber-500/30">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                                <span>Membaca QR Checkout...</span>
                              </div>
                            ) : scanStatus.status === "success" ? (
                              <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-sm">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                <span>Checkout Sukses!</span>
                              </div>
                            ) : (
                              <div className="w-full h-0.5 bg-accent/80 animate-pulse shadow-sm" />
                            )}

                            <div className="flex justify-between">
                              <span className="h-5 w-5 border-b-2 border-l-2 border-accent" />
                              <span className="h-5 w-5 border-b-2 border-r-2 border-accent" />
                            </div>
                          </div>
                        )}

                        {/* Camera Requesting / Permission Loading */}
                        {cameraStatus === "requesting" && (
                          <div className="space-y-3 p-6 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
                            <p className="text-xs text-white/80 font-medium">
                              Meminta izin akses kamera perangkat...
                            </p>
                          </div>
                        )}

                        {/* Camera Denied / Error State */}
                        {(cameraStatus === "denied" || cameraStatus === "error" || cameraStatus === "unsupported") && (
                          <div className="space-y-3 p-6 text-center bg-black/95">
                            <VideoOff className="h-10 w-10 text-danger mx-auto" />
                            <h4 className="font-heading text-sm font-bold text-white">
                              {cameraStatus === "denied" ? "Akses Kamera Ditolak" : "Kamera Tidak Tersedia"}
                            </h4>
                            <p className="text-[11px] text-white/70">
                              {cameraErrorDetail || "Izinkan akses kamera di pengaturan browser Anda untuk memindai QR secara otomatis."}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={startCamera}
                              className="text-xs gap-1 border-white/30 text-white hover:bg-white/10 cursor-pointer"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Coba Kamera Lagi</span>
                            </Button>
                          </div>
                        )}

                        {/* Camera Controls Bar (Torch & Switch Facing) */}
                        {cameraStatus === "active" && (
                          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                            {hasTorch && (
                              <button
                                type="button"
                                onClick={toggleTorch}
                                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                                  torchOn ? "bg-amber-400 text-black" : "bg-black/60 text-white hover:bg-black/80"
                                }`}
                                title="Senter Kamera"
                              >
                                <Zap className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={toggleFacingMode}
                              className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                              title="Ganti Kamera Depan/Belakang"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Dev Quick Test Button */}
                        {isDev && activeSession && (
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-1 z-20">
                            <button
                              type="button"
                              onClick={() => handleCheckOut(`IN-${activeSession.standCode}`)}
                              className="px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-accent border border-accent/40 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                            >
                              Test Out: IN-{activeSession.standCode}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                          <span>{scanStatus.message}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Arahkan kamera ke stiker QR bertuliskan <strong>&ldquo;DI DALAM STAND (CHECKOUT)&rdquo;</strong>.
                        </p>
                      </div>
                    </Card>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setCheckoutMode("code")}
                        className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Kamera bermasalah? Masukkan kode stand secara manual</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Pilihan 2: Form Input Manual Kode di Dalam Stand */
                  <Card className="p-5 space-y-3.5 border border-border bg-card shadow-xs">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <KeyRound className="h-4 w-4 text-accent" />
                        <span>Input Kode di Dalam Stand</span>
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Ketik kode unik yang terpajang di panggung/area pameran stand (contoh: IN-{activeSession.standCode}).
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCheckOut(checkoutCodeInput);
                      }}
                      className="space-y-3"
                    >
                      <Input
                        label="Kode di Dalam Stand *"
                        placeholder={`Contoh: IN-${activeSession.standCode}`}
                        value={checkoutCodeInput}
                        onChange={(e) => setCheckoutCodeInput(e.target.value.toUpperCase())}
                        className="font-mono text-sm tracking-wider"
                        required
                      />

                      <Button
                        type="submit"
                        size="lg"
                        disabled={actionLoading || !checkoutCodeInput.trim()}
                        className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span>{actionLoading ? "Memvalidasi..." : "Selesaikan Stand Ini"}</span>
                      </Button>
                    </form>

                    {rewardConfig.validationMode !== "code" && (
                      <div className="text-center pt-1 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setCheckoutMode("qr")}
                          className="text-xs text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span>Gunakan pemindai kamera (Scan QR Checkout)</span>
                        </button>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </Card>
        ) : (
          /* ========================================================================= */
          /* KONDISI 2: BELUM ADA SESI -> SCAN QR MASUK (CHECK-IN)                    */
          /* ========================================================================= */
          <div className="space-y-5">
            {/* Viewfinder Camera Card */}
            <Card className="overflow-hidden border-2 border-dashed border-accent/50 p-4 text-center space-y-3 bg-muted/20 shadow-xs">
              <div className="relative aspect-square max-w-xs mx-auto rounded-xl bg-black flex flex-col items-center justify-center text-white overflow-hidden shadow-inner">
                {/* HTML5 Live Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${cameraStatus === "active" ? "block" : "hidden"}`}
                />

                {/* Viewfinder Target Framing Overlay */}
                {cameraStatus === "active" && (
                  <div
                    className={cn(
                      "absolute inset-6 border-2 rounded-lg pointer-events-none flex flex-col justify-between p-2 shadow-2xl transition-all duration-300",
                      scanStatus.status === "success" && "border-emerald-500 bg-emerald-500/10",
                      scanStatus.status === "processing" && "border-amber-400 bg-amber-500/10",
                      scanStatus.status === "info" && "border-amber-500 bg-amber-500/10",
                      scanStatus.status === "error" && "border-rose-500 bg-rose-500/10",
                      scanStatus.status === "scanning" && "border-accent/70"
                    )}
                  >
                    <div className="flex justify-between">
                      <span className="h-5 w-5 border-t-2 border-l-2 border-accent" />
                      <span className="h-5 w-5 border-t-2 border-r-2 border-accent" />
                    </div>

                    {scanStatus.status === "processing" ? (
                      <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-sm animate-pulse border border-amber-500/30">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                        <span>Membaca QR Masuk...</span>
                      </div>
                    ) : scanStatus.status === "success" ? (
                      <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Check-in Sukses!</span>
                      </div>
                    ) : (
                      <div className="w-full h-0.5 bg-accent/80 animate-pulse shadow-sm" />
                    )}

                    <div className="flex justify-between">
                      <span className="h-5 w-5 border-b-2 border-l-2 border-accent" />
                      <span className="h-5 w-5 border-b-2 border-r-2 border-accent" />
                    </div>
                  </div>
                )}

                {/* Camera Requesting / Permission Loading */}
                {cameraStatus === "requesting" && (
                  <div className="space-y-3 p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
                    <p className="text-xs text-white/80 font-medium">
                      Meminta izin akses kamera perangkat...
                    </p>
                  </div>
                )}

                {/* Camera Denied / Error State */}
                {(cameraStatus === "denied" || cameraStatus === "error" || cameraStatus === "unsupported") && (
                  <div className="space-y-3 p-6 text-center bg-black/95">
                    <VideoOff className="h-10 w-10 text-danger mx-auto" />
                    <h4 className="font-heading text-sm font-bold text-white">
                      {cameraStatus === "denied" ? "Akses Kamera Ditolak" : "Kamera Tidak Tersedia"}
                    </h4>
                    <p className="text-[11px] text-white/70">
                      {cameraErrorDetail || "Izinkan akses kamera di pengaturan browser Anda untuk memindai QR secara otomatis."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startCamera}
                      className="text-xs gap-1 border-white/30 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Coba Kamera Lagi</span>
                    </Button>
                  </div>
                )}

                {/* Camera Controls Bar (Torch & Switch Facing) */}
                {cameraStatus === "active" && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {hasTorch && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                          torchOn ? "bg-amber-400 text-black" : "bg-black/60 text-white hover:bg-black/80"
                        }`}
                        title="Senter Kamera"
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors"
                      title="Ganti Kamera Depan/Belakang"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Dev Quick Test Buttons */}
                {isDev && (
                  <div className="absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-1 z-20">
                    <button
                      type="button"
                      onClick={() => handleCheckIn("PUISI01")}
                      className="px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-accent border border-accent/40 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                    >
                      Test In: PUISI01
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCheckIn("FILM02")}
                      className="px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-accent border border-accent/40 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                    >
                      Test In: FILM02
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{scanStatus.message}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Scan QR di pintu masuk stand untuk check-in & memulai sesi menonton minimal {rewardConfig.minDurationMinutes} menit.
                </p>
              </div>
            </Card>

            {/* Manual Code Input Form (Untuk Check-in Pintu Masuk) */}
            <Card className="p-5 space-y-3.5">
              <div className="space-y-0.5">
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Input Manual Kode Masuk Stand
                </h3>
                <p className="text-xs text-muted-foreground">
                  Jika kamera bermasalah, ketikkan kode stand yang ada di pintu masuk (contoh: PUISI01, FILM02).
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckIn(manualCode);
                }}
                className="space-y-3"
              >
                <Input
                  label="Kode Masuk Stand *"
                  placeholder="Contoh: PUISI01"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  maxLength={15}
                  className="font-mono"
                  required
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={actionLoading || !manualCode.trim()}
                  className="w-full text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                  <span>{actionLoading ? "Memproses Check-in..." : "Check-in & Mulai Menonton"}</span>
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHECKLIST DAFTAR STAND LOMBA                                              */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Stand Budaya ({standsCompletedCount}/{totalActiveStands || activeStandsList.length} Selesai)
            </h3>
            <span className="text-[11px] text-accent font-medium">
              Wajib Selesai Semua
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeStandsList.map((st) => (
              <div
                key={st.id}
                className={cn(
                  "p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors",
                  st.isCompleted
                    ? "border-success/40 bg-success/5 text-foreground"
                    : activeSession?.standId === st.id
                    ? "border-amber-500/50 bg-amber-500/10 text-foreground"
                    : "border-border bg-background/50 text-muted-foreground"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <strong className="truncate block font-semibold text-foreground">
                      {st.name}
                    </strong>
                    <span className="font-mono text-[10px] text-muted-foreground">({st.code})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {st.location}
                  </span>
                </div>

                <div className="shrink-0">
                  {st.isCompleted ? (
                    <Badge variant="success" className="text-[10px] gap-1 py-0 px-1.5">
                      <Check className="h-3 w-3" />
                      <span>Selesai</span>
                    </Badge>
                  ) : activeSession?.standId === st.id ? (
                    <Badge variant="gold" className="text-[10px] gap-1 py-0 px-1.5 animate-pulse">
                      <Hourglass className="h-3 w-3" />
                      <span>Menonton</span>
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px] py-0 px-1.5 opacity-60">
                      Belum
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PesertaScanStandPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardLayout role="peserta">
          <div className="flex items-center justify-center py-20 text-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
          </div>
        </DashboardLayout>
      }
    >
      <PesertaScanContent />
    </React.Suspense>
  );
}
