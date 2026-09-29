"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

// =============================================================================
// TYPES
// =============================================================================
export interface PuzzleItem {
  id: string;
  costumeName: string;
  regionName: string;
  costumeImageUrl: string | null;
  hint: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface PuzzleAttemptResult {
  id: string;
  totalItems: number;
  correctCount: number;
  score: number;
  timeSeconds: number | null;
  createdAt: string;
}

// =============================================================================
// IN-MEMORY FALLBACK (Aktif otomatis jika tabel Supabase belum dimigrasi)
// =============================================================================
const DEFAULT_PUZZLE_ITEMS: PuzzleItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111101",
    costumeName: "Kebaya",
    regionName: "Jawa",
    costumeImageUrl: null,
    hint: "Pakaian tradisional wanita dengan bordir anggun nan menawan",
    sortOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111102",
    costumeName: "Ulos",
    regionName: "Sumatera Utara",
    costumeImageUrl: null,
    hint: "Kain tenun sakral khas Batak yang disampirkan di bahu",
    sortOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111103",
    costumeName: "Baju Bodo",
    regionName: "Sulawesi Selatan",
    costumeImageUrl: null,
    hint: "Pakaian adat wanita Bugis-Makassar berbentuk segi empat berlengan pendek",
    sortOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111104",
    costumeName: "Pakaian Ewer",
    regionName: "Papua",
    costumeImageUrl: null,
    hint: "Pakaian adat alami dari susunan rumbai daun sagu kering",
    sortOrder: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111105",
    costumeName: "Songket Palembang",
    regionName: "Sumatera Selatan",
    costumeImageUrl: null,
    hint: "Ratu kain tenun bercorak kilau benang emas warisan Sriwijaya",
    sortOrder: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111106",
    costumeName: "Beskap",
    regionName: "Jawa Tengah",
    costumeImageUrl: null,
    hint: "Jas resmi adat pria berkerah kaku tanpa lipatan",
    sortOrder: 6,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111107",
    costumeName: "Baju Kurung",
    regionName: "Riau",
    costumeImageUrl: null,
    hint: "Baju longgar santun khas kebudayaan Melayu Nusantara",
    sortOrder: 7,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111108",
    costumeName: "Pakaian Sapei Sapaq",
    regionName: "Kalimantan Timur",
    costumeImageUrl: null,
    hint: "Busana tradisional suku Dayak bermotif flora-fauna dan manik-manik",
    sortOrder: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111109",
    costumeName: "Baju Cele",
    regionName: "Maluku",
    costumeImageUrl: null,
    hint: "Kain khas bermotif kotak-kotak geometris merah cerah dan kain sarung tenun",
    sortOrder: 9,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "11111111-1111-4111-8111-111111111110",
    costumeName: "Payas Agung",
    regionName: "Bali",
    costumeImageUrl: null,
    hint: "Busana kebesaran adat Bali dengan mahkota tajug bertingkat menjulang emas",
    sortOrder: 10,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

let fallbackMemoryItems: PuzzleItem[] = [...DEFAULT_PUZZLE_ITEMS];

interface MemoryAttemptRow {
  id: string;
  participantId: string;
  participantName: string;
  institution: string;
  totalItems: number;
  correctCount: number;
  score: number;
  timeSeconds: number | null;
  createdAt: string;
}

const fallbackMemoryAttempts: MemoryAttemptRow[] = [
  {
    id: "att-demo-01",
    participantId: "demo-part-1",
    participantName: "Siti Rahmawati",
    institution: "SMA Negeri 1 Jakarta",
    totalItems: 10,
    correctCount: 9,
    score: 90,
    timeSeconds: 42,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "att-demo-02",
    participantId: "demo-part-2",
    participantName: "Budi Pratama",
    institution: "SMK Negeri 2 Bandung",
    totalItems: 10,
    correctCount: 8,
    score: 80,
    timeSeconds: 58,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// =============================================================================
// ADMIN — GET ALL PUZZLE ITEMS
// =============================================================================
export async function getAdminPuzzleItems(): Promise<{
  success: boolean;
  items: PuzzleItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("puzzle_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      const items: PuzzleItem[] = data.map((row) => ({
        id: row.id,
        costumeName: row.costume_name,
        regionName: row.region_name,
        costumeImageUrl: row.costume_image_url || null,
        hint: row.hint || null,
        sortOrder: row.sort_order,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
      }));
      return { success: true, items };
    }

    return { success: true, items: fallbackMemoryItems };
  } catch {
    return { success: true, items: fallbackMemoryItems };
  }
}

// =============================================================================
// ADMIN — CREATE PUZZLE ITEM
// =============================================================================
const CreatePuzzleSchema = z.object({
  costumeName: z.string().min(2, "Nama baju daerah minimal 2 karakter"),
  regionName: z.string().min(2, "Nama daerah minimal 2 karakter"),
  costumeImageUrl: z.string().optional(),
  hint: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function createPuzzleItem(
  data: z.infer<typeof CreatePuzzleSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = CreatePuzzleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    const { error } = await supabase.from("puzzle_items").insert({
      costume_name: parsed.data.costumeName,
      region_name: parsed.data.regionName,
      costume_image_url: parsed.data.costumeImageUrl || null,
      hint: parsed.data.hint || null,
      sort_order: parsed.data.sortOrder,
      is_active: parsed.data.isActive,
      created_by: user?.id || null,
    });

    if (error) {
      // Fallback ke memory jika tabel belum ada di DB
      const newItem: PuzzleItem = {
        id: crypto.randomUUID(),
        costumeName: parsed.data.costumeName,
        regionName: parsed.data.regionName,
        costumeImageUrl: parsed.data.costumeImageUrl || null,
        hint: parsed.data.hint || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        createdAt: new Date().toISOString(),
      };
      fallbackMemoryItems.push(newItem);
    }

    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  } catch {
    const newItem: PuzzleItem = {
      id: crypto.randomUUID(),
      costumeName: parsed.data.costumeName,
      regionName: parsed.data.regionName,
      costumeImageUrl: parsed.data.costumeImageUrl || null,
      hint: parsed.data.hint || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
      createdAt: new Date().toISOString(),
    };
    fallbackMemoryItems.push(newItem);
    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — UPDATE PUZZLE ITEM
// =============================================================================
const UpdatePuzzleSchema = z.object({
  id: z.string().uuid(),
  costumeName: z.string().min(2).optional(),
  regionName: z.string().min(2).optional(),
  costumeImageUrl: z.string().optional(),
  hint: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function updatePuzzleItem(
  data: z.infer<typeof UpdatePuzzleSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdatePuzzleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();

    const updatePayload: Database["public"]["Tables"]["puzzle_items"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.costumeName !== undefined)
      updatePayload.costume_name = parsed.data.costumeName;
    if (parsed.data.regionName !== undefined)
      updatePayload.region_name = parsed.data.regionName;
    if (parsed.data.costumeImageUrl !== undefined)
      updatePayload.costume_image_url = parsed.data.costumeImageUrl || null;
    if (parsed.data.hint !== undefined)
      updatePayload.hint = parsed.data.hint || null;
    if (parsed.data.sortOrder !== undefined)
      updatePayload.sort_order = parsed.data.sortOrder;
    if (parsed.data.isActive !== undefined)
      updatePayload.is_active = parsed.data.isActive;

    const { error } = await supabase
      .from("puzzle_items")
      .update(updatePayload)
      .eq("id", parsed.data.id);

    if (error) {
      fallbackMemoryItems = fallbackMemoryItems.map((item) => {
        if (item.id === parsed.data.id) {
          return {
            ...item,
            ...(parsed.data.costumeName && { costumeName: parsed.data.costumeName }),
            ...(parsed.data.regionName && { regionName: parsed.data.regionName }),
            ...(parsed.data.costumeImageUrl !== undefined && { costumeImageUrl: parsed.data.costumeImageUrl || null }),
            ...(parsed.data.hint !== undefined && { hint: parsed.data.hint || null }),
            ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
            ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
          };
        }
        return item;
      });
    }

    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  } catch {
    fallbackMemoryItems = fallbackMemoryItems.map((item) => {
      if (item.id === parsed.data.id) {
        return {
          ...item,
          ...(parsed.data.costumeName && { costumeName: parsed.data.costumeName }),
          ...(parsed.data.regionName && { regionName: parsed.data.regionName }),
          ...(parsed.data.costumeImageUrl !== undefined && { costumeImageUrl: parsed.data.costumeImageUrl || null }),
          ...(parsed.data.hint !== undefined && { hint: parsed.data.hint || null }),
          ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
          ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        };
      }
      return item;
    });
    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — DELETE PUZZLE ITEM
// =============================================================================
export async function deletePuzzleItem(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("puzzle_items").delete().eq("id", id);

    if (error) {
      fallbackMemoryItems = fallbackMemoryItems.filter((i) => i.id !== id);
    }

    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  } catch {
    fallbackMemoryItems = fallbackMemoryItems.filter((i) => i.id !== id);
    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — TOGGLE ACTIVE STATUS
// =============================================================================
export async function togglePuzzleItemActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("puzzle_items")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      fallbackMemoryItems = fallbackMemoryItems.map((i) =>
        i.id === id ? { ...i, isActive } : i
      );
    }

    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  } catch {
    fallbackMemoryItems = fallbackMemoryItems.map((i) =>
      i.id === id ? { ...i, isActive } : i
    );
    revalidatePath("/dashboard/challenge/puzzle");
    return { success: true };
  }
}

// =============================================================================
// PESERTA — GET ACTIVE PUZZLE ITEMS (shuffled, tanpa jawaban terekspos)
// =============================================================================
export async function getActivePuzzleItems(): Promise<{
  success: boolean;
  costumes: Array<{ id: string; costumeName: string; costumeImageUrl: string | null; hint: string | null }>;
  regions: string[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("puzzle_items")
      .select("id, costume_name, region_name, costume_image_url, hint")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (!error && data && data.length > 0) {
      const costumes = data.map((row) => ({
        id: row.id,
        costumeName: row.costume_name,
        costumeImageUrl: row.costume_image_url || null,
        hint: row.hint || null,
      }));

      const regions = data
        .map((row) => row.region_name)
        .sort(() => Math.random() - 0.5);

      return { success: true, costumes, regions };
    }

    // Fallback dari memory
    const active = fallbackMemoryItems.filter((i) => i.isActive);
    const costumes = active.map((i) => ({
      id: i.id,
      costumeName: i.costumeName,
      costumeImageUrl: i.costumeImageUrl,
      hint: i.hint,
    }));
    const regions = active
      .map((i) => i.regionName)
      .sort(() => Math.random() - 0.5);

    return { success: true, costumes, regions };
  } catch {
    const active = fallbackMemoryItems.filter((i) => i.isActive);
    const costumes = active.map((i) => ({
      id: i.id,
      costumeName: i.costumeName,
      costumeImageUrl: i.costumeImageUrl,
      hint: i.hint,
    }));
    const regions = active
      .map((i) => i.regionName)
      .sort(() => Math.random() - 0.5);

    return { success: true, costumes, regions };
  }
}

// =============================================================================
// PESERTA — SUBMIT PUZZLE ANSWERS
// =============================================================================
const SubmitPuzzleSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  answers: z.array(
    z.object({
      itemId: z.string().uuid(),
      selectedRegion: z.string().min(1),
    })
  ),
  timeSeconds: z.number().int().optional(),
});

export async function submitPuzzleAnswers(
  data: z.infer<typeof SubmitPuzzleSchema>
): Promise<{
  success: boolean;
  result?: PuzzleAttemptResult;
  details?: Array<{
    itemId: string;
    costumeName: string;
    selectedRegion: string;
    correctRegion: string;
    isCorrect: boolean;
  }>;
  pointsAwarded?: number;
  error?: string;
}> {
  const parsed = SubmitPuzzleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();

    // 1. Ambil jawaban benar dari DB atau fallback
    const itemIds = parsed.data.answers.map((a) => a.itemId);
    let answerMap = new Map<string, { id: string; costume_name: string; region_name: string }>();

    try {
      const { data: items } = await supabase
        .from("puzzle_items")
        .select("id, costume_name, region_name")
        .in("id", itemIds);

      if (items && items.length > 0) {
        answerMap = new Map(items.map((i) => [i.id, i]));
      }
    } catch {
      // ignore
    }

    if (answerMap.size === 0) {
      fallbackMemoryItems.forEach((i) => {
        answerMap.set(i.id, {
          id: i.id,
          costume_name: i.costumeName,
          region_name: i.regionName,
        });
      });
    }

    // 2. Koreksi jawaban
    let correctCount = 0;
    const details = parsed.data.answers.map((a) => {
      const item = answerMap.get(a.itemId);
      const correctRegion = item?.region_name || "";
      const isCorrect =
        a.selectedRegion.trim().toLowerCase() === correctRegion.trim().toLowerCase();
      if (isCorrect) correctCount++;
      return {
        itemId: a.itemId,
        costumeName: item?.costume_name || "?",
        selectedRegion: a.selectedRegion,
        correctRegion,
        isCorrect,
      };
    });

    const totalItems = parsed.data.answers.length;
    // Skor: 10 poin per jawaban benar
    const score = correctCount * 10;
    const attemptId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 3. Simpan attempt ke DB jika bisa
    try {
      await supabase.from("puzzle_attempts").insert({
        id: attemptId,
        participant_id: parsed.data.participantId,
        total_items: totalItems,
        correct_count: correctCount,
        score,
        time_seconds: parsed.data.timeSeconds || null,
        answers: details,
      });

      if (score > 0) {
        await supabase.from("point_transactions").insert({
          participant_id: parsed.data.participantId,
          points: score,
          source: "input_panitia",
          note: `Challenge Puzzle Baju Daerah: ${correctCount}/${totalItems} benar (+${score} poin)`,
        });
      }
    } catch {
      // Simpan di memory fallback
      fallbackMemoryAttempts.unshift({
        id: attemptId,
        participantId: parsed.data.participantId,
        participantName: "Peserta Kamu",
        institution: "-",
        totalItems,
        correctCount,
        score,
        timeSeconds: parsed.data.timeSeconds || null,
        createdAt: nowIso,
      });
    }

    revalidatePath("/peserta");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta/riwayat-poin");
    revalidatePath("/leaderboard");

    return {
      success: true,
      result: {
        id: attemptId,
        totalItems,
        correctCount,
        score,
        timeSeconds: parsed.data.timeSeconds || null,
        createdAt: nowIso,
      },
      details,
      pointsAwarded: score,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memproses jawaban puzzle.",
    };
  }
}

// =============================================================================
// PESERTA — GET MY PUZZLE HISTORY
// =============================================================================
export async function getMyPuzzleAttempts(participantId: string): Promise<{
  success: boolean;
  attempts: PuzzleAttemptResult[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("puzzle_attempts")
      .select("id, total_items, correct_count, score, time_seconds, created_at")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      const attempts: PuzzleAttemptResult[] = data.map((row) => ({
        id: row.id,
        totalItems: row.total_items,
        correctCount: row.correct_count,
        score: row.score,
        timeSeconds: row.time_seconds,
        createdAt: row.created_at,
      }));
      return { success: true, attempts };
    }

    const filtered = fallbackMemoryAttempts
      .filter((a) => a.participantId === participantId)
      .map((a) => ({
        id: a.id,
        totalItems: a.totalItems,
        correctCount: a.correctCount,
        score: a.score,
        timeSeconds: a.timeSeconds,
        createdAt: a.createdAt,
      }));
    return { success: true, attempts: filtered };
  } catch {
    const filtered = fallbackMemoryAttempts
      .filter((a) => a.participantId === participantId)
      .map((a) => ({
        id: a.id,
        totalItems: a.totalItems,
        correctCount: a.correctCount,
        score: a.score,
        timeSeconds: a.timeSeconds,
        createdAt: a.createdAt,
      }));
    return { success: true, attempts: filtered };
  }
}

// =============================================================================
// ADMIN — GET ALL PUZZLE ATTEMPTS (leaderboard/stats)
// =============================================================================
export async function getAdminPuzzleAttempts(): Promise<{
  success: boolean;
  attempts: Array<{
    id: string;
    participantName: string;
    institution: string;
    totalItems: number;
    correctCount: number;
    score: number;
    timeSeconds: number | null;
    createdAt: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("puzzle_attempts")
      .select("*, participants(full_name, institution)")
      .order("score", { ascending: false })
      .order("time_seconds", { ascending: true })
      .limit(100);

    if (!error && data && data.length > 0) {
      const attempts = data.map((row: any) => ({
        id: row.id,
        participantName: row.participants?.full_name || "Peserta",
        institution: row.participants?.institution || "-",
        totalItems: row.total_items,
        correctCount: row.correct_count,
        score: row.score,
        timeSeconds: row.time_seconds,
        createdAt: row.created_at,
      }));
      return { success: true, attempts };
    }

    return { success: true, attempts: fallbackMemoryAttempts };
  } catch {
    return { success: true, attempts: fallbackMemoryAttempts };
  }
}
