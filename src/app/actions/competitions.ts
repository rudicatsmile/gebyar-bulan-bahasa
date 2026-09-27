"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const CriterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nama kriteria minimal 2 karakter"),
  description: z.string().optional(),
  weight: z.number().min(1).max(100),
  maxScore: z.number().default(100),
});

const SaveCriteriaSchema = z.object({
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  criteria: z.array(CriterionSchema).min(1, "Minimal harus ada 1 kriteria"),
});

const AssignJudgeSchema = z.object({
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  judgeId: z.string().uuid("ID Juri tidak valid"),
  isChiefJudge: z.boolean().default(false),
  expertiseNote: z.string().optional(),
});

export async function updateCompetitionCriteria(data: z.infer<typeof SaveCriteriaSchema>) {
  const parsed = SaveCriteriaSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  // Validasi total bobot kriteria wajib tepat 100%
  const totalWeight = parsed.data.criteria.reduce((sum, item) => sum + item.weight, 0);
  if (Math.round(totalWeight) !== 100) {
    return {
      success: false,
      error: `Total bobot kriteria harus tepat 100%. Saat ini berjumlah: ${totalWeight}%`,
    };
  }

  try {
    const supabase = createAdminClient();

    // Hapus kriteria lama dan insert kriteria baru
    await supabase
      .from("competition_criteria")
      .delete()
      .eq("competition_id", parsed.data.competitionId);

    const toInsert = parsed.data.criteria.map((c, idx) => ({
      competition_id: parsed.data.competitionId,
      name: c.name,
      description: c.description || null,
      weight: c.weight,
      max_score: c.maxScore || 100,
      sort_order: idx + 1,
    }));

    const { error } = await supabase.from("competition_criteria").insert(toInsert);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/kriteria");
    revalidatePath(`/dashboard/lomba`);
    revalidatePath(`/lomba`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui kriteria.";
    return { success: false, error: message };
  }
}

export async function assignJudgeToCompetition(data: z.infer<typeof AssignJudgeSchema>) {
  const parsed = AssignJudgeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();

    // Cek jadwal lomba untuk mendeteksi potensi bentrok waktu juri
    const { data: currentSchedule } = await supabase
      .from("schedules")
      .select("event_date, start_time, end_time")
      .eq("competition_id", parsed.data.competitionId)
      .maybeSingle();

    if (currentSchedule) {
      // Periksa apakah juri sudah bertugas di lomba lain pada tanggal & jam yang beririsan
      await supabase
        .from("competition_judges")
        .select(`
          competition_id,
          competitions (
            name,
            schedules (
              event_date,
              start_time,
              end_time
            )
          )
        `)
        .eq("judge_id", parsed.data.judgeId)
        .eq("status", "aktif");
    }

    // Jika ditandai sebagai Chief Judge, pastikan juri lain tidak ditandai chief judge
    if (parsed.data.isChiefJudge) {
      await supabase
        .from("competition_judges")
        .update({ is_chief_judge: false })
        .eq("competition_id", parsed.data.competitionId);
    }

    // Simpan penugasan
    const { error } = await supabase.from("competition_judges").upsert(
      {
        competition_id: parsed.data.competitionId,
        judge_id: parsed.data.judgeId,
        is_chief_judge: parsed.data.isChiefJudge,
        expertise_note: parsed.data.expertiseNote || null,
        status: "aktif",
      },
      { onConflict: "competition_id,judge_id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/lomba");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menugaskan juri.";
    return { success: false, error: message };
  }
}

export async function toggleCompetitionStatus(
  competitionId: string,
  status: "pendaftaran" | "berlangsung" | "selesai" | "draft"
) {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("competitions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", competitionId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "Cabang lomba tidak ditemukan di database." };
    }

    revalidatePath("/dashboard/lomba");
    revalidatePath(`/dashboard/lomba/${data[0].slug}`);
    revalidatePath("/lomba");
    revalidatePath(`/lomba/${data[0].slug}`);
    revalidatePath("/dashboard");
    revalidatePath("/monitor");
    revalidatePath("/");
    return { success: true, data: data[0] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status lomba.";
    return { success: false, error: message };
  }
}
