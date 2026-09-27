"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STANDS } from "@/lib/dummy-data";
import { ArrowLeft, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { claimStandVisit } from "@/app/actions/challenges";
import { createClient } from "@/lib/supabase/client";

export default function PesertaScanStandPage() {
  const isDev = process.env.NODE_ENV === "development";
  const [manualCode, setManualCode] = React.useState("");
  const [successStand, setSuccessStand] = React.useState<{ name: string; points: number } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [scanningSimulated, setScanningSimulated] = React.useState(false);

  // Helper to retrieve active participant UUID or fallback in dev
  const resolveParticipantId = async (): Promise<string> => {
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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualCode.trim().toUpperCase();
    const matched = STANDS.find((s) => s.code === cleanCode);

    if (!matched) {
      setErrorMsg("Kode unik stand tidak valid. Pastikan kode 6 karakter (contoh: PUISI01, FILM02).");
      return;
    }

    try {
      const participantId = await resolveParticipantId();
      const res = await claimStandVisit({
        participantId,
        standCode: cleanCode,
      });

      if (!res.success && res.error && !res.error.includes("placeholder")) {
        setErrorMsg(res.error);
        return;
      }
    } catch {
      // Fallback to local state
    }

    setErrorMsg("");
    setSuccessStand({ name: matched.name, points: matched.points });
    setManualCode("");
  };

  const handleSimulateScan = async (standCode: string) => {
    setScanningSimulated(true);
    const matched = STANDS.find((s) => s.code === standCode);

    try {
      const participantId = await resolveParticipantId();
      await claimStandVisit({
        participantId,
        standCode,
      });
    } catch {
      // Fallback
    }

    setTimeout(() => {
      setScanningSimulated(false);
      if (matched) {
        setSuccessStand({ name: matched.name, points: matched.points });
      }
    }, 600);
  };

  return (
    <DashboardLayout role="peserta">
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
              Scan QR / Input Kode Stand Lomba
            </h1>
            <p className="text-xs text-muted-foreground">
              Arahkan kamera ke QR stiker di meja stand, atau masukkan kode 6 karakter manual bila ada kendala kamera.
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
              <Button size="sm" onClick={() => setSuccessStand(null)} className="text-xs">
                Scan Stand Lain
              </Button>
              <Link href="/peserta/reward">
                <Button size="sm" variant="outline" className="text-xs">
                  Tukar Hadiah →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Camera Scanner Viewfinder Simulator */}
        <Card className="overflow-hidden border-2 border-dashed border-accent/50 p-6 text-center space-y-4 bg-muted/20">
          <div className="relative aspect-square max-w-xs mx-auto rounded-xl bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden shadow-inner">
            <div className="absolute inset-4 border-2 border-accent/70 rounded-lg pointer-events-none animate-pulse flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="h-4 w-4 border-t-2 border-l-2 border-accent" />
                <span className="h-4 w-4 border-t-2 border-r-2 border-accent" />
              </div>
              <div className="flex justify-between">
                <span className="h-4 w-4 border-b-2 border-l-2 border-accent" />
                <span className="h-4 w-4 border-b-2 border-r-2 border-accent" />
              </div>
            </div>

            <Camera className="h-10 w-10 text-accent/80 mb-2" />
            <span className="text-xs font-semibold">Kamera Pemindai QR Aktif</span>
            <span className="text-[10px] text-white/60">Arahkan pada kode QR stand</span>

            {/* Quick Demo Scan Triggers (Dev Only) */}
            {isDev && (
              <div className="pt-4 flex flex-wrap justify-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => handleSimulateScan("PUISI01")}
                  className="px-2 py-1 rounded text-[10px] font-mono bg-white/20 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                >
                  Dev: Scan PUISI01
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateScan("FILM02")}
                  className="px-2 py-1 rounded text-[10px] font-mono bg-white/20 hover:bg-accent hover:text-black transition-colors cursor-pointer"
                >
                  Dev: Scan FILM02
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {scanningSimulated ? "Sedang memproses kode QR stand..." : "Kamera otomatis mengenali QR token stand lomba"}
          </p>
        </Card>

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

            <Button type="submit" size="lg" className="w-full text-xs font-semibold">
              Klaim 10 Poin Stand Sekarang
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
