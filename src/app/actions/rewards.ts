"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  status: "menunggu" | "diserahkan";
  requestedAt: string;
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
      status: q.status === "diserahkan" ? "diserahkan" : "menunggu",
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
