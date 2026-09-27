"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PARTICIPANTS } from "@/lib/dummy-data";
import { Coins, ArrowLeft, CheckCircle2, History } from "lucide-react";

export default function DashboardPoinManualPage() {
  const [selectedParticipantId, setSelectedParticipantId] = React.useState(PARTICIPANTS[0].id);
  const [pointsDelta, setPointsDelta] = React.useState("15");
  const [sourceType, setSourceType] = React.useState("input_panitia");
  const [reason, setReason] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setReason("");
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6 max-w-3xl">
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Coins className="h-7 w-7 text-accent" />
              <span>Penyesuaian Poin Manual Panitia</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Entri transaksi poin tambahan atau koreksi ke ledger saldo peserta. Seluruh mutasi dicatat secara permanen untuk audit.
            </p>
          </div>
        </div>

        {submitted && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              Penyesuaian poin berhasil dicatat ke ledger transaksi dan saldo peserta telah diperbarui!
            </span>
          </div>
        )}

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pilih Peserta Penerima Poin *
              </label>
              <select
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
              >
                {PARTICIPANTS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.institution}) — Saldo: {p.totalPoints} Poin
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Jumlah Poin (Positif / Negatif) *"
                type="number"
                value={pointsDelta}
                onChange={(e) => setPointsDelta(e.target.value)}
                helperText="Gunakan tanda minus (-) untuk pemotongan koreksi."
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jenis Sumber Poin *
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none"
                >
                  <option value="input_panitia">Input Khusus Panitia</option>
                  <option value="penyesuaian">Koreksi Penyesuaian Saldo</option>
                  <option value="bonus_kuis">Bonus Kuis Interaktif</option>
                </select>
              </div>
            </div>

            <Textarea
              label="Catatan Alasan Pemberian / Koreksi Poin *"
              placeholder="Contoh: Apresiasi keaktifan bertanya pada Talkshow Budaya sesi pagi..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />

            <Button type="submit" size="lg" className="w-full text-xs font-semibold gap-2">
              <Coins className="h-4 w-4" />
              <span>Simpan Mutasi Poin ke Ledger</span>
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
