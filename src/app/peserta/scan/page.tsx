"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STANDS } from "@/lib/dummy-data";
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
  HelpCircle,
  Gift,
  Trophy,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { claimStandVisit } from "@/app/actions/challenges";
import { getParticipantStandProgress } from "@/app/actions/stand-rewards";
import { createClient } from "@/lib/supabase/client";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { cn } from "@/lib/utils";
import jsQR from "jsqr";

function PesertaScanContent() {
  const isDev = process.env.NODE_ENV === "development";
  const searchParams = useSearchParams();
  const urlCode = searchParams?.get("code") || searchParams?.get("stand") || "";

  const { participant, refetch } = useCurrentParticipant();
  const [manualCode, setManualCode] = React.useState("");
  const [successStand, setSuccessStand] = React.useState<{ name: string; points: number } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [scanningSimulated, setScanningSimulated] = React.useState(false);

  // Special Reward & Progress States
  const [standProgress, setStandProgress] = React.useState<{
    standsCompletedCount: number;
    totalActiveStands: number;
    allCompleted: boolean;
    config: { quota: number; rewardName: string };
    grantedCount: number;
    remainingQuota: number;
    existingRecipient: any;
  } | null>(null);

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

  // Camera & QR Scanner States
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const barcodeDetectorRef = React.useRef<any>(null);
  const isProcessingFrameRef = React.useRef<boolean>(false);
  const lastScanTimestampRef = React.useRef<number>(0);

  const [cameraStatus, setCameraStatus] = React.useState<"idle" | "requesting" | "active" | "denied" | "error" | "unsupported">("idle");
  const [cameraErrorDetail, setCameraErrorDetail] = React.useState("");
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);

  // Live feedback on viewfinder
  const [scanStatus, setScanStatus] = React.useState<{
    status: "scanning" | "processing" | "success" | "info" | "error";
    message: string;
  }>({ status: "scanning", message: "Arahkan kamera ke stiker QR stand" });

  // Helper to retrieve active participant UUID or fallback
  const resolveParticipantId = async (): Promise<string> => {
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
  };

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

  // Process scanned code string (extract stand code from JSON, URL, or raw string)
  const processCodeString = React.useCallback((rawText: string): string => {
    let clean = rawText.trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    // If it's a JSON string (from QRCodeCard)
    if (clean.startsWith("{") && clean.endsWith("}")) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.code) return String(parsed.code).trim().toUpperCase();
        if (parsed.token) return String(parsed.token).trim().toUpperCase();
        if (parsed.standCode) return String(parsed.standCode).trim().toUpperCase();
      } catch {}
    }
    // If it's a URL, extract 'code' or 'stand' or 'token' query parameter
    if (clean.includes("http://") || clean.includes("https://") || clean.includes("HTTP://") || clean.includes("HTTPS://")) {
      try {
        const parsedUrl = new URL(clean);
        const codeParam = parsedUrl.searchParams.get("code") || parsedUrl.searchParams.get("stand") || parsedUrl.searchParams.get("token");
        if (codeParam) return codeParam.trim().toUpperCase();
      } catch {}
    }

    return clean.toUpperCase();
  }, []);

  // Load initial stand exploration progress
  const loadProgress = React.useCallback(async () => {
    if (!participant?.id) return;
    try {
      const res = await getParticipantStandProgress(participant.id);
      if (res.success) {
        setStandProgress(res);
        if (res.existingRecipient) {
          setSpecialRewardResult({
            alreadyProcessed: true,
            qualified: true,
            granted: res.existingRecipient.status === "diterima",
            rank: res.existingRecipient.rank,
            quota: res.config.quota,
            rewardName: res.existingRecipient.rewardName,
            pickupCode: res.existingRecipient.pickupCode,
            message: res.existingRecipient.status === "diterima"
              ? `Anda adalah penerima #${res.existingRecipient.rank} dari ${res.config.quota} kuota reward khusus!`
              : `Anda telah menyelesaikan seluruh stand di urutan #${res.existingRecipient.rank} (kuota reward khusus ${res.config.quota} peserta pertama telah habis).`,
          });
        }
      }
    } catch (err) {
      console.error("Gagal load progress stand:", err);
    }
  }, [participant?.id]);

  React.useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const handleCopyPickupCode = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(code);
      setCopiedPickupCode(true);
      setTimeout(() => setCopiedPickupCode(false), 2000);
    }
  };

  const handleClaimCode = React.useCallback(
    async (codeString: string) => {
      const cleanCode = processCodeString(codeString);
      if (!cleanCode) return;

      triggerScanFeedback();
      setScanningSimulated(true);
      setErrorMsg("");
      setScanStatus({
        status: "processing",
        message: "QR Stand Terdeteksi! Memverifikasi...",
      });

      try {
        const participantId = await resolveParticipantId();
        const res = await claimStandVisit({
          participantId,
          standCode: cleanCode,
        });

        if (res.success) {
          const matched = STANDS.find(
            (s) => s.code.toUpperCase() === cleanCode.toUpperCase() || s.qrToken.toUpperCase() === cleanCode.toUpperCase()
          );
          const sName = res.data?.standName || matched?.name || `Stand ${cleanCode}`;
          const sPoints = res.data?.pointsAwarded || matched?.points || 10;

          if (res.data?.specialReward) {
            setSpecialRewardResult(res.data.specialReward);
          }

          setScanStatus({
            status: "success",
            message: `🎉 Berhasil! Mengunjungi ${sName} (+${sPoints} Poin)`,
          });
          setSuccessStand({ name: sName, points: sPoints });
          setManualCode("");
          refetch();
          loadProgress();
        } else {
          const isAlreadyClaimed = res.error?.includes("sudah pernah");
          setScanStatus({
            status: isAlreadyClaimed ? "info" : "error",
            message: res.error || "Gagal mengklaim poin stand.",
          });
          setErrorMsg(res.error || "Gagal mengklaim poin stand.");

          // Resume scanning automatically after 2.5 seconds
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
          message: err.message || "Gagal mengklaim poin stand.",
        });
        setErrorMsg(err.message || "Gagal mengklaim poin stand.");
        setTimeout(() => {
          setScanStatus({
            status: "scanning",
            message: "Arahkan kamera ke stiker QR stand",
          });
          setLastScannedCode(null);
          isProcessingFrameRef.current = false;
        }, 2500);
      } finally {
        setScanningSimulated(false);
      }
    },
    [processCodeString, triggerScanFeedback, refetch, loadProgress]
  );

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
    // Stop any existing stream
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
      setScanStatus({ status: "scanning", message: "Arahkan kamera ke stiker QR stand" });

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities?.() as any) || {};
        setHasTorch(!!capabilities.torch);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraErrorDetail("Izin kamera ditolak. Silakan izinkan kamera di browser Anda.");
      } else {
        setCameraStatus("error");
        setCameraErrorDetail(err.message || "Gagal membuka kamera perangkat.");
      }
    }
  }, [facingMode, stopCamera]);

  // Keep video element attached to stream whenever camera is active
  React.useEffect(() => {
    if (videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStatus]);

  // Initialize BarcodeDetector once if available
  React.useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window && !barcodeDetectorRef.current) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      } catch {}
    }
  }, []);

  // Toggle Torch Light
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const nextState = !torchOn;
      try {
        await (track.applyConstraints as any)({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.error("Torch error:", err);
      }
    }
  };

  // Toggle Front / Rear Camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // AUTO-START Camera on Mount
  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Auto Claim if URL parameter contains code
  React.useEffect(() => {
    if (urlCode && urlCode !== lastScannedCode) {
      setLastScannedCode(urlCode);
      handleClaimCode(urlCode);
    }
  }, [urlCode, lastScannedCode, handleClaimCode]);

  // Continuous High-Performance Scanner Loop (Native BarcodeDetector + jsQR Fallback)
  React.useEffect(() => {
    if (cameraStatus !== "active" || successStand) return;

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

          // Engine 2: Pure JS jsQR Fallback with Downscaling (iOS Safari / Firefox / older Android)
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

          if (detectedValue && isScanningActive && detectedValue !== lastScannedCode) {
            isScanningActive = false; // Stop further frame capture
            setLastScannedCode(detectedValue);
            await handleClaimCode(detectedValue);
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
  }, [cameraStatus, successStand, lastScannedCode, handleClaimCode]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleClaimCode(manualCode);
  };

  const handleSimulateScan = async (standCode: string) => {
    handleClaimCode(standCode);
  };

  return (
    <DashboardLayout role="peserta" participantPoints={participant?.totalPoints}>
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="space-y-1 text-center">
            <Badge variant="gold" className="text-xs">
              Klaim Poin Kunjungan
            </Badge>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Pemindai QR Stand Lomba
            </h1>
            <p className="text-xs text-muted-foreground">
              Arahkan kamera ke QR stiker di meja stand, atau ketikkan kode 6 karakter manual jika kamera bermasalah.
            </p>
          </div>
        </div>

        {/* Stand Exploration Progress Card */}
        {standProgress && (
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-accent" />
                <span>Progres Jelajah Stand Lomba:</span>
              </span>
              <span className="font-mono font-bold text-accent">
                {standProgress.standsCompletedCount} / {standProgress.totalActiveStands} Stand
              </span>
            </div>

            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (standProgress.standsCompletedCount / Math.max(1, standProgress.totalActiveStands)) * 100)}%`,
                }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-0.5 gap-2">
              <span>
                {standProgress.allCompleted
                  ? "🎉 Seluruh stand aktif telah selesai dikunjungi!"
                  : `Kunjungi ${standProgress.totalActiveStands - standProgress.standsCompletedCount} stand lagi untuk menyelesaikan challenge.`}
              </span>
              <span className="text-accent font-medium">
                Kuota Hadiah Khusus: {standProgress.remainingQuota} / {standProgress.config.quota}
              </span>
            </div>
          </div>
        )}

        {/* Success Modal / Banner */}
        {successStand && (
          <div className="p-6 rounded-2xl border border-success/40 bg-success/10 text-center space-y-4 animate-in zoom-in-95">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <div className="space-y-1">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Klaim Poin Berhasil!
              </h3>
              <p className="text-xs text-muted-foreground">
                Selamat! Anda telah mengunjungi <strong>{successStand.name}</strong> dan memperoleh tambahan{" "}
                <strong className="text-accent font-mono">+{successStand.points} Poin</strong>.
              </p>
            </div>

            {/* Special Reward Feedback Box */}
            {specialRewardResult && specialRewardResult.qualified && (
              specialRewardResult.granted ? (
                <div className="p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 text-left space-y-2.5 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                    <Trophy className="h-4 w-4" />
                    <span>Reward Khusus Eksklusif Diraih!</span>
                    <Badge variant="gold" className="text-[10px] ml-auto">
                      Penerima Ke-#{specialRewardResult.rank}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    🎉 Selamat! Anda adalah <strong>peserta ke-{specialRewardResult.rank} dari {specialRewardResult.quota} kuota pertama</strong> yang berhasil memindai semua stand pameran budaya!
                  </p>
                  <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Hadiah Khusus:</span>
                      <strong className="text-xs text-foreground">{specialRewardResult.rewardName}</strong>
                    </div>
                    {specialRewardResult.pickupCode && (
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Kode Pengambilan:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-accent text-sm">
                            {specialRewardResult.pickupCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPickupCode(specialRewardResult.pickupCode!)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Salin Kode Voucher"
                          >
                            {copiedPickupCode ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    * Tunjukkan kode pengambilan voucher di atas kepada panitia stand untuk mengambil hadiah Anda.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-left space-y-2 shadow-sm animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Sparkles className="h-4 w-4" />
                    <span>Seluruh Stand Selesai (Urutan ke-#{specialRewardResult.rank})</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">
                    🏁 Hebat! Anda telah berhasil menyelesaikan pemindaian seluruh stand pameran (Urutan ke-#{specialRewardResult.rank}).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mohon maaf, kuota reward khusus (untuk <strong>{specialRewardResult.quota} peserta pertama</strong>) telah habis. Namun seluruh poin yang Anda kumpulkan tetap tersimpan dan dapat ditukarkan di katalog reward!
                  </p>
                </div>
              )
            )}

            <div className="pt-2 flex justify-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSuccessStand(null);
                  setLastScannedCode(null);
                  startCamera();
                }}
                className="text-xs gap-1.5 cursor-pointer font-semibold"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Scan Stand Lain</span>
              </Button>
              <Link href="/peserta/reward">
                <Button size="sm" variant="outline" className="text-xs">
                  Tukar Hadiah →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Real Live Camera Viewfinder */}
        {!successStand && (
          <Card className="overflow-hidden border-2 border-dashed border-accent/50 p-4 text-center space-y-3 bg-muted/20">
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
                    <span
                      className={cn(
                        "h-5 w-5 border-t-2 border-l-2 transition-colors",
                        scanStatus.status === "success"
                          ? "border-emerald-500"
                          : scanStatus.status === "processing"
                          ? "border-amber-400"
                          : scanStatus.status === "error"
                          ? "border-rose-500"
                          : "border-accent"
                      )}
                    />
                    <span
                      className={cn(
                        "h-5 w-5 border-t-2 border-r-2 transition-colors",
                        scanStatus.status === "success"
                          ? "border-emerald-500"
                          : scanStatus.status === "processing"
                          ? "border-amber-400"
                          : scanStatus.status === "error"
                          ? "border-rose-500"
                          : "border-accent"
                      )}
                    />
                  </div>

                  {/* Dynamic Laser or Center Badge Feedback */}
                  {scanStatus.status === "processing" ? (
                    <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-sm animate-pulse border border-amber-500/30">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                      <span>Membaca QR...</span>
                    </div>
                  ) : scanStatus.status === "success" ? (
                    <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-lg backdrop-blur-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Terverifikasi!</span>
                    </div>
                  ) : scanStatus.status === "error" ? (
                    <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/50 text-rose-300 text-xs font-semibold shadow-lg backdrop-blur-sm">
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                      <span>QR Tidak Cocok</span>
                    </div>
                  ) : scanStatus.status === "info" ? (
                    <div className="self-center flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-sm">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span>Sudah Pernah</span>
                    </div>
                  ) : (
                    <div className="w-full h-0.5 bg-accent/80 animate-pulse shadow-sm" />
                  )}

                  <div className="flex justify-between">
                    <span
                      className={cn(
                        "h-5 w-5 border-b-2 border-l-2 transition-colors",
                        scanStatus.status === "success"
                          ? "border-emerald-500"
                          : scanStatus.status === "processing"
                          ? "border-amber-400"
                          : scanStatus.status === "error"
                          ? "border-rose-500"
                          : "border-accent"
                      )}
                    />
                    <span
                      className={cn(
                        "h-5 w-5 border-b-2 border-r-2 transition-colors",
                        scanStatus.status === "success"
                          ? "border-emerald-500"
                          : scanStatus.status === "processing"
                          ? "border-amber-400"
                          : scanStatus.status === "error"
                          ? "border-rose-500"
                          : "border-accent"
                      )}
                    />
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
                    onClick={() => handleSimulateScan("PUISI01")}
                    className="px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-accent border border-accent/40 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                  >
                    Test: PUISI01
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateScan("FILM02")}
                    className="px-2 py-0.5 rounded text-[9px] font-mono bg-black/80 text-accent border border-accent/40 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                  >
                    Test: FILM02
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                {scanStatus.status === "scanning" && cameraStatus === "active" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{scanStatus.message}</span>
                  </div>
                )}
                {scanStatus.status === "processing" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{scanStatus.message}</span>
                  </div>
                )}
                {scanStatus.status === "success" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{scanStatus.message}</span>
                  </div>
                )}
                {scanStatus.status === "info" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{scanStatus.message}</span>
                  </div>
                )}
                {scanStatus.status === "error" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{scanStatus.message}</span>
                  </div>
                )}
                {cameraStatus !== "active" && scanStatus.status === "scanning" && (
                  <span className="text-xs text-muted-foreground">
                    Gunakan input kode manual di bawah jika kamera bermasalah
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Poin stand akan langsung ditambahkan ke profil Anda setelah QR terdeteksi.
              </p>
            </div>
          </Card>
        )}

        {/* Manual Code Input Form */}
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-foreground">
              Input Kode Unik Stand Manual
            </h3>
            <p className="text-xs text-muted-foreground">
              Bila kamera bermasalah, ketikkan 6 karakter kode yang tertera di stand (misal: PUISI01, KANVAS04, MEDIA08).
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              label="Kode Unik Stand (6 Karakter) *"
              placeholder="Contoh: PUISI01"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              maxLength={10}
              required
            />

            <Button
              type="submit"
              size="lg"
              disabled={scanningSimulated || !manualCode.trim()}
              className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {scanningSimulated ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{scanningSimulated ? "Memproses Kode..." : "Klaim Poin Stand Sekarang"}</span>
            </Button>
          </form>
        </Card>
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

