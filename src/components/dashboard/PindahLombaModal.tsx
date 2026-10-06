"use client";

import * as React from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { transferParticipantCompetition } from "@/app/actions/participants";
import { getCompetitions } from "@/lib/supabase/queries";
import type { Competition } from "@/lib/dummy-data";
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Info,
} from "lucide-react";

export interface ParticipantTransferTarget {
  id: string; // participantId (public.participants.id)
  registrationId?: string;
  fullName: string;
  registrationNumber?: string;
  competitionId?: string;
  competitionName?: string;
  documentsCount?: number;
}

interface PindahLombaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantTransferTarget | null;
  competitions?: Competition[];
  onSuccess?: () => void;
}

export function PindahLombaModal({
  open,
  onOpenChange,
  participant,
  competitions: initialCompetitions,
  onSuccess,
}: PindahLombaModalProps) {
  const [competitions, setCompetitions] = React.useState<Competition[]>(
    initialCompetitions || []
  );
  const [loadingComps, setLoadingComps] = React.useState<boolean>(false);
  const [selectedTargetId, setSelectedTargetId] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [warningMsg, setWarningMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Load competitions if not passed via props
  React.useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setWarningMsg(null);
      setSuccessMsg(null);
      setSelectedTargetId("");
      setReason("");

      if (!initialCompetitions || initialCompetitions.length === 0) {
        setLoadingComps(true);
        getCompetitions().then((data) => {
          setCompetitions(data || []);
          setLoadingComps(false);
        });
      } else {
        setCompetitions(initialCompetitions);
      }
    }
  }, [open, initialCompetitions]);

  if (!participant) return null;

  const currentCompId = participant.competitionId || "";
  const currentCompName = participant.competitionName || "Belum Memilih Lomba";

  // Filter list: exclude current competition
  const availableTargets = competitions.filter(
    (c) => c.id !== currentCompId && c.status !== "dibatalkan"
  );

  const selectedTarget = competitions.find((c) => c.id === selectedTargetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId) {
      setErrorMsg("Silakan pilih cabang lomba tujuan terlebih dahulu.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setWarningMsg(null);
      setSuccessMsg(null);

      const res = await transferParticipantCompetition({
        participantId: participant.id,
        registrationId: participant.registrationId,
        targetCompetitionId: selectedTargetId,
        reason: reason.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(
          `Peserta "${participant.fullName}" berhasil dipindahkan ke cabang lomba "${selectedTarget?.name || "tujuan"}".`
        );
        if (res.warning) {
          setWarningMsg(res.warning);
        }
        setTimeout(() => {
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Gagal memindahkan cabang lomba peserta.");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memindahkan lomba."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ArrowRightLeft className="h-5 w-5 text-accent shrink-0" />
            <span>Pindah Cabang Lomba Peserta</span>
          </DialogTitle>
          <DialogDescription>
            Pindahkan registrasi peserta ke cabang lomba lain tanpa menghapus data peserta atau berkas pendukung.
          </DialogDescription>
        </DialogHeader>

        {/* Informasi Ringkas Peserta & Lomba Saat Ini */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{participant.fullName}</span>
            <span className="font-mono text-[11px] font-bold text-accent">
              {participant.registrationNumber}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t border-border/60">
            <Trophy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              Lomba Asal: <strong className="text-foreground">{currentCompName}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Alert Messages */}
        {errorMsg && (
          <div className="p-3 rounded-lg border border-danger/40 bg-danger/5 flex items-start gap-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {warningMsg && (
          <div className="p-3 rounded-lg border border-warning/40 bg-warning/5 flex items-start gap-2 text-xs text-warning-foreground">
            <Info className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <span>{warningMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg border border-success/40 bg-success/5 flex items-start gap-2 text-xs text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Pilihan Lomba Tujuan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Pilih Cabang Lomba Tujuan *
          </label>
          {loadingComps ? (
            <div className="h-10 rounded-lg border border-border bg-muted/20 flex items-center px-3 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
              <span>Memuat daftar cabang lomba...</span>
            </div>
          ) : (
            <select
              value={selectedTargetId}
              onChange={(e) => setSelectedTargetId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none font-medium"
              required
            >
              <option value="">-- Pilih Cabang Lomba Tujuan --</option>
              {availableTargets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category.toUpperCase()} • {c.status.toUpperCase()})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Highlight detail lomba tujuan */}
        {selectedTarget && (
          <div className="p-3 rounded-lg border border-accent/30 bg-accent/5 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{selectedTarget.name}</span>
              <Badge
                variant={selectedTarget.status === "pendaftaran" ? "gold" : "warning"}
                className="text-[10px]"
              >
                {selectedTarget.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] pt-1">
              <span>
                Kategori: <strong className="text-foreground">{selectedTarget.category.toUpperCase()}</strong>
              </span>
              <span>•</span>
              <span>
                Venue: <strong className="text-foreground">{selectedTarget.venue}</strong>
              </span>
              <span>•</span>
              <span>
                Persyaratan Berkas:{" "}
                <strong className="text-foreground">
                  {selectedTarget.requireDocument !== false ? "Wajib Upload Berkas" : "Tidak Wajib Berkas"}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* Input Alasan Pindah Lomba */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alasan Kepindahan (Opsional)
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Salah pilih cabang saat registrasi mandiri, konfirmasi panitia, dll..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
          />
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedTargetId}
            className="text-xs font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses Kepindahan...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                <span>Pindahkan Lomba</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
