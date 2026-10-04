"use client";

import * as React from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Coins,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  Building,
  Check,
  X,
  Loader2,
  History,
  Sparkles,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  getParticipantsForPointAdjustment,
  getManualPointHistory,
  adjustPointsByCommittee,
  type ParticipantPointOption,
  type ManualPointTransactionItem,
} from "@/app/actions/challenges";

export default function DashboardPoinManualPage() {
  const [participants, setParticipants] = React.useState<ParticipantPointOption[]>([]);
  const [history, setHistory] = React.useState<ManualPointTransactionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  // Searchable combobox states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedParticipant, setSelectedParticipant] = React.useState<ParticipantPointOption | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Form states
  const [pointsDelta, setPointsDelta] = React.useState("15");
  const [sourceType, setSourceType] = React.useState<"input_panitia" | "penyesuaian">("input_panitia");
  const [reason, setReason] = React.useState("");

  // Feedback states
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load participants & history from database
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [partRes, histRes] = await Promise.all([
        getParticipantsForPointAdjustment(),
        getManualPointHistory(),
      ]);

      if (partRes.success) {
        setParticipants(partRes.participants);
      }
      if (histRes.success) {
        setHistory(histRes.transactions);
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Gagal memuat data dari database.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Click outside listener for searchable dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered participants based on search query
  const filteredParticipants = React.useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.registrationNumber.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q))
    );
  }, [participants, searchQuery]);

  const handleSelectParticipant = (p: ParticipantPointOption) => {
    setSelectedParticipant(p);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleClearSelected = () => {
    setSelectedParticipant(null);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedParticipant) {
      setFeedback({
        type: "error",
        message: "Mohon pilih peserta penerima poin terlebih dahulu.",
      });
      return;
    }

    const pointsNum = parseInt(pointsDelta, 10);
    if (isNaN(pointsNum) || pointsNum === 0) {
      setFeedback({
        type: "error",
        message: "Jumlah poin harus berupa angka tidak nol.",
      });
      return;
    }

    if (!reason.trim()) {
      setFeedback({
        type: "error",
        message: "Catatan / alasan penyesuaian poin wajib diisi.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await adjustPointsByCommittee({
        participantId: selectedParticipant.id,
        points: pointsNum,
        source: sourceType,
        note: reason.trim(),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Berhasil mencatat mutasi ${pointsNum > 0 ? `+${pointsNum}` : pointsNum} Poin untuk ${selectedParticipant.fullName}.`,
        });
        setReason("");
        setPointsDelta("15");

        // Reload data to refresh current balances & ledger history
        await loadData();

        // Update selected participant total points locally
        setSelectedParticipant((prev) =>
          prev ? { ...prev, totalPoints: prev.totalPoints + pointsNum } : null
        );
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mencatat mutasi poin.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan sistem saat memproses transaksi poin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-8 max-w-4xl">
        {/* Header Navigation */}
        <div>
          <Link
            href="/dashboard/challenge"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelola Challenge</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Coins className="h-7 w-7 text-accent" />
                <span>Penyesuaian Poin Manual Panitia</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Entri transaksi poin tambahan atau koreksi ke ledger saldo peserta secara resmi dari database Supabase.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in-50 ${
              feedback.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form Card */}
        <Card className="p-6 sm:p-8 space-y-6 shadow-xs border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Searchable Participant Selector */}
            <div className="space-y-2 text-left" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pilih Peserta Penerima Poin <span className="text-danger">*</span>
                </label>
                {participants.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {participants.length} Peserta Terdaftar di Database
                  </span>
                )}
              </div>

              {selectedParticipant ? (
                /* Selected Participant Card */
                <div className="p-3.5 rounded-xl border-2 border-accent/60 bg-accent/5 flex items-center justify-between gap-3 animate-in fade-in-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 text-accent font-bold">
                      {selectedParticipant.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">
                          {selectedParticipant.fullName}
                        </p>
                        <Badge variant="gold" className="text-[10px] gap-1 shrink-0">
                          <Coins className="h-2.5 w-2.5" />
                          <span>Saldo: {selectedParticipant.totalPoints} Pts</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedParticipant.registrationNumber} • {selectedParticipant.institution}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelected}
                    className="text-xs gap-1 text-muted-foreground hover:text-danger cursor-pointer shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Ganti Peserta</span>
                  </Button>
                </div>
              ) : (
                /* Searchable Input + Dropdown List */
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Ketik nama, nomor registrasi (GBB-...), atau instansi peserta..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full h-11 rounded-xl border border-border bg-background pl-9 pr-10 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all placeholder:text-muted-foreground/70"
                    />
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Dropdown Results Box */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-lg p-1.5 space-y-1 animate-in fade-in-50">
                      {loading ? (
                        <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-accent" />
                          <span>Memuat daftar peserta dari database...</span>
                        </div>
                      ) : filteredParticipants.length > 0 ? (
                        filteredParticipants.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectParticipant(p)}
                            className="p-2.5 rounded-lg hover:bg-accent/10 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0 group-hover:bg-accent/20 group-hover:text-accent">
                                {p.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-foreground truncate group-hover:text-accent">
                                  {p.fullName}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  <span className="font-mono text-foreground/80">{p.registrationNumber}</span> • {p.institution}
                                </p>
                              </div>
                            </div>
                            <Badge variant="gold" className="text-[10px] shrink-0 font-mono">
                              {p.totalPoints} Poin
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center space-y-1">
                          <p className="text-xs font-semibold text-foreground">Tidak ada peserta yang cocok</p>
                          <p className="text-[11px] text-muted-foreground">
                            Coba kata kunci pencarian nama atau kode peserta lainnya.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Points & Source Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jumlah Poin (Positif / Negatif) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-muted-foreground mr-1">Preset:</span>
                  {[
                    { label: "+10", val: "10", color: "text-emerald-500" },
                    { label: "+25", val: "25", color: "text-emerald-500" },
                    { label: "+50", val: "50", color: "text-emerald-500" },
                    { label: "+100", val: "100", color: "text-emerald-500" },
                    { label: "-10", val: "-10", color: "text-rose-500" },
                    { label: "-25", val: "-25", color: "text-rose-500" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPointsDelta(preset.val)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted/60 hover:bg-muted text-foreground border border-border/50 cursor-pointer transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jenis Sumber Poin <span className="text-danger">*</span>
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value as any)}
                  className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="input_panitia">Input Khusus Panitia (Apresiasi / Hadiah / Kuis)</option>
                  <option value="penyesuaian">Koreksi Penyesuaian Saldo (Koreksi Sistem / Pembatalan)</option>
                </select>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Dicatat secara permanen di ledger transaksi dengan identitas panitia yang login.
                </p>
              </div>
            </div>

            {/* Reason Textarea */}
            <Textarea
              label="Catatan Alasan Pemberian / Koreksi Poin *"
              placeholder="Contoh: Apresiasi partisipasi aktif pada sesi Bedah Buku dan Tanya Jawab Sastrawan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !selectedParticipant}
              className="w-full text-xs font-semibold gap-2 cursor-pointer shadow-xs"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              <span>
                {selectedParticipant
                  ? `Simpan Mutasi (${parseInt(pointsDelta) > 0 ? `+${pointsDelta}` : pointsDelta} Poin) ke Saldo Peserta`
                  : "Pilih Peserta Terlebih Dahulu"}
              </span>
            </Button>
          </form>
        </Card>

        {/* History of Recent Manual Adjustments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              <span>Riwayat Mutasi Poin Manual Terbaru</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">
              {history.length} Transaksi Terakhir
            </span>
          </div>

          {history.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="divide-y divide-border">
                {history.map((h) => {
                  const isPositive = h.points > 0;
                  return (
                    <div
                      key={h.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-foreground">
                            {h.participantName}
                          </p>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            ({h.participantReg})
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.institution} • {h.note || "Tanpa catatan"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(h.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })} WIB
                        </span>
                        <Badge
                          variant={isPositive ? "success" : "danger"}
                          className="font-mono text-xs font-bold"
                        >
                          {isPositive ? `+${h.points}` : h.points} Poin
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl border border-dashed border-border bg-card space-y-1 text-muted-foreground">
              <History className="h-8 w-8 mx-auto opacity-50 mb-2" />
              <p className="text-xs font-semibold text-foreground">Belum ada riwayat mutasi poin manual</p>
              <p className="text-[11px]">
                Transaksi mutasi poin yang Anda tambahkan akan tercatat dan ditampilkan di sini.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
