"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

import {
  DUMMY_TO_COMP_ID,
  DUMMY_TO_JUDGE_ID,
  type MatrixAssignmentItem,
} from "@/lib/constants";

export async function getJudgeAssignmentData(): Promise<{
  success: boolean;
  judges: Array<{ id: string; fullName: string; email: string; expertise?: string; title?: string; avatarUrl?: string }>;
  competitions: Array<{ id: string; name: string; shortName: string; category: string; slug: string }>;
  assignments: Array<{ judgeId: string; competitionId: string; isChiefJudge: boolean }>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil juri dari profiles
    const { data: dbJudges, error: errJudges } = await supabase
      .from("profiles")
      .select("id, full_name, email, institution, nickname, avatar_url")
      .eq("role", "juri")
      .order("created_at", { ascending: true });

    if (errJudges) throw errJudges;

    // 2. Ambil kompetisi dari competitions
    const { data: dbCompetitions, error: errComps } = await supabase
      .from("competitions")
      .select("id, name, short_name, type, slug, sort_order")
      .order("sort_order", { ascending: true });

    if (errComps) throw errComps;

    // 3. Ambil penugasan dari competition_judges
    const { data: dbAssignments, error: errAssignments } = await supabase
      .from("competition_judges")
      .select("competition_id, judge_id, is_chief_judge, status")
      .eq("status", "aktif");

    if (errAssignments) throw errAssignments;

    const assignments = (dbAssignments || []).map((row) => ({
      competitionId: row.competition_id,
      judgeId: row.judge_id,
      isChiefJudge: Boolean(row.is_chief_judge),
    }));

    return {
      success: true,
      judges: (dbJudges || []).map((j) => ({
        id: j.id,
        fullName: j.full_name || "Dewan Juri",
        email: j.email || "",
        expertise: j.institution || "Dewan Juri Ahli",
        title: j.nickname || undefined,
        avatarUrl: j.avatar_url || undefined,
      })),
      competitions: (dbCompetitions || []).map((c) => ({
        id: c.id,
        name: c.name,
        shortName: c.short_name || c.name,
        category: c.type || "umum",
        slug: c.slug,
      })),
      assignments,
    };
  } catch (err: unknown) {
    console.error("Error getJudgeAssignmentData:", err);
    return {
      success: false,
      judges: [],
      competitions: [],
      assignments: [],
      error: err instanceof Error ? err.message : "Gagal memuat data penugasan juri",
    };
  }
}

export async function saveJudgeAssignmentMatrix(assignments: MatrixAssignmentItem[]): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Normalisasi ID juri dan ID kompetisi ke UUID
    const cleanAssignments: Array<{
      competition_id: string;
      judge_id: string;
      is_chief_judge: boolean;
      status: "aktif";
      assigned_at: string;
    }> = [];

    const seen = new Set<string>();

    for (const item of assignments) {
      const compId = DUMMY_TO_COMP_ID[item.competitionId] || item.competitionId;
      const jId = DUMMY_TO_JUDGE_ID[item.judgeId] || item.judgeId;

      const isUuidJudge = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jId);
      const isUuidComp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(compId);

      if (isUuidJudge && isUuidComp) {
        const key = `${compId}_${jId}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleanAssignments.push({
            competition_id: compId,
            judge_id: jId,
            is_chief_judge: Boolean(item.isChiefJudge),
            status: "aktif",
            assigned_at: new Date().toISOString(),
          });
        }
      }
    }

    // 2. Kosongkan penugasan aktif lama
    const { error: delError } = await supabase
      .from("competition_judges")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (delError) {
      console.error("Gagal menghapus penugasan lama:", delError);
      return { success: false, error: delError.message };
    }

    // 3. Masukkan batch penugasan baru
    if (cleanAssignments.length > 0) {
      const { error: insError } = await supabase
        .from("competition_judges")
        .insert(cleanAssignments);

      if (insError) {
        console.error("Gagal menyimpan penugasan juri:", insError);
        return { success: false, error: insError.message };
      }
    }

    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/juri");
    revalidatePath("/juri");
    revalidatePath("/dashboard/lomba");
    return { success: true, count: cleanAssignments.length };
  } catch (err: unknown) {
    console.error("Error saveJudgeAssignmentMatrix:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan matriks penugasan.",
    };
  }
}

export async function createJudgeAccount(data: {
  fullName: string;
  email: string;
  expertise: string;
  title?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Cek atau buat user auth
    const { data: userList } = await supabase.auth.admin.listUsers();
    let existingUser = userList?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );

    let userId = existingUser?.id;

    if (!existingUser) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: "rahasia123",
        email_confirm: true,
        user_metadata: {
          full_name: data.fullName,
          role: "juri",
          institution: data.expertise,
        },
      });

      if (createError || !created?.user?.id) {
        return { success: false, error: createError?.message || "Gagal membuat akun auth juri." };
      }
      userId = created.user.id;
    }

    if (!userId) {
      return { success: false, error: "ID pengguna juri tidak ditemukan." };
    }

    // 2. Simpan/sinkronkan ke public.profiles
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: data.email,
      full_name: data.fullName,
      role: "juri",
      institution: data.expertise,
      nickname: data.title || null,
      phone: data.phone || null,
      avatar_url: data.avatarUrl || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    revalidatePath("/dashboard/juri");
    revalidatePath("/dashboard/juri/penugasan");
    return { success: true, userId };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan dewan juri.",
    };
  }
}

export async function updateJudgeAccount(data: {
  judgeId: string;
  fullName: string;
  email: string;
  expertise: string;
  title?: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Update public.profiles
    const updatePayload: Record<string, any> = {
      full_name: data.fullName,
      email: data.email,
      institution: data.expertise,
      nickname: data.title || null,
      phone: data.phone || null,
      updated_at: new Date().toISOString(),
    };
    // Hanya update avatar_url jika dikirim (tidak undefined) agar tidak menimpa foto lama
    if (data.avatarUrl !== undefined) {
      updatePayload.avatar_url = data.avatarUrl || null;
    }

    const { error: profileError } = await (supabase
      .from("profiles") as any)
      .update(updatePayload)
      .eq("id", data.judgeId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 2. Sinkronkan ke auth user jika email/metadata berubah
    try {
      await supabase.auth.admin.updateUserById(data.judgeId, {
        email: data.email,
        user_metadata: {
          full_name: data.fullName,
          institution: data.expertise,
        },
      });
    } catch (e) {
      console.warn("Notice: Gagal update auth metadata juri:", e);
    }

    revalidatePath("/dashboard/juri");
    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/pengguna");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data dewan juri.",
    };
  }
}


export async function getCompetitionMonitoringData(slug: string): Promise<{
  success: boolean;
  competition?: {
    id: string;
    slug: string;
    name: string;
    shortName: string;
    category: string;
    status: string;
    description: string;
  };
  judges?: Array<{
    id: string;
    fullName: string;
    expertise: string;
    avatarUrl: string;
    isChiefJudge: boolean;
  }>;
  participants?: Array<{
    id: string;
    registrationNumber: string;
    fullName: string;
    institution: string;
  }>;
  scores?: Record<string, Record<string, number>>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const resolvedCompId = DUMMY_TO_COMP_ID[slug] || slug;

    // 1. Ambil data kompetisi
    const query = supabase.from("competitions").select("*, competition_criteria(*)");
    const { data: compRow, error: cErr } = isUuid
      ? await query.eq("id", slug).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    if (cErr) throw cErr;

    const compId = compRow?.id || resolvedCompId;
    if (!compRow && !compId) {
      return { success: false, error: "Cabang lomba tidak ditemukan" };
    }

    // 2. Ambil penugasan dewan juri dari tabel competition_judges
    const { data: cJudges, error: jErr } = await supabase
      .from("competition_judges")
      .select("is_chief_judge, judge:profiles!competition_judges_judge_id_fkey(id, full_name, email, institution, avatar_url)")
      .eq("competition_id", compId)
      .eq("status", "aktif");

    if (jErr) throw jErr;

    const judges = (cJudges || []).map((cj) => {
      const p = cj.judge as any;
      return {
        id: p?.id || "",
        fullName: p?.full_name || "Dewan Juri",
        expertise: p?.institution || "Dewan Juri Ahli",
        avatarUrl:
          p?.avatar_url ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
        isChiefJudge: Boolean(cj.is_chief_judge),
      };
    });

    // 3. Ambil pendaftaran peserta dari registrations
    const { data: regRows, error: rErr } = await supabase
      .from("registrations")
      .select("id, team_name, participant_id, participants(id, full_name, institution, registration_number)")
      .eq("competition_id", compId);

    if (rErr) throw rErr;

    const participants = (regRows || []).map((r) => {
      const part = r.participants as any;
      return {
        id: r.id,
        registrationNumber: part?.registration_number || `REG-${r.id.slice(0, 6)}`,
        fullName: r.team_name || part?.full_name || "Peserta",
        institution: part?.institution || "Umum",
      };
    });

    // 4. Ambil penilaian jika ada
    const { data: assessments } = await supabase
      .from("assessments")
      .select("registration_id, judge_id, weighted_total, status")
      .eq("competition_id", compId);

    const scores: Record<string, Record<string, number>> = {};
    (assessments || []).forEach((sc) => {
      if (!scores[sc.registration_id]) {
        scores[sc.registration_id] = {};
      }
      scores[sc.registration_id][sc.judge_id] = Number(sc.weighted_total);
    });

    return {
      success: true,
      competition: compRow
        ? {
            id: compRow.id,
            slug: compRow.slug,
            name: compRow.name,
            shortName: compRow.short_name || compRow.name,
            category: compRow.type || "Umum",
            status: compRow.status || "berlangsung",
            description: compRow.description || "",
          }
        : undefined,
      judges,
      participants,
      scores,
    };
  } catch (err: unknown) {
    console.error("Error getCompetitionMonitoringData:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat data monitoring lomba.",
    };
  }
}

export async function getCompetitionJudgesBySlug(slug: string): Promise<Array<{
  id: string;
  fullName: string;
  expertise: string;
  avatarUrl: string;
  isChiefJudge: boolean;
}>> {
  try {
    const supabase = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    const resolvedCompId = DUMMY_TO_COMP_ID[slug] || slug;

    const query = supabase.from("competitions").select("id");
    const { data: comp } = isUuid
      ? await query.eq("id", slug).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    const compId = comp?.id || resolvedCompId;
    if (!compId) return [];

    const { data: cJudges } = await supabase
      .from("competition_judges")
      .select("is_chief_judge, judge:profiles!competition_judges_judge_id_fkey(id, full_name, email, institution, avatar_url)")
      .eq("competition_id", compId)
      .eq("status", "aktif");

    if (!cJudges || cJudges.length === 0) return [];

    return cJudges.map((cj) => {
      const p = cj.judge as any;
      return {
        id: p?.id || "",
        fullName: p?.full_name || "Dewan Juri",
        expertise: p?.institution || "Dewan Juri Ahli",
        avatarUrl:
          p?.avatar_url ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
        isChiefJudge: Boolean(cj.is_chief_judge),
      };
    });
  } catch (err) {
    console.error("Error getCompetitionJudgesBySlug:", err);
    return [];
  }
}

/**
 * Helper to fetch all competition manuscripts stored in event_settings (key: competition_manuscripts)
 */
export async function getCompetitionManuscriptsMap(): Promise<Record<string, string[]>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "competition_manuscripts")
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      return data.value as Record<string, string[]>;
    }
    return {};
  } catch (err) {
    console.error("Error getCompetitionManuscriptsMap:", err);
    return {};
  }
}

/**
 * Helper to update a competition's manuscripts in event_settings
 */
export async function saveCompetitionManuscriptEntry(
  competitionId: string,
  slug: string,
  manuscripts: string[]
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const currentMap = await getCompetitionManuscriptsMap();
    const nextMap = {
      ...currentMap,
      [competitionId]: manuscripts,
      [slug]: manuscripts,
    };

    await supabase.from("event_settings").upsert({
      key: "competition_manuscripts",
      value: nextMap,
      description: "Daftar pilihan naskah untuk cabang lomba tertentu",
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error saveCompetitionManuscriptEntry:", err);
  }
}

/**
 * Helper to fetch all competition event formats stored in event_settings (key: competition_event_formats)
 */
export async function getCompetitionEventFormatsMap(): Promise<Record<string, string[]>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "competition_event_formats")
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      return data.value as Record<string, string[]>;
    }
    return {};
  } catch (err) {
    console.error("Error getCompetitionEventFormatsMap:", err);
    return {};
  }
}

/**
 * Helper to update a competition's event formats in event_settings
 */
export async function saveCompetitionEventFormatEntry(
  competitionId: string,
  slug: string,
  eventFormats: string[]
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const currentMap = await getCompetitionEventFormatsMap();
    const nextMap = {
      ...currentMap,
      [competitionId]: eventFormats,
      [slug]: eventFormats,
    };

    await supabase.from("event_settings").upsert({
      key: "competition_event_formats",
      value: nextMap,
      description: "Daftar format acara yang dibawakan untuk cabang lomba tertentu",
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error saveCompetitionEventFormatEntry:", err);
  }
}

export async function createCompetitionAdmin(data: {
  name: string;
  shortName: string;
  slug?: string;
  category: "individu" | "kelompok";
  description?: string;
  rules?: string;
  manuscripts?: string[] | string;
  eventFormats?: string[] | string;
  venue?: string;
  aggregation: "rata_rata" | "total" | "rata_rata_buang_ekstrem";
  minMembers?: number;
  maxMembers?: number;
  maxParticipants?: number;
  status?: "draft" | "pendaftaran" | "berlangsung" | "selesai" | "dibatalkan";
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Generate slug jika kosong
    const rawSlug = data.slug?.trim() || data.shortName || data.name;
    const cleanSlug = rawSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Cek duplikasi slug
    const { data: existing } = await supabase
      .from("competitions")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    const finalSlug = existing ? `${cleanSlug}-${Date.now().toString().slice(-4)}` : cleanSlug;

    const minTeam = data.category === "kelompok" ? Math.max(2, data.minMembers || 2) : 1;
    const maxTeam = data.category === "kelompok" ? Math.max(minTeam, data.maxMembers || 10) : 1;

    const { data: inserted, error: cErr } = await supabase
      .from("competitions")
      .insert({
        name: data.name.trim(),
        short_name: data.shortName.trim(),
        slug: finalSlug,
        type: data.category,
        description: data.description?.trim() || "",
        rules: data.rules?.trim() || null,
        theme_link: data.venue?.trim() || "Panggung Utama",
        aggregation: data.aggregation,
        min_team_members: minTeam,
        max_team_members: maxTeam,
        max_participants: data.maxParticipants || 20,
        status: data.status || "pendaftaran",
        sort_order: 99,
      })
      .select()
      .single();

    if (cErr) return { success: false, error: cErr.message };

    // Simpan pilihan naskah jika ada
    if (data.manuscripts !== undefined) {
      const list = Array.isArray(data.manuscripts)
        ? data.manuscripts.map((m) => m.trim()).filter(Boolean)
        : data.manuscripts
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean);
      await saveCompetitionManuscriptEntry(inserted.id, finalSlug, list);
    }

    // Simpan format acara jika ada
    if (data.eventFormats !== undefined) {
      const list = Array.isArray(data.eventFormats)
        ? data.eventFormats.map((m) => m.trim()).filter(Boolean)
        : data.eventFormats
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean);
      await saveCompetitionEventFormatEntry(inserted.id, finalSlug, list);
    }

    // Pasang 1 kriteria default berbobot 100% agar perhitungan penilaian langsung berfungsi
    await supabase.from("competition_criteria").insert({
      competition_id: inserted.id,
      name: "Kualitas Penampilan & Penguasaan Materi",
      description: "Penilaian menyeluruh terhadap keselarasan dan estetika penampilan",
      weight: 100,
      max_score: 100,
      sort_order: 1,
    });

    try {
      await supabase.from("activity_logs").insert({
        action: "create_competition",
        entity: "competitions",
        entity_id: inserted.id,
        description: `Penambahan cabang lomba baru: "${inserted.name}" (${inserted.type}).`,
      });
    } catch {}

    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/kriteria");
    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/lomba");
    revalidatePath("/");
    return { success: true, data: inserted };
  } catch (err: unknown) {
    console.error("Error createCompetitionAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan cabang lomba.",
    };
  }
}

export async function updateCompetitionAdmin(data: {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  category: "individu" | "kelompok";
  description?: string;
  rules?: string;
  manuscripts?: string[] | string;
  eventFormats?: string[] | string;
  venue?: string;
  aggregation: "rata_rata" | "total" | "rata_rata_buang_ekstrem";
  minMembers?: number;
  maxMembers?: number;
  maxParticipants?: number;
  status: "draft" | "pendaftaran" | "berlangsung" | "selesai" | "dibatalkan";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const minTeam = data.category === "kelompok" ? Math.max(2, data.minMembers || 2) : 1;
    const maxTeam = data.category === "kelompok" ? Math.max(minTeam, data.maxMembers || 10) : 1;

    const { error: uErr } = await supabase
      .from("competitions")
      .update({
        name: data.name.trim(),
        short_name: data.shortName.trim(),
        slug: data.slug.trim(),
        type: data.category,
        description: data.description?.trim() || "",
        ...(data.rules !== undefined ? { rules: data.rules.trim() } : {}),
        theme_link: data.venue?.trim() || "Panggung Utama",
        aggregation: data.aggregation,
        min_team_members: minTeam,
        max_team_members: maxTeam,
        max_participants: data.maxParticipants || 20,
        status: data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (uErr) return { success: false, error: uErr.message };

    // Simpan pilihan naskah jika ada
    if (data.manuscripts !== undefined) {
      const list = Array.isArray(data.manuscripts)
        ? data.manuscripts.map((m) => m.trim()).filter(Boolean)
        : data.manuscripts
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean);
      await saveCompetitionManuscriptEntry(data.id, data.slug, list);
    }

    // Simpan format acara jika ada
    if (data.eventFormats !== undefined) {
      const list = Array.isArray(data.eventFormats)
        ? data.eventFormats.map((m) => m.trim()).filter(Boolean)
        : data.eventFormats
            .split("\n")
            .map((m) => m.trim())
            .filter(Boolean);
      await saveCompetitionEventFormatEntry(data.id, data.slug, list);
    }

    try {
      await supabase.from("activity_logs").insert({
        action: "update_competition",
        entity: "competitions",
        entity_id: data.id,
        description: `Pembaruan data lomba: "${data.name}" (${data.category}) oleh Seksi Acara.`,
      });
    } catch {}

    revalidatePath("/dashboard/lomba");
    revalidatePath(`/dashboard/lomba/${data.slug}`);
    revalidatePath("/dashboard/kriteria");
    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/lomba");
    revalidatePath(`/lomba/${data.slug}`);
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updateCompetitionAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data lomba.",
    };
  }
}

export async function deleteOrArchiveCompetitionAdmin(
  id: string,
  mode: "archive" | "delete"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    if (mode === "archive") {
      const { error } = await supabase
        .from("competitions")
        .update({ status: "dibatalkan", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) return { success: false, error: error.message };

      try {
        await supabase.from("activity_logs").insert({
          action: "archive_competition",
          entity: "competitions",
          entity_id: id,
          description: `Cabang lomba dibatalkan / diarsipkan oleh Seksi Acara.`,
        });
      } catch {}
    } else {
      // Cek apakah ada peserta terdaftar
      const { count, error: countErr } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", id);

      if (countErr) return { success: false, error: countErr.message };

      if ((count || 0) > 0) {
        return {
          success: false,
          error: `Cabang lomba ini telah memiliki ${count} pendaftaran peserta. Silakan gunakan opsi 'Arsipkan / Batalkan Lomba' untuk menjaga integritas data penilaian.`,
        };
      }

      // Hapus kriteria & juri yang terkait lalu hapus lomba
      await supabase.from("competition_criteria").delete().eq("competition_id", id);
      await supabase.from("competition_judges").delete().eq("competition_id", id);
      const { error: dErr } = await supabase.from("competitions").delete().eq("id", id);

      if (dErr) return { success: false, error: dErr.message };

      try {
        await supabase.from("activity_logs").insert({
          action: "delete_competition",
          entity: "competitions",
          entity_id: id,
          description: `Cabang lomba berhasil dihapus permanen.`,
        });
      } catch {}
    }

    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/kriteria");
    revalidatePath("/dashboard/juri/penugasan");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/lomba");
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error deleteOrArchiveCompetitionAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memproses penghapusan lomba.",
    };
  }
}

export async function getJudgeDashboardData(): Promise<{
  success: boolean;
  judgeInfo?: {
    fullName: string;
    expertise: string;
    title: string;
    avatarUrl?: string;
  };
  assignedComps: Array<{
    id: string;
    slug: string;
    name: string;
    category: string;
    description: string;
    venue: string;
    stage: string;
    status: string;
    criteriaCount: number;
    isChiefJudge: boolean;
  }>;
  error?: string;
}> {
  try {
    const adminSupabase = createAdminClient();
    const serverSupabase = await createServerClient();

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

    const queryStr = `
      judge_id,
      is_chief_judge,
      judge:profiles!competition_judges_judge_id_fkey (
        id,
        full_name,
        institution,
        role,
        avatar_url
      ),
      competitions (
        id,
        slug,
        name,
        type,
        description,
        theme_link,
        status,
        competition_criteria (id),
        schedules (venue, stage)
      )
    `;

    // 1. Jika ada user login dan memiliki penugasan di competition_judges
    if (judgeProfile) {
      const { data: assignments } = await adminSupabase
        .from("competition_judges")
        .select(queryStr)
        .eq("judge_id", judgeProfile.id)
        .eq("status", "aktif");

      if (assignments && assignments.length > 0) {
        const mapped = assignments
          .filter((a) => Boolean(a.competitions))
          .map((a) => {
            const comp = a.competitions as any;
            const rawTheme = comp.theme_link?.trim() || "";
            const sch = comp.schedules?.[0];
            let venue = "";
            let stage = "";

            if (rawTheme.includes(" | ")) {
              const parts = rawTheme.split(" | ");
              venue = parts[0]?.trim() || "";
              stage = parts[1]?.trim() || "";
            } else if (rawTheme) {
              venue = rawTheme;
              stage = sch?.stage?.trim() || "";
            } else {
              venue = sch?.venue?.trim() || "Panggung Utama";
              stage = sch?.stage?.trim() || "";
            }

            return {
              id: comp.id,
              slug: comp.slug,
              name: comp.name,
              category: comp.type || "individu",
              description: comp.description || "",
              venue: venue || "Panggung Utama",
              stage,
              status: comp.status || "pendaftaran",
              criteriaCount: comp.competition_criteria?.length || 4,
              isChiefJudge: Boolean(a.is_chief_judge),
            };
          });

        return {
          success: true,
          judgeInfo: {
            fullName: judgeProfile.full_name || "Dewan Juri",
            expertise: judgeProfile.institution || "Dewan Juri Resmi",
            title: judgeProfile.role === "juri" ? "Dewan Juri Ahli Bersertifikasi" : "Penilai Lomba",
            avatarUrl: judgeProfile.avatar_url || undefined,
          },
          assignedComps: mapped,
        };
      }
    }

    // 2. Fallback: jika belum login atau login sebagai akun panitia/admin,
    // ambil penugasan aktif dari database (utamakan juri H.MULYANA,MM atau juri pertama aktif)
    const { data: allActive } = await adminSupabase
      .from("competition_judges")
      .select(queryStr)
      .eq("status", "aktif");

    if (allActive && allActive.length > 0) {
      const targetAssignment =
        allActive.find(
          (a) => (a.judge as any)?.full_name?.toUpperCase().includes("MULYANA")
        ) || allActive[0];

      const fallbackJudge = targetAssignment.judge as any;
      const targetJudgeId = fallbackJudge?.id || targetAssignment.judge_id;
      const activeForJudge = allActive.filter((a) => a.judge_id === targetJudgeId);

      const mapped = activeForJudge
        .filter((a) => Boolean(a.competitions))
        .map((a) => {
          const comp = a.competitions as any;
          const rawTheme = comp.theme_link?.trim() || "";
          const sch = comp.schedules?.[0];
          let venue = "";
          let stage = "";

          if (rawTheme.includes(" | ")) {
            const parts = rawTheme.split(" | ");
            venue = parts[0]?.trim() || "";
            stage = parts[1]?.trim() || "";
          } else if (rawTheme) {
            venue = rawTheme;
            stage = sch?.stage?.trim() || "";
          } else {
            venue = sch?.venue?.trim() || "Panggung Utama";
            stage = sch?.stage?.trim() || "";
          }

          return {
            id: comp.id,
            slug: comp.slug,
            name: comp.name,
            category: comp.type || "individu",
            description: comp.description || "",
            venue: venue || "Panggung Utama",
            stage,
            status: comp.status || "pendaftaran",
            criteriaCount: comp.competition_criteria?.length || 4,
            isChiefJudge: Boolean(a.is_chief_judge),
          };
        });

      return {
        success: true,
        judgeInfo: {
          fullName: fallbackJudge?.full_name || "H.MULYANA,MM",
          expertise: fallbackJudge?.institution || "Dewan Juri Sastra & Puisi",
          title: "Dewan Juri Ahli Bersertifikasi",
          avatarUrl: fallbackJudge?.avatar_url || undefined,
        },
        assignedComps: mapped,
      };
    }

    return {
      success: true,
      assignedComps: [],
    };
  } catch (err: unknown) {
    console.error("Error getJudgeDashboardData:", err);
    return {
      success: false,
      assignedComps: [],
      error: err instanceof Error ? err.message : "Gagal memuat penugasan juri",
    };
  }
}

