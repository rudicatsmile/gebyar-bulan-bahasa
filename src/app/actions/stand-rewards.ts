"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { STANDS } from "@/lib/dummy-data";

export interface StandSpecialRewardConfig {
  enabled: boolean;
  quota: number;
  rewardId: string | null;
  rewardName: string;
  description?: string;
}

export interface StandSpecialRewardRecipient {
  participantId: string;
  participantName: string;
  institution: string;
  rank: number;
  completedAt: string;
  pickupCode: string | null;
  rewardName: string;
  status: "diterima" | "kuota_habis";
}

export interface StandSpecialRewardStatus {
  config: StandSpecialRewardConfig;
  totalActiveStands: number;
  activeStandsList: { id: string; name: string; code: string }[];
  grantedCount: number;
  remainingQuota: number;
  totalCompleters: number;
  recipients: StandSpecialRewardRecipient[];
  availableRewards: {
    id: string;
    name: string;
    quota: number;
    claimedCount: number;
    isActive: boolean;
  }[];
}

const DEFAULT_CONFIG: StandSpecialRewardConfig = {
  enabled: true,
  quota: 50,
  rewardId: null,
  rewardName: "Paket Merchandise Spesial Eksplorasi Budaya",
  description: "Diberikan khusus untuk 50 peserta pertama yang berhasil mengunjungi seluruh stand pameran budaya.",
};

/**
 * Mengambil status lengkap konfigurasi, kuota, stand aktif, dan daftar penerima reward khusus.
 */
export async function getStandSpecialRewardStatus(): Promise<{
  success: boolean;
  data?: StandSpecialRewardStatus;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil stand yang aktif
    const { data: dbStands } = await supabase
      .from("stands")
      .select("id, name, code, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    let activeStands: { id: string; name: string; code: string }[] = [];
    if (dbStands && dbStands.length > 0) {
      activeStands = dbStands.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      }));
    } else {
      // Fallback dummy stands jika tabel belum diisi
      activeStands = STANDS.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
      }));
    }

    // 2. Ambil konfigurasi dari event_settings
    const { data: configRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    let config: StandSpecialRewardConfig = { ...DEFAULT_CONFIG };
    if (configRow?.value && typeof configRow.value === "object") {
      config = {
        ...DEFAULT_CONFIG,
        ...(configRow.value as Partial<StandSpecialRewardConfig>),
      };
    }

    // 3. Ambil daftar reward dari tabel rewards (/dashboard/challenge/reward)
    const { data: dbRewards } = await supabase
      .from("rewards")
      .select("id, name, quota, claimed_count, is_active")
      .eq("is_active", true)
      .order("points_required", { ascending: true });

    const availableRewards = (dbRewards || []).map((r) => ({
      id: r.id,
      name: r.name,
      quota: Number(r.quota) || 0,
      claimedCount: Number(r.claimed_count) || 0,
      isActive: Boolean(r.is_active),
    }));

    // Jika rewardId belum diset dan ada reward di database, pasangkan ke reward pertama
    if (!config.rewardId && availableRewards.length > 0) {
      config.rewardId = availableRewards[0].id;
      config.rewardName = availableRewards[0].name;
    } else if (config.rewardId) {
      const matched = availableRewards.find((r) => r.id === config.rewardId);
      if (matched) {
        config.rewardName = matched.name;
      }
    }

    // 4. Ambil daftar penerima reward dari event_settings
    const { data: recRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_recipients")
      .maybeSingle();

    const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
      ? (recRow.value as unknown as StandSpecialRewardRecipient[])
      : [];

    const grantedCount = recipients.filter((r) => r.status === "diterima").length;
    const remainingQuota = Math.max(0, config.quota - grantedCount);

    return {
      success: true,
      data: {
        config,
        totalActiveStands: activeStands.length,
        activeStandsList: activeStands,
        grantedCount,
        remainingQuota,
        totalCompleters: recipients.length,
        recipients,
        availableRewards,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat status reward khusus stand.";
    return { success: false, error: message };
  }
}

/**
 * Menyimpan konfigurasi batas penerima (kuota), pilihan reward, dan status aktif reward khusus.
 */
export async function updateStandSpecialRewardConfig(payload: {
  enabled?: boolean;
  quota?: number;
  rewardId?: string | null;
  rewardName?: string;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Ambil setting lama
    const { data: oldRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    const current: StandSpecialRewardConfig = {
      ...DEFAULT_CONFIG,
      ...((oldRow?.value as any) || {}),
    };

    const updated: StandSpecialRewardConfig = {
      ...current,
      ...(payload.enabled !== undefined ? { enabled: payload.enabled } : {}),
      ...(payload.quota !== undefined ? { quota: Math.max(1, Number(payload.quota) || 50) } : {}),
      ...(payload.rewardId !== undefined ? { rewardId: payload.rewardId } : {}),
      ...(payload.rewardName !== undefined ? { rewardName: payload.rewardName } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };

    const { error } = await supabase.from("event_settings").upsert({
      key: "stand_special_reward_config",
      value: updated as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/scan");
    revalidatePath("/peserta/reward");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi reward khusus.";
    return { success: false, error: message };
  }
}

/**
 * Reset daftar penerima reward khusus (hanya digunakan untuk keperluan administrasi/pengujian).
 */
export async function resetStandSpecialRewardRecipients(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("event_settings").upsert({
      key: "stand_special_reward_recipients",
      value: [],
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/peserta/scan");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mereset data penerima.";
    return { success: false, error: message };
  }
}

export interface StandCompletionCheckResult {
  allStandsCompleted: boolean;
  standsCompletedCount: number;
  totalActiveStands: number;
  specialReward?: {
    alreadyProcessed?: boolean;
    qualified: boolean;
    granted: boolean;
    rank: number;
    quota: number;
    rewardName: string;
    pickupCode: string | null;
    message: string;
  };
}

/**
 * Logika inti: Memeriksa apakah peserta telah menyelesaikan scan seluruh stand aktif,
 * dan secara otomatis memberikan reward khusus kepada 50 peserta pertama (kuota dinamis).
 */
export async function checkAndProcessStandCompletionReward(
  participantId: string
): Promise<StandCompletionCheckResult> {
  const supabase = createAdminClient();

  // 1. Dapatkan daftar seluruh stand aktif
  const { data: dbStands } = await supabase
    .from("stands")
    .select("id, name, code, is_active")
    .eq("is_active", true);

  let activeStands: { id: string; name: string }[] = [];
  if (dbStands && dbStands.length > 0) {
    activeStands = dbStands;
  } else {
    activeStands = STANDS.map((s) => ({ id: s.id, name: s.name }));
  }

  const totalActiveStands = activeStands.length;
  if (totalActiveStands === 0) {
    return {
      allStandsCompleted: false,
      standsCompletedCount: 0,
      totalActiveStands: 0,
    };
  }

  const activeStandIdSet = new Set(activeStands.map((s) => s.id));

  // 2. Dapatkan riwayat kunjungan stand oleh peserta ini dari point_transactions
  const { data: userVisits } = await supabase
    .from("point_transactions")
    .select("stand_id")
    .eq("participant_id", participantId)
    .eq("source", "kode_unik")
    .not("stand_id", "is", null);

  const visitedStandIds = new Set(
    (userVisits || [])
      .map((v) => v.stand_id)
      .filter((id): id is string => Boolean(id && activeStandIdSet.has(id)))
  );

  const standsCompletedCount = visitedStandIds.size;
  const allStandsCompleted = standsCompletedCount >= totalActiveStands;

  // Jika belum semua stand selesai di-scan, kembalikan status progres
  if (!allStandsCompleted) {
    return {
      allStandsCompleted: false,
      standsCompletedCount,
      totalActiveStands,
      specialReward: {
        qualified: false,
        granted: false,
        rank: 0,
        quota: 50,
        rewardName: "",
        pickupCode: null,
        message: `Progres Stand: ${standsCompletedCount} dari ${totalActiveStands} stand telah dikunjungi.`,
      },
    };
  }

  // 3. PESERTA TELAH MENYELESAIKAN SEMUA STAND!
  // Periksa apakah peserta ini sudah pernah tercatat sebelumnya (hindari reward ganda)
  const { data: recRow } = await supabase
    .from("event_settings")
    .select("value")
    .eq("key", "stand_special_reward_recipients")
    .maybeSingle();

  const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
    ? (recRow.value as unknown as StandSpecialRewardRecipient[])
    : [];

  const existing = recipients.find((r) => r.participantId === participantId);

  // Ambil konfigurasi batas kuota & nama reward
  const { data: configRow } = await supabase
    .from("event_settings")
    .select("value")
    .eq("key", "stand_special_reward_config")
    .maybeSingle();

  const config: StandSpecialRewardConfig = {
    ...DEFAULT_CONFIG,
    ...((configRow?.value as any) || {}),
  };

  if (existing) {
    // Peserta sudah pernah diverifikasi sebelumnya
    const wasGranted = existing.status === "diterima";
    return {
      allStandsCompleted: true,
      standsCompletedCount,
      totalActiveStands,
      specialReward: {
        alreadyProcessed: true,
        qualified: true,
        granted: wasGranted,
        rank: existing.rank,
        quota: config.quota,
        rewardName: existing.rewardName || config.rewardName,
        pickupCode: existing.pickupCode,
        message: wasGranted
          ? `🎉 Anda telah menyelesaikan semua stand sebelumnya (Penerima #${existing.rank} dari ${config.quota}). Kode Pengambilan Hadiah: ${existing.pickupCode}`
          : `🏁 Anda telah menyelesaikan semua stand di urutan #${existing.rank}. Kuota reward khusus (${config.quota} peserta pertama) sudah habis saat Anda menyelesaikan misi.`,
      },
    };
  }

  // 4. INI ADALAH PENYELESAIAN PERTAMA KALI OLEH PESERTA INI!
  // Ambil nama dan instansi peserta
  const { data: participantData } = await supabase
    .from("participants")
    .select("full_name, institution")
    .eq("id", participantId)
    .maybeSingle();

  const participantName = participantData?.full_name || "Peserta Gebyar Bahasa";
  const institution = participantData?.institution || "-";

  // Hitung jumlah peserta yang telah menerima reward (status: 'diterima')
  const grantedCount = recipients.filter((r) => r.status === "diterima").length;
  const isWithinQuota = config.enabled && grantedCount < config.quota;

  if (isWithinQuota) {
    // DALAM KUOTA: BERIKAN REWARD KHUSUS!
    const rank = grantedCount + 1;
    const pickupCode = `STAND-${String(rank).padStart(3, "0")}`;

    // Catat ke reward_redemptions jika rewardId terhubung
    if (config.rewardId) {
      try {
        await supabase.from("reward_redemptions").insert({
          reward_id: config.rewardId,
          participant_id: participantId,
          points_spent: 0,
          status: "menunggu",
          pickup_code: pickupCode,
          note: `Reward Khusus Stand: Penyelesaian Seluruh Stand Budaya (Penerima #${rank} dari ${config.quota})`,
        });

        // Tambah claimed_count di tabel rewards
        const { data: rew } = await supabase
          .from("rewards")
          .select("claimed_count")
          .eq("id", config.rewardId)
          .maybeSingle();

        if (rew) {
          await supabase
            .from("rewards")
            .update({ claimed_count: (rew.claimed_count || 0) + 1 })
            .eq("id", config.rewardId);
        }
      } catch (err) {
        console.error("Gagal mencatat redemption reward khusus:", err);
      }
    }

    // Catat penerima ke list
    const newRecipient: StandSpecialRewardRecipient = {
      participantId,
      participantName,
      institution,
      rank,
      completedAt: new Date().toISOString(),
      pickupCode,
      rewardName: config.rewardName,
      status: "diterima",
    };

    recipients.push(newRecipient);

    // Simpan ke event_settings
    await supabase.from("event_settings").upsert({
      key: "stand_special_reward_recipients",
      value: recipients as any,
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/dashboard/challenge/reward");
    revalidatePath("/peserta/scan");
    revalidatePath("/peserta/reward");

    return {
      allStandsCompleted: true,
      standsCompletedCount,
      totalActiveStands,
      specialReward: {
        qualified: true,
        granted: true,
        rank,
        quota: config.quota,
        rewardName: config.rewardName,
        pickupCode,
        message: `🎉 SELAMAT! Anda adalah peserta ke-${rank} dari ${config.quota} orang yang berhasil menyelesaikan seluruh stand pameran budaya! Tunjukkan kode voucher "${pickupCode}" ke panitia untuk mengambil "${config.rewardName}".`,
      },
    };
  } else {
    // KUOTA HABIS (Urutan ke-51 atau melebihi kuota dinamis yang ditentukan)
    const completionRank = recipients.length + 1;

    const newRecipient: StandSpecialRewardRecipient = {
      participantId,
      participantName,
      institution,
      rank: completionRank,
      completedAt: new Date().toISOString(),
      pickupCode: null,
      rewardName: config.rewardName,
      status: "kuota_habis",
    };

    recipients.push(newRecipient);

    // Simpan pencatatan completion meski kuota habis (sebagai bukti urutan ke-51+)
    await supabase.from("event_settings").upsert({
      key: "stand_special_reward_recipients",
      value: recipients as any,
      updated_at: new Date().toISOString(),
    });

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/peserta/scan");

    return {
      allStandsCompleted: true,
      standsCompletedCount,
      totalActiveStands,
      specialReward: {
        qualified: true,
        granted: false,
        rank: completionRank,
        quota: config.quota,
        rewardName: config.rewardName,
        pickupCode: null,
        message: `🏁 Hebat! Anda telah berhasil menyelesaikan pemindaian seluruh ${totalActiveStands} stand (Urutan penyelesaian ke-${completionRank}). Namun mohon maaf, kuota reward khusus (untuk ${config.quota} peserta tercepat) sudah habis. Tetap pantau leaderboard untuk hadiah keaktifan lainnya!`,
      },
    };
  }
}

/**
 * Mengambil informasi progres eksplorasi stand untuk peserta saat ini (tampilan scan).
 */
export async function getParticipantStandProgress(participantId: string) {
  try {
    const supabase = createAdminClient();

    // 1. Ambil stand aktif
    const { data: dbStands } = await supabase
      .from("stands")
      .select("id, name, code, is_active")
      .eq("is_active", true);

    const activeStands = (dbStands && dbStands.length > 0)
      ? dbStands
      : STANDS.map((s) => ({ id: s.id, name: s.name, code: s.code }));

    const totalActiveStands = activeStands.length;
    const activeStandIdSet = new Set(activeStands.map((s) => s.id));

    // 2. Kunjungan peserta
    const { data: userVisits } = await supabase
      .from("point_transactions")
      .select("stand_id")
      .eq("participant_id", participantId)
      .eq("source", "kode_unik")
      .not("stand_id", "is", null);

    const visitedStandIds = new Set(
      (userVisits || [])
        .map((v) => v.stand_id)
        .filter((id): id is string => Boolean(id && activeStandIdSet.has(id)))
    );

    const standsCompletedCount = visitedStandIds.size;
    const allCompleted = standsCompletedCount >= totalActiveStands && totalActiveStands > 0;

    // 3. Konfigurasi reward khusus
    const { data: configRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    const config: StandSpecialRewardConfig = {
      ...DEFAULT_CONFIG,
      ...((configRow?.value as any) || {}),
    };

    // 4. Cek apakah peserta sudah terdaftar sebagai penerima
    const { data: recRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_recipients")
      .maybeSingle();

    const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
      ? (recRow.value as unknown as StandSpecialRewardRecipient[])
      : [];

    const existingRecipient = recipients.find((r) => r.participantId === participantId) || null;
    const grantedCount = recipients.filter((r) => r.status === "diterima").length;
    const remainingQuota = Math.max(0, config.quota - grantedCount);

    return {
      success: true,
      standsCompletedCount,
      totalActiveStands,
      allCompleted,
      config,
      grantedCount,
      remainingQuota,
      existingRecipient,
    };
  } catch (err: unknown) {
    return {
      success: false,
      standsCompletedCount: 0,
      totalActiveStands: 8,
      allCompleted: false,
      config: DEFAULT_CONFIG,
      grantedCount: 0,
      remainingQuota: 50,
      existingRecipient: null,
    };
  }
}

