"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMultiStageCompetitionState,
  getCompetitionStages,
} from "@/app/actions/duta-bahasa";
import { getCompetitionRoundTypesMap } from "@/app/actions/competitions";

const SCORE_GAP_ALERT = Number(process.env.NEXT_PUBLIC_SCORE_GAP_ALERT || 20);

// ======================================================================
// MULTI-STAGE ASSESSMENTS STORAGE HELPERS (event_settings)
// ======================================================================

export interface StageAssessmentRecord {
  id: string; // `${registrationId}_${judgeId}_${stageId}`
  registrationId: string;
  competitionId: string;
  stageId: string;
  stageOrder: number;
  stageTitle: string;
  judgeId: string;
  judgeName?: string;
  status: "draft" | "terkirim" | "final";
  weightedTotal: number;
  notes?: string | null;
  scores: {
    criterionId: string;
    score: number;
    comment?: string | null;
  }[];
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getStageAssessmentsMap(): Promise<
  Record<string, StageAssessmentRecord>
> {
  try {
    const adminSupabase = createAdminClient();
    const { data } = await adminSupabase
      .from("event_settings")
      .select("value")
      .eq("key", "stage_assessments")
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      return data.value as unknown as Record<string, StageAssessmentRecord>;
    }
    return {};
  } catch (err) {
    console.error("Error getStageAssessmentsMap:", err);
    return {};
  }
}

export async function saveStageAssessmentRecord(
  record: StageAssessmentRecord
): Promise<void> {
  const adminSupabase = createAdminClient();
  const currentMap = await getStageAssessmentsMap();
  const nextMap: Record<string, any> = {
    ...currentMap,
    [record.id]: record,
  };

  await adminSupabase.from("event_settings").upsert(
    {
      key: "stage_assessments",
      value: nextMap as any,
      description: "Rekam penilaian juri per tahapan perlombaan multi-stage",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

const ScoreInputSchema = z.object({
  criterionId: z.string().uuid("ID Kriteria tidak valid"),
  score: z.number().min(0, "Nilai minimal 0").max(100, "Nilai maksimal 100"),
  comment: z.string().optional(),
});

const SubmitAssessmentSchema = z.object({
  registrationId: z.string().uuid("ID Pendaftaran tidak valid"),
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  stageId: z.string().optional(),
  scores: z.array(ScoreInputSchema).min(1, "Minimal harus ada 1 nilai kriteria"),
  notes: z.string().optional(),
  isFinal: z.boolean().default(false),
});

export type SubmitAssessmentInput = z.infer<typeof SubmitAssessmentSchema>;

export async function saveAssessment(data: SubmitAssessmentInput) {
  const parsed = SubmitAssessmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let judgeId = user?.id;
    let judgeProfile: any = null;

    if (user) {
      const { data: p } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        judgeProfile = p;
        judgeId = p.id;
      }
    }

    // Fallback: jika sesi user belum ada atau dalam konteks pengujian lokal, ambil juri aktif dari penugasan lomba
    if (!judgeId) {
      const { data: cj } = await adminSupabase
        .from("competition_judges")
        .select("judge_id, judge:profiles!competition_judges_judge_id_fkey(*)")
        .eq("competition_id", parsed.data.competitionId)
        .eq("status", "aktif")
        .limit(1)
        .maybeSingle();

      if (cj?.judge_id) {
        judgeId = cj.judge_id;
        judgeProfile = cj.judge;
      }
    }

    if (!judgeId) {
      return { success: false, error: "Sesi juri tidak ditemukan. Silakan login kembali." };
    }

    // Pastikan lomba belum difinalisasi / dikunci oleh panitia
    const { data: compCheck } = await adminSupabase
      .from("competitions")
      .select("id, status, name, slug")
      .eq("id", parsed.data.competitionId)
      .maybeSingle();

    if (!compCheck) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }

    if (compCheck.status === "selesai") {
      return {
        success: false,
        error: "Nilai lomba telah difinalisasi dan dikunci oleh panitia. Perubahan nilai tidak diperkenankan.",
      };
    }

    // Ambil seluruh kriteria lomba untuk menghitung total terbobot
    const { data: criteriaList } = await adminSupabase
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

    // Cek apakah lomba ini model multi_stage
    const roundTypesMap = await getCompetitionRoundTypesMap();
    const roundType: "single_round" | "multi_stage" =
      roundTypesMap[compCheck.id] ||
      roundTypesMap[compCheck.slug] ||
      ((compCheck.slug === "pidato" || compCheck.name?.toLowerCase().includes("duta"))
        ? "multi_stage"
        : "single_round");

    // =========================================================================
    // KASUS 1: MULTI_STAGE (Penilaian terikat ke tahap tertentu)
    // =========================================================================
    if (roundType === "multi_stage" || parsed.data.stageId) {
      const stagesRes = await getCompetitionStages(compCheck.slug);
      const stages = stagesRes.stages || [];

      let targetStage = parsed.data.stageId
        ? stages.find((s) => s.id === parsed.data.stageId)
        : null;

      if (!targetStage) {
        // Cari tahap yang sedang aktif dan memerlukan juri
        targetStage =
          stages.find((s) => s.status === "active" && s.requiresJudge !== false) ||
          stages.find((s) => s.status === "active") ||
          stages[0];
      }

      const stageId = targetStage?.id || "stage-default";
      const stageTitle = targetStage?.title || "Penilaian Tahap";
      const stageOrder = targetStage?.stageOrder || 1;

      const stageRecordId = `${parsed.data.registrationId}_${judgeId}_${stageId}`;
      const stageRecord: StageAssessmentRecord = {
        id: stageRecordId,
        registrationId: parsed.data.registrationId,
        competitionId: parsed.data.competitionId,
        stageId,
        stageOrder,
        stageTitle,
        judgeId,
        judgeName: judgeProfile?.full_name || "Dewan Juri",
        status,
        weightedTotal: Number(weightedTotal.toFixed(2)),
        notes: parsed.data.notes || null,
        scores: parsed.data.scores,
        submittedAt: parsed.data.isFinal ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveStageAssessmentRecord(stageRecord);

      // Jika final, update skor tahap peserta di progress settings
      if (parsed.data.isFinal) {
        const { data: regInfo } = await adminSupabase
          .from("registrations")
          .select("participant_id")
          .eq("id", parsed.data.registrationId)
          .maybeSingle();

        if (regInfo?.participant_id) {
          const isDuta =
            compCheck.slug === "duta-bahasa" ||
            compCheck.slug === "pidato" ||
            compCheck.name.toLowerCase().includes("duta");
          const progressKey = isDuta
            ? "duta_bahasa_progress"
            : `progress_${compCheck.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;

          const { data: curProgData } = await adminSupabase
            .from("event_settings")
            .select("value")
            .eq("key", progressKey)
            .maybeSingle();

          const progMap: Record<string, Record<string, any>> =
            ((curProgData?.value as unknown) as Record<string, Record<string, any>>) || {};

          const pProg = progMap[regInfo.participant_id] || {};
          if (!pProg[stageId]) {
            pProg[stageId] = {
              participantId: regInfo.participant_id,
              stageId,
              status: "menunggu",
              score: null,
              notes: `Penilaian tahap ${stageTitle}`,
              reviewedAt: new Date().toISOString(),
            };
          }
          pProg[stageId].score = Number(weightedTotal.toFixed(2));
          pProg[stageId].reviewedAt = new Date().toISOString();
          progMap[regInfo.participant_id] = pProg;

          await adminSupabase.from("event_settings").upsert(
            {
              key: progressKey,
              value: progMap as any,
              description: `Progress peserta per tahapan lomba ${compCheck.name}`,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "key" }
          );
        }

        await adminSupabase.from("activity_logs").insert({
          actor_id: judgeId,
          action: "submit_assessment_stage",
          entity: "stage_assessment",
          entity_id: stageRecordId,
          description: `Juri mengirim penilaian final tahap ${stageOrder}: ${stageTitle} (${weightedTotal.toFixed(2)} pts).`,
        });
      }

      // Upsert ke assessments header untuk kompatibilitas rekap global
      await adminSupabase.from("assessments").upsert(
        {
          registration_id: parsed.data.registrationId,
          competition_id: parsed.data.competitionId,
          judge_id: judgeId,
          status,
          weighted_total: Number(weightedTotal.toFixed(2)),
          notes: parsed.data.notes || null,
          submitted_at: parsed.data.isFinal ? new Date().toISOString() : null,
        },
        { onConflict: "registration_id,judge_id" }
      );
    } else {
      // =========================================================================
      // KASUS 2: SINGLE_ROUND (Penilaian tunggal per lomba)
      // =========================================================================
      const { data: assessment, error: aErr } = await adminSupabase
        .from("assessments")
        .upsert(
          {
            registration_id: parsed.data.registrationId,
            competition_id: parsed.data.competitionId,
            judge_id: judgeId,
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

      const { error: sErr } = await adminSupabase
        .from("assessment_scores")
        .upsert(scoresToUpsert, { onConflict: "assessment_id,criterion_id" });

      if (sErr) {
        return { success: false, error: sErr.message };
      }

      if (parsed.data.isFinal) {
        await adminSupabase.from("activity_logs").insert({
          actor_id: judgeId,
          action: "submit_assessment",
          entity: "assessment",
          entity_id: assessment.id,
          description: `Juri mengirim penilaian final (${weightedTotal.toFixed(2)} pts).`,
        });
      }
    }

    revalidatePath("/juri");
    revalidatePath("/juri/riwayat");
    revalidatePath("/juri/lomba");
    revalidatePath(`/juri/lomba/${compCheck.slug}`);
    revalidatePath(`/juri/penilaian/${parsed.data.registrationId}`);
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/lomba/duta-bahasa");
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

export async function toggleCompetitionFinalize(
  competitionIdOrSlug: string,
  finalize: boolean
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  try {
    const adminSupabase = createAdminClient();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(competitionIdOrSlug);

    const compQuery = adminSupabase.from("competitions").select("id, name, slug, status");
    const { data: comp, error: cErr } = isUuid
      ? await compQuery.eq("id", competitionIdOrSlug).maybeSingle()
      : await compQuery.eq("slug", competitionIdOrSlug).maybeSingle();

    if (cErr || !comp) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }

    const newStatus = finalize ? "selesai" : "berlangsung";

    // 1. Update status kompetisi
    const { error: uErr } = await adminSupabase
      .from("competitions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", comp.id);

    if (uErr) throw uErr;

    // 2. Jika difinalisasi, kunci seluruh asesmen yang sudah terkirim menjadi status 'final'
    if (finalize) {
      await adminSupabase
        .from("assessments")
        .update({ status: "final" })
        .eq("competition_id", comp.id)
        .eq("status", "terkirim");
    }

    // 3. Catat di activity_logs
    await adminSupabase.from("activity_logs").insert({
      actor_id: user?.id || null,
      action: finalize ? "finalize_scoring" : "unlock_scoring",
      entity: "competition",
      entity_id: comp.id,
      description: finalize
        ? `Finalisasi nilai lomba ${comp.name}. Skor dikunci.`
        : `Membuka kunci nilai lomba ${comp.name}. Penilaian dapat disesuaikan kembali.`,
    });

    revalidatePath(`/dashboard/penilaian/${comp.slug}`);
    revalidatePath(`/dashboard/penilaian/${comp.id}`);
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/lomba");
    revalidatePath(`/dashboard/lomba/${comp.slug}`);

    return { success: true, newStatus };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui status finalisasi lomba.";
    console.error("Error toggleCompetitionFinalize:", err);
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

export interface EvaluationHistoryItem {
  id: string;
  registrationNumber: string;
  participantName: string;
  institution: string;
  competitionName: string;
  competitionSlug?: string;
  roundType?: "single_round" | "multi_stage";
  stageId?: string;
  stageOrder?: number;
  stageTitle?: string;
  weightedScore: number;
  status: "draft" | "terkirim";
  submittedAt: string;
}

export async function getJudgeEvaluationHistory(): Promise<{
  success: boolean;
  history: EvaluationHistoryItem[];
  judgeName?: string;
  error?: string;
}> {
  try {
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let judgeProfile: any = null;
    if (user) {
      const { data: p } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) judgeProfile = p;
    }

    let targetJudgeId = judgeProfile?.id;
    const isAdminOrAcara =
      judgeProfile?.role === "super_admin" || judgeProfile?.role === "seksi_acara";

    // Jika belum login atau akun bukan juri/admin, cari juri aktif dari matriks
    if (!targetJudgeId) {
      const { data: allActiveJudges } = await adminSupabase
        .from("competition_judges")
        .select("judge_id, judge:profiles!competition_judges_judge_id_fkey(id, full_name)")
        .eq("status", "aktif");

      if (allActiveJudges && allActiveJudges.length > 0) {
        const found =
          allActiveJudges.find((a) =>
            (a.judge as any)?.full_name?.toUpperCase().includes("MULYANA")
          ) || allActiveJudges[0];
        targetJudgeId = found.judge_id;
        judgeProfile = found.judge;
      }
    }

    // 1. Ambil model babak tiap lomba (single_round vs multi_stage)
    const roundTypesMap = await getCompetitionRoundTypesMap();

    // 2. Ambil penilaian tahapan (multi_stage) dari event_settings
    const stageAssessmentsMap = await getStageAssessmentsMap();
    const stageAssessmentsList = Object.values(stageAssessmentsMap).filter((sa) => {
      if (!isAdminOrAcara && targetJudgeId) {
        return sa.judgeId === targetJudgeId;
      }
      return true;
    });

    const stageRegIds = Array.from(new Set(stageAssessmentsList.map((sa) => sa.registrationId)));
    const regLookup: Record<string, any> = {};
    if (stageRegIds.length > 0) {
      const { data: regData } = await adminSupabase
        .from("registrations")
        .select(`
          id,
          team_name,
          competition:competitions(id, name, slug),
          participant:participants(id, full_name, institution, registration_number)
        `)
        .in("id", stageRegIds);
      (regData || []).forEach((r) => {
        regLookup[r.id] = r;
      });
    }

    const multiStageHistoryItems: (EvaluationHistoryItem & { rawDate: string })[] =
      stageAssessmentsList.map((sa) => {
        const reg = regLookup[sa.registrationId];
        const comp = reg?.competition as any;
        const part = reg?.participant as any;

        const dateStr = sa.submittedAt || sa.updatedAt || sa.createdAt;
        let formattedDate = "-";
        if (dateStr) {
          try {
            const d = new Date(dateStr);
            formattedDate =
              new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(d) + " WIB";
          } catch {
            formattedDate = dateStr;
          }
        }

        return {
          id: sa.id,
          registrationNumber:
            part?.registration_number || `REG-${sa.registrationId.slice(0, 6)}`,
          participantName: reg?.team_name || part?.full_name || "Peserta",
          institution: part?.institution || "Umum",
          competitionName: comp?.name || "Cabang Lomba",
          competitionSlug: comp?.slug,
          roundType: "multi_stage" as const,
          stageId: sa.stageId,
          stageOrder: sa.stageOrder,
          stageTitle: sa.stageTitle,
          weightedScore: Number(sa.weightedTotal) || 0,
          status: (sa.status === "final" ? "terkirim" : sa.status) as "draft" | "terkirim",
          submittedAt: formattedDate,
          rawDate: dateStr,
        };
      });

    // 3. Ambil data single_round dari tabel assessments Supabase
    let query = adminSupabase
      .from("assessments")
      .select(`
        id,
        registration_id,
        weighted_total,
        status,
        submitted_at,
        created_at,
        competitions (
          id,
          name,
          slug
        ),
        registrations (
          id,
          team_name,
          participants (
            id,
            full_name,
            institution,
            registration_number
          )
        )
      `)
      .order("submitted_at", { ascending: false, nullsFirst: false });

    if (!isAdminOrAcara && targetJudgeId) {
      query = query.eq("judge_id", targetJudgeId);
    }

    const { data: rows, error: qErr } = await query;
    if (qErr) throw qErr;

    const multiStageRegKeys = new Set(stageAssessmentsList.map((sa) => sa.registrationId));

    const singleRoundHistoryItems: (EvaluationHistoryItem & { rawDate: string })[] = (
      rows || []
    )
      .filter((r) => {
        const comp = r.competitions as any;
        const isMulti =
          roundTypesMap[comp?.id] === "multi_stage" ||
          roundTypesMap[comp?.slug] === "multi_stage" ||
          comp?.slug === "pidato" ||
          comp?.name?.toLowerCase().includes("duta");

        // Jika kompetisi ini multi_stage dan sudah ada entri spesifik tahap, hindari duplikasi
        if (isMulti && multiStageRegKeys.has(r.registration_id)) {
          return false;
        }
        return true;
      })
      .map((r) => {
        const comp = r.competitions as any;
        const reg = r.registrations as any;
        const part = reg?.participants as any;

        const isMulti =
          roundTypesMap[comp?.id] === "multi_stage" ||
          roundTypesMap[comp?.slug] === "multi_stage" ||
          comp?.slug === "pidato" ||
          comp?.name?.toLowerCase().includes("duta");

        const dateStr = r.submitted_at || r.created_at;
        let formattedDate = "-";
        if (dateStr) {
          try {
            const d = new Date(dateStr);
            formattedDate =
              new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(d) + " WIB";
          } catch {
            formattedDate = dateStr;
          }
        }

        return {
          id: r.id,
          registrationNumber: part?.registration_number || `REG-${r.id.slice(0, 6)}`,
          participantName: reg?.team_name || part?.full_name || "Peserta",
          institution: part?.institution || "Umum",
          competitionName: comp?.name || "Lomba",
          competitionSlug: comp?.slug,
          roundType: (isMulti ? "multi_stage" : "single_round") as
            | "single_round"
            | "multi_stage",
          stageTitle: isMulti ? "Tahap Penilaian" : "Babak Tunggal",
          weightedScore: Number(r.weighted_total) || 0,
          status: (r.status as "draft" | "terkirim") || "draft",
          submittedAt: formattedDate,
          rawDate: dateStr,
        };
      });

    // Gabungkan dan urutkan berdasarkan waktu kirim / tanggal terbaru
    const combinedHistory = [...multiStageHistoryItems, ...singleRoundHistoryItems].sort(
      (a, b) => {
        const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
        return timeB - timeA;
      }
    );

    const history: EvaluationHistoryItem[] = combinedHistory.map(
      ({ rawDate, ...rest }) => rest
    );

    return {
      success: true,
      history,
      judgeName: judgeProfile?.full_name || "Dewan Juri",
    };
  } catch (err: unknown) {
    console.error("Error getJudgeEvaluationHistory:", err);
    return {
      success: false,
      history: [],
      error: err instanceof Error ? err.message : "Gagal memuat riwayat penilaian.",
    };
  }
}

export interface JudgeRosterMember {
  id?: string;
  name: string;
  role?: string | null;
  isLeader?: boolean;
}

export interface JudgeRosterParticipant {
  registrationId: string;
  participantId: string;
  registrationNumber: string;
  fullName: string;
  teamName: string | null;
  members?: JudgeRosterMember[];
  institution: string;
  status: "draft" | "terkirim" | "final" | "belum_dinilai";
  weightedScore: number | null;
  performanceOrder: number | null;
  stageStatus?: "terdaftar" | "menunggu" | "lolos" | "tidak_lolos";
  stageStatusLabel?: string;
  stageScore?: number | null;
  activeStageId?: string;
  activeStageOrder?: number;
  activeStageName?: string;
}

export interface JudgeCompetitionRosterResult {
  success: boolean;
  competition?: {
    id: string;
    name: string;
    slug: string;
    category: string;
    stageName?: string | null;
    status: string;
    rules?: string | null;
    roundType?: "single_round" | "multi_stage";
    activeStage?: {
      id: string;
      stageOrder: number;
      title: string;
      status: string;
      requiresJudge: boolean;
    } | null;
  };
  judge?: {
    id: string;
    name: string;
  };
  participants: JudgeRosterParticipant[];
  notice?: string;
  error?: string;
}

export async function getJudgeCompetitionRoster(
  slugOrId: string
): Promise<JudgeCompetitionRosterResult> {
  try {
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    // 1. Cari cabang lomba berdasarkan slug atau id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId
    );
    let compQuery = adminSupabase.from("competitions").select("*");
    if (isUuid) {
      compQuery = compQuery.eq("id", slugOrId);
    } else {
      compQuery = compQuery.eq("slug", slugOrId);
    }

    const { data: comp, error: compErr } = await compQuery.maybeSingle();

    if (compErr || !comp) {
      return {
        success: false,
        participants: [],
        error: "Cabang lomba tidak ditemukan.",
      };
    }

    // 2. Ambil model babak lomba: single_round vs multi_stage
    const roundTypesMap = await getCompetitionRoundTypesMap();
    const roundType: "single_round" | "multi_stage" =
      roundTypesMap[comp.id] ||
      roundTypesMap[comp.slug] ||
      ((comp.slug === "pidato" || comp.name.toLowerCase().includes("duta"))
        ? "multi_stage"
        : "single_round");

    // 3. Ambil profil juri yang sedang login, atau fallback ke juri aktif cabang lomba
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let judgeProfile: any = null;
    if (user) {
      const { data: p } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) judgeProfile = p;
    }

    let targetJudgeId = judgeProfile?.id;
    if (!targetJudgeId) {
      const { data: activeJudges } = await adminSupabase
        .from("competition_judges")
        .select("judge_id, judge:profiles!competition_judges_judge_id_fkey(id, full_name)")
        .eq("competition_id", comp.id)
        .eq("status", "aktif");

      if (activeJudges && activeJudges.length > 0) {
        const found =
          activeJudges.find((a) =>
            (a.judge as any)?.full_name?.toUpperCase().includes("MULYANA")
          ) || activeJudges[0];
        targetJudgeId = found.judge_id;
        judgeProfile = found.judge;
      }
    }

    // 4. Ambil seluruh data pendaftaran peserta lomba ini dari Supabase
    const { data: registrations, error: regErr } = await adminSupabase
      .from("registrations")
      .select(`
        id,
        participant_id,
        competition_id,
        team_name,
        performance_order,
        is_confirmed,
        created_at,
        participant:participants(*),
        registration_members (
          id,
          member_name,
          member_role,
          is_leader
        )
      `)
      .eq("competition_id", comp.id)
      .order("performance_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (regErr) throw regErr;

    // 5. Ambil riwayat penilaian oleh juri ini jika sudah ada
    let assessments: any[] = [];
    if (targetJudgeId) {
      const { data: assessList } = await adminSupabase
        .from("assessments")
        .select("id, registration_id, judge_id, status, weighted_total, notes")
        .eq("competition_id", comp.id)
        .eq("judge_id", targetJudgeId);
      assessments = assessList || [];
    }

    const baseCompInfo = {
      id: comp.id,
      name: comp.name,
      slug: comp.slug,
      category: comp.type === "kelompok" ? "Kelompok" : "Individu",
      stageName: comp.theme_link || "Panggung Utama",
      status: comp.status,
      rules: comp.rules,
      roundType,
    };

    // =========================================================================
    // LOGIKA MULTI-STAGE: Filter tahap aktif & hanya tampilkan jika Perlu Juri
    // =========================================================================
    if (roundType === "multi_stage") {
      const multiRes = await getMultiStageCompetitionState(comp.slug);
      const activeStage = multiRes.activeStage;

      // Kasus B1: Belum ada tahap yang aktif
      if (!activeStage) {
        return {
          success: true,
          competition: {
            ...baseCompInfo,
            activeStage: null,
          },
          judge: {
            id: targetJudgeId || "",
            name: judgeProfile?.full_name || "Dewan Juri",
          },
          participants: [],
          notice: "Belum ada tahapan perlombaan yang sedang berlangsung (aktif) untuk cabang lomba ini.",
        };
      }

      // Kasus B2: Tahap aktif TIDAK PERLU JURI (requiresJudge === false)
      if (activeStage.requiresJudge === false) {
        return {
          success: true,
          competition: {
            ...baseCompInfo,
            activeStage: {
              id: activeStage.id,
              stageOrder: activeStage.stageOrder,
              title: activeStage.title,
              status: activeStage.status,
              requiresJudge: false,
            },
          },
          judge: {
            id: targetJudgeId || "",
            name: judgeProfile?.full_name || "Dewan Juri",
          },
          participants: [],
          notice: `Tahap yang sedang aktif saat ini (${activeStage.title}) tidak memerlukan penilaian dewan juri (merupakan tahap administrasi panitia). Dewan juri akan mulai bertugas pada tahapan berikutnya yang memerlukan penilaian juri.`,
        };
      }

      // Kasus B3: Tahap aktif PERLU JURI (requiresJudge === true)
      // Filter peserta:
      // - Harus berada di activeStage
      // - Bukan peserta yang statusnya "tidak_lolos"
      // - Tampilkan terutama "menunggu" (Menunggu Penilaian), "terdaftar", atau "lolos"
      const eligibleStageParticipants = (multiRes.participants || []).filter((p) => {
        const stageProg = p.progress[activeStage.id];
        if (!stageProg) return false;
        if (stageProg.status === "tidak_lolos" || p.overallStatus === "tereliminasi") {
          return false;
        }
        return ["menunggu", "terdaftar", "lolos"].includes(stageProg.status);
      });

      const regMapByPartId = new Map(
        (registrations || []).map((r) => [r.participant_id, r])
      );
      const regMapByRegNum = new Map(
        (registrations || []).map((r) => [(r.participant as any)?.registration_number, r])
      );

      // Ambil penilaian tahapan dari event_settings
      const stageAssessmentsMap = await getStageAssessmentsMap();

      const stageRosterParticipants: JudgeRosterParticipant[] = eligibleStageParticipants.map((p, index) => {
        const matchedReg =
          regMapByPartId.get(p.participantId) || regMapByRegNum.get(p.registrationNumber);
        const registrationId = matchedReg?.id || p.participantId;

        // Cari penilaian khusus tahap aktif ini
        const stageRecordId = `${registrationId}_${targetJudgeId}_${activeStage.id}`;
        const myStageAssessment = stageAssessmentsMap[stageRecordId];

        let assessStatus: "draft" | "terkirim" | "final" | "belum_dinilai" = "belum_dinilai";
        let assessScore: number | null = null;

        if (myStageAssessment) {
          assessStatus = myStageAssessment.status === "final" ? "terkirim" : myStageAssessment.status;
          assessScore = Number(myStageAssessment.weightedTotal);
        } else {
          // Fallback ke tabel assessments jika belum ada record di stage_assessments
          const fallbackAssess = assessments.find((a) => a.registration_id === registrationId);
          if (fallbackAssess) {
            assessStatus = fallbackAssess.status === "final" ? "terkirim" : fallbackAssess.status;
            assessScore = fallbackAssess.weighted_total ? Number(fallbackAssess.weighted_total) : null;
          }
        }

        const stageProg = p.progress[activeStage.id];
        const rawStageStatus = stageProg?.status || "menunggu";

        let stageStatusLabel = "Menunggu Penilaian";
        if (rawStageStatus === "terdaftar") {
          stageStatusLabel = "Terdaftar";
        } else if (rawStageStatus === "lolos") {
          stageStatusLabel = "Lolos ke tahap berikutnya";
        }

        return {
          registrationId,
          participantId: p.participantId,
          registrationNumber: p.registrationNumber || `REG-${(index + 1).toString().padStart(3, "0")}`,
          fullName: p.fullName || "Peserta",
          teamName: matchedReg?.team_name || null,
          institution: p.institution || "Umum",
          status: assessStatus,
          weightedScore: assessScore,
          performanceOrder: matchedReg?.performance_order || null,
          members: ((matchedReg as any)?.registration_members || []).map((m: any) => ({
            id: m.id,
            name: m.member_name,
            role: m.member_role,
            isLeader: m.is_leader,
          })),
          stageStatus: rawStageStatus as "terdaftar" | "menunggu" | "lolos" | "tidak_lolos",
          stageStatusLabel,
          stageScore: assessScore ?? stageProg?.score ?? null,
          activeStageId: activeStage.id,
          activeStageOrder: activeStage.stageOrder,
          activeStageName: activeStage.title,
        };
      });

      return {
        success: true,
        competition: {
          ...baseCompInfo,
          activeStage: {
            id: activeStage.id,
            stageOrder: activeStage.stageOrder,
            title: activeStage.title,
            status: activeStage.status,
            requiresJudge: true,
          },
        },
        judge: {
          id: targetJudgeId || "",
          name: judgeProfile?.full_name || "Dewan Juri",
        },
        participants: stageRosterParticipants,
      };
    }

    // =========================================================================
    // LOGIKA SINGLE ROUND (EXISTING FLOW): Tampilkan semua peserta lomba
    // =========================================================================
    const participants: JudgeRosterParticipant[] = (registrations || []).map((r, index) => {
      const part = r.participant as any;
      const myAssessment = assessments.find((a) => a.registration_id === r.id);

      let status: "draft" | "terkirim" | "final" | "belum_dinilai" = "belum_dinilai";
      if (myAssessment?.status === "terkirim" || myAssessment?.status === "final") {
        status = "terkirim";
      } else if (myAssessment?.status === "draft") {
        status = "draft";
      }

      return {
        registrationId: r.id,
        participantId: r.participant_id,
        registrationNumber: part?.registration_number || `REG-${(index + 1).toString().padStart(3, "0")}`,
        fullName: part?.full_name || r.team_name || "Peserta",
        teamName: r.team_name,
        institution: part?.institution || "Umum",
        status,
        weightedScore: myAssessment?.weighted_total ? Number(myAssessment.weighted_total) : null,
        performanceOrder: r.performance_order,
        members: ((r as any).registration_members || []).map((m: any) => ({
          id: m.id,
          name: m.member_name,
          role: m.member_role,
          isLeader: m.is_leader,
        })),
      };
    });

    return {
      success: true,
      competition: {
        ...baseCompInfo,
        activeStage: null,
      },
      judge: {
        id: targetJudgeId || "",
        name: judgeProfile?.full_name || "Dewan Juri",
      },
      participants,
    };
  } catch (err: unknown) {
    console.error("Error getJudgeCompetitionRoster:", err);
    return {
      success: false,
      participants: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar peserta lomba.",
    };
  }
}

export interface GradingCriterionItem {
  id: string;
  competitionId: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number;
  sortOrder: number;
}

export interface ParticipantGradingSheetResult {
  success: boolean;
  participant?: {
    registrationId: string;
    registrationNumber: string;
    fullName: string;
    teamName: string | null;
    members?: JudgeRosterMember[];
    institution: string;
  };
  competition?: {
    id: string;
    name: string;
    slug: string;
    category: string;
    type?: string;
    roundType?: "single_round" | "multi_stage";
    stageName?: string | null;
    status?: string;
    stage?: {
      id: string;
      stageOrder: number;
      title: string;
      requiresJudge: boolean;
      status: string;
    } | null;
  };
  criteria: GradingCriterionItem[];
  existingScores: Record<string, number>;
  existingComments: Record<string, string>;
  existingNotes: string;
  status: "draft" | "terkirim" | "final" | "belum_dinilai";
  judgeName?: string;
  error?: string;
}

export async function getParticipantGradingSheet(
  registrationId: string,
  stageId?: string
): Promise<ParticipantGradingSheetResult> {
  try {
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    // 1. Ambil pendaftaran peserta beserta detail peserta & lomba
    const { data: reg, error: regErr } = await adminSupabase
      .from("registrations")
      .select(`
        id,
        participant_id,
        competition_id,
        team_name,
        participant:participants(*),
        competition:competitions(*),
        registration_members (
          id,
          member_name,
          member_role,
          is_leader
        )
      `)
      .eq("id", registrationId)
      .maybeSingle();

    if (regErr || !reg) {
      return {
        success: false,
        criteria: [],
        existingScores: {},
        existingComments: {},
        existingNotes: "",
        status: "belum_dinilai",
        error: "Data pendaftaran peserta tidak ditemukan.",
      };
    }

    const comp = reg.competition as any;
    const part = reg.participant as any;

    // 2. Ambil kriteria penilaian lomba
    const { data: criteriaList, error: critErr } = await adminSupabase
      .from("competition_criteria")
      .select("*")
      .eq("competition_id", reg.competition_id)
      .order("sort_order", { ascending: true });

    if (critErr) throw critErr;

    const criteria: GradingCriterionItem[] = (criteriaList || []).map((c) => ({
      id: c.id,
      competitionId: c.competition_id,
      name: c.name,
      description: c.description,
      weight: Number(c.weight),
      maxScore: Number(c.max_score) || 100,
      sortOrder: c.sort_order || 0,
    }));

    // 3. Ambil juri yang login atau fallback juri aktif
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let judgeProfile: any = null;
    if (user) {
      const { data: p } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) judgeProfile = p;
    }

    let targetJudgeId = judgeProfile?.id;
    if (!targetJudgeId) {
      const { data: activeJudges } = await adminSupabase
        .from("competition_judges")
        .select("judge_id, judge:profiles!competition_judges_judge_id_fkey(id, full_name)")
        .eq("competition_id", reg.competition_id)
        .eq("status", "aktif");

      if (activeJudges && activeJudges.length > 0) {
        const found =
          activeJudges.find((a) =>
            (a.judge as any)?.full_name?.toUpperCase().includes("MULYANA")
          ) || activeJudges[0];
        targetJudgeId = found.judge_id;
        judgeProfile = found.judge;
      }
    }

    // Cek model babak lomba: single_round vs multi_stage
    const roundTypesMap = await getCompetitionRoundTypesMap();
    const roundType: "single_round" | "multi_stage" =
      roundTypesMap[comp.id] ||
      roundTypesMap[comp.slug] ||
      ((comp.slug === "pidato" || comp.name?.toLowerCase().includes("duta"))
        ? "multi_stage"
        : "single_round");

    let targetStage: any = null;
    if (roundType === "multi_stage") {
      const stagesRes = await getCompetitionStages(comp.slug);
      const stages = stagesRes.stages || [];
      if (stageId) {
        targetStage = stages.find((s) => s.id === stageId) || null;
      }
      if (!targetStage) {
        targetStage =
          stages.find((s) => s.status === "active" && s.requiresJudge !== false) ||
          stages.find((s) => s.status === "active") ||
          stages[0] ||
          null;
      }
    }

    // 4. Ambil penilaian yang sudah ada dari juri ini
    const existingScores: Record<string, number> = {};
    const existingComments: Record<string, string> = {};
    let existingNotes = "";
    let assessmentStatus: "draft" | "terkirim" | "final" | "belum_dinilai" = "belum_dinilai";

    if (roundType === "multi_stage" && targetStage) {
      // Ambil penilaian khusus tahap dari stage_assessments di event_settings
      const stageAssessmentsMap = await getStageAssessmentsMap();
      const stageRecordId = `${registrationId}_${targetJudgeId}_${targetStage.id}`;
      const stageAssess = stageAssessmentsMap[stageRecordId];

      if (stageAssess) {
        assessmentStatus = (stageAssess.status === "final" ? "terkirim" : stageAssess.status) as any;
        existingNotes = stageAssess.notes || "";
        (stageAssess.scores || []).forEach((s) => {
          existingScores[s.criterionId] = Number(s.score);
          if (s.comment) existingComments[s.criterionId] = s.comment;
        });
      }
    } else if (targetJudgeId) {
      // Single round: ambil dari tabel assessments Supabase
      const { data: existingAssessment } = await adminSupabase
        .from("assessments")
        .select("id, status, weighted_total, notes")
        .eq("registration_id", registrationId)
        .eq("judge_id", targetJudgeId)
        .maybeSingle();

      if (existingAssessment) {
        assessmentStatus = (existingAssessment.status as any) || "draft";
        existingNotes = existingAssessment.notes || "";

        const { data: scoreRows } = await adminSupabase
          .from("assessment_scores")
          .select("criterion_id, score, comment")
          .eq("assessment_id", existingAssessment.id);

        (scoreRows || []).forEach((s) => {
          existingScores[s.criterion_id] = Number(s.score);
          if (s.comment) existingComments[s.criterion_id] = s.comment;
        });
      }
    }

    // Berikan nilai default 85 jika belum ada skor sama sekali
    criteria.forEach((c) => {
      if (existingScores[c.id] === undefined) {
        existingScores[c.id] = 85;
      }
    });

    return {
      success: true,
      participant: {
        registrationId: reg.id,
        registrationNumber: part?.registration_number || `REG-${reg.id.slice(0, 6)}`,
        fullName: part?.full_name || reg.team_name || "Peserta",
        teamName: reg.team_name,
        members: ((reg as any)?.registration_members || []).map((m: any) => ({
          id: m.id,
          name: m.member_name,
          role: m.member_role,
          isLeader: m.is_leader,
        })),
        institution: part?.institution || "Umum",
      },
      competition: {
        id: comp.id,
        name: comp.name,
        slug: comp.slug,
        category: comp.type === "kelompok" ? "Kelompok" : "Individu",
        type: comp.type,
        roundType,
        stageName: targetStage?.title || comp.theme_link || "Panggung Utama",
        status: comp.status || "berlangsung",
        stage: targetStage
          ? {
              id: targetStage.id,
              stageOrder: targetStage.stageOrder,
              title: targetStage.title,
              requiresJudge: targetStage.requiresJudge ?? true,
              status: targetStage.status,
            }
          : null,
      },
      criteria,
      existingScores,
      existingComments,
      existingNotes,
      status: assessmentStatus,
      judgeName: judgeProfile?.full_name || "Dewan Juri",
    };
  } catch (err: unknown) {
    console.error("Error getParticipantGradingSheet:", err);
    return {
      success: false,
      criteria: [],
      existingScores: {},
      existingComments: {},
      existingNotes: "",
      status: "belum_dinilai",
      error: err instanceof Error ? err.message : "Gagal memuat lembar penilaian peserta.",
    };
  }
}

export interface JudgeAssignedCompetition {
  id: string;
  competitionId: string;
  name: string;
  slug: string;
  category: string;
  stageName: string;
  isChiefJudge: boolean;
  status: string;
  expertiseNote?: string | null;
}

export interface JudgeProfileResult {
  success: boolean;
  profile?: {
    id: string;
    fullName: string;
    email: string;
    institution: string;
    nickname: string;
    phone: string;
    avatarUrl: string;
    role: string;
  };
  assignedCompetitions: JudgeAssignedCompetition[];
  stats: {
    totalAssigned: number;
    submittedAssessments: number;
    draftAssessments: number;
  };
  error?: string;
}

export async function getJudgeProfileData(): Promise<JudgeProfileResult> {
  try {
    const adminSupabase = createAdminClient();
    const serverSupabase = await createClient();

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    let judgeProfile: any = null;
    if (user) {
      const { data: p } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (p) judgeProfile = p;
    }

    let targetJudgeId = judgeProfile?.id;
    if (!targetJudgeId) {
      const { data: activeJudges } = await adminSupabase
        .from("competition_judges")
        .select("judge_id, judge:profiles!competition_judges_judge_id_fkey(*)")
        .eq("status", "aktif");

      if (activeJudges && activeJudges.length > 0) {
        const found =
          activeJudges.find((a) =>
            (a.judge as any)?.full_name?.toUpperCase().includes("MULYANA")
          ) || activeJudges[0];
        targetJudgeId = found.judge_id;
        judgeProfile = found.judge;
      }
    }

    if (!judgeProfile) {
      return {
        success: false,
        assignedCompetitions: [],
        stats: { totalAssigned: 0, submittedAssessments: 0, draftAssessments: 0 },
        error: "Profil dewan juri tidak ditemukan.",
      };
    }

    // Ambil daftar penugasan cabang lomba
    const { data: assignments, error: aErr } = await adminSupabase
      .from("competition_judges")
      .select(`
        id,
        competition_id,
        is_chief_judge,
        status,
        expertise_note,
        competition:competitions(*)
      `)
      .eq("judge_id", judgeProfile.id);

    if (aErr) throw aErr;

    const assignedCompetitions: JudgeAssignedCompetition[] = (assignments || []).map((a) => {
      const comp = a.competition as any;
      return {
        id: a.id,
        competitionId: a.competition_id,
        name: comp?.name || "Cabang Lomba",
        slug: comp?.slug || "",
        category: comp?.type === "kelompok" ? "Kelompok" : "Individu",
        stageName: comp?.theme_link || "Panggung Utama",
        isChiefJudge: !!a.is_chief_judge,
        status: a.status || "aktif",
        expertiseNote: a.expertise_note,
      };
    });

    // Ambil statistik penilaian juri ini
    const { data: assessments } = await adminSupabase
      .from("assessments")
      .select("id, status")
      .eq("judge_id", judgeProfile.id);

    const submittedCount = (assessments || []).filter(
      (as) => as.status === "terkirim" || as.status === "final"
    ).length;
    const draftCount = (assessments || []).filter((as) => as.status === "draft").length;

    return {
      success: true,
      profile: {
        id: judgeProfile.id,
        fullName: judgeProfile.full_name || "",
        email: judgeProfile.email || "",
        institution: judgeProfile.institution || "",
        nickname: judgeProfile.nickname || "",
        phone: judgeProfile.phone || "",
        avatarUrl:
          judgeProfile.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            judgeProfile.full_name || "Juri"
          )}`,
        role: judgeProfile.role || "juri",
      },
      assignedCompetitions,
      stats: {
        totalAssigned: assignedCompetitions.length,
        submittedAssessments: submittedCount,
        draftAssessments: draftCount,
      },
    };
  } catch (err: unknown) {
    console.error("Error getJudgeProfileData:", err);
    return {
      success: false,
      assignedCompetitions: [],
      stats: { totalAssigned: 0, submittedAssessments: 0, draftAssessments: 0 },
      error: err instanceof Error ? err.message : "Gagal memuat profil dewan juri.",
    };
  }
}

export async function updateJudgeProfileData(data: {
  id: string;
  fullName: string;
  institution: string;
  nickname?: string;
  phone?: string;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSupabase = createAdminClient();

    const { error: pErr } = await adminSupabase
      .from("profiles")
      .update({
        full_name: data.fullName,
        institution: data.institution,
        nickname: data.nickname || null,
        phone: data.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (pErr) throw pErr;

    if (data.newPassword && data.newPassword.trim().length >= 6) {
      try {
        await adminSupabase.auth.admin.updateUserById(data.id, {
          password: data.newPassword.trim(),
        });
      } catch (authErr) {
        console.warn("Notice: Gagal memperbarui kata sandi auth:", authErr);
      }
    }

    revalidatePath("/juri/profil");
    revalidatePath("/juri");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updateJudgeProfileData:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui profil juri.",
    };
  }
}


