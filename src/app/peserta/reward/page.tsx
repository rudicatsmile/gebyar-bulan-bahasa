"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { REWARDS, Reward } from "@/lib/dummy-data";
import { getRewards } from "@/lib/supabase/queries";
import { useCurrentParticipant } from "@/lib/hooks/useCurrentParticipant";
import { redeemReward } from "@/app/actions/challenges";
import { Gift, ArrowLeft, CheckCircle2, AlertCircle, Coins, Loader2, Sparkles } from "lucide-react";

export default function PesertaRewardPage() {
  const { participant, loading: participantLoading, refetch: refetchParticipant } = useCurrentParticipant();
  const [balance, setBalance] = React.useState<number>(0);
  const [rewards, setRewards] = React.useState<Reward[]>(REWARDS);
  const [loadingRewards, setLoadingRewards] = React.useState(true);
  const [selectedReward, setSelectedReward] = React.useState<Reward | null>(null);
  const [claimSuccess, setClaimSuccess] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [dialogError, setDialogError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadRewardCatalog = React.useCallback(async () => {
    try {
      setLoadingRewards(true);
      const data = await getRewards();
      if (data && data.length > 0) {
        setRewards(data);
      } else {
        setRewards(REWARDS);
      }
    } catch (err) {
      console.error("Gagal memuat katalog reward:", err);
    } finally {
      setLoadingRewards(false);
    }
  }, []);

  React.useEffect(() => {
    loadRewardCatalog();
  }, [loadRewardCatalog]);

  // Sync balance when participant loads
  React.useEffect(() => {
    if (participant) {
      setBalance(participant.totalPoints ?? 0);
    }
  }, [participant]);

  const handleOpenClaim = (r: Reward) => {
    if (balance < r.pointsRequired) {
      setErrorMsg(`Saldo poin Anda (${balance} Pts) tidak mencukupi untuk reward "${r.name}" (${r.pointsRequired} Pts). Selesaikan misi challenge atau kunjungi stand festival untuk mengumpulkan lebih banyak poin.`);
      return;
    }
    setErrorMsg("");
    setDialogError("");
    setSelectedReward(r);
  };

  const handleConfirmClaim = async () => {
    if (!selectedReward) return;

    try {
      setIsSubmitting(true);
      setDialogError("");
      setErrorMsg("");

      const res = await redeemReward({
        participantId: participant?.id,
        rewardId: selectedReward.id,
      });

      if (!res.success) {
        setDialogError(res.error || "Gagal memproses penukaran reward.");
        return;
      }

      // Berhasil
      const pickupCode = res.data?.pickupCode || `RW-${Math.floor(1000 + Math.random() * 9000)}`;
      setClaimSuccess(pickupCode);

      if (res.data?.remainingPoints !== undefined) {
        setBalance(res.data.remainingPoints);
      } else {
        setBalance((prev) => Math.max(0, prev - selectedReward.pointsRequired));
      }

      setSelectedReward(null);

      // Sinkronkan data peserta & stok reward secara aktual dari database
      if (refetchParticipant) {
        await refetchParticipant();
      }
      await loadRewardCatalog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan koneksi saat memproses penukaran.";
      setDialogError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="peserta" participantPoints={balance}>
      <div className="space-y-6">
        <div>
          <Link
            href="/peserta"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda Peserta</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Gift className="h-7 w-7 text-accent" />
                <span>Katalog Penukaran Hadiah (Reward)</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tukarkan akumulasi poin Anda dengan merchandise resmi, voucher kopi, dan buku sastra eksklusif.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-accent/40 bg-accent/10 flex items-center gap-2 shrink-0">
              <Coins className="h-5 w-5 text-accent" />
              <div>
                <span className="text-[10px] text-muted-foreground block font-mono">Saldo Tersedia:</span>
                <span className="font-mono text-xl font-bold text-accent">{balance} Poin</span>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {claimSuccess && (
          <div className="p-6 rounded-2xl border border-success/40 bg-success/10 text-center space-y-3 animate-in zoom-in-95">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Penukaran Berhasil Diajukan!
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Tunjukkan kode pengambilan berikut kepada petugas di Stand Media Center:
            </p>
            <div className="font-mono text-2xl font-black text-accent bg-card py-2 px-4 rounded-lg inline-block border border-accent/40">
              {claimSuccess}
            </div>
            <div>
              <Button size="sm" onClick={() => setClaimSuccess(null)} className="text-xs">
                Tutup Notifikasi
              </Button>
            </div>
          </div>
        )}

        {/* Katalog Grid */}
        {rewards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((rew) => {
              const isAffordable = balance >= rew.pointsRequired;
              const remaining = rew.quota - rew.claimedCount;

              return (
                <Card key={rew.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-accent transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="gold" className="text-[10px]">
                        {rew.category}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-accent">
                        {rew.pointsRequired} Poin
                      </span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-foreground">
                      {rew.name}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {rew.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span>Sisa Stok:</span>
                      <strong>{remaining} unit</strong>
                    </div>

                    <Button
                      size="sm"
                      disabled={!isAffordable || remaining <= 0}
                      onClick={() => handleOpenClaim(rew)}
                      className="w-full text-xs font-semibold"
                    >
                      {remaining <= 0
                        ? "Kuota Habis"
                        : isAffordable
                        ? `Tukar (${rew.pointsRequired} Poin)`
                        : `Kurang ${rew.pointsRequired - balance} Poin`}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-border bg-card max-w-lg mx-auto space-y-3">
            <Gift className="h-12 w-12 text-accent mx-auto" />
            <h3 className="font-heading text-lg font-bold text-foreground">
              Belum Ada Katalog Merchandise
            </h3>
            <p className="text-xs text-muted-foreground">
              Merchandise dan hadiah penukaran poin challenge akan segera tersedia.
            </p>
          </div>
        )}

        {/* Modal Konfirmasi Tukar */}
        {selectedReward && (
          <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Konfirmasi Penukaran Reward</DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menukar <strong>{selectedReward.pointsRequired} poin</strong> untuk <strong>{selectedReward.name}</strong>?
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Saldo Saat Ini:</span>
                  <strong className="font-mono text-foreground">{balance} Pts</strong>
                </div>
                <div className="flex justify-between">
                  <span>Poin Terpotong:</span>
                  <strong className="font-mono text-danger">-{selectedReward.pointsRequired} Pts</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-semibold text-foreground">
                  <span>Sisa Saldo Baru:</span>
                  <strong className="font-mono text-accent">{balance - selectedReward.pointsRequired} Pts</strong>
                </div>
              </div>

              {dialogError && (
                <div className="p-3 rounded-xl border border-danger/40 bg-danger/10 text-danger text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setSelectedReward(null)}
                >
                  Batal
                </Button>
                <Button
                  disabled={isSubmitting}
                  onClick={handleConfirmClaim}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Ya, Tukar Sekarang"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
