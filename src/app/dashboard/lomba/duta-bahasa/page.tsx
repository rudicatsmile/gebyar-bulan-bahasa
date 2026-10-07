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
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Crown,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Save,
  RotateCcw,
  Calendar,
  Award,
  XCircle,
  Clock,
  Star,
  Edit2,
} from "lucide-react";
import type {
  DutaBahasaStage,
  DutaBahasaParticipantInfo,
  DutaBahasaParticipantStatus,
} from "@/app/actions/duta-bahasa";
import {
  getDutaBahasaStages,
  getDutaBahasaProgress,
  saveDutaBahasaStages,
  resetDutaBahasaStagesToDefault,
  updateParticipantStageStatus,
  addParticipantToDutaBahasa,
  removeParticipantFromDutaBahasa,
} from "@/app/actions/duta-bahasa";

// ======================================================================
// HELPERS
// ======================================================================

const statusLabel: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "Terdaftar",
  lolos: "Lolos",
  tidak_lolos: "Tidak Lolos",
  menunggu: "Menunggu",
};

const statusBadge: Record<DutaBahasaParticipantStatus, string> = {
  terdaftar: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  lolos: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  tidak_lolos: "bg-red-500/15 text-red-700 border-red-500/30",
  menunggu: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

const overallStatusLabel: Record<DutaBahasaParticipantInfo["overallStatus"], string> = {
  aktif: "Aktif",
  tereliminasi: "Tereliminasi",
  finalis: "Finalis 3 Besar",
  pemenang: "Duta Bahasa Terpilih",
};

const overallStatusBadge: Record<DutaBahasaParticipantInfo["overallStatus"], string> = {
  aktif: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  tereliminasi: "bg-red-500/15 text-red-700 border-red-500/30",
  finalis: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  pemenang: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const stageStatusLabel: Record<DutaBahasaStage["status"], string> = {
  upcoming: "Akan Datang",
  active: "Sedang Berlangsung",
  completed: "Selesai",
};

const stageStatusBadge: Record<DutaBahasaStage["status"], string> = {
  upcoming: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  active: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

// ======================================================================
// MAIN COMPONENT
// ======================================================================

export default function DashboardDutaBahasaPage() {
  const [stages, setStages] = React.useState<DutaBahasaStage[]>([]);
  const [participants, setParticipants] = React.useState<DutaBahasaParticipantInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isMounted, setIsMounted] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Expanded stage view
  const [expandedStage, setExpandedStage] = React.useState<string | null>(null);

  // Edit stages dialog
  const [editStagesOpen, setEditStagesOpen] = React.useState(false);
  const [editingStages, setEditingStages] = React.useState<DutaBahasaStage[]>([]);
  const [isSavingStages, setIsSavingStages] = React.useState(false);
  const [isResettingStages, setIsResettingStages] = React.useState(false);

  // Add participant dialog
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [addParticipantId, setAddParticipantId] = React.useState("");
  const [addLoading, setAddLoading] = React.useState(false);

  // Update status dialog
  const [updateDialog, setUpdateDialog] = React.useState<{
    participantId: string;
    participantName: string;
    stageId: string;
    stageTitle: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = React.useState<DutaBahasaParticipantStatus>("menunggu");
  const [updateScore, setUpdateScore] = React.useState("");
  const [updateNotes, setUpdateNotes] = React.useState("");
  const [updateLoading, setUpdateLoading] = React.useState(false);

  // Participant search for adding
  const [searchResults, setSearchResults] = React.useState<
    Array<{ id: string; full_name: string; institution: string; registration_number: string }>
  >([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchLoading, setSearchLoading] = React.useState(false);

  // ======================================================================
  // DATA LOADING
  // ======================================================================

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [stagesRes, progressRes] = await Promise.all([
        getDutaBahasaStages(),
        getDutaBahasaProgress(),
      ]);
      setStages(stagesRes.stages);
      setParticipants(progressRes.participants);
    } catch (err) {
      console.error("Load error:", err);
      setFeedback({ type: "error", message: "Gagal memuat data Duta Bahasa." });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ======================================================================
  // STAGE STATUS UPDATE
  // ======================================================================

  const handleSaveStageStatus = async (stageId: string, newStatus: DutaBahasaStage["status"]) => {
    const updatedStages = stages.map((s) =>
      s.id === stageId ? { ...s, status: newStatus } : s
    );
    setSaving(true);
    const res = await saveDutaBahasaStages(updatedStages);
    setSaving(false);
    if (res.success) {
      setStages(updatedStages);
      setFeedback({ type: "success", message: "Status tahapan berhasil diperbarui!" });
    } else {
      setFeedback({ type: "error", message: res.error || "Gagal menyimpan status tahapan." });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // ======================================================================
  // EDIT ALL STAGES (TITLE, DATES, DESCRIPTIONS)
  // ======================================================================

  const handleOpenEditStages = () => {
    setEditingStages(JSON.parse(JSON.stringify(stages)));
    setEditStagesOpen(true);
  };

  const handleStageFieldChange = (
    index: number,
    field: keyof DutaBahasaStage,
    value: unknown
  ) => {
    setEditingStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveEditedStages = async () => {
    try {
      setIsSavingStages(true);
      const res = await saveDutaBahasaStages(editingStages);
      if (res.success) {
        setStages(editingStages);
        setFeedback({
          type: "success",
          message: "Perubahan konfigurasi tahapan Duta Bahasa berhasil disimpan ke database!",
        });
        setEditStagesOpen(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan perubahan tahapan.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan tahapan.",
      });
    } finally {
      setIsSavingStages(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleResetStagesToDefault = async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Apakah Anda yakin ingin memuat ulang seluruh judul dan tanggal tahapan ke konfigurasi standar bawaan terbaru?"
      );
      if (!ok) return;
    }
    try {
      setIsResettingStages(true);
      const res = await resetDutaBahasaStagesToDefault();
      if (res.success) {
        setStages(res.stages);
        setEditingStages(JSON.parse(JSON.stringify(res.stages)));
        setFeedback({
          type: "success",
          message: "Seluruh nama dan jadwal tahapan berhasil direset ke standar default terbaru!",
        });
        setEditStagesOpen(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mereset tahapan ke standar.",
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mereset tahapan.",
      });
    } finally {
      setIsResettingStages(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // ======================================================================
  // ADD PARTICIPANT
  // ======================================================================

  const handleSearchParticipant = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/participants?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.participants || []);
      }
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddParticipant = async (participantId: string) => {
    setAddLoading(true);
    const res = await addParticipantToDutaBahasa(participantId);
    setAddLoading(false);
    if (res.success) {
      setFeedback({ type: "success", message: "Peserta berhasil ditambahkan ke Duta Bahasa!" });
      setShowAddDialog(false);
      setSearchQuery("");
      setSearchResults([]);
      loadData();
    } else {
      setFeedback({ type: "error", message: res.error || "Gagal menambahkan peserta." });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // ======================================================================
  // REMOVE PARTICIPANT
  // ======================================================================

  const handleRemoveParticipant = async (participantId: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${name}" dari Duta Bahasa?`)) return;
    const res = await removeParticipantFromDutaBahasa(participantId);
    if (res.success) {
      setFeedback({ type: "success", message: `${name} dihapus dari Duta Bahasa.` });
      loadData();
    } else {
      setFeedback({ type: "error", message: res.error || "Gagal menghapus peserta." });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // ======================================================================
  // UPDATE PARTICIPANT STAGE STATUS
  // ======================================================================

  const handleUpdateStatus = async () => {
    if (!updateDialog) return;
    setUpdateLoading(true);
    const res = await updateParticipantStageStatus({
      participantId: updateDialog.participantId,
      stageId: updateDialog.stageId,
      status: updateStatus,
      score: updateScore ? Number(updateScore) : null,
      notes: updateNotes,
    });
    setUpdateLoading(false);
    if (res.success) {
      setFeedback({ type: "success", message: "Status peserta berhasil diperbarui!" });
      setUpdateDialog(null);
      loadData();
    } else {
      setFeedback({ type: "error", message: res.error || "Gagal update status peserta." });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  // ======================================================================
  // STATS
  // ======================================================================

  const totalParticipants = participants.length;
  const activeCount = participants.filter((p) => p.overallStatus === "aktif").length;
  const eliminatedCount = participants.filter((p) => p.overallStatus === "tereliminasi").length;
  const finalistCount = participants.filter(
    (p) => p.overallStatus === "finalis" || p.overallStatus === "pemenang"
  ).length;

  // ======================================================================
  // RENDER
  // ======================================================================

  return (
    <DashboardLayout role="seksi_acara">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div>
          <Link
            href="/dashboard/lomba"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar Lomba</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-6 w-6 text-amber-500" />
                <Badge variant="gold" className="text-[10px]">
                  LOMBA BERTAHAP
                </Badge>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Duta Bahasa dan Budaya
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Kelola tahapan seleksi peserta dari pendaftaran hingga Grand Final.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isMounted ? loading : false}
                suppressHydrationWarning
                className="text-xs gap-1.5 cursor-pointer"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isMounted && loading ? "animate-spin" : ""}`} />
                <span>Muat Ulang</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="text-xs gap-1.5 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Tambah Peserta</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 animate-in fade-in-50 ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
            <p className="text-xs">Memuat data tahapan Duta Bahasa...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 flex flex-col items-center text-center">
                <Users className="h-5 w-5 text-accent mb-1" />
                <p className="text-2xl font-bold text-foreground">{totalParticipants}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Peserta</p>
              </Card>
              <Card className="p-4 flex flex-col items-center text-center">
                <Clock className="h-5 w-5 text-sky-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Masih Aktif</p>
              </Card>
              <Card className="p-4 flex flex-col items-center text-center">
                <XCircle className="h-5 w-5 text-red-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{eliminatedCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tereliminasi</p>
              </Card>
              <Card className="p-4 flex flex-col items-center text-center">
                <Star className="h-5 w-5 text-amber-500 mb-1" />
                <p className="text-2xl font-bold text-foreground">{finalistCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Finalis / Pemenang</p>
              </Card>
            </div>

            {/* Timeline Tahapan */}
            <Card className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  <span>Timeline Tahapan</span>
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditStages}
                  className="gap-1.5 text-xs font-semibold self-start sm:self-auto cursor-pointer border-border hover:bg-muted"
                >
                  <Edit2 className="h-3.5 w-3.5 text-accent" />
                  <span>Edit Tahapan</span>
                </Button>
              </div>

              <div className="space-y-4">
                {stages.map((stage, idx) => {
                  const isExpanded = expandedStage === stage.id;
                  const stageParticipants = participants.filter((p) => {
                    const progress = p.progress[stage.id];
                    return !!progress;
                  });

                  return (
                    <div key={stage.id} className="border border-border rounded-xl overflow-hidden bg-card">
                      {/* Stage Header */}
                      <div
                        className="p-3.5 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-3"
                        onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                      >
                        <div className="flex items-start gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                          {/* Timeline Indicator */}
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 ${
                                stage.status === "completed"
                                  ? "bg-emerald-500 text-white border-emerald-500"
                                  : stage.status === "active"
                                  ? "bg-amber-500 text-white border-amber-500 animate-pulse"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {stage.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                              ) : (
                                stage.stageOrder
                              )}
                            </div>
                          </div>

                          {/* Stage Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading text-xs sm:text-sm font-bold text-foreground">
                                {stage.title}
                              </h3>
                              <Badge
                                className={`text-[10px] border ${stageStatusBadge[stage.status]}`}
                              >
                                {stageStatusLabel[stage.status]}
                              </Badge>
                            </div>
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-accent shrink-0" />
                                <span>{stage.stageDayLabel}</span>
                              </span>
                              <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                              <span className="bg-muted/60 px-1.5 py-0.5 rounded text-[10px] sm:bg-transparent sm:p-0">
                                {stageParticipants.length} peserta
                              </span>
                            </p>
                          </div>

                          {/* Mobile Expand Chevron */}
                          <div className="shrink-0 pt-0.5 sm:hidden">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Status Toggle & Desktop Expand Chevron */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t border-border/40 sm:border-0 shrink-0">
                          <span className="text-[11px] text-muted-foreground font-medium sm:hidden">
                            Status Tahap:
                          </span>
                          <div className="flex items-center gap-2">
                            <select
                              value={stage.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleSaveStageStatus(
                                  stage.id,
                                  e.target.value as DutaBahasaStage["status"]
                                );
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-md border border-border bg-background text-foreground cursor-pointer focus:ring-1 focus:ring-accent"
                            >
                              <option value="upcoming">Akan Datang</option>
                              <option value="active">Berlangsung</option>
                              <option value="completed">Selesai</option>
                            </select>
                            <div className="hidden sm:block">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded: Participants View */}
                      {isExpanded && (
                        <div className="border-t border-border p-3.5 sm:p-4 bg-muted/10">
                          <p className="text-xs text-muted-foreground mb-3">
                            {stage.description}
                          </p>

                          {stageParticipants.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                              Belum ada peserta di tahap ini.
                            </p>
                          ) : (
                            <>
                              {/* Mobile Participant Card List */}
                              <div className="space-y-2.5 sm:hidden">
                                {stageParticipants.map((p, pIdx) => {
                                  const progress = p.progress[stage.id];
                                  return (
                                    <div
                                      key={p.participantId}
                                      className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                              #{pIdx + 1}
                                            </span>
                                            <p className="font-bold text-foreground">{p.fullName}</p>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground font-mono">
                                            {p.registrationNumber} • {p.institution || "-"}
                                          </p>
                                        </div>
                                        <Badge
                                          className={`text-[9px] border shrink-0 ${
                                            statusBadge[progress?.status || "terdaftar"]
                                          }`}
                                        >
                                          {statusLabel[progress?.status || "terdaftar"]}
                                        </Badge>
                                      </div>

                                      {(progress?.score != null || progress?.notes) && (
                                        <div className="pt-1.5 border-t border-border/40 text-[11px] flex items-center justify-between text-muted-foreground">
                                          <span>
                                            Skor:{" "}
                                            <strong className="text-foreground font-mono">
                                              {progress?.score != null ? progress.score : "-"}
                                            </strong>
                                          </span>
                                          {progress?.notes && (
                                            <span className="truncate max-w-[140px] text-muted-foreground">
                                              {progress.notes}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      <div className="pt-1 flex items-center justify-end">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-[11px] h-7 px-3 w-full cursor-pointer"
                                          onClick={() => {
                                            setUpdateDialog({
                                              participantId: p.participantId,
                                              participantName: p.fullName,
                                              stageId: stage.id,
                                              stageTitle: stage.title,
                                            });
                                            setUpdateStatus(progress?.status || "menunggu");
                                            setUpdateScore(
                                              progress?.score != null
                                                ? String(progress.score)
                                                : ""
                                            );
                                            setUpdateNotes(progress?.notes || "");
                                          }}
                                        >
                                          Kelola Status & Nilai
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Desktop/Tablet Participant Table */}
                              <div className="hidden sm:block overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-[10px] w-8">#</TableHead>
                                      <TableHead className="text-[10px]">Peserta</TableHead>
                                      <TableHead className="text-[10px]">Institusi</TableHead>
                                      <TableHead className="text-[10px]">Status Tahap</TableHead>
                                      <TableHead className="text-[10px]">Skor</TableHead>
                                      <TableHead className="text-[10px]">Catatan</TableHead>
                                      <TableHead className="text-[10px] text-right">Aksi</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {stageParticipants.map((p, pIdx) => {
                                      const progress = p.progress[stage.id];
                                      return (
                                        <TableRow key={p.participantId}>
                                          <TableCell className="text-xs font-mono">
                                            {pIdx + 1}
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <p className="text-xs font-semibold text-foreground">
                                                {p.fullName}
                                              </p>
                                              <p className="text-[10px] text-muted-foreground font-mono">
                                                {p.registrationNumber}
                                              </p>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground">
                                            {p.institution || "-"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              className={`text-[10px] border ${
                                                statusBadge[progress?.status || "terdaftar"]
                                              }`}
                                            >
                                              {statusLabel[progress?.status || "terdaftar"]}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-xs font-mono">
                                            {progress?.score != null ? progress.score : "-"}
                                          </TableCell>
                                          <TableCell className="text-[10px] text-muted-foreground max-w-[150px] truncate">
                                            {progress?.notes || "-"}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-[10px] h-7 px-2 cursor-pointer"
                                                onClick={() => {
                                                  setUpdateDialog({
                                                    participantId: p.participantId,
                                                    participantName: p.fullName,
                                                    stageId: stage.id,
                                                    stageTitle: stage.title,
                                                  });
                                                  setUpdateStatus(progress?.status || "menunggu");
                                                  setUpdateScore(
                                                    progress?.score != null
                                                      ? String(progress.score)
                                                      : ""
                                                  );
                                                  setUpdateNotes(progress?.notes || "");
                                                }}
                                              >
                                                Kelola
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* All Participants Overview */}
            <Card className="p-6 sm:p-8">
              <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" />
                <span>Ringkasan Seluruh Peserta Duta Bahasa</span>
              </h2>

              {participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">
                    Belum ada peserta yang terdaftar di Duta Bahasa.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 text-xs gap-1.5 cursor-pointer"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Tambah Peserta Pertama</span>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] w-8">#</TableHead>
                        <TableHead className="text-[10px]">No. Registrasi</TableHead>
                        <TableHead className="text-[10px]">Nama Peserta</TableHead>
                        <TableHead className="text-[10px]">Institusi</TableHead>
                        <TableHead className="text-[10px]">Tahap Saat Ini</TableHead>
                        <TableHead className="text-[10px]">Status Keseluruhan</TableHead>
                        <TableHead className="text-[10px] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((p, idx) => (
                        <TableRow key={p.participantId}>
                          <TableCell className="text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {p.registrationNumber}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground">
                            {p.fullName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.institution || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-foreground">
                              Tahap {p.currentStageOrder} —{" "}
                              {stages.find((s) => s.id === p.currentStageId)?.title || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-[10px] border ${
                                overallStatusBadge[p.overallStatus]
                              }`}
                            >
                              {overallStatusLabel[p.overallStatus]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-7 w-7 p-0 cursor-pointer"
                              onClick={() =>
                                handleRemoveParticipant(p.participantId, p.fullName)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ============================================================= */}
        {/* ADD PARTICIPANT DIALOG */}
        {/* ============================================================= */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Peserta ke Duta Bahasa</DialogTitle>
              <DialogDescription>
                Cari peserta berdasarkan nama atau nomor registrasi. Peserta akan otomatis
                didaftarkan ke Tahap 1 (Pendaftaran).
              </DialogDescription>
            </DialogHeader>

            <Input
              label="Cari Peserta"
              placeholder="Ketik nama atau no. registrasi..."
              value={searchQuery}
              onChange={(e) => handleSearchParticipant(e.target.value)}
            />

            {searchLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Mencari peserta...</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {searchResults.map((p) => {
                  const alreadyAdded = participants.some(
                    (pp) => pp.participantId === p.id
                  );
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {p.full_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.registration_number} · {p.institution || "Umum"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyAdded ? "outline" : "default"}
                        disabled={alreadyAdded || addLoading}
                        className="text-[10px] h-7 cursor-pointer"
                        onClick={() => handleAddParticipant(p.id)}
                      >
                        {alreadyAdded ? "Sudah Terdaftar" : "Tambahkan"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Tidak ditemukan peserta dengan kata kunci "{searchQuery}"
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddDialog(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="text-xs cursor-pointer"
              >
                Tutup
              </Button>
            </DialogFooter>
          </div>
        </Dialog>

        {/* ============================================================= */}
        {/* UPDATE STATUS DIALOG */}
        {/* ============================================================= */}
        <Dialog open={!!updateDialog} onOpenChange={(o) => !o && setUpdateDialog(null)}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Update Status Peserta</DialogTitle>
              <DialogDescription>
                {updateDialog?.participantName} — Tahap: {updateDialog?.stageTitle}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Status Tahapan *
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) =>
                    setUpdateStatus(e.target.value as DutaBahasaParticipantStatus)
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground cursor-pointer"
                >
                  <option value="terdaftar">Terdaftar</option>
                  <option value="menunggu">Menunggu Penilaian</option>
                  <option value="lolos">✅ Lolos ke Tahap Berikutnya</option>
                  <option value="tidak_lolos">❌ Tidak Lolos (Eliminasi)</option>
                </select>
              </div>

              <Input
                label="Skor / Nilai (Opsional)"
                type="number"
                min={0}
                max={100}
                step={0.01}
                placeholder="0 - 100"
                value={updateScore}
                onChange={(e) => setUpdateScore(e.target.value)}
              />

              <Textarea
                label="Catatan (Opsional)"
                placeholder="Catatan penilaian juri atau alasan keputusan..."
                rows={3}
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpdateDialog(null)}
                className="text-xs cursor-pointer"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                disabled={updateLoading}
                className="text-xs gap-1.5 cursor-pointer"
              >
                {updateLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>

        {/* ============================================================= */}
        {/* EDIT STAGES DIALOG */}
        {/* ============================================================= */}
        <Dialog open={editStagesOpen} onOpenChange={setEditStagesOpen}>
          <div className="space-y-4 max-w-2xl w-full max-h-[85vh] flex flex-col p-1 sm:p-2">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-accent" />
                <DialogTitle>Kelola & Edit Tahapan Duta Bahasa</DialogTitle>
              </div>
              <DialogDescription>
                Sesuaikan nama tahapan, deskripsi, tanggal pelaksanaan, dan status tiap tahapan seleksi.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
              {editingStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="p-4 border border-border rounded-xl bg-card space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                        {stage.stageOrder}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Tahap {stage.stageOrder}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`edit-stage-status-${stage.id}`} className="text-[11px] text-muted-foreground">Status:</label>
                      <select
                        id={`edit-stage-status-${stage.id}`}
                        value={stage.status}
                        onChange={(e) =>
                          handleStageFieldChange(
                            idx,
                            "status",
                            e.target.value as DutaBahasaStage["status"]
                          )
                        }
                        className="h-7 text-xs rounded-md border border-border bg-background px-2 font-medium focus:ring-1 focus:ring-accent"
                      >
                        <option value="upcoming">Akan Datang (Upcoming)</option>
                        <option value="active">Sedang Berlangsung (Aktif)</option>
                        <option value="completed">Selesai (Completed)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Judul Tahap *
                    </label>
                    <Input
                      value={stage.title}
                      onChange={(e) => handleStageFieldChange(idx, "title", e.target.value)}
                      placeholder="Contoh: Seleksi Administrasi dan Wawancara"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Label Hari & Tanggal Tampil
                      </label>
                      <Input
                        value={stage.stageDayLabel}
                        onChange={(e) =>
                          handleStageFieldChange(idx, "stageDayLabel", e.target.value)
                        }
                        placeholder="Contoh: Sabtu, 17 Oktober 2026"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Tanggal Kalender (ISO)
                      </label>
                      <Input
                        type="date"
                        value={stage.stageDate}
                        onChange={(e) =>
                          handleStageFieldChange(idx, "stageDate", e.target.value)
                        }
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Deskripsi / Penjelasan Tahap
                    </label>
                    <Textarea
                      rows={2}
                      value={stage.description}
                      onChange={(e) =>
                        handleStageFieldChange(idx, "description", e.target.value)
                      }
                      placeholder="Penjelasan ringkas tahapan seleksi..."
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetStagesToDefault}
                disabled={isResettingStages || isSavingStages}
                className="text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/30 gap-1.5 cursor-pointer w-full sm:w-auto"
                title="Kembalikan semua nama dan jadwal tahapan ke standar bawaan terbaru"
              >
                {isResettingStages ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Reset ke Standar Bawaan</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditStagesOpen(false)}
                  disabled={isSavingStages}
                  className="text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditedStages}
                  disabled={isSavingStages}
                  className="text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {isSavingStages ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{isSavingStages ? "Menyimpan..." : "Simpan Perubahan Tahapan"}</span>
                </Button>
              </div>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
