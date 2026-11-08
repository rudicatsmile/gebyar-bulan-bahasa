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
  isExclusiveStandReward?: boolean;
}

export interface RedemptionQueueItem {
  id: string;
  participantName: string;
  rewardId: string;
  rewardName: string;
  rewardStock: number;
  isRewardOutOfStock: boolean;
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
    const [{ data, error }, { data: diserahkanList }, { data: standCfgRow }] = await Promise.all([
      supabase
        .from("rewards")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("points_required", { ascending: true }),
      supabase
        .from("reward_redemptions")
        .select("reward_id")
        .eq("status", "diserahkan"),
      supabase
        .from("event_settings")
        .select("value")
        .eq("key", "stand_special_reward_config")
        .maybeSingle(),
    ]);

    if (error) throw error;

    const standCfg = standCfgRow?.value as { enabled?: boolean; rewardId?: string } | null;
    const specialRewardId = standCfg?.enabled && standCfg?.rewardId ? standCfg.rewardId : null;

    // Hitung jumlah fisik yang sudah diserahkan per reward
    const handedMap: Record<string, number> = {};
    for (const item of diserahkanList || []) {
      if (item.reward_id) {
        handedMap[item.reward_id] = (handedMap[item.reward_id] || 0) + 1;
      }
    }

    const mapped: DbRewardItem[] = (data || []).map((r: any) => {
      const dbClaimed = Number(r.claimed_count) || 0;
      const actualDiserahkan = handedMap[r.id] || 0;
      // Gunakan nilai maksimum agar sinkron dengan database
      const claimedCount = Math.max(dbClaimed, actualDiserahkan);

      return {
        id: r.id,
        name: r.name,
        description: r.description || "",
        pointsRequired: Number(r.points_required) || 0,
        quota: Number(r.quota) || 0,
        claimedCount,
        category: r.points_required >= 300 ? "Akses/Buku" : r.points_required >= 200 ? "Merchandise" : "Voucher",
        isActive: Boolean(r.is_active),
        sortOrder: r.sort_order,
        isExclusiveStandReward: Boolean(specialRewardId && r.id === specialRewardId),
      };
    });

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
      .select("*, participants(full_name), rewards(id, name, points_required, quota, claimed_count, is_active)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped: RedemptionQueueItem[] = (data || []).map((q: any) => {
      const rewardQuota = Number(q.rewards?.quota) || 0;
      const rewardClaimed = Number(q.rewards?.claimed_count) || 0;
      const rewardStock = Math.max(0, rewardQuota - rewardClaimed);
      const isRewardOutOfStock = rewardStock <= 0;

      return {
        id: q.id,
        participantName: q.participants?.full_name || "Peserta",
        rewardId: q.rewards?.id || q.reward_id || "",
        rewardName: q.rewards?.name || "Merchandise Festival",
        rewardStock,
        isRewardOutOfStock,
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
      };
    });

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

export async function handoverRedemption(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  remainingStock?: number;
}> {
  if (!id) return { success: false, error: "ID Klaim tidak valid" };

  try {
    const supabase = createAdminClient();
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    // 1. Ambil data redemption saat ini
    const { data: redemption, error: rErr } = await supabase
      .from("reward_redemptions")
      .select("id, reward_id, participant_id, status, pickup_code, points_spent")
      .eq("id", id)
      .maybeSingle();

    if (rErr || !redemption) {
      return { success: false, error: "Data klaim hadiah tidak ditemukan." };
    }

    // 2. Validasi status klaim antrean (idempotency check)
    if (redemption.status === "diserahkan") {
      return { success: false, error: "Hadiah ini sudah pernah diserahkan sebelumnya." };
    }
    if (redemption.status === "ditolak") {
      return { success: false, error: "Klaim hadiah ini telah dibatalkan dan tidak dapat diserahkan." };
    }
    if (redemption.status !== "menunggu") {
      return { success: false, error: `Status antrean saat ini (${redemption.status}) tidak memenuhi syarat penyerahan.` };
    }

    if (!redemption.reward_id) {
      return { success: false, error: "Klaim ini tidak terhubung dengan item hadiah di katalog." };
    }

    // 3. Ambil data reward terkait
    const { data: reward, error: rewErr } = await supabase
      .from("rewards")
      .select("id, name, quota, claimed_count, is_active")
      .eq("id", redemption.reward_id)
      .maybeSingle();

    if (rewErr || !reward) {
      return { success: false, error: "Item hadiah tidak ditemukan di katalog." };
    }

    if (!reward.is_active) {
      return { success: false, error: `Hadiah "${reward.name}" sedang dinonaktifkan.` };
    }

    const quota = Number(reward.quota) || 0;
    const currentClaimed = Number(reward.claimed_count) || 0;
    const remainingStock = quota - currentClaimed;

    // 4. VALIDASI STOK: Jangan izinkan jika stok <= 0 (Cegah defisit)
    if (remainingStock <= 0 || currentClaimed >= quota) {
      return {
        success: false,
        error: `Stok hadiah habis. Hadiah "${reward.name}" sudah tidak memiliki sisa stok (Tersedia: 0 unit). Penyerahan hadiah ditolak.`,
      };
    }

    // 5. ATOMIC UPDATE STOK DENGAN COMPARE-AND-SWAP (OCC):
    // Kondisi filter: eq('claimed_count', currentClaimed) AND lt('claimed_count', quota)
    // Menjamin secara transaksional di database bahwa:
    // a. Dua panitia yang klik bersamaan tidak akan membuat stok defisit (< 0).
    // b. claimed_count tidak pernah melebihi quota.
    const { data: updatedReward, error: stockUpdateErr } = await supabase
      .from("rewards")
      .update({ claimed_count: currentClaimed + 1 })
      .eq("id", reward.id)
      .eq("claimed_count", currentClaimed)
      .lt("claimed_count", quota)
      .select("id, claimed_count, quota");

    if (stockUpdateErr || !updatedReward || updatedReward.length === 0) {
      // Terjadi konkurensi: panitia lain baru saja memproses sisa stok terakhir atau kuota berubah
      return {
        success: false,
        error: `Stok hadiah habis. Stok hadiah "${reward.name}" baru saja habis atau diperbarui oleh panitia lain. Penyerahan dibatalkan.`,
      };
    }

    // 6. UPDATE STATUS ANTREAN PENYERAHAN MENJADI 'diserahkan'
    const { data: updatedRedemption, error: redemptionUpdateErr } = await supabase
      .from("reward_redemptions")
      .update({
        status: "diserahkan",
        processed_by: user?.id || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "menunggu")
      .select("id, status");

    if (redemptionUpdateErr || !updatedRedemption || updatedRedemption.length === 0) {
      // Rollback stok reward karena status antrean gagal diupdate (misal sudah diproses panitia lain)
      await supabase
        .from("rewards")
        .update({ claimed_count: currentClaimed })
        .eq("id", reward.id)
        .eq("claimed_count", currentClaimed + 1);

      return {
        success: false,
        error: "Gagal memperbarui antrean karena klaim ini sudah diproses atau dibatalkan oleh pihak lain.",
      };
    }

    const newRemainingStock = Math.max(0, quota - (currentClaimed + 1));

    // 7. Catat Log Aktivitas
    try {
      await supabase.from("activity_logs").insert({
        actor_id: user?.id || null,
        actor_role: "seksi_acara",
        action: "penyerahan_reward",
        entity: "reward_redemptions",
        entity_id: id,
        description: `Panitia menyerahkan hadiah "${reward.name}" (Kode: ${redemption.pickup_code || "-"}). Sisa stok: ${newRemainingStock} unit.`,
        metadata: {
          reward_id: reward.id,
          reward_name: reward.name,
          pickup_code: redemption.pickup_code,
          remaining_stock: newRemainingStock,
        },
      });
    } catch {
      // Non-fatal
    }

    // 8. Siarkan broadcast realtime ke antrean & monitor
    try {
      const channel = supabase.channel("reward-redemptions-channel");
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: {
          action: "handover",
          id,
          rewardId: reward.id,
          remainingStock: newRemainingStock,
          timestamp: new Date().toISOString(),
        },
      });
      supabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast handover error:", realtimeErr);
    }

    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/reward");
    revalidatePath("/peserta");

    return {
      success: true,
      remainingStock: newRemainingStock,
      message: `Hadiah "${reward.name}" (Kode: ${redemption.pickup_code}) berhasil diserahkan! Sisa stok sekarang: ${newRemainingStock} unit.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui status penyerahan.";
    return { success: false, error: message };
  }
}

/**
 * Reset stok reward (mengembalikan claimed_count ke 0 sehingga sisa stok kembali 100%)
 * Dapat mereset 1 reward spesifik ataupun seluruh reward katalog sekaligus.
 */
export async function resetRewardStock(rewardId?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (rewardId) {
      const { data: targetReward, error: fetchErr } = await supabase
        .from("rewards")
        .select("name, quota")
        .eq("id", rewardId)
        .maybeSingle();

      if (fetchErr || !targetReward) {
        return { success: false, error: "Hadiah tidak ditemukan di database." };
      }

      const { error } = await supabase
        .from("rewards")
        .update({ claimed_count: 0 })
        .eq("id", rewardId);

      if (error) return { success: false, error: error.message };

      // Catat log aktivitas
      try {
        await supabase.from("activity_logs").insert({
          actor_id: user?.id || null,
          actor_role: "seksi_acara",
          action: "reset_reward_stock",
          entity: "rewards",
          entity_id: rewardId,
          description: `Reset stok hadiah "${targetReward.name}". Kuota terpakai dikembalikan ke 0 (Sisa: ${targetReward.quota} unit).`,
        });
      } catch {
        // Non-fatal
      }
    } else {
      // Reset semua reward di katalog
      const { error } = await supabase
        .from("rewards")
        .update({ claimed_count: 0 })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) return { success: false, error: error.message };

      // Sekaligus reset penerima reward stand di event_settings agar kuota stand juga pulih
      try {
        await supabase.from("event_settings").upsert(
          [
            {
              key: "stand_special_reward_recipients",
              value: [],
              description: "Daftar peserta penerima reward khusus jelajah stand",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "key" }
        );
      } catch {
        // Non-fatal
      }

      // Catat log aktivitas
      try {
        await supabase.from("activity_logs").insert({
          actor_id: user?.id || null,
          actor_role: "seksi_acara",
          action: "reset_all_reward_stock",
          entity: "rewards",
          entity_id: null,
          description: "Reset seluruh stok katalog hadiah dan kuota reward stand menjadi kembali penuh 100%.",
        });
      } catch {
        // Non-fatal
      }
    }

    // Broadcast realtime update
    try {
      const channel = supabase.channel("reward-redemptions-channel");
      await channel.send({
        type: "broadcast",
        event: "queue_updated",
        payload: { action: "stock_reset", rewardId, timestamp: new Date().toISOString() },
      });
      supabase.removeChannel(channel);
    } catch (realtimeErr) {
      console.warn("Realtime broadcast stock reset error:", realtimeErr);
    }

    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/peserta/reward");
    revalidatePath("/peserta/scan");

    return {
      success: true,
      message: rewardId
        ? "Stok hadiah berhasil di-reset kembali ke kuota penuh!"
        : "Seluruh stok hadiah berhasil di-reset kembali ke kuota penuh!",
    };
  } catch (err: unknown) {
    console.error("Error resetRewardStock:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mereset stok hadiah.",
    };
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

    // 7. Kembalikan kuota/stok reward jika claimed_count pernah terpotong (jaga agar tidak pernah < 0)
    if (reward?.id) {
      const currentClaimed = Number(reward.claimed_count) || 0;
      if (currentClaimed > 0) {
        const { count: handedOverCount } = await adminSupabase
          .from("reward_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("reward_id", reward.id)
          .eq("status", "diserahkan");

        if (currentClaimed > (handedOverCount || 0)) {
          await adminSupabase
            .from("rewards")
            .update({ claimed_count: Math.max(0, currentClaimed - 1) })
            .eq("id", reward.id);
        }
      }
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

