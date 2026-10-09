"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureParticipantLedgerSynced } from "@/lib/supabase/point-sync";
import type { ChallengeType } from "@/types/database.types";
import { STANDS } from "@/lib/dummy-data";
import { checkAndProcessStandCompletionReward } from "./stand-rewards";

export interface AdminChallengeItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: "scan_qr" | "kode_unik" | "unggah_bukti" | "input_panitia";
  pointReward: number;
  badge: string;
  participantsCount: number;
  status: "aktif" | "selesai";
  isActive: boolean;
  createdAt: string;
}

const ChallengeInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Judul challenge minimal 3 karakter"),
  description: z.string().min(5, "Deskripsi challenge minimal 5 karakter"),
  type: z.enum(["scan_qr", "kode_unik", "unggah_bukti", "input_panitia"]).default("scan_qr"),
  pointReward: z.coerce.number().min(1, "Reward poin minimal 1"),
  badge: z.string().min(2, "Lencana kehormatan wajib diisi").default("Peserta Aktif"),
  isActive: z.boolean().default(true),
});

export type ChallengeInput = z.infer<typeof ChallengeInputSchema>;

export async function getAdminChallenges(): Promise<{
  success: boolean;
  challenges: AdminChallengeItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped: AdminChallengeItem[] = (data || []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      type: row.type,
      pointReward: Number(row.point_reward) || 25,
      badge: row.badge_icon || "Peserta Aktif",
      participantsCount: 0,
      status: row.is_active ? "aktif" : "selesai",
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
    }));

    return { success: true, challenges: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar challenge.";
    return { success: false, challenges: [], error: message };
  }
}

export interface ParticipantChallengeItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  pointReward: number;
  badge: string;
}

/**
 * Daftar tantangan untuk halaman peserta.
 * Sumber datanya sama dengan /dashboard/challenge (tabel `challenges`),
 * dibatasi hanya challenge yang sedang aktif (is_active = true) karena
 * challenge non-aktif tidak relevan untuk peserta. Pembacaan memakai
 * klien sesi peserta sehingga mengikuti aturan RLS.
 */
export async function getParticipantChallenges(): Promise<{
  success: boolean;
  challenges: ParticipantChallengeItem[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("challenges")
      .select("id, slug, title, description, type, point_reward, badge_icon")
      .eq("is_active", true)
      .order("point_reward", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped: ParticipantChallengeItem[] = (data || []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      type: row.type,
      pointReward: Number(row.point_reward) || 0,
      badge: row.badge_icon || "Peserta Aktif",
    }));

    return { success: true, challenges: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar tantangan.";
    return { success: false, challenges: [], error: message };
  }
}

export async function upsertChallenge(data: ChallengeInput) {
  const parsed = ChallengeInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const slug = parsed.data.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const payload = {
      title: parsed.data.title,
      slug: slug || `challenge-${Date.now()}`,
      description: parsed.data.description,
      type: parsed.data.type,
      point_reward: parsed.data.pointReward,
      badge_icon: parsed.data.badge,
      is_active: parsed.data.isActive,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("challenges")
        .update(payload)
        .eq("id", parsed.data.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("challenges")
        .insert({
          ...payload,
          start_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    revalidatePath("/dashboard/challenge");
    revalidatePath("/challenge");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan challenge.";
    return { success: false, error: message };
  }
}

export async function deleteChallenge(challengeId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", challengeId);

    if (error) throw error;

    revalidatePath("/dashboard/challenge");
    revalidatePath("/challenge");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus challenge.";
    return { success: false, error: message };
  }
}

export async function toggleChallengeStatus(challengeId: string, isActive: boolean) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("challenges")
      .update({ is_active: isActive })
      .eq("id", challengeId);

    if (error) throw error;

    revalidatePath("/dashboard/challenge");
    revalidatePath("/challenge");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status challenge.";
    return { success: false, error: message };
  }
}

const ScanStandSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  standCode: z.string().min(4, "Kode stand minimal 4 karakter"),
});

const SubmitProofSchema = z.object({
  challengeId: z.string().uuid("ID Challenge tidak valid"),
  participantId: z.string().uuid("ID Peserta tidak valid"),
  proofUrl: z.string().min(5, "Tautan atau berkas bukti wajib dilampirkan"),
  proofType: z.enum(["foto", "video", "tautan", "teks"]).default("foto"),
  description: z.string().optional(),
});

const AdjustPointsSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  points: z.number().int(),
  source: z.enum(["input_panitia", "penyesuaian"]).optional().default("input_panitia"),
  note: z.string().min(3, "Catatan penyesuaian poin wajib diisi"),
});

const RedeemRewardSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid").optional(),
  rewardId: z.string().uuid("ID Reward tidak valid"),
});

export type RedeemRewardInput = z.infer<typeof RedeemRewardSchema>;

// Aksi: Scan QR / Input Kode Unik Stand Budaya
export async function claimStandVisit(data: z.infer<typeof ScanStandSchema>) {
  const parsed = ScanStandSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  let cleanInput = parsed.data.standCode.trim();

  // Defensively extract if user passed JSON payload (from QRCodeCard)
  if (cleanInput.startsWith("{") && cleanInput.endsWith("}")) {
    try {
      const obj = JSON.parse(cleanInput);
      if (obj.code) cleanInput = String(obj.code).trim();
      else if (obj.token) cleanInput = String(obj.token).trim();
    } catch { }
  }

  // Defensively extract if URLs
  if (cleanInput.includes("http://") || cleanInput.includes("https://") || cleanInput.includes("HTTP://") || cleanInput.includes("HTTPS://")) {
    try {
      const parsedUrl = new URL(cleanInput);
      const codeParam = parsedUrl.searchParams.get("code") || parsedUrl.searchParams.get("stand") || parsedUrl.searchParams.get("token");
      if (codeParam) cleanInput = codeParam.trim();
    } catch { }
  }

  try {
    const supabase = createAdminClient();

    // 1. Cari stand berdasarkan kode unik atau qr_token/id (case insensitive)
    let stand: { id: string; name: string; points_per_visit: number; is_active: boolean } | null = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);

    let query = supabase
      .from("stands")
      .select("id, name, points_per_visit, is_active");

    if (isUuid) {
      query = query.or(`id.eq.${cleanInput},qr_token.eq.${cleanInput}`);
    } else {
      query = query.ilike("code", cleanInput);
    }

    const { data: dbStand } = await query.maybeSingle();

    if (dbStand) {
      stand = dbStand;
    } else {
      // Fallback: Check in STANDS dummy-data if database not yet migrated
      const matchedDummy = STANDS.find(
        (s) => s.code.toUpperCase() === cleanInput.toUpperCase() || s.qrToken.toUpperCase() === cleanInput.toUpperCase()
      );
      if (matchedDummy) {
        // Map to valid UUID format if id is in format 'stand-X'
        const dummyUuidMap: Record<string, string> = {
          "stand-1": "c0000000-0000-0000-0000-000000000001",
          "stand-2": "c0000000-0000-0000-0000-000000000002",
          "stand-3": "c0000000-0000-0000-0000-000000000003",
          "stand-4": "c0000000-0000-0000-0000-000000000004",
          "stand-5": "c0000000-0000-0000-0000-000000000005",
          "stand-6": "c0000000-0000-0000-0000-000000000006",
          "stand-7": "c0000000-0000-0000-0000-000000000007",
          "stand-8": "c0000000-0000-0000-0000-000000000008",
        };
        const validId = dummyUuidMap[matchedDummy.id] || matchedDummy.id;
        stand = {
          id: validId,
          name: matchedDummy.name,
          points_per_visit: matchedDummy.points,
          is_active: true,
        };
      }
    }

    if (!stand) {
      return { success: false, error: `Kode stand "${cleanInput}" tidak valid atau tidak terdaftar.` };
    }

    if (!stand.is_active) {
      return { success: false, error: `Stand "${stand.name}" saat ini sedang nonaktif.` };
    }

    // 2. Periksa apakah peserta sudah pernah mengunjungi stand ini
    const { data: existingVisit } = await supabase
      .from("point_transactions")
      .select("id")
      .eq("participant_id", parsed.data.participantId)
      .eq("stand_id", stand.id)
      .eq("source", "kode_unik")
      .maybeSingle();

    if (existingVisit) {
      return {
        success: false,
        error: `Anda sudah pernah mengklaim poin dari ${stand.name}. Kunjungan hanya dapat diklaim 1 kali per stand.`,
      };
    }

    // 3. Masukkan transaksi poin (ledger)
    await ensureParticipantLedgerSynced(supabase, parsed.data.participantId);
    const { error: pErr } = await supabase.from("point_transactions").insert({
      participant_id: parsed.data.participantId,
      stand_id: stand.id,
      points: stand.points_per_visit,
      source: "kode_unik",
      note: `Kunjungan stand budaya: ${stand.name}`,
    });

    if (pErr) {
      return { success: false, error: pErr.message };
    }

    revalidatePath("/peserta");
    revalidatePath("/peserta/scan");
    revalidatePath("/peserta/riwayat-poin");
    revalidatePath("/leaderboard");
    revalidatePath("/monitor");
    revalidatePath("/monitor/leaderboard");

    // 4. Periksa apakah seluruh stand aktif telah selesai dikunjungi & proses reward khusus (50 pertama)
    const completionResult = await checkAndProcessStandCompletionReward(parsed.data.participantId);

    return {
      success: true,
      data: {
        standName: stand.name,
        pointsAwarded: stand.points_per_visit,
        ...completionResult,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengklaim poin stand.";
    return { success: false, error: message };
  }
}

// Aksi: Penukaran Reward
export async function redeemReward(data: RedeemRewardInput) {
  const parsed = RedeemRewardSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const adminSupabase = createAdminClient();
    const userSupabase = await createClient();
    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    let targetParticipantId = parsed.data.participantId;

    if (!targetParticipantId && user) {
      const userEmail = (user.email || "").toLowerCase().trim();
      const { data: pRow } = await adminSupabase
        .from("participants")
        .select("id")
        .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
        .maybeSingle();

      if (pRow) {
        targetParticipantId = pRow.id;
      }
    }

    if (!targetParticipantId) {
      return {
        success: false,
        error: "Data peserta tidak ditemukan. Pastikan Anda telah terdaftar dan login sebagai peserta.",
      };
    }

    // 1. Cek saldo poin peserta
    const { data: participant } = await adminSupabase
      .from("participants")
      .select("id, total_points, full_name")
      .eq("id", targetParticipantId)
      .maybeSingle();

    if (!participant) {
      return { success: false, error: "Data peserta tidak ditemukan di sistem." };
    }

    // 2. Cek reward dan kuota
    const { data: reward } = await adminSupabase
      .from("rewards")
      .select("id, name, points_required, quota, claimed_count, is_active")
      .eq("id", parsed.data.rewardId)
      .maybeSingle();

    if (!reward || !reward.is_active) {
      return { success: false, error: "Reward tidak aktif atau tidak ditemukan." };
    }

    if (reward.quota !== null && (reward.claimed_count || 0) >= reward.quota) {
      return {
        success: false,
        error: `Mohon maaf, kuota penukaran reward "${reward.name}" telah habis.`,
      };
    }

    if (participant.total_points < reward.points_required) {
      return {
        success: false,
        error: `Poin Anda tidak mencukupi (Saldo: ${participant.total_points} Poin, Dibutuhkan: ${reward.points_required} Poin).`,
      };
    }

    // 3. Generate pickup code unik: RW-{4 digit acak}
    const pickupCode = `RW-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Pastikan ledger sinkron dengan total_points peserta sebelum debit
    const { data: existingLedger } = await adminSupabase
      .from("point_transactions")
      .select("points")
      .eq("participant_id", participant.id);

    const currentLedgerSum = (existingLedger || []).reduce((acc, t) => acc + (t.points || 0), 0);
    const ledgerDiscrepancy = participant.total_points - currentLedgerSum;

    if (ledgerDiscrepancy > 0) {
      await adminSupabase.from("point_transactions").insert({
        participant_id: participant.id,
        points: ledgerDiscrepancy,
        source: "penyesuaian",
        note: "Sinkronisasi saldo awal poin peserta",
      });
    }

    // 5. Catat transaksi pengurangan poin di ledger
    const { error: ptError } = await adminSupabase.from("point_transactions").insert({
      participant_id: participant.id,
      points: -reward.points_required,
      source: "penyesuaian",
      note: `Penukaran reward: ${reward.name} (Kode: ${pickupCode})`,
    });

    if (ptError) {
      return { success: false, error: `Gagal mencatat mutasi pengurangan poin: ${ptError.message}` };
    }

    // 6. Catat data penukaran di reward_redemptions
    const { data: redemption, error: rErr } = await adminSupabase
      .from("reward_redemptions")
      .insert({
        reward_id: reward.id,
        participant_id: participant.id,
        points_spent: reward.points_required,
        status: "menunggu",
        pickup_code: pickupCode,
      })
      .select()
      .single();

    if (rErr) {
      return { success: false, error: `Gagal menyimpan riwayat penukaran: ${rErr.message}` };
    }

    // 7. Update claimed_count reward
    await adminSupabase
      .from("rewards")
      .update({ claimed_count: (reward.claimed_count || 0) + 1 })
      .eq("id", reward.id);

    // 8. Update eksplisit total_points di participants
    const newTotalPoints = Math.max(0, participant.total_points - reward.points_required);
    await adminSupabase
      .from("participants")
      .update({ total_points: newTotalPoints, updated_at: new Date().toISOString() })
      .eq("id", participant.id);

    // 9. Catat di activity_logs
    await adminSupabase.from("activity_logs").insert({
      actor_id: user?.id || null,
      actor_role: "peserta",
      action: "penukaran_reward",
      entity: "reward_redemptions",
      entity_id: redemption.id,
      description: `${participant.full_name} menukarkan ${reward.points_required} poin untuk ${reward.name} (Kode: ${pickupCode})`,
      metadata: {
        reward_id: reward.id,
        reward_name: reward.name,
        pickup_code: pickupCode,
        points_spent: reward.points_required,
        remaining_points: newTotalPoints,
      },
    });

    // Siarkan pembaruan antrean realtime ke dashboard panitia
    try {
      const channel = adminSupabase.channel("reward-redemptions-channel");
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: {
          action: "created",
          redemptionId: redemption.id,
          pickupCode,
          timestamp: new Date().toISOString(),
        },
      });
      adminSupabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast redeemReward error:", realtimeErr);
    }

    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");
    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/dashboard/challenge/leaderboard");
    revalidatePath("/leaderboard");

    return {
      success: true,
      data: {
        pickupCode,
        rewardName: reward.name,
        remainingPoints: newTotalPoints,
        pointsSpent: reward.points_required,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses penukaran reward.";
    return { success: false, error: message };
  }
}

// =====================================================================
// Aksi: Pengambilan Peserta & Riwayat Mutasi Poin Manual
// =====================================================================

export interface ParticipantPointOption {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
  totalPoints: number;
  email: string | null;
  status: string;
}

export interface ManualPointTransactionItem {
  id: string;
  participantName: string;
  participantReg: string;
  institution: string;
  points: number;
  source: string;
  note: string | null;
  grantedByName: string | null;
  createdAt: string;
}

export async function getParticipantsForPointAdjustment(): Promise<{
  success: boolean;
  participants: ParticipantPointOption[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("participants")
      .select("id, registration_number, full_name, institution, total_points, email, status")
      .order("full_name", { ascending: true });

    if (error) throw error;

    const mapped: ParticipantPointOption[] = (data || []).map((row: any) => ({
      id: row.id,
      registrationNumber: row.registration_number,
      fullName: row.full_name,
      institution: row.institution || "-",
      totalPoints: Number(row.total_points) || 0,
      email: row.email || null,
      status: row.status,
    }));

    return { success: true, participants: mapped };
  } catch (err: unknown) {
    console.error("Error getParticipantsForPointAdjustment:", err);
    const message =
      (err as any)?.message ||
      (err instanceof Error ? err.message : "Gagal memuat data peserta.");
    return { success: false, participants: [], error: message };
  }
}

export async function getManualPointHistory(): Promise<{
  success: boolean;
  transactions: ManualPointTransactionItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase
      .from("point_transactions") as any)
      .select(`
        id,
        points,
        source,
        note,
        created_at,
        participants (
          registration_number,
          full_name,
          institution
        )
      `)
      .in("source", ["input_panitia", "penyesuaian"])
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) throw error;

    const mapped: ManualPointTransactionItem[] = (data || []).map((row: any) => {
      const pt = Array.isArray(row.participants) ? row.participants[0] : row.participants;
      return {
        id: row.id,
        participantName: pt?.full_name || pt?.registration_number || "Peserta",
        participantReg: pt?.registration_number || "-",
        institution: pt?.institution || "-",
        points: Number(row.points) || 0,
        source: row.source,
        note: row.note || null,
        grantedByName: null,
        createdAt: row.created_at,
      };
    });

    return { success: true, transactions: mapped };
  } catch (err: unknown) {
    console.error("Error getManualPointHistory:", err);
    const message =
      (err as any)?.message ||
      (err instanceof Error ? err.message : "Gagal memuat riwayat mutasi poin.");
    return { success: false, transactions: [], error: message };
  }
}

// Aksi: Penyesuaian Poin Manual oleh Panitia
export async function adjustPointsByCommittee(data: z.infer<typeof AdjustPointsSchema>) {
  const parsed = AdjustPointsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Pastikan ledger peserta tersinkron sebelum mutasi
    await ensureParticipantLedgerSynced(supabase, parsed.data.participantId);

    const { error } = await supabase.from("point_transactions").insert({
      participant_id: parsed.data.participantId,
      points: parsed.data.points,
      source: parsed.data.source || "input_panitia",
      note: parsed.data.note,
      granted_by: user?.id || null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/challenge/poin");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/peserta/riwayat-poin");
    revalidatePath("/peserta");
    revalidatePath("/leaderboard");
    revalidatePath("/monitor");
    revalidatePath("/monitor/leaderboard");
    return { success: true };
  } catch (err: unknown) {
    const message =
      (err as any)?.message ||
      (err instanceof Error ? err.message : "Gagal melakukan penyesuaian poin.");
    return { success: false, error: message };
  }
}

// =====================================================================
// Aksi: Moderasi & Verifikasi Bukti Challenge Peserta
// =====================================================================

export interface ChallengeSubmissionItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengePoints: number;
  participantId: string;
  participantName: string;
  institution: string;
  proofType: "foto" | "video" | "tautan" | "teks";
  proofUrl: string | null;
  description: string | null;
  status: "menunggu" | "disetujui" | "ditolak";
  pointsAwarded: number;
  verifiedByName: string | null;
  verifiedAt: string | null;
  note: string | null;
  submittedAt: string;
}

export async function getChallengeSubmissions(filterStatus?: "menunggu" | "disetujui" | "ditolak" | "semua"): Promise<{
  success: boolean;
  submissions: ChallengeSubmissionItem[];
  stats: {
    menunggu: number;
    disetujui: number;
    ditolak: number;
    total: number;
  };
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("challenge_submissions")
      .select(`
        id,
        challenge_id,
        participant_id,
        proof_url,
        proof_type,
        description,
        status,
        points_awarded,
        verified_by,
        verified_at,
        note,
        created_at,
        challenges (
          id,
          title,
          point_reward,
          type
        ),
        participants (
          id,
          registration_number,
          full_name,
          institution,
          email
        ),
        verifier:profiles!challenge_submissions_verified_by_fkey (
          full_name
        )
      `)
      .order("created_at", { ascending: false });

    if (filterStatus && filterStatus !== "semua") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await (query as any);

    if (error) {
      console.error("Error getChallengeSubmissions query:", error);
      throw error;
    }

    // Hitung statistik seluruh status
    const { data: allStatuses } = await supabase
      .from("challenge_submissions")
      .select("status");

    const stats = {
      menunggu: 0,
      disetujui: 0,
      ditolak: 0,
      total: allStatuses?.length || 0,
    };

    allStatuses?.forEach((item: { status: string }) => {
      if (item.status === "menunggu") stats.menunggu++;
      else if (item.status === "disetujui") stats.disetujui++;
      else if (item.status === "ditolak") stats.ditolak++;
    });

    const mapped: ChallengeSubmissionItem[] = (data || []).map((row: any) => {
      const ch = Array.isArray(row.challenges) ? row.challenges[0] : row.challenges;
      const pt = Array.isArray(row.participants) ? row.participants[0] : row.participants;
      const vf = row.verifier ? (Array.isArray(row.verifier) ? row.verifier[0] : row.verifier) : null;

      return {
        id: row.id,
        challengeId: row.challenge_id,
        challengeTitle: ch?.title || "Challenge Tidak Diketahui",
        challengePoints: Number(ch?.point_reward) || Number(row.points_awarded) || 0,
        participantId: row.participant_id,
        participantName: pt?.full_name || pt?.registration_number || "Peserta",
        institution: pt?.institution || "-",
        proofType: (row.proof_type as any) || "foto",
        proofUrl: row.proof_url || null,
        description: row.description || null,
        status: row.status as "menunggu" | "disetujui" | "ditolak",
        pointsAwarded: Number(row.points_awarded) || 0,
        verifiedByName: vf?.full_name || null,
        verifiedAt: row.verified_at || null,
        note: row.note || null,
        submittedAt: row.created_at,
      };
    });

    return {
      success: true,
      submissions: mapped,
      stats,
    };
  } catch (err: unknown) {
    console.error("Error in getChallengeSubmissions:", err);
    const message =
      (err as any)?.message ||
      (err instanceof Error ? err.message : "Gagal memuat kiriman bukti challenge.");
    return {
      success: false,
      submissions: [],
      stats: { menunggu: 0, disetujui: 0, ditolak: 0, total: 0 },
      error: message,
    };
  }
}

export async function verifyChallengeSubmissionAction(data: {
  submissionId: string;
  status: "disetujui" | "ditolak";
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    // 1. Ambil data submission
    const { data: submission, error: sErr } = await (supabase
      .from("challenge_submissions") as any)
      .select(`
        id,
        status,
        participant_id,
        challenge_id,
        challenges (
          id,
          title,
          point_reward
        )
      `)
      .eq("id", data.submissionId)
      .single();

    if (sErr || !submission) {
      return { success: false, error: "Bukti submission tidak ditemukan." };
    }

    const ch = Array.isArray(submission.challenges)
      ? submission.challenges[0]
      : submission.challenges;
    const pointReward = Number(ch?.point_reward) || 0;

    if (data.status === "disetujui") {
      // 2a. Setujui submission
      const { error: uErr } = await (supabase
        .from("challenge_submissions") as any)
        .update({
          status: "disetujui",
          points_awarded: pointReward,
          note: data.note || "Bukti terverifikasi valid oleh panitia.",
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", data.submissionId);

      if (uErr) throw uErr;

      // 3a. Berikan poin ke peserta via point_transactions
      await ensureParticipantLedgerSynced(supabase, submission.participant_id);
      const { error: pErr } = await supabase.from("point_transactions").insert({
        participant_id: submission.participant_id,
        challenge_id: submission.challenge_id,
        points: pointReward,
        source: "verifikasi_bukti",
        note: `Verifikasi Bukti: ${ch?.title || "Challenge"}`,
        granted_by: user?.id || null,
      });

      if (pErr) {
        console.warn("Notice: Gagal mencatat point_transactions verifikasi:", pErr);
      }
    } else {
      // 2b. Tolak submission
      const { error: uErr } = await (supabase
        .from("challenge_submissions") as any)
        .update({
          status: "ditolak",
          points_awarded: 0,
          note: data.note || "Bukti belum memenuhi kriteria.",
          verified_by: user?.id || null,
          verified_at: new Date().toISOString(),
        })
        .eq("id", data.submissionId);

      if (uErr) throw uErr;
    }

    revalidatePath("/dashboard/challenge/verifikasi");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/peserta/challenge");
    revalidatePath("/peserta/riwayat-poin");
    revalidatePath("/peserta");
    revalidatePath("/leaderboard");
    revalidatePath("/monitor");
    revalidatePath("/monitor/leaderboard");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses verifikasi submission.";
    return { success: false, error: message };
  }
}

// =============================================================================
// RIWAYAT MUTASI POIN PESERTA (LEDGER)
// =============================================================================
export interface PointLedgerItem {
  id: string;
  source: string;
  description: string;
  pointsDelta: number;
  timestamp: string;
}

export async function getParticipantPointLedger(participantId?: string): Promise<{
  success: boolean;
  transactions: PointLedgerItem[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let resolvedParticipantId = participantId;

    if (!resolvedParticipantId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: p } = await admin
          .from("participants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (p?.id) {
          resolvedParticipantId = p.id;
        }
      }
    }

    if (!resolvedParticipantId) {
      return { success: true, transactions: [] };
    }

    const { data, error } = await (admin
      .from("point_transactions") as any)
      .select(`
        id,
        points,
        source,
        note,
        created_at,
        stand_id,
        challenge_id,
        stands (
          name
        ),
        challenges (
          title
        )
      `)
      .eq("participant_id", resolvedParticipantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const sourceMap = (src: string, note?: string | null): string => {
      const n = (note || "").toLowerCase();
      if (n.includes("puzzle")) return "Challenge Puzzle";
      if (n.includes("twibbon")) return "Tantangan Twibbon";
      if (n.includes("qr huruf") || n.includes("susun kata")) return "Challenge QR Huruf";
      if (src === "scan_qr") return "Scan QR Stand";
      if (src === "kode_unik") return "Kode Stand";
      if (src === "verifikasi_bukti") return "Misi Challenge";
      if (src === "input_panitia") return "Bonus Panitia";
      if (src === "penyesuaian") return "Penyesuaian Poin";
      return "Mutasi Poin";
    };

    const transactions: PointLedgerItem[] = (data || []).map((row: any) => {
      const standName = Array.isArray(row.stands) ? row.stands[0]?.name : row.stands?.name;
      const challengeTitle = Array.isArray(row.challenges) ? row.challenges[0]?.title : row.challenges?.title;

      let description = row.note?.trim();
      if (!description) {
        if (standName) {
          description = `Kunjungan stand: ${standName}`;
        } else if (challengeTitle) {
          description = `Penyelesaian tantangan: ${challengeTitle}`;
        } else {
          description = "Perolehan poin aktivitas festival";
        }
      }

      const dateObj = new Date(row.created_at);
      const timestamp = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB"
        : "-";

      return {
        id: row.id,
        source: sourceMap(row.source, row.note),
        description,
        pointsDelta: Number(row.points) || 0,
        timestamp,
      };
    });

    return { success: true, transactions };
  } catch (err: unknown) {
    console.error("Error getParticipantPointLedger:", err);
    return {
      success: false,
      transactions: [],
      error: err instanceof Error ? err.message : "Gagal memuat riwayat poin.",
    };
  }
}


