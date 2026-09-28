"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SCORE_GAP_ALERT = Number(process.env.NEXT_PUBLIC_SCORE_GAP_ALERT || 20);

const ScoreInputSchema = z.object({
  criterionId: z.string().uuid("ID Kriteria tidak valid"),
  score: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
  comment: z.string().optional(),
});

const SubmitAssessmentSchema = z.object({
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan penilaian.";
    return { success: false, error: message };
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
  } catch {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengoreksi nilai.";
    return { success: false, error: message };
  }
}

export async function getPenilaianOverviewData(): Promise<{
  success: boolean;
  competitions: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    status: string;
    aggregation: string;
    totalParticipants: number;
    scoredParticipants: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil seluruh kompetisi
    const { data: dbComps, error: cErr } = await supabase
      .from("competitions")
      .select("id, name, slug, type, status, aggregation, sort_order")
      .order("sort_order", { ascending: true });

    if (cErr) throw cErr;

    // 2. Ambil seluruh registrations
    const { data: dbRegs, error: rErr } = await supabase
      .from("registrations")
      .select("id, competition_id, participant_id");

    if (rErr) throw rErr;

    // 3. Ambil seluruh assessments
    const { data: dbAssessments, error: aErr } = await supabase
      .from("assessments")
      .select("id, competition_id, registration_id, status");

    if (aErr) throw aErr;

    // Hitung peserta per cabang lomba
    const regCountMap: Record<string, number> = {};
    (dbRegs || []).forEach((r) => {
      regCountMap[r.competition_id] = (regCountMap[r.competition_id] || 0) + 1;
    });

    const scoredRegSet: Record<string, Set<string>> = {};
    (dbAssessments || []).forEach((a) => {
      if (!scoredRegSet[a.competition_id]) {
        scoredRegSet[a.competition_id] = new Set();
      }
      scoredRegSet[a.competition_id].add(a.registration_id);
    });

    const competitions = (dbComps || []).map((c) => {
      const totalParticipants = regCountMap[c.id] || 0;
      const scoredParticipants = scoredRegSet[c.id]?.size || 0;

      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        category: c.type || "Umum",
        status: c.status || "berlangsung",
        aggregation: c.aggregation || "rata_rata",
        totalParticipants,
        scoredParticipants,
      };
    });

    return { success: true, competitions };
  } catch (err: unknown) {
    console.error("Error getPenilaianOverviewData:", err);
    return {
      success: false,
      competitions: [],
      error: err instanceof Error ? err.message : "Gagal memuat overview penilaian",
    };
  }
}

export interface ScoringRecapJudgeScore {
  judgeId: string;
  judgeName: string;
  weightedTotal: number;
}

export interface ScoringRecapItem {
  rank: number;
  registrationId: string;
  participantName: string;
  institution: string;
  scoresPerJudge: ScoringRecapJudgeScore[];
  finalScore: number;
  scoreGap: number;
  gapAlert: boolean;
  status: "selesai" | "menunggu_juri" | "audit";
}

export async function getCompetitionScoringRecap(competitionIdOrSlug: string): Promise<{
  success: boolean;
  competition?: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    category: string;
    status: string;
    aggregation: string;
    criteria: Array<{ id: string; name: string; weight: number }>;
  };
  judges: Array<{ id: string; fullName: string; isChiefJudge: boolean }>;
  recaps: ScoringRecapItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(competitionIdOrSlug);

    // 1. Ambil kompetisi
    const compQuery = supabase.from("competitions").select("*");
    const { data: compRow, error: cErr } = isUuid
      ? await compQuery.eq("id", competitionIdOrSlug).maybeSingle()
      : await compQuery.eq("slug", competitionIdOrSlug).maybeSingle();

    if (cErr) throw cErr;
    if (!compRow) return { success: false, judges: [], recaps: [], error: "Lomba tidak ditemukan" };

    const compId = compRow.id;

    // Ambil kriteria lomba
    const { data: dbCriteria } = await supabase
      .from("competition_criteria")
      .select("id, name, weight")
      .eq("competition_id", compId);

    // 2. Ambil juri yang ditugaskan
    const { data: cJudges } = await supabase
      .from("competition_judges")
      .select("judge_id, is_chief_judge, judge:profiles!competition_judges_judge_id_fkey(id, full_name)")
      .eq("competition_id", compId)
      .eq("status", "aktif");

    const judges = (cJudges || []).map((cj) => ({
      id: cj.judge_id,
      fullName: (cj.judge as any)?.full_name || "Dewan Juri",
      isChiefJudge: Boolean(cj.is_chief_judge),
    }));

    // 3. Ambil seluruh peserta dari registrations
    const { data: regRows } = await supabase
      .from("registrations")
      .select("id, team_name, participant_id, participants(id, full_name, institution, registration_number)")
      .eq("competition_id", compId);

    // 4. Ambil assessments
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id, registration_id, judge_id, weighted_total, status")
      .eq("competition_id", compId);

    const assessmentMap: Record<string, Record<string, number>> = {};
    (assessments || []).forEach((a) => {
      if (!assessmentMap[a.registration_id]) assessmentMap[a.registration_id] = {};
      assessmentMap[a.registration_id][a.judge_id] = Number(a.weighted_total);
    });

    const judgeNameMap = new Map(judges.map((j) => [j.id, j.fullName]));

    const recapsList: ScoringRecapItem[] = (regRows || []).map((r) => {
      const part = r.participants as any;
      const regScores = assessmentMap[r.id] || {};

      const scoresPerJudge: ScoringRecapJudgeScore[] = Object.entries(regScores).map(([jId, val]) => ({
        judgeId: jId,
        judgeName: judgeNameMap.get(jId) || "Dewan Juri",
        weightedTotal: val,
      }));

      const scoreVals = scoresPerJudge.map((s) => s.weightedTotal);
      let finalScore = 0;
      let scoreGap = 0;

      if (scoreVals.length > 0) {
        if (compRow.aggregation === "total") {
          finalScore = scoreVals.reduce((a, b) => a + b, 0);
        } else if (compRow.aggregation === "rata_rata_buang_ekstrem" && scoreVals.length >= 3) {
          const sorted = [...scoreVals].sort((a, b) => a - b);
          const trimmed = sorted.slice(1, sorted.length - 1);
          finalScore = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
        } else {
          // rata_rata
          finalScore = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;
        }

        if (scoreVals.length >= 2) {
          scoreGap = Math.max(...scoreVals) - Math.min(...scoreVals);
        }
      }

      const isAudit = scoreGap > 20;
      const status: "selesai" | "menunggu_juri" | "audit" =
        scoreVals.length === 0 ? "menunggu_juri" : isAudit ? "audit" : "selesai";

      return {
        rank: 1,
        registrationId: r.id,
        participantName: r.team_name || part?.full_name || "Peserta",
        institution: part?.institution || "Umum",
        scoresPerJudge,
        finalScore: Number(finalScore.toFixed(2)),
        scoreGap: Number(scoreGap.toFixed(2)),
        gapAlert: isAudit,
        status,
      };
    });

    // Urutkan berdasarkan finalScore descending dan berikan ranking
    recapsList.sort((a, b) => b.finalScore - a.finalScore);
    recapsList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return {
      success: true,
      competition: {
        id: compRow.id,
        slug: compRow.slug,
        name: compRow.name,
        shortName: compRow.short_name || compRow.name,
        category: compRow.type || "Umum",
        status: compRow.status || "berlangsung",
        aggregation: compRow.aggregation || "rata_rata",
        criteria: (dbCriteria || []).map((crit) => ({
          id: crit.id,
          name: crit.name,
          weight: Number(crit.weight),
        })),
      },
      judges,
      recaps: recapsList,
    };
  } catch (err: unknown) {
    console.error("Error getCompetitionScoringRecap:", err);
    return {
      success: false,
      judges: [],
      recaps: [],
      error: err instanceof Error ? err.message : "Gagal memuat rekap nilai",
    };
  }
}
