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
} from "lucide-react";
import { claimStandVisit } from "@/app/actions/challenges";
import { createClient } from "@/lib/supabase/client";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";

function PesertaScanContent() {
  const isDev = process.env.NODE_ENV === "development";
  const searchParams = useSearchParams();
  const urlCode = searchParams?.get("code") || searchParams?.get("stand") || "";

  const { participant, refetch } = useCurrentParticipant();
  const [manualCode, setManualCode] = React.useState("");
  const [successStand, setSuccessStand] = React.useState<{ name: string; points: number } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [scanningSimulated, setScanningSimulated] = React.useState(false);

  // Camera & QR Scanner States
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = React.useState<"idle" | "requesting" | "active" | "denied" | "error" | "unsupported">("idle");
  const [cameraErrorDetail, setCameraErrorDetail] = React.useState("");
  const [facingMode, setFacingMode] = React.useState<"environment" | "user">("environment");
  const [hasTorch, setHasTorch] = React.useState(false);
  const [torchOn, setTorchOn] = React.useState(false);
  const [lastScannedCode, setLastScannedCode] = React.useState<string | null>(null);

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

  // Process scanned code string (extract stand code from URL or raw string)
  const processCodeString = (rawText: string): string => {
    let clean = rawText.trim();

    // If it's a URL, extract 'code' or 'stand' query parameter
    if (clean.includes("http://") || clean.includes("https://")) {
      try {
        const parsedUrl = new URL(clean);
        const codeParam = parsedUrl.searchParams.get("code") || parsedUrl.searchParams.get("stand");
        if (codeParam) clean = codeParam;
      } catch {
        // fallback
      }
    }

    return clean.toUpperCase();
  };

  const handleClaimCode = async (codeString: string) => {
    const cleanCode = processCodeString(codeString);
    if (!cleanCode) return;

    const matched = STANDS.find((s) => s.code === cleanCode);

    if (!matched) {
      setErrorMsg(`Kode stand "${cleanCode}" tidak terdaftar. Pastikan kode 6 karakter yang benar.`);
      return;
    }

    setScanningSimulated(true);
    setErrorMsg("");

    try {
      const participantId = await resolveParticipantId();
      const res = await claimStandVisit({
        participantId,
        standCode: cleanCode,
      });

      if (!res.success && res.error && !res.error.includes("placeholder")) {
        setErrorMsg(res.error);
        setScanningSimulated(false);
        return;
      }
    } catch {
      // Fallback to client state
    }

    setScanningSimulated(false);
    setSuccessStand({ name: matched.name, points: matched.points });
    setManualCode("");
    refetch();
  };

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
        await videoRef.current.play();
      }

      setCameraStatus("active");

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
  }, [facingMode]);

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
  }, [urlCode]);

  // Continuous BarcodeDetector Scanner Loop
  React.useEffect(() => {
    if (cameraStatus !== "active" || successStand) return;

    let isScanning = true;

    const detectFrame = async () => {
      if (!isScanning || !videoRef.current) return;

      if ("BarcodeDetector" in window) {
        try {
          const videoEl = videoRef.current;
          if (videoEl.readyState >= 2) {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
            const barcodes = await detector.detect(videoEl);

            if (barcodes && barcodes.length > 0) {
              const detectedValue = barcodes[0].rawValue;
              if (detectedValue && detectedValue !== lastScannedCode) {
                setLastScannedCode(detectedValue);
                handleClaimCode(detectedValue);
                isScanning = false;
                return;
              }
            }
          }
        } catch {
          // ignore detector frame error
        }
      }

      if (isScanning) {
        animFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isScanning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [cameraStatus, successStand, lastScannedCode]);

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

        {/* Success Modal / Banner */}
        {successStand && (
          <div className="p-6 rounded-2xl border border-success/40 bg-success/10 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Klaim Poin Berhasil!
            </h3>
            <p className="text-xs text-muted-foreground">
              Selamat! Anda telah mengunjungi <strong>{successStand.name}</strong> dan memperoleh tambahan{" "}
              <strong className="text-accent font-mono">+{successStand.points} Poin</strong>.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSuccessStand(null);
                  setLastScannedCode(null);
                  startCamera();
                }}
                className="text-xs gap-1.5 cursor-pointer"
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
                <div className="absolute inset-6 border-2 border-accent/70 rounded-lg pointer-events-none flex flex-col justify-between p-2 shadow-2xl">
                  <div className="flex justify-between">
                    <span className="h-5 w-5 border-t-2 border-l-2 border-accent" />
                    <span className="h-5 w-5 border-t-2 border-r-2 border-accent" />
                  </div>
                  <div className="w-full h-0.5 bg-accent/80 animate-pulse shadow-sm" />
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
              <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                {cameraStatus === "active" ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Kamera Siap Memindai QR Stand</span>
                  </>
                ) : scanningSimulated ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                    <span>Sedang Memproses Kode QR...</span>
                  </>
                ) : (
                  <span>Gunakan Input Manual di Bawah Jika Kamera Bermasalah</span>
                )}
              </p>
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

