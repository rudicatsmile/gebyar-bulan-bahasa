"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureParticipantLedgerSynced } from "@/lib/supabase/point-sync";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback
  }
}

// =============================================================================
// TYPES
// =============================================================================
export interface JigsawConfig {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  gridSize: number; // 2=2x2, 3=3x3, 4=4x4, 5=5x5
  piecesCount: number; // 4, 9, 16, 25
  pointsReward: number;
  timeLimitSeconds: number; // 0 = tanpa batas
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JigsawAttempt {
  id: string;
  puzzleId: string;
  participantId: string;
  participantName?: string;
  institution?: string;
  score: number;
  timeSeconds: number | null;
  movesCount: number;
  isCompleted: boolean;
  createdAt: string;
}

// In-Memory Fallback jika tabel Supabase belum dimigrasikan
const DEFAULT_JIGSAW: JigsawConfig = {
  id: "33333333-3333-4333-8333-333333333301",
  title: "Mahakarya Wayang & Ornamen Nusantara",
  description:
    "Susun kembali kepingan mahakarya wayang kulit dan ornamen batik nusantara hingga menjadi gambar utuh untuk membuktikan ketangkasan visual Anda!",
  imageUrl: "/uploads/puzzle/puzzle-wayang.jpg",
  gridSize: 3,
  piecesCount: 9,
  pointsReward: 100,
  timeLimitSeconds: 120,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let fallbackConfigs: JigsawConfig[] = [DEFAULT_JIGSAW];
let fallbackAttempts: JigsawAttempt[] = [];

// =============================================================================
// 1. ADMIN — GET CONFIGS
// =============================================================================
export async function getAdminJigsawConfigs(): Promise<{
  success: boolean;
  configs: JigsawConfig[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("jigsaw_puzzles")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data && data.length > 0) {
      const configs: JigsawConfig[] = data.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        imageUrl: row.image_url,
        gridSize: row.grid_size || Math.round(Math.sqrt(row.pieces_count || 9)),
        piecesCount: row.pieces_count || 9,
        pointsReward: row.points_reward ?? 100,
        timeLimitSeconds: row.time_limit_seconds ?? 120,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      return { success: true, configs };
    }

    return { success: true, configs: fallbackConfigs };
  } catch {
    return { success: true, configs: fallbackConfigs };
  }
}

// =============================================================================
// 2. PESERTA / PUBLIK — GET ACTIVE JIGSAW PUZZLE
// =============================================================================
export async function getActiveJigsawPuzzle(): Promise<{
  success: boolean;
  puzzle: JigsawConfig | null;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("jigsaw_puzzles")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const puzzle: JigsawConfig = {
        id: data.id,
        title: data.title,
        description: data.description || "",
        imageUrl: data.image_url,
        gridSize: data.grid_size || Math.round(Math.sqrt(data.pieces_count || 9)),
        piecesCount: data.pieces_count || 9,
        pointsReward: data.points_reward ?? 100,
        timeLimitSeconds: data.time_limit_seconds ?? 120,
        isActive: Boolean(data.is_active),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      return { success: true, puzzle };
    }

    const activeFallback = fallbackConfigs.find((c) => c.isActive) || null;
    return { success: true, puzzle: activeFallback };
  } catch {
    const activeFallback = fallbackConfigs.find((c) => c.isActive) || null;
    return { success: true, puzzle: activeFallback };
  }
}

// =============================================================================
// 3. ADMIN — SAVE CONFIG (CREATE / UPDATE)
// =============================================================================
const SaveJigsawSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Judul puzzle minimal 3 karakter"),
  description: z.string().optional(),
  imageUrl: z.string().min(1, "Gambar puzzle wajib diisi atau dipilih"),
  piecesCount: z.coerce.number().refine((n) => [4, 9, 16, 25].includes(n), {
    message: "Jumlah kepingan harus 4, 9, 16, atau 25",
  }),
  pointsReward: z.coerce.number().min(0, "Poin reward minimal 0"),
  timeLimitSeconds: z.coerce.number().min(0, "Batas waktu minimal 0 detik"),
  isActive: z.boolean().default(true),
});

export async function saveJigsawConfig(
  input: z.infer<typeof SaveJigsawSchema>
): Promise<{
  success: boolean;
  config?: JigsawConfig;
  error?: string;
}> {
  const parsed = SaveJigsawSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { id, title, description, imageUrl, piecesCount, pointsReward, timeLimitSeconds, isActive } =
    parsed.data;
  const gridSize = Math.round(Math.sqrt(piecesCount));
  const puzzleId = id || crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    const payload = {
      id: puzzleId,
      title: title.trim(),
      description: description ? description.trim() : null,
      image_url: imageUrl.trim(),
      grid_size: gridSize,
      pieces_count: piecesCount,
      points_reward: pointsReward,
      time_limit_seconds: timeLimitSeconds,
      is_active: isActive,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("jigsaw_puzzles")
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.warn("DB save jigsaw error, fallback in-memory:", error);
    }

    const savedConfig: JigsawConfig = {
      id: puzzleId,
      title: title.trim(),
      description: description || "",
      imageUrl: imageUrl.trim(),
      gridSize,
      piecesCount,
      pointsReward,
      timeLimitSeconds,
      isActive,
      createdAt: data?.created_at || now,
      updatedAt: now,
    };

    // Update in-memory
    const idx = fallbackConfigs.findIndex((c) => c.id === puzzleId);
    if (idx >= 0) {
      fallbackConfigs[idx] = savedConfig;
    } else {
      fallbackConfigs.unshift(savedConfig);
    }

    // Jika puzzle ini diset aktif, nonaktifkan puzzle lain jika perlu (agar hanya 1 yang aktif utama)
    if (isActive) {
      fallbackConfigs.forEach((c) => {
        if (c.id !== puzzleId) c.isActive = false;
      });
      try {
        await supabase
          .from("jigsaw_puzzles")
          .update({ is_active: false })
          .neq("id", puzzleId);
      } catch {
        // ignore
      }
    }

    safeRevalidate("/dashboard/challenge");
    safeRevalidate("/dashboard/challenge/kepingan-puzzle");
    safeRevalidate("/peserta/challenge");
    safeRevalidate("/peserta/challenge/kepingan-puzzle");

    return { success: true, config: savedConfig };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi puzzle";
    return { success: false, error: message };
  }
}

// =============================================================================
// 4. ADMIN — TOGGLE STATUS AKTIF
// =============================================================================
export async function toggleJigsawActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase
      .from("jigsaw_puzzles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    const target = fallbackConfigs.find((c) => c.id === id);
    if (target) target.isActive = isActive;

    safeRevalidate("/dashboard/challenge");
    safeRevalidate("/dashboard/challenge/kepingan-puzzle");
    safeRevalidate("/peserta/challenge");
    safeRevalidate("/peserta/challenge/kepingan-puzzle");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengubah status aktif",
    };
  }
}

// =============================================================================
// 5. ADMIN — UPLOAD GAMBAR PUZZLE
// =============================================================================
export async function uploadJigsawImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Berkas gambar tidak ditemukan." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Ukuran gambar melebihi batas maksimal 5MB." };
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: "Format gambar harus JPG, PNG, atau WEBP." };
    }

    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `puzzle-${Date.now()}-${sanitized}`;
    const storagePath = `puzzle/${uniqueFileName}`;

    // 1. Coba upload ke Supabase Storage
    try {
      const supabase = createAdminClient();
      const bucket = process.env.NEXT_PUBLIC_BUCKET_MEDIA || "media-acara";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

      if (!error && data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);
        return { success: true, url: publicUrl };
      }
    } catch {
      // Fallback lokal jika bucket Supabase offline
    }

    // 2. Fallback: Simpan ke public/uploads/puzzle/
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "puzzle");
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, uniqueFileName);
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(localFilePath, Buffer.from(arrayBuffer));

      const localUrl = `/uploads/puzzle/${uniqueFileName}`;
      return { success: true, url: localUrl };
    } catch (fsErr) {
      return {
        success: false,
        error: fsErr instanceof Error ? fsErr.message : "Gagal menyimpan berkas ke server.",
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengunggah berkas gambar.",
    };
  }
}

// =============================================================================
// 6. PESERTA — GET STATUS PENYELESAIAN (CEGAH KLAIM GANDA)
// =============================================================================
export async function getParticipantJigsawStatus(
  participantId: string,
  puzzleId: string
): Promise<{
  hasCompleted: boolean;
  attempt?: JigsawAttempt;
}> {
  if (!participantId || !puzzleId) {
    return { hasCompleted: false };
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("jigsaw_attempts")
      .select("*")
      .eq("participant_id", participantId)
      .eq("puzzle_id", puzzleId)
      .maybeSingle();

    if (data) {
      return {
        hasCompleted: true,
        attempt: {
          id: data.id,
          puzzleId: data.puzzle_id,
          participantId: data.participant_id,
          score: data.score,
          timeSeconds: data.time_seconds,
          movesCount: data.moves_count,
          isCompleted: data.is_completed,
          createdAt: data.created_at,
        },
      };
    }

    const memoryMatch = fallbackAttempts.find(
      (a) => a.participantId === participantId && a.puzzleId === puzzleId
    );
    if (memoryMatch) {
      return { hasCompleted: true, attempt: memoryMatch };
    }

    return { hasCompleted: false };
  } catch {
    const memoryMatch = fallbackAttempts.find(
      (a) => a.participantId === participantId && a.puzzleId === puzzleId
    );
    return { hasCompleted: Boolean(memoryMatch), attempt: memoryMatch };
  }
}

// =============================================================================
// 7. PESERTA — SUBMIT PENYELESAIAN PUZZLE (BERI POIN & CATAT ATTEMPT)
// =============================================================================
const SubmitJigsawSchema = z.object({
  puzzleId: z.string().min(1, "ID Puzzle tidak valid"),
  participantId: z.string().uuid("ID Peserta tidak valid"),
  timeSeconds: z.number().int().min(0).default(0),
  movesCount: z.number().int().min(1).default(1),
});

export async function submitJigsawCompletion(
  input: z.infer<typeof SubmitJigsawSchema>
): Promise<{
  success: boolean;
  pointsAwarded?: number;
  error?: string;
}> {
  const parsed = SubmitJigsawSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const { puzzleId, participantId, timeSeconds, movesCount } = parsed.data;

  try {
    const supabase = createAdminClient();

    // 1. Ambil data puzzle aktif
    let puzzle: JigsawConfig | null = null;
    const { data: dbPuzzle } = await supabase
      .from("jigsaw_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .maybeSingle();

    if (dbPuzzle) {
      puzzle = {
        id: dbPuzzle.id,
        title: dbPuzzle.title,
        description: dbPuzzle.description || "",
        imageUrl: dbPuzzle.image_url,
        gridSize: dbPuzzle.grid_size,
        piecesCount: dbPuzzle.pieces_count,
        pointsReward: dbPuzzle.points_reward,
        timeLimitSeconds: dbPuzzle.time_limit_seconds,
        isActive: dbPuzzle.is_active,
        createdAt: dbPuzzle.created_at,
        updatedAt: dbPuzzle.updated_at,
      };
    } else {
      puzzle = fallbackConfigs.find((c) => c.id === puzzleId) || DEFAULT_JIGSAW;
    }

    if (!puzzle.isActive) {
      return {
        success: false,
        error: "Challenge kepingan puzzle ini sedang dinonaktifkan oleh panitia.",
      };
    }

    // 2. Cegah penyelesaian ganda (cek apakah peserta sudah pernah menyelesaikan)
    const { data: existingDb } = await supabase
      .from("jigsaw_attempts")
      .select("id")
      .eq("participant_id", participantId)
      .eq("puzzle_id", puzzleId)
      .maybeSingle();

    if (existingDb) {
      return {
        success: false,
        error: "Anda sudah pernah menyelesaikan puzzle ini dan memperoleh poin sebelumnya.",
      };
    }

    const memoryExisting = fallbackAttempts.find(
      (a) => a.participantId === participantId && a.puzzleId === puzzleId
    );
    if (memoryExisting) {
      return {
        success: false,
        error: "Anda sudah pernah menyelesaikan puzzle ini dan memperoleh poin sebelumnya.",
      };
    }

    const points = puzzle.pointsReward;
    const attemptId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 3. Simpan attempt ke database
    try {
      await supabase.from("jigsaw_attempts").insert({
        id: attemptId,
        puzzle_id: puzzleId,
        participant_id: participantId,
        score: points,
        time_seconds: timeSeconds,
        moves_count: movesCount,
        is_completed: true,
      });

      // 4. Beri poin ke saldo peserta dan catat riwayat transaksi
      if (points > 0) {
        await ensureParticipantLedgerSynced(supabase, participantId);
        await supabase.from("point_transactions").insert({
          participant_id: participantId,
          points: points,
          source: "input_panitia",
          note: `Game Kepingan Puzzle: ${puzzle.title} (${movesCount} swap, ${timeSeconds}s) (+${points} poin)`,
        });
      }
    } catch (insertErr) {
      console.warn("DB attempt insert notice, caching memory:", insertErr);
    }

    // Simpan ke in-memory fallback
    fallbackAttempts.unshift({
      id: attemptId,
      puzzleId,
      participantId,
      score: points,
      timeSeconds,
      movesCount,
      isCompleted: true,
      createdAt: nowIso,
    });

    safeRevalidate("/peserta");
    safeRevalidate("/peserta/challenge");
    safeRevalidate("/peserta/challenge/kepingan-puzzle");
    safeRevalidate("/peserta/riwayat-poin");
    safeRevalidate("/dashboard/challenge");
    safeRevalidate("/dashboard/challenge/kepingan-puzzle");
    safeRevalidate("/leaderboard");

    return { success: true, pointsAwarded: points };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kendala saat klaim penyelesaian puzzle.",
    };
  }
}

// =============================================================================
// 8. ADMIN — GET RIWAYAT ATTEMPTS
// =============================================================================
export async function getAdminJigsawAttempts(
  puzzleId?: string
): Promise<{
  success: boolean;
  attempts: JigsawAttempt[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("jigsaw_attempts")
      .select(`
        id,
        puzzle_id,
        participant_id,
        score,
        time_seconds,
        moves_count,
        is_completed,
        created_at,
        participants (
          id,
          name,
          school
        )
      `)
      .order("created_at", { ascending: false });

    if (puzzleId) {
      query = query.eq("puzzle_id", puzzleId);
    }

    const { data, error } = await query;

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: JigsawAttempt[] = data.map((row: any) => ({
        id: row.id,
        puzzleId: row.puzzle_id,
        participantId: row.participant_id,
        participantName: row.participants?.name || "Peserta",
        institution: row.participants?.school || "-",
        score: row.score,
        timeSeconds: row.time_seconds,
        movesCount: row.moves_count,
        isCompleted: row.is_completed,
        createdAt: row.created_at,
      }));
      return { success: true, attempts: mapped };
    }

    return { success: true, attempts: fallbackAttempts };
  } catch {
    return { success: true, attempts: fallbackAttempts };
  }
}

// =============================================================================
// 9. ADMIN — RESET KESEMPATAN PESERTA
// =============================================================================
export async function resetParticipantJigsawAttempt(
  participantId: string,
  puzzleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    let q = supabase.from("jigsaw_attempts").delete().eq("participant_id", participantId);
    if (puzzleId) {
      q = q.eq("puzzle_id", puzzleId);
    }
    await q;

    fallbackAttempts = fallbackAttempts.filter((a) => {
      if (puzzleId) {
        return !(a.participantId === participantId && a.puzzleId === puzzleId);
      }
      return a.participantId !== participantId;
    });

    safeRevalidate("/dashboard/challenge/kepingan-puzzle");
    safeRevalidate("/peserta/challenge/kepingan-puzzle");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mereset percobaan peserta.",
    };
  }
}
