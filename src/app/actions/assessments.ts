"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SCORE_GAP_ALERT = Number(process.env.NEXT_PUBLIC_SCORE_GAP_ALERT || 20);

export const ScoreInputSchema = z.object({
  criterionId: z.string().uuid("ID Kriteria tidak valid"),
  score: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
  comment: z.string().optional(),
});

export const SubmitAssessmentSchema = z.object({
  registrationId: z.string().uuid("ID Pendaftaran tidak valid"),
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  scores: z.array(ScoreInputSchema).min(1, "Minimal harus ada 1 nilai kriteria"),
  notes: z.string().optional(),
  isFinal: z.boolean().default(false),
});

export async function saveAssessment(data: z.infer<typeof SubmitAssessmentSchema>) {
  const parsed = SubmitAssessmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Sesi juri tidak ditemukan. Silakan login kembali." };
    }

    // Ambil seluruh kriteria lomba untuk menghitung total terbobot
    const { data: criteriaList } = await supabase
      .from("competition_criteria")
      .select("id, weight")
      .eq("competition_id", parsed.data.competitionId);

    const criteriaMap = new Map((criteriaList || []).map((c) => [c.id, Number(c.weight)]));

    // Jika final submission, pastikan semua kriteria terisi
    if (parsed.data.isFinal && criteriaList && parsed.data.scores.length < criteriaList.length) {
      return {
        success: false,
        error: "Semua kriteria penilaian wajib diisi sebelum mengirimkan nilai final.",
      };
    }

    // Hitung weighted total: sum(score * weight / 100)
    let weightedTotal = 0;
    for (const sc of parsed.data.scores) {
      const weight = criteriaMap.get(sc.criterionId) || 0;
      weightedTotal += (sc.score * weight) / 100;
    }

    const status = parsed.data.isFinal ? "terkirim" : "draft";

    // Upsert assessment header
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .upsert(
        {
          registration_id: parsed.data.registrationId,
          competition_id: parsed.data.competitionId,
          judge_id: user.id,
          status,
          weighted_total: Number(weightedTotal.toFixed(2)),
          notes: parsed.data.notes || null,
          submitted_at: parsed.data.isFinal ? new Date().toISOString() : null,
        },
        { onConflict: "registration_id,judge_id" }
      )
      .select()
      .single();

    if (aErr) {
      return { success: false, error: aErr.message };
    }

    // Upsert scores per kriteria
    const scoresToUpsert = parsed.data.scores.map((sc) => ({
      assessment_id: assessment.id,
      criterion_id: sc.criterionId,
      score: sc.score,
      comment: sc.comment || null,
    }));

    const { error: sErr } = await supabase
      .from("assessment_scores")
      .upsert(scoresToUpsert, { onConflict: "assessment_id,criterion_id" });

    if (sErr) {
      return { success: false, error: sErr.message };
    }

    // Catat log jika final
    if (parsed.data.isFinal) {
      await supabase.from("activity_logs").insert({
        actor_id: user.id,
        action: "submit_assessment",
        entity: "assessment",
        entity_id: assessment.id,
        description: `Juri mengirim penilaian final (${weightedTotal.toFixed(2)} pts).`,
      });
    }

    revalidatePath("/juri");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/papan-skor");
    return { success: true, data: { weightedTotal, status } };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menyimpan penilaian." };
  }
}

export async function detectScoreGaps(competitionId: string) {
  try {
    const supabase = await createClient();

    // Dapatkan seluruh nilai final per registrasi
    const { data: assessments } = await supabase
      .from("assessments")
      .select("registration_id, weighted_total, judge_id")
      .eq("competition_id", competitionId)
      .neq("status", "draft");

    if (!assessments || assessments.length === 0) {
      return { gaps: [] };
    }

    const regGroups: Record<string, number[]> = {};
    for (const a of assessments) {
      if (!regGroups[a.registration_id]) regGroups[a.registration_id] = [];
      regGroups[a.registration_id].push(Number(a.weighted_total));
    }

    const gaps: { registrationId: string; gap: number }[] = [];
    for (const [regId, scores] of Object.entries(regGroups)) {
      if (scores.length >= 2) {
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const diff = maxScore - minScore;
        if (diff > SCORE_GAP_ALERT) {
          gaps.push({ registrationId: regId, gap: Number(diff.toFixed(2)) });
        }
      }
    }

    return { gaps };
  } catch (err: any) {
    return { gaps: [] };
  }
}

export async function correctAssessmentByAdmin(
  assessmentId: string,
  newWeightedTotal: number,
  reason: string
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("assessments")
      .update({
        weighted_total: newWeightedTotal,
        notes: `Koreksi Seksi Acara: ${reason}`,
      })
      .eq("id", assessmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from("activity_logs").insert({
      actor_id: user?.id || null,
      action: "correct_score",
      entity: "assessment",
      entity_id: assessmentId,
      description: `Koreksi nilai menjadi ${newWeightedTotal} pts. Alasan: ${reason}`,
    });

    revalidatePath("/dashboard/penilaian");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
