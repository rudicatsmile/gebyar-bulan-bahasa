"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureParticipantLedgerSynced } from "@/lib/supabase/point-sync";

export interface DbRewardItem {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  quota: number;
  claimedCount: number;
  category: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface RedemptionQueueItem {
  id: string;
  participantName: string;
  rewardName: string;
  pointsSpent: number;
  pickupCode: string;
  status: "menunggu" | "diserahkan" | "ditolak";
  requestedAt: string;
}

export interface ParticipantRedemptionItem {
  id: string;
  rewardId: string;
  rewardName: string;
  pointsSpent: number;
  pickupCode: string;
  status: "menunggu" | "diserahkan" | "ditolak";
  note?: string;
  createdAt: string;
  processedAt?: string;
}

const RewardSchema = z.object({
  name: z.string().min(3, "Nama reward minimal 3 karakter"),
  description: z.string().optional(),
  pointsRequired: z.coerce.number().min(1, "Poin yang dibutuhkan minimal 1"),
  quota: z.coerce.number().min(1, "Stok/kuota minimal 1"),
  category: z.string().default("Merchandise"),
  isActive: z.boolean().default(true),
});

export async function getAdminRewards(): Promise<{
  success: boolean;
  rewards: DbRewardItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("points_required", { ascending: true });

    if (error) throw error;

    const mapped: DbRewardItem[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      pointsRequired: Number(r.points_required) || 0,
      quota: Number(r.quota) || 0,
      claimedCount: Number(r.claimed_count) || 0,
      category: r.points_required >= 300 ? "Akses/Buku" : r.points_required >= 200 ? "Merchandise" : "Voucher",
      isActive: Boolean(r.is_active),
      sortOrder: r.sort_order,
    }));

    return { success: true, rewards: mapped };
  } catch (err: unknown) {
    console.error("Error getAdminRewards:", err);
    return {
      success: false,
      rewards: [],
      error: err instanceof Error ? err.message : "Gagal memuat katalog reward.",
    };
  }
}

export async function getRedemptionQueue(): Promise<{
  success: boolean;
  queue: RedemptionQueueItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("reward_redemptions")
      .select("*, participants(full_name), rewards(name, points_required)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped: RedemptionQueueItem[] = (data || []).map((q: any) => ({
      id: q.id,
      participantName: q.participants?.full_name || "Peserta",
      rewardName: q.rewards?.name || "Merchandise Festival",
      pointsSpent: Number(q.points_spent) || Number(q.rewards?.points_required) || 0,
      pickupCode: q.pickup_code || "KLAIM",
      status: q.status === "diserahkan" ? "diserahkan" : q.status === "ditolak" ? "ditolak" : "menunggu",
      requestedAt: q.created_at
        ? new Date(q.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB"
        : "-",
    }));

    return { success: true, queue: mapped };
  } catch (err: unknown) {
    console.error("Error getRedemptionQueue:", err);
    return {
      success: false,
      queue: [],
      error: err instanceof Error ? err.message : "Gagal memuat antrean penyerahan reward.",
    };
  }
}

export async function createReward(formData: z.infer<typeof RewardSchema>) {
  const parsed = RewardSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("rewards").insert({
      name: parsed.data.name,
      description: parsed.data.description || "",
      points_required: parsed.data.pointsRequired,
      quota: parsed.data.quota,
      claimed_count: 0,
      is_active: parsed.data.isActive,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambahkan reward baru.";
    return { success: false, error: message };
  }
}

export async function updateReward(id: string, formData: Partial<z.infer<typeof RewardSchema>>) {
  if (!id) return { success: false, error: "ID Reward tidak valid" };

  try {
    const supabase = createAdminClient();
    const updatePayload: any = {};
    if (formData.name !== undefined) updatePayload.name = formData.name;
    if (formData.description !== undefined) updatePayload.description = formData.description;
    if (formData.pointsRequired !== undefined) updatePayload.points_required = formData.pointsRequired;
    if (formData.quota !== undefined) updatePayload.quota = formData.quota;
    if (formData.isActive !== undefined) updatePayload.is_active = formData.isActive;

    const { error } = await supabase
      .from("rewards")
      .update(updatePayload)
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui reward.";
    return { success: false, error: message };
  }
}

export async function deleteReward(id: string) {
  if (!id) return { success: false, error: "ID Reward tidak valid" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("rewards").delete().eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus reward.";
    return { success: false, error: message };
  }
}

export async function handoverRedemption(id: string) {
  if (!id) return { success: false, error: "ID Klaim tidak valid" };

  try {
    const supabase = createAdminClient();
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    const { error } = await supabase
      .from("reward_redemptions")
      .update({
        status: "diserahkan",
        processed_by: user?.id || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    // Siarkan broadcast realtime ke channel antrean
    try {
      const channel = supabase.channel("reward-redemptions-channel");
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: { action: "handover", id, timestamp: new Date().toISOString() },
      });
      supabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast handover error:", realtimeErr);
    }

    revalidatePath("/dashboard/challenge/reward");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui status penyerahan.";
    return { success: false, error: message };
  }
}

export async function getParticipantRedemptions(participantId?: string): Promise<{
  success: boolean;
  redemptions: ParticipantRedemptionItem[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let resolvedParticipantId = participantId;

    if (!resolvedParticipantId) {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const userEmail = (user.email || "").toLowerCase().trim();
          const { data: p } = await admin
            .from("participants")
            .select("id")
            .or(`user_id.eq.${user.id},email.eq.${userEmail}`)
            .maybeSingle();

          if (p?.id) {
            resolvedParticipantId = p.id;
          }
        }
      } catch {
        // Abaikan jika dipanggil di luar request scope
      }
    }

    if (!resolvedParticipantId) {
      return { success: true, redemptions: [] };
    }

    const { data, error } = await admin
      .from("reward_redemptions")
      .select(`
        id,
        reward_id,
        participant_id,
        points_spent,
        status,
        pickup_code,
        note,
        created_at,
        processed_at,
        rewards (
          id,
          name,
          points_required
        )
      `)
      .eq("participant_id", resolvedParticipantId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const redemptions: ParticipantRedemptionItem[] = (data || []).map((row: any) => {
      const reward = Array.isArray(row.rewards) ? row.rewards[0] : row.rewards;
      const dateObj = new Date(row.created_at);
      const createdAt = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB"
        : "-";

      const procObj = row.processed_at ? new Date(row.processed_at) : null;
      const processedAt = procObj && !isNaN(procObj.getTime())
        ? procObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }) + " WIB"
        : undefined;

      return {
        id: row.id,
        rewardId: row.reward_id,
        rewardName: reward?.name || "Merchandise Festival",
        pointsSpent: Number(row.points_spent) || Number(reward?.points_required) || 0,
        pickupCode: row.pickup_code || "-",
        status: (row.status as any) || "menunggu",
        note: row.note || undefined,
        createdAt,
        processedAt,
      };
    });

    return { success: true, redemptions };
  } catch (err: unknown) {
    console.error("Error getParticipantRedemptions:", err);
    return {
      success: false,
      redemptions: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar penukaran reward.",
    };
  }
}

export async function cancelRewardRedemption(redemptionId: string, participantId?: string): Promise<{
  success: boolean;
  refundedPoints?: number;
  newTotalPoints?: number;
  error?: string;
}> {
  if (!redemptionId) {
    return { success: false, error: "ID Penukaran tidak valid." };
  }

  try {
    const adminSupabase = createAdminClient();
    let user: any = null;
    try {
      const userClient = await createClient();
      const authRes = await userClient.auth.getUser();
      user = authRes.data.user;
    } catch {
      // Abaikan jika dipanggil di luar request scope / service role execution
    }

    // 1. Ambil data penukaran
    const { data: redemption, error: rErr } = await adminSupabase
      .from("reward_redemptions")
      .select(`
        id,
        participant_id,
        reward_id,
        points_spent,
        status,
        pickup_code,
        rewards (
          id,
          name,
          claimed_count
        ),
        participants (
          id,
          full_name,
          total_points,
          user_id,
          email
        )
      `)
      .eq("id", redemptionId)
      .maybeSingle();

    if (rErr || !redemption) {
      return { success: false, error: "Data klaim reward tidak ditemukan." };
    }

    const participant = Array.isArray(redemption.participants) ? redemption.participants[0] : redemption.participants;
    const reward = Array.isArray(redemption.rewards) ? redemption.rewards[0] : redemption.rewards;

    // 2. Otorisasi: caller harus peserta pemilik redemption atau admin
    if (participantId && redemption.participant_id !== participantId) {
      return { success: false, error: "Anda tidak berhak membatalkan klaim reward milik peserta lain." };
    }

    if (user && participant?.user_id && participant.user_id !== user.id) {
      // Cek apakah panitia / admin
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile || (profile.role !== "super_admin" && profile.role !== "seksi_acara" && profile.role !== "media_center")) {
        return { success: false, error: "Akses ditolak: penukaran bukan milik Anda." };
      }
    }

    // 3. Validasi status: HANYA BOLEH MENUNGGU!
    if (redemption.status === "diserahkan") {
      return {
        success: false,
        error: "Hadiah sudah diserahkan oleh panitia di lokasi dan tidak dapat dibatalkan.",
      };
    }

    if (redemption.status === "ditolak") {
      return {
        success: false,
        error: "Penukaran hadiah ini sudah pernah dibatalkan sebelumnya.",
      };
    }

    if (redemption.status !== "menunggu") {
      return {
        success: false,
        error: `Status klaim saat ini (${redemption.status}) tidak memenuhi syarat untuk dibatalkan.`,
      };
    }

    const pointsToRefund = Number(redemption.points_spent) || 0;
    const rewardName = reward?.name || "Merchandise";
    const pickupCode = redemption.pickup_code || "KLAIM";

    // 4. Sinkronkan saldo awal ledger peserta agar tidak ada selisih sebelum refund
    await ensureParticipantLedgerSynced(adminSupabase, redemption.participant_id);

    // 5. Update status reward_redemptions menjadi 'ditolak' (standar DB enum untuk pembatalan)
    // Gunakan filter status: 'menunggu' untuk menjamin idempotensi / atomic update
    const { error: updateErr } = await adminSupabase
      .from("reward_redemptions")
      .update({
        status: "ditolak",
        note: `Dibatalkan oleh peserta pada ${new Date().toLocaleString("id-ID")}`,
        processed_at: new Date().toISOString(),
      })
      .eq("id", redemptionId)
      .eq("status", "menunggu");

    if (updateErr) {
      return { success: false, error: `Gagal memperbarui status penukaran: ${updateErr.message}` };
    }

    // 6. Kembalikan poin ke saldo peserta melalui tabel point_transactions (Ledger)
    if (pointsToRefund > 0) {
      const { error: ptError } = await adminSupabase.from("point_transactions").insert({
        participant_id: redemption.participant_id,
        points: pointsToRefund,
        source: "penyesuaian",
        note: `Pengembalian Poin: Pembatalan penukaran ${rewardName} (Kode: ${pickupCode})`,
      });

      if (ptError) {
        console.error("Gagal mencatat mutasi pengembalian poin:", ptError);
      }
    }

    // 7. Kembalikan kuota/stok reward (kurangi claimed_count)
    if (reward?.id) {
      const currentClaimed = Number(reward.claimed_count) || 0;
      await adminSupabase
        .from("rewards")
        .update({ claimed_count: Math.max(0, currentClaimed - 1) })
        .eq("id", reward.id);
    }

    // 8. Ambil saldo terbaru setelah trigger sync points
    const { data: updatedPart } = await adminSupabase
      .from("participants")
      .select("total_points")
      .eq("id", redemption.participant_id)
      .maybeSingle();

    const newTotalPoints = Number(updatedPart?.total_points) || 0;

    // 9. Catat di activity_logs
    await adminSupabase.from("activity_logs").insert({
      actor_id: user?.id || null,
      actor_role: "peserta",
      action: "pembatalan_reward",
      entity: "reward_redemptions",
      entity_id: redemption.id,
      description: `${participant?.full_name || "Peserta"} membatalkan klaim reward ${rewardName} (Kode: ${pickupCode}). Saldo +${pointsToRefund} poin dikembalikan.`,
      metadata: {
        reward_id: redemption.reward_id,
        reward_name: rewardName,
        pickup_code: pickupCode,
        refunded_points: pointsToRefund,
        new_total_points: newTotalPoints,
      },
    });

    // 10. Siarkan broadcast realtime ke antrean dashboard panitia
    try {
      const channel = adminSupabase.channel("reward-redemptions-channel");
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: {
          action: "cancelled",
          redemptionId: redemption.id,
          pickupCode,
          timestamp: new Date().toISOString(),
        },
      });
      adminSupabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast cancelReward error:", realtimeErr);
    }

    // 11. Revalidate paths
    try {
      revalidatePath("/peserta/riwayat-poin");
      revalidatePath("/peserta/reward");
      revalidatePath("/peserta");
      revalidatePath("/dashboard/challenge/reward");
      revalidatePath("/dashboard/challenge/leaderboard");
      revalidatePath("/leaderboard");
    } catch {
      // Revalidation diabaikan di luar request scope Next.js
    }

    return {
      success: true,
      refundedPoints: pointsToRefund,
      newTotalPoints,
    };
  } catch (err: unknown) {
    console.error("Error cancelRewardRedemption:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat membatalkan klaim reward.",
    };
  }
}

