"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  note: z.string().min(3, "Catatan penyesuaian poin wajib diisi"),
});

const RedeemRewardSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  rewardId: z.string().uuid("ID Reward tidak valid"),
});

// Aksi: Scan QR / Input Kode Unik Stand Budaya
export async function claimStandVisit(data: z.infer<typeof ScanStandSchema>) {
  const parsed = ScanStandSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    // 1. Cari stand berdasarkan kode unik (case insensitive)
    const { data: stand, error: sErr } = await supabase
      .from("stands")
      .select("id, name, points_per_visit, is_active")
      .ilike("code", parsed.data.standCode.trim())
      .maybeSingle();

    if (sErr || !stand) {
      return { success: false, error: `Kode stand "${parsed.data.standCode}" tidak valid atau tidak terdaftar.` };
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

    return {
      success: true,
      data: {
        standName: stand.name,
        pointsAwarded: stand.points_per_visit,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengklaim poin stand.";
    return { success: false, error: message };
  }
}

// Aksi: Penukaran Reward
export async function redeemReward(data: z.infer<typeof RedeemRewardSchema>) {
  const parsed = RedeemRewardSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    // 1. Cek saldo poin peserta
    const { data: participant } = await supabase
      .from("participants")
      .select("id, total_points")
      .eq("id", parsed.data.participantId)
      .single();

    if (!participant) {
      return { success: false, error: "Data peserta tidak ditemukan." };
    }

    // 2. Cek reward dan kuota
    const { data: reward } = await supabase
      .from("rewards")
      .select("id, name, points_required, quota, claimed_count, is_active")
      .eq("id", parsed.data.rewardId)
      .single();

    if (!reward || !reward.is_active) {
      return { success: false, error: "Reward tidak aktif atau tidak ditemukan." };
    }

    if (reward.quota !== null && reward.claimed_count >= reward.quota) {
      return { success: false, error: "Mohon maaf, kuota reward ini telah habis." };
    }

    if (participant.total_points < reward.points_required) {
      return {
        success: false,
        error: `Poin Anda tidak mencukupi (${participant.total_points}/${reward.points_required} Poin).`,
      };
    }

    // 3. Generate pickup code unik: RW-{4 digit acak}
    const pickupCode = `RW-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Catat transaksi pengurangan poin di ledger
    await supabase.from("point_transactions").insert({
      participant_id: participant.id,
      points: -reward.points_required,
      source: "penyesuaian",
      note: `Penukaran reward: ${reward.name} (Kode: ${pickupCode})`,
    });

    // 5. Catat data penukaran
    const { data: redemption, error: rErr } = await supabase
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

    if (rErr) return { success: false, error: rErr.message };

    // 6. Update claimed_count reward
    await supabase
      .from("rewards")
      .update({ claimed_count: reward.claimed_count + 1 })
      .eq("id", reward.id);

    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");
    revalidatePath("/dashboard/challenge/reward");
    return { success: true, data: { pickupCode, rewardName: reward.name } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses penukaran reward.";
    return { success: false, error: message };
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

    const { error } = await supabase.from("point_transactions").insert({
      participant_id: parsed.data.participantId,
      points: parsed.data.points,
      source: "penyesuaian",
      note: `Penyesuaian panitia: ${parsed.data.note}`,
      granted_by: user?.id || null,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/challenge/poin");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/leaderboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal melakukan penyesuaian poin.";
    return { success: false, error: message };
  }
}
