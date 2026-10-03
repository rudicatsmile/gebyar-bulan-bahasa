"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

// =============================================================================
// TYPES
// =============================================================================
export interface QrLetterChallenge {
  id: string;
  title: string;
  description: string | null;
  targetPhrase: string;
  pointsReward: number;
  isActive: boolean;
  createdAt: string;
  letterCodes: QrLetterCode[];
}

export interface QrLetterCode {
  id: string;
  challengeId: string;
  letter: string;
  letterIndex: number;
  qrToken: string;
  locationHint: string | null;
  createdAt: string;
}

export interface QrSubmissionItem {
  id: string;
  challengeId: string;
  participantId: string;
  participantName: string;
  institution: string;
  submittedPhrase: string;
  isCorrect: boolean;
  score: number;
  timeSeconds: number | null;
  submittedAt: string;
}

export interface CollectedLetter {
  scanId: string;
  codeId: string;
  letter: string;
  letterIndex: number;
  qrToken: string;
  locationHint: string | null;
  scannedAt: string;
}

// =============================================================================
// IN-MEMORY FALLBACK (Aktif otomatis jika tabel Supabase belum dimigrasi)
// =============================================================================
const DEFAULT_CHALLENGE_ID = "chal-bulan-bahasa-2025";
const DEFAULT_TARGET_PHRASE = "BULAN BAHASA";

const DEFAULT_CODES: QrLetterCode[] = [
  { id: "code-01", challengeId: DEFAULT_CHALLENGE_ID, letter: "B", letterIndex: 1,  qrToken: "QR-HURUF-B-01", locationHint: "Pintu Masuk Utama Gelora", createdAt: new Date().toISOString() },
  { id: "code-02", challengeId: DEFAULT_CHALLENGE_ID, letter: "U", letterIndex: 2,  qrToken: "QR-HURUF-U-02", locationHint: "Stand Pameran Buku Literasi", createdAt: new Date().toISOString() },
  { id: "code-03", challengeId: DEFAULT_CHALLENGE_ID, letter: "L", letterIndex: 3,  qrToken: "QR-HURUF-L-03", locationHint: "Pojok Karya Puisi & Cerpen", createdAt: new Date().toISOString() },
  { id: "code-04", challengeId: DEFAULT_CHALLENGE_ID, letter: "A", letterIndex: 4,  qrToken: "QR-HURUF-A-04", locationHint: "Area Photobooth Twibbon", createdAt: new Date().toISOString() },
  { id: "code-05", challengeId: DEFAULT_CHALLENGE_ID, letter: "N", letterIndex: 5,  qrToken: "QR-HURUF-N-05", locationHint: "Stand Musikalisasi & Teater", createdAt: new Date().toISOString() },
  { id: "code-06", challengeId: DEFAULT_CHALLENGE_ID, letter: "B", letterIndex: 6,  qrToken: "QR-HURUF-B-06", locationHint: "Meja Informasi Registrasi", createdAt: new Date().toISOString() },
  { id: "code-07", challengeId: DEFAULT_CHALLENGE_ID, letter: "A", letterIndex: 7,  qrToken: "QR-HURUF-A-07", locationHint: "Kantin Budaya Nusantara", createdAt: new Date().toISOString() },
  { id: "code-08", challengeId: DEFAULT_CHALLENGE_ID, letter: "H", letterIndex: 8,  qrToken: "QR-HURUF-H-08", locationHint: "Pojok Dongeng & Pidato", createdAt: new Date().toISOString() },
  { id: "code-09", challengeId: DEFAULT_CHALLENGE_ID, letter: "A", letterIndex: 9,  qrToken: "QR-HURUF-A-09", locationHint: "Panggung Utama Acara", createdAt: new Date().toISOString() },
  { id: "code-10", challengeId: DEFAULT_CHALLENGE_ID, letter: "S", letterIndex: 10, qrToken: "QR-HURUF-S-10", locationHint: "Taman Baca Mini", createdAt: new Date().toISOString() },
  { id: "code-11", challengeId: DEFAULT_CHALLENGE_ID, letter: "A", letterIndex: 11, qrToken: "QR-HURUF-A-11", locationHint: "Area Parkir VIP & Tamu", createdAt: new Date().toISOString() },
];

let fallbackChallenges: QrLetterChallenge[] = [
  {
    id: DEFAULT_CHALLENGE_ID,
    title: "Jelajah Aksara: Misteri Bulan Bahasa",
    description: "Temukan 11 QR code huruf yang tersebar di area acara, kumpulkan semua huruf, lalu susun menjadi kalimat bermakna!",
    targetPhrase: DEFAULT_TARGET_PHRASE,
    pointsReward: 100,
    isActive: true,
    createdAt: new Date().toISOString(),
    letterCodes: DEFAULT_CODES,
  },
];

let fallbackLetterCodes: QrLetterCode[] = [...DEFAULT_CODES];

let fallbackScans: Array<{
  id: string;
  challengeId: string;
  participantId: string;
  qrCodeId: string;
  scannedAt: string;
}> = [];

let fallbackSubmissions: QrSubmissionItem[] = [
  {
    id: "sub-demo-01",
    challengeId: DEFAULT_CHALLENGE_ID,
    participantId: "demo-part-1",
    participantName: "Siti Rahmawati",
    institution: "SMA Negeri 1 Jakarta",
    submittedPhrase: "BULAN BAHASA",
    isCorrect: true,
    score: 100,
    timeSeconds: 310,
    submittedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Helper: generate huruf-huruf dari kalimat target
function generateLetterCodes(phrase: string, challengeId: string): Omit<QrLetterCode, "id" | "createdAt">[] {
  const letters: Omit<QrLetterCode, "id" | "createdAt">[] = [];
  const clean = phrase.toUpperCase();
  let index = 1;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    // Hanya huruf alfabet A-Z yang diubah menjadi QR Code
    if (/[A-Z]/.test(char)) {
      const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
      const qrToken = `QR-HURUF-${char}-${index}-${randomHex}`;
      letters.push({
        challengeId,
        letter: char,
        letterIndex: index,
        qrToken,
        locationHint: `Lokasi Pos Huruf ${index}`,
      });
      index++;
    }
  }

  return letters;
}

// =============================================================================
// ADMIN — GET ALL QR CHALLENGES
// =============================================================================
export async function getAdminQrChallenges(): Promise<{
  success: boolean;
  challenges: QrLetterChallenge[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data: challenges, error } = await supabase
      .from("qr_letter_challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && challenges && challenges.length > 0) {
      const { data: codes } = await supabase
        .from("qr_letter_codes")
        .select("*")
        .order("letter_index", { ascending: true });

      const codesByChal = new Map<string, QrLetterCode[]>();
      (codes || []).forEach((c) => {
        const list = codesByChal.get(c.challenge_id) || [];
        list.push({
          id: c.id,
          challengeId: c.challenge_id,
          letter: c.letter,
          letterIndex: c.letter_index,
          qrToken: c.qr_token,
          locationHint: c.location_hint,
          createdAt: c.created_at,
        });
        codesByChal.set(c.challenge_id, list);
      });

      const formatted: QrLetterChallenge[] = challenges.map((ch) => ({
        id: ch.id,
        title: ch.title,
        description: ch.description,
        targetPhrase: ch.target_phrase,
        pointsReward: ch.points_reward,
        isActive: ch.is_active,
        createdAt: ch.created_at,
        letterCodes: codesByChal.get(ch.id) || [],
      }));

      return { success: true, challenges: formatted };
    }

    return { success: true, challenges: fallbackChallenges };
  } catch {
    return { success: true, challenges: fallbackChallenges };
  }
}

// =============================================================================
// ADMIN — CREATE QR CHALLENGE
// =============================================================================
const CreateQrChallengeSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  description: z.string().optional(),
  targetPhrase: z.string().min(2, "Kalimat target minimal 2 karakter"),
  pointsReward: z.number().int().min(5).default(50),
  isActive: z.boolean().default(true),
  locationHints: z.record(z.string()).optional(), // { [letterIndex]: locationHint }
});

export async function createQrChallenge(
  data: z.infer<typeof CreateQrChallengeSchema>
): Promise<{ success: boolean; challengeId?: string; error?: string }> {
  const parsed = CreateQrChallengeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const challengeId = crypto.randomUUID();
  const rawLetters = generateLetterCodes(parsed.data.targetPhrase, challengeId);

  if (rawLetters.length === 0) {
    return { success: false, error: "Kalimat harus mengandung setidaknya satu huruf alfabet." };
  }

  // Assign custom location hints jika ada
  const letters = rawLetters.map((l) => ({
    ...l,
    locationHint: parsed.data.locationHints?.[l.letterIndex.toString()] || l.locationHint,
  }));

  try {
    const supabase = createAdminClient();
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    // Insert challenge
    const { error: chErr } = await supabase.from("qr_letter_challenges").insert({
      id: challengeId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      target_phrase: parsed.data.targetPhrase.toUpperCase().trim(),
      points_reward: parsed.data.pointsReward,
      is_active: parsed.data.isActive,
      created_by: user?.id || null,
    });

    if (chErr) throw chErr;

    // Insert letter codes
    const codeInserts = letters.map((l) => ({
      challenge_id: challengeId,
      letter: l.letter,
      letter_index: l.letterIndex,
      qr_token: l.qrToken,
      location_hint: l.locationHint,
    }));

    const { error: codeErr } = await supabase.from("qr_letter_codes").insert(codeInserts);
    if (codeErr) throw codeErr;

    revalidatePath("/dashboard/challenge/qr-huruf");
    revalidatePath("/peserta/challenge/qr-huruf");
    return { success: true, challengeId };
  } catch {
    // Fallback in-memory
    const newCodes: QrLetterCode[] = letters.map((l) => ({
      ...l,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }));

    const newChal: QrLetterChallenge = {
      id: challengeId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      targetPhrase: parsed.data.targetPhrase.toUpperCase().trim(),
      pointsReward: parsed.data.pointsReward,
      isActive: parsed.data.isActive,
      createdAt: new Date().toISOString(),
      letterCodes: newCodes,
    };

    fallbackChallenges.unshift(newChal);
    fallbackLetterCodes.push(...newCodes);

    revalidatePath("/dashboard/challenge/qr-huruf");
    revalidatePath("/peserta/challenge/qr-huruf");
    return { success: true, challengeId };
  }
}

// =============================================================================
// ADMIN — UPDATE QR CHALLENGE
// =============================================================================
const UpdateQrChallengeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  pointsReward: z.number().int().min(5).optional(),
  isActive: z.boolean().optional(),
});

export async function updateQrChallenge(
  data: z.infer<typeof UpdateQrChallengeSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateQrChallengeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const updatePayload: Database["public"]["Tables"]["qr_letter_challenges"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
    if (parsed.data.description !== undefined) updatePayload.description = parsed.data.description || null;
    if (parsed.data.pointsReward !== undefined) updatePayload.points_reward = parsed.data.pointsReward;
    if (parsed.data.isActive !== undefined) updatePayload.is_active = parsed.data.isActive;

    const { error } = await supabase
      .from("qr_letter_challenges")
      .update(updatePayload)
      .eq("id", parsed.data.id);

    if (error) throw error;

    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  } catch {
    fallbackChallenges = fallbackChallenges.map((ch) => {
      if (ch.id === parsed.data.id) {
        return {
          ...ch,
          ...(parsed.data.title !== undefined && { title: parsed.data.title }),
          ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
          ...(parsed.data.pointsReward !== undefined && { pointsReward: parsed.data.pointsReward }),
          ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        };
      }
      return ch;
    });
    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — UPDATE QR LETTER LOCATIONS
// =============================================================================
export async function updateQrLetterLocations(
  locations: Array<{ codeId: string; locationHint: string }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    for (const loc of locations) {
      await supabase
        .from("qr_letter_codes")
        .update({ location_hint: loc.locationHint })
        .eq("id", loc.codeId);
    }

    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  } catch {
    for (const loc of locations) {
      fallbackLetterCodes = fallbackLetterCodes.map((c) =>
        c.id === loc.codeId ? { ...c, locationHint: loc.locationHint } : c
      );
      fallbackChallenges = fallbackChallenges.map((ch) => ({
        ...ch,
        letterCodes: ch.letterCodes.map((c) =>
          c.id === loc.codeId ? { ...c, locationHint: loc.locationHint } : c
        ),
      }));
    }
    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — DELETE QR CHALLENGE
// =============================================================================
export async function deleteQrChallenge(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("qr_letter_challenges").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  } catch {
    fallbackChallenges = fallbackChallenges.filter((ch) => ch.id !== id);
    fallbackLetterCodes = fallbackLetterCodes.filter((c) => c.challengeId !== id);
    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — TOGGLE ACTIVE
// =============================================================================
export async function toggleQrChallengeActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("qr_letter_challenges")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  } catch {
    fallbackChallenges = fallbackChallenges.map((ch) =>
      ch.id === id ? { ...ch, isActive } : ch
    );
    revalidatePath("/dashboard/challenge/qr-huruf");
    return { success: true };
  }
}

// =============================================================================
// ADMIN — GET ALL SUBMISSIONS (Leaderboard / Hasil Peserta)
// =============================================================================
export async function getAdminQrSubmissions(): Promise<{
  success: boolean;
  submissions: QrSubmissionItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("qr_letter_submissions")
      .select("*, participants(full_name, institution)")
      .order("is_correct", { ascending: false })
      .order("score", { ascending: false })
      .order("time_seconds", { ascending: true })
      .limit(100);

    if (!error && data && data.length > 0) {
      const submissions = data.map((row: any) => ({
        id: row.id,
        challengeId: row.challenge_id,
        participantId: row.participant_id,
        participantName: row.participants?.full_name || "Peserta",
        institution: row.participants?.institution || "-",
        submittedPhrase: row.submitted_phrase,
        isCorrect: row.is_correct,
        score: row.score,
        timeSeconds: row.time_seconds,
        submittedAt: row.submitted_at,
      }));
      return { success: true, submissions };
    }

    return { success: true, submissions: fallbackSubmissions };
  } catch {
    return { success: true, submissions: fallbackSubmissions };
  }
}

// =============================================================================
// PESERTA — GET ACTIVE CHALLENGE INFO (Tanpa membocorkan target phrase!)
// =============================================================================
export async function getActiveQrChallenge(): Promise<{
  success: boolean;
  challenge?: {
    id: string;
    title: string;
    description: string | null;
    pointsReward: number;
    totalLetters: number;
    wordLengths: number[]; // Jumlah huruf per kata, misal "BULAN BAHASA" -> [5, 6]
  };
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data: challenge, error } = await supabase
      .from("qr_letter_challenges")
      .select("id, title, description, points_reward, target_phrase")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && challenge) {
      const words = challenge.target_phrase.trim().split(/\s+/).filter(Boolean);
      const wordLengths = words.map((w) => w.replace(/[^A-Za-z]/g, "").length);
      const totalLetters = wordLengths.reduce((acc, curr) => acc + curr, 0);

      return {
        success: true,
        challenge: {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          pointsReward: challenge.points_reward,
          totalLetters,
          wordLengths,
        },
      };
    }

    // Fallback
    const ch = fallbackChallenges.find((c) => c.isActive) || fallbackChallenges[0];
    if (ch) {
      const words = ch.targetPhrase.trim().split(/\s+/).filter(Boolean);
      const wordLengths = words.map((w) => w.replace(/[^A-Za-z]/g, "").length);
      const totalLetters = wordLengths.reduce((acc, curr) => acc + curr, 0);
      return {
        success: true,
        challenge: {
          id: ch.id,
          title: ch.title,
          description: ch.description,
          pointsReward: ch.pointsReward,
          totalLetters,
          wordLengths,
        },
      };
    }

    return { success: false, error: "Belum ada tantangan QR Huruf yang aktif." };
  } catch {
    const ch = fallbackChallenges[0];
    const words = ch.targetPhrase.trim().split(/\s+/).filter(Boolean);
    const wordLengths = words.map((w) => w.replace(/[^A-Za-z]/g, "").length);
    const totalLetters = wordLengths.reduce((acc, curr) => acc + curr, 0);
    return {
      success: true,
      challenge: {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        pointsReward: ch.pointsReward,
        totalLetters,
        wordLengths,
      },
    };
  }
}

// =============================================================================
// PESERTA — GET COLLECTED LETTERS
// =============================================================================
export async function getParticipantCollectedLetters(
  participantId: string
): Promise<{
  success: boolean;
  letters: CollectedLetter[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("qr_letter_scans")
      .select("id, qr_code_id, scanned_at, qr_letter_codes(id, letter, letter_index, qr_token, location_hint)")
      .eq("participant_id", participantId)
      .order("scanned_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const letters: CollectedLetter[] = data.map((row: any) => ({
        scanId: row.id,
        codeId: row.qr_code_id,
        letter: row.qr_letter_codes?.letter || "?",
        letterIndex: row.qr_letter_codes?.letter_index || 0,
        qrToken: row.qr_letter_codes?.qr_token || "",
        locationHint: row.qr_letter_codes?.location_hint || null,
        scannedAt: row.scanned_at,
      }));
      return { success: true, letters };
    }

    // Fallback from memory
    const myScans = fallbackScans.filter((s) => s.participantId === participantId);
    const letters: CollectedLetter[] = myScans.map((s) => {
      const code = fallbackLetterCodes.find((c) => c.id === s.qrCodeId);
      return {
        scanId: s.id,
        codeId: s.qrCodeId,
        letter: code?.letter || "?",
        letterIndex: code?.letterIndex || 0,
        qrToken: code?.qrToken || "",
        locationHint: code?.locationHint || null,
        scannedAt: s.scannedAt,
      };
    });

    return { success: true, letters };
  } catch {
    const myScans = fallbackScans.filter((s) => s.participantId === participantId);
    const letters: CollectedLetter[] = myScans.map((s) => {
      const code = fallbackLetterCodes.find((c) => c.id === s.qrCodeId);
      return {
        scanId: s.id,
        codeId: s.qrCodeId,
        letter: code?.letter || "?",
        letterIndex: code?.letterIndex || 0,
        qrToken: code?.qrToken || "",
        locationHint: code?.locationHint || null,
        scannedAt: s.scannedAt,
      };
    });
    return { success: true, letters };
  }
}

// =============================================================================
// PESERTA — SCAN QR TOKEN
// =============================================================================
const ScanQrTokenSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  qrToken: z.string().min(3, "Kode token QR tidak valid"),
});

export async function scanQrLetterToken(
  data: z.infer<typeof ScanQrTokenSchema>
): Promise<{
  success: boolean;
  letter?: string;
  locationHint?: string | null;
  alreadyScanned?: boolean;
  totalCollected?: number;
  totalNeeded?: number;
  error?: string;
}> {
  const parsed = ScanQrTokenSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  const cleanToken = parsed.data.qrToken.trim();

  try {
    const supabase = createAdminClient();

    // 1. Cari QR code dari token
    const { data: code, error: codeErr } = await supabase
      .from("qr_letter_codes")
      .select("*, qr_letter_challenges(id, is_active)")
      .eq("qr_token", cleanToken)
      .maybeSingle();

    if (!codeErr && code) {
      if (!code.qr_letter_challenges?.is_active) {
        return { success: false, error: "Tantangan untuk huruf ini sedang tidak aktif." };
      }

      // 2. Periksa apakah sudah pernah discan
      const { data: existingScan } = await supabase
        .from("qr_letter_scans")
        .select("id")
        .eq("participant_id", parsed.data.participantId)
        .eq("qr_code_id", code.id)
        .maybeSingle();

      if (existingScan) {
        return {
          success: true,
          letter: code.letter,
          locationHint: code.location_hint,
          alreadyScanned: true,
        };
      }

      // 3. Catat scan baru
      await supabase.from("qr_letter_scans").insert({
        challenge_id: code.challenge_id,
        participant_id: parsed.data.participantId,
        qr_code_id: code.id,
      });

      // Hitung total yang sudah discan
      const { count } = await supabase
        .from("qr_letter_scans")
        .select("*", { count: "exact", head: true })
        .eq("participant_id", parsed.data.participantId)
        .eq("challenge_id", code.challenge_id);

      const { count: totalCodes } = await supabase
        .from("qr_letter_codes")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", code.challenge_id);

      revalidatePath("/peserta/challenge/qr-huruf");

      return {
        success: true,
        letter: code.letter,
        locationHint: code.location_hint,
        alreadyScanned: false,
        totalCollected: count || 1,
        totalNeeded: totalCodes || 10,
      };
    }

    // Fallback: Check in-memory
    const memCode = fallbackLetterCodes.find(
      (c) => c.qrToken.toUpperCase() === cleanToken.toUpperCase()
    );

    if (!memCode) {
      return { success: false, error: "Kode QR tidak dikenali atau tidak valid untuk tantangan ini." };
    }

    const alreadyScanned = fallbackScans.some(
      (s) => s.participantId === parsed.data.participantId && s.qrCodeId === memCode.id
    );

    if (alreadyScanned) {
      return {
        success: true,
        letter: memCode.letter,
        locationHint: memCode.locationHint,
        alreadyScanned: true,
      };
    }

    fallbackScans.push({
      id: crypto.randomUUID(),
      challengeId: memCode.challengeId,
      participantId: parsed.data.participantId,
      qrCodeId: memCode.id,
      scannedAt: new Date().toISOString(),
    });

    const myTotal = fallbackScans.filter(
      (s) => s.participantId === parsed.data.participantId && s.challengeId === memCode.challengeId
    ).length;
    const totalInChal = fallbackLetterCodes.filter((c) => c.challengeId === memCode.challengeId).length;

    revalidatePath("/peserta/challenge/qr-huruf");

    return {
      success: true,
      letter: memCode.letter,
      locationHint: memCode.locationHint,
      alreadyScanned: false,
      totalCollected: myTotal,
      totalNeeded: totalInChal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memproses scan QR.",
    };
  }
}

// =============================================================================
// PESERTA — SUBMIT WORD ARRANGEMENT (Penyusunan kata/kalimat)
// =============================================================================
const SubmitWordSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  challengeId: z.string().uuid("ID Challenge tidak valid"),
  submittedPhrase: z.string().min(1, "Susunan kalimat tidak boleh kosong"),
  timeSeconds: z.number().int().optional(),
});

export async function submitWordArrangement(
  data: z.infer<typeof SubmitWordSchema>
): Promise<{
  success: boolean;
  isCorrect?: boolean;
  score?: number;
  pointsAwarded?: number;
  targetPhrase?: string;
  message?: string;
  error?: string;
}> {
  const parsed = SubmitWordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();

    // 1. Ambil target phrase dari DB
    let target = "";
    let pointsReward = 100;

    const { data: challenge } = await supabase
      .from("qr_letter_challenges")
      .select("target_phrase, points_reward")
      .eq("id", parsed.data.challengeId)
      .maybeSingle();

    if (challenge) {
      target = challenge.target_phrase;
      pointsReward = challenge.points_reward;
    } else {
      const mem = fallbackChallenges.find((c) => c.id === parsed.data.challengeId) || fallbackChallenges[0];
      target = mem.targetPhrase;
      pointsReward = mem.pointsReward;
    }

    // 2. Bandingkan jawaban (case-insensitive & abaikan spasi berlebih)
    const normSubmitted = parsed.data.submittedPhrase.trim().toUpperCase().replace(/\s+/g, " ");
    const normTarget = target.trim().toUpperCase().replace(/\s+/g, " ");

    const isCorrect = normSubmitted === normTarget;
    const score = isCorrect ? pointsReward : 0;
    const submissionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 3. Simpan riwayat submission
    try {
      await supabase.from("qr_letter_submissions").insert({
        id: submissionId,
        challenge_id: parsed.data.challengeId,
        participant_id: parsed.data.participantId,
        submitted_phrase: normSubmitted,
        is_correct: isCorrect,
        score,
        time_seconds: parsed.data.timeSeconds || null,
      });

      // Tambahkan poin jika benar
      if (isCorrect && score > 0) {
        await supabase.from("point_transactions").insert({
          participant_id: parsed.data.participantId,
          points: score,
          source: "input_panitia",
          note: `Challenge QR Huruf: Berhasil menyusun "${normTarget}" (+${score} poin)`,
        });
      }
    } catch {
      // Memory fallback
      fallbackSubmissions.unshift({
        id: submissionId,
        challengeId: parsed.data.challengeId,
        participantId: parsed.data.participantId,
        participantName: "Peserta Kamu",
        institution: "-",
        submittedPhrase: normSubmitted,
        isCorrect,
        score,
        timeSeconds: parsed.data.timeSeconds || null,
        submittedAt: nowIso,
      });
    }

    revalidatePath("/peserta");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta/challenge/qr-huruf");
    revalidatePath("/peserta/riwayat-poin");
    revalidatePath("/leaderboard");

    return {
      success: true,
      isCorrect,
      score,
      pointsAwarded: score,
      targetPhrase: isCorrect ? normTarget : undefined,
      message: isCorrect
        ? `Selamat! Kalimat "${normTarget}" berhasil Anda susun dengan sempurna!`
        : `Susunan kalimat "${normSubmitted}" belum tepat. Periksa kembali urutan huruf-hurufnya!`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengirimkan susunan kata.",
    };
  }
}

// =============================================================================
// PESERTA — GET MY SUBMISSIONS
// =============================================================================
export async function getMyQrSubmissions(
  participantId: string
): Promise<{
  success: boolean;
  submissions: Array<{
    id: string;
    submittedPhrase: string;
    isCorrect: boolean;
    score: number;
    timeSeconds: number | null;
    submittedAt: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("qr_letter_submissions")
      .select("id, submitted_phrase, is_correct, score, time_seconds, submitted_at")
      .eq("participant_id", participantId)
      .order("submitted_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      const submissions = data.map((row) => ({
        id: row.id,
        submittedPhrase: row.submitted_phrase,
        isCorrect: row.is_correct,
        score: row.score,
        timeSeconds: row.time_seconds,
        submittedAt: row.submitted_at,
      }));
      return { success: true, submissions };
    }

    const filtered = fallbackSubmissions
      .filter((s) => s.participantId === participantId)
      .map((s) => ({
        id: s.id,
        submittedPhrase: s.submittedPhrase,
        isCorrect: s.isCorrect,
        score: s.score,
        timeSeconds: s.timeSeconds,
        submittedAt: s.submittedAt,
      }));
    return { success: true, submissions: filtered };
  } catch {
    const filtered = fallbackSubmissions
      .filter((s) => s.participantId === participantId)
      .map((s) => ({
        id: s.id,
        submittedPhrase: s.submittedPhrase,
        isCorrect: s.isCorrect,
        score: s.score,
        timeSeconds: s.timeSeconds,
        submittedAt: s.submittedAt,
      }));
    return { success: true, submissions: filtered };
  }
}
