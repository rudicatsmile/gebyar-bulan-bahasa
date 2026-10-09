"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  getParticipantGradingSheet,
  saveAssessment,
  GradingCriterionItem,
} from "@/app/actions/assessments";
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Sliders,
  AlertCircle,
  Loader2,
  User,
  UserCheck,
  Lock,
} from "lucide-react";

export default function FormPenilaianDigitalPage() {
  const router = useRouter();
  const params = useParams();
  const regId = params?.registrationId as string;

  const [loading, setLoading] = React.useState(true);
  const [notFoundState, setNotFoundState] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [participant, setParticipant] = React.useState<{
    registrationId: string;
    registrationNumber: string;
    fullName: string;
    teamName: string | null;
    members?: { id?: string; name: string; role?: string | null; isLeader?: boolean }[];
    institution: string;
  } | null>(null);

  const [competition, setCompetition] = React.useState<{
    id: string;
    name: string;
    slug: string;
    category: string;
    type?: string;
    stageName?: string | null;
    status?: string;
  } | null>(null);

  const [criteria, setCriteria] = React.useState<GradingCriterionItem[]>([]);
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "terkirim" | "final" | "belum_dinilai">(
    "belum_dinilai"
  );
  const [judgeName, setJudgeName] = React.useState("");
  const [feedbackNotice, setFeedbackNotice] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadSheet = React.useCallback(async () => {
    if (!regId) return;
    setLoading(true);
    try {
      const res = await getParticipantGradingSheet(regId);
      if (!res.success || !res.participant || !res.competition) {
        setNotFoundState(true);
      } else {
        setParticipant(res.participant);
        setCompetition(res.competition);
        setCriteria(res.criteria);
        setScores(res.existingScores);
        setComments(res.existingComments || {});
        setNotes(res.existingNotes || "");
        setStatus(res.status);
        if (res.judgeName) setJudgeName(res.judgeName);
      }
    } catch {
      setNotFoundState(true);
    } finally {
      setLoading(false);
    }
  }, [regId]);

  React.useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  if (notFoundState) {
    return notFound();
  }

  // Live calculation weighted total
  const isCompetitionLocked = competition?.status === "selesai";

  const weightedTotal = criteria.reduce((total, c) => {
    const scoreVal = scores[c.id] || 0;
    return total + (scoreVal * c.weight) / 100;
  }, 0);

  const handleScoreChange = (critId: string, val: number) => {
    setScores((prev) => ({ ...prev, [critId]: Math.min(100, Math.max(0, val)) }));
  };

  const handleSaveDraft = async () => {
    if (!competition || !participant) return;
    setIsSaving(true);
    setFeedbackNotice(null);

    try {
      const payloadScores = criteria.map((c) => ({
        criterionId: c.id,
        score: scores[c.id] ?? 85,
        comment: comments[c.id] || undefined,
      }));

      const res = await saveAssessment({
        registrationId: participant.registrationId,
        competitionId: competition.id,
        scores: payloadScores,
        notes,
        isFinal: false,
      });

      if (!res.success) {
        setFeedbackNotice({
          type: "error",
          message: res.error || "Gagal menyimpan draft penilaian.",
        });
      } else {
        setStatus("draft");
        setFeedbackNotice({
          type: "success",
          message: "Draft penilaian berhasil disimpan di database! Nilai belum dipublikasikan ke rekap final.",
        });
        setTimeout(() => setFeedbackNotice(null), 4000);
      }
    } catch (err: unknown) {
      setFeedbackNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan draft.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!competition || !participant) return;

    // Validasi kelengkapan kriteria
    const allFilled = criteria.every(
      (c) => scores[c.id] !== undefined && Number(scores[c.id]) > 0
    );
    if (!allFilled) {
      alert("Harap lengkapi nilai untuk seluruh kriteria penilaian sebelum mengirimkan nilai final.");
      return;
    }

    const confirmSubmit = window.confirm(
      `Kirim nilai final sebesar ${weightedTotal.toFixed(2)} pts untuk peserta ${participant.fullName}? Nilai akan langsung masuk ke rekapitulasi kejuaraan.`
    );
    if (!confirmSubmit) return;

    setIsSaving(true);
    setFeedbackNotice(null);

    try {
      const payloadScores = criteria.map((c) => ({
        criterionId: c.id,
        score: scores[c.id] ?? 85,
        comment: comments[c.id] || undefined,
      }));

      const res = await saveAssessment({
        registrationId: participant.registrationId,
        competitionId: competition.id,
        scores: payloadScores,
        notes,
        isFinal: true,
      });

      if (!res.success) {
        setFeedbackNotice({
          type: "error",
          message: res.error || "Gagal mengirim penilaian final.",
        });
        setIsSaving(false);
      } else {
        setStatus("terkirim");
        setFeedbackNotice({
          type: "success",
          message: "Penilaian final berhasil dikirimkan ke database dan diagregasikan ke rekapitulasi lomba!",
        });
        setTimeout(() => {
          router.push(`/juri/lomba/${competition.slug}`);
        }, 1500);
      }
    } catch (err: unknown) {
      setFeedbackNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim nilai final.",
      });
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="juri">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Memuat lembar penilaian digital peserta...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!participant || !competition) {
    return notFound();
  }

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <Link
            href={`/juri/lomba/${competition.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Roster Peserta ({competition.name})</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="gold" className="text-[10px]">
                  FORM PENILAIAN DIGITAL JURI
                </Badge>
                <span className="font-mono text-xs font-bold text-accent">
                  {participant.registrationNumber}
                </span>
                {judgeName && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <UserCheck className="h-3 w-3 text-accent" />
                    {judgeName}
                  </span>
                )}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {competition.category?.toLowerCase() === "kelompok" ||
                competition.type === "kelompok" ||
                Boolean(participant.teamName)
                  ? (participant.teamName || participant.fullName)
                  : participant.fullName}
              </h1>
              {(competition.category?.toLowerCase() === "kelompok" ||
                competition.type === "kelompok" ||
                Boolean(participant.teamName)) &&
              participant.members &&
              participant.members.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5 mb-1">
                  {participant.members.map((m, mIdx) => (
                    <span
                      key={m.id || mIdx}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                        m.isLeader || m.role?.toLowerCase() === "ketua"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
                          : "bg-muted/70 text-foreground border-border/60"
                      }`}
                    >
                      <User className="h-3 w-3 opacity-70" />
                      <span>{m.name}</span>
                      {m.role && (
                        <span className="text-[9px] opacity-80">
                          ({m.role})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (competition.category?.toLowerCase() === "kelompok" ||
                  competition.type === "kelompok" ||
                  Boolean(participant.teamName)) &&
                participant.teamName &&
                participant.fullName &&
                participant.fullName !== participant.teamName ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ketua / Perwakilan: <span className="font-medium text-foreground">{participant.fullName}</span>
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {participant.institution} • Cabang: <strong>{competition.name}</strong>{" "}
                {competition.stageName ? `(${competition.stageName})` : ""}
              </p>
            </div>

            {/* Live Weighted Total Card */}
            <div className="p-4 rounded-xl border border-accent/40 bg-accent/10 text-center sm:text-right shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-bold block">
                Total Terbobot (Live Calculation):
              </span>
              <span className="font-mono text-3xl font-black text-accent">
                {weightedTotal.toFixed(2)}
              </span>
              <span className="text-[11px] text-muted-foreground block">Skor Maksimal: 100.00</span>
            </div>
          </div>
        </div>

        {isCompetitionLocked && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3">
            <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-bold">Penilaian Dikunci (Mode Hanya-Baca)</p>
              <p className="text-[11px] mt-0.5">
                Nilai untuk cabang lomba ini telah difinalisasi dan dikunci oleh Panitia / Seksi Acara. Perubahan atau pengiriman nilai baru tidak diperkenankan.
              </p>
            </div>
          </div>
        )}

        {feedbackNotice && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in-50 ${feedbackNotice.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
          >
            {feedbackNotice.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{feedbackNotice.message}</span>
          </div>
        )}

        {/* Criteria Sliders & Inputs */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-accent" />
            <span>Skor Kriteria Penilaian Berbobot</span>
          </h2>

          <div className="space-y-4">
            {criteria.map((crit) => {
              const currentScore = scores[crit.id] ?? 85;
              const contribution = ((currentScore * crit.weight) / 100).toFixed(2);

              return (
                <Card key={crit.id} className="p-5 space-y-4 border-border bg-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          Bobot {crit.weight}%
                        </span>
                        <h3 className="font-heading text-base font-bold text-foreground">
                          {crit.name}
                        </h3>
                      </div>
                      {crit.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{crit.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 sm:shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          Kontribusi: +{contribution}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={crit.maxScore}
                          value={currentScore}
                          disabled={isCompetitionLocked}
                          onChange={(e) =>
                            handleScoreChange(crit.id, parseFloat(e.target.value) || 0)
                          }
                          className="h-10 w-20 rounded-lg border border-border bg-background px-3 text-center font-mono text-lg font-bold text-foreground focus:outline-none focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Range Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={crit.maxScore}
                      value={currentScore}
                      disabled={isCompetitionLocked}
                      onChange={(e) =>
                        handleScoreChange(crit.id, parseFloat(e.target.value) || 0)
                      }
                      className="w-full accent-[hsl(var(--accent))] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>0</span>
                      <span>50</span>
                      <span>Maks: {crit.maxScore}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Catatan Kualitatif Juri */}
        <Card className="p-5 space-y-3">
          <h3 className="font-heading text-sm font-bold text-foreground">
            Catatan Kualitatif / Komentar Evaluasi Dewan Juri
          </h3>
          <Textarea
            placeholder="Tuliskan catatan apresiasi, saran pengembangan vokal/ekspresi, atau hal yang perlu diperbaiki peserta..."
            value={notes}
            disabled={isCompetitionLocked}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </Card>

        {/* Action Buttons */}
        <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Status Nilai Saat Ini:{" "}
            <Badge
              variant={
                status === "terkirim" || status === "final"
                  ? "success"
                  : status === "draft"
                    ? "warning"
                    : "default"
              }
              className="text-[10px]"
            >
              {status === "terkirim" || status === "final"
                ? "TERKIRIM FINAL"
                : status === "draft"
                  ? "DRAFT (TERSEMBUNYI)"
                  : "BELUM DINILAI"}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving || isCompetitionLocked}
              onClick={handleSaveDraft}
              className="text-xs gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Simpan Draft</span>
            </Button>
            <Button
              type="button"
              disabled={isSaving || isCompetitionLocked}
              onClick={handleSubmitFinal}
              size="lg"
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Kirimkan Nilai Final</span>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
