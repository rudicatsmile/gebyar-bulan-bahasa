"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PARTICIPANTS, COMPETITIONS, SCORING_RECAPS } from "@/lib/dummy-data";
import { ArrowLeft, Save, Send, CheckCircle2, Sliders, AlertCircle } from "lucide-react";

export default function FormPenilaianDigitalPage() {
  const router = useRouter();
  const params = useParams();
  const regId = params?.registrationId as string;

  const participant = PARTICIPANTS.find((p) => p.id === regId);
  if (!participant) return notFound();

  const comp = COMPETITIONS.find((c) => c.id === participant.competitionId);
  if (!comp) return notFound();

  // Existing scores if any
  const existingRecap = SCORING_RECAPS[comp.id]?.find((r) => r.registrationId === regId);
  const myExistingGrading = existingRecap?.scoresPerJudge.find((j) => j.judgeId === "judge-1");

  // State skor per kriteria
  const [scores, setScores] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    comp.criteria.forEach((c) => {
      init[c.id] = myExistingGrading?.scores[c.id] ?? 85;
    });
    return init;
  });

  const [notes, setNotes] = React.useState(myExistingGrading?.notes || "");
  const [status, setStatus] = React.useState<"draft" | "terkirim">(
    myExistingGrading?.status || "draft"
  );
  const [feedbackNotice, setFeedbackNotice] = React.useState("");

  // Live calculation weighted total
  const weightedTotal = comp.criteria.reduce((total, c) => {
    const scoreVal = scores[c.id] || 0;
    return total + (scoreVal * c.weight) / 100;
  }, 0);

  const handleScoreChange = (critId: string, val: number) => {
    setScores((prev) => ({ ...prev, [critId]: Math.min(100, Math.max(0, val)) }));
  };

  const handleSaveDraft = () => {
    setStatus("draft");
    setFeedbackNotice("Draft penilaian berhasil disimpan! Nilai belum dipublikasikan ke rekap.");
    setTimeout(() => setFeedbackNotice(""), 3500);
  };

  const handleSubmitFinal = () => {
    // Validasi kelengkapan
    const allFilled = comp.criteria.every((c) => scores[c.id] !== undefined && scores[c.id] > 0);
    if (!allFilled) {
      alert("Harap lengkapi nilai untuk seluruh kriteria penilaian sebelum mengirimkan nilai final.");
      return;
    }
    setStatus("terkirim");
    setFeedbackNotice("Penilaian final berhasil dikirimkan dan langsung diagregasikan ke rekapitulasi lomba!");
    setTimeout(() => {
      router.push(`/juri/lomba/${comp.slug}`);
    }, 1500);
  };

  return (
    <DashboardLayout role="juri">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <Link
            href={`/juri/lomba/${comp.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Roster Peserta</span>
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
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {participant.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">
                {participant.institution} • Cabang: <strong>{comp.name}</strong>
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

        {feedbackNotice && (
          <div className="p-4 rounded-xl border border-success/40 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Criteria Sliders & Inputs */}
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-5 w-5 text-accent" />
            <span>Skor Kriteria Penilaian Berbobot</span>
          </h2>

          <div className="space-y-4">
            {comp.criteria.map((crit) => {
              const currentScore = scores[crit.id] || 0;
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
                      <p className="text-xs text-muted-foreground">{crit.description}</p>
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
                          onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value) || 0)}
                          className="h-10 w-20 rounded-lg border border-border bg-background px-3 text-center font-mono text-lg font-bold text-foreground focus:outline-none focus:border-accent"
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
                      onChange={(e) => handleScoreChange(crit.id, parseFloat(e.target.value))}
                      className="w-full accent-[hsl(var(--accent))] cursor-pointer"
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
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>

        {/* Action Buttons */}
        <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            Status Nilai Saat Ini:{" "}
            <Badge variant={status === "terkirim" ? "success" : "warning"} className="text-[10px]">
              {status === "terkirim" ? "TERKIRIM FINAL" : "DRAFT (TERSEMBUNYI)"}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              className="text-xs gap-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Draft</span>
            </Button>
            <Button
              type="button"
              onClick={handleSubmitFinal}
              size="lg"
              className="text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>Kirimkan Nilai Final</span>
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
