"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { STANDS } from "@/lib/dummy-data";
import { getStandCheckoutCode, getStandCheckoutToken } from "@/lib/stand-utils";
import { checkParticipantChallengeEligibility } from "./challenge-eligibility";

export interface StandSpecialRewardConfig {
  enabled: boolean;
  quota: number;
  rewardId: string | null;
  rewardName: string;
  description?: string;
  minDurationMinutes: number; // default: 15 menit
  validationMode: "both" | "qr" | "code"; // "both", "qr", "code"
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

export interface StandViewerSession {
  id: string;
  participantId: string;
  standId: string;
  standName: string;
  standCode: string;
  location?: string;
  startedAt: string; // ISO date server
  minDurationMinutes: number;
  status: "sedang_menonton" | "selesai" | "dibatalkan";
  completedAt?: string;
}

export interface StandSpecialRewardStatus {
  config: StandSpecialRewardConfig;
  totalActiveStands: number;
  activeStandsList: { id: string; name: string; code: string; location?: string; checkoutCode?: string; checkoutToken?: string }[];
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
  description: "Diberikan khusus untuk peserta yang berhasil menyelesaikan seluruh stand pameran budaya.",
  minDurationMinutes: 15,
  validationMode: "both",
};

async function broadcastStandUpdate(action: string, payload?: Record<string, any>) {
  try {
    const supabase = createAdminClient();
    const channel = supabase.channel("stand-challenge-channel");
    await channel.send({
      type: "broadcast",
      event: "stand_updated",
      payload: { action, ...payload, timestamp: new Date().toISOString() },
    });
    supabase.removeChannel(channel);
  } catch (err) {
    console.warn("Realtime broadcast stand error:", err);
  }
}

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
      .select("id, name, code, booth_location, qr_token, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    let activeStands: { id: string; name: string; code: string; location?: string; checkoutCode?: string; checkoutToken?: string }[] = [];
    if (dbStands && dbStands.length > 0) {
      activeStands = dbStands.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        location: s.booth_location || "Area Pameran",
        checkoutCode: getStandCheckoutCode(s.code),
        checkoutToken: getStandCheckoutToken(s.id, s.qr_token),
      }));
    } else {
      // Fallback dummy stands jika tabel belum diisi
      activeStands = STANDS.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        location: s.location || "Area Pameran",
        checkoutCode: getStandCheckoutCode(s.code),
        checkoutToken: getStandCheckoutToken(s.id, s.qrToken),
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
 * Menyimpan konfigurasi batas penerima (kuota), durasi menonton minimal, pilihan reward, dan status aktif reward khusus.
 */
export async function updateStandSpecialRewardConfig(payload: {
  enabled?: boolean;
  quota?: number;
  rewardId?: string | null;
  rewardName?: string;
  description?: string;
  minDurationMinutes?: number;
  validationMode?: "both" | "qr" | "code";
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
      ...(payload.minDurationMinutes !== undefined ? { minDurationMinutes: Math.max(1, Number(payload.minDurationMinutes) || 15) } : {}),
      ...(payload.validationMode !== undefined ? { validationMode: payload.validationMode } : {}),
    };

    const { error } = await supabase.from("event_settings").upsert({
      key: "stand_special_reward_config",
      value: updated as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    await broadcastStandUpdate("config_updated", {
      quota: updated.quota,
      enabled: updated.enabled,
      minDurationMinutes: updated.minDurationMinutes,
      validationMode: updated.validationMode,
    });

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

    await broadcastStandUpdate("recipients_reset");

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

  // 2. Dapatkan riwayat penyelesaian stand oleh peserta ini dari sesi menonton (status: selesai)
  const { data: sessionRow } = await supabase
    .from("event_settings")
    .select("value")
    .eq("key", "stand_viewer_sessions")
    .maybeSingle();

  const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
    ? (sessionRow.value as unknown as StandViewerSession[])
    : [];

  const sessionCompletedIds = allSessions
    .filter((s) => s.participantId === participantId && s.status === "selesai")
    .map((s) => s.standId);

  // Dukungan riwayat kunjungan legacy
  const { data: userVisits } = await supabase
    .from("point_transactions")
    .select("stand_id")
    .eq("participant_id", participantId)
    .eq("source", "kode_unik")
    .not("stand_id", "is", null);

  const legacyVisitedIds = (userVisits || [])
    .map((v) => v.stand_id)
    .filter((id): id is string => Boolean(id));

  const visitedStandIds = new Set(
    [...sessionCompletedIds, ...legacyVisitedIds]
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

    await supabase.from("event_settings").upsert({
      key: "stand_special_reward_recipients",
      value: recipients as any,
      updated_at: new Date().toISOString(),
    });

    await broadcastStandUpdate("recipient_added", {
      participantId,
      status: "diterima",
      rank,
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

    await broadcastStandUpdate("recipient_added", {
      participantId,
      status: "kuota_habis",
      rank: completionRank,
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

    // 2. Dapatkan semua ID terkait peserta (id dan user_id) untuk konsistensi query
    const validIds = new Set<string>([participantId]);
    try {
      const { data: partRow } = await supabase
        .from("participants")
        .select("id, user_id")
        .or(`id.eq.${participantId},user_id.eq.${participantId}`)
        .maybeSingle();

      if (partRow) {
        if (partRow.id) validIds.add(partRow.id);
        if (partRow.user_id) validIds.add(partRow.user_id);
      }
    } catch {
      // Abaikan jika format ID bukan UUID atau query gagal
    }

    // 3. Kunjungan / sesi selesai peserta
    const { data: sessionRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_viewer_sessions")
      .maybeSingle();

    const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
      ? (sessionRow.value as unknown as StandViewerSession[])
      : [];

    const sessionCompletedIds = allSessions
      .filter((s) => validIds.has(s.participantId) && s.status === "selesai")
      .map((s) => s.standId);

    // Kunjungan legacy
    const { data: userVisits } = await supabase
      .from("point_transactions")
      .select("stand_id")
      .in("participant_id", Array.from(validIds))
      .eq("source", "kode_unik")
      .not("stand_id", "is", null);

    const legacyVisitedIds = (userVisits || [])
      .map((v) => v.stand_id)
      .filter((id): id is string => Boolean(id));

    const visitedStandIds = new Set(
      [...sessionCompletedIds, ...legacyVisitedIds]
        .filter((id): id is string => Boolean(id && activeStandIdSet.has(id)))
    );

    const standsCompletedCount = visitedStandIds.size;

    // 4. Konfigurasi reward khusus
    const { data: configRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    const config: StandSpecialRewardConfig = {
      ...DEFAULT_CONFIG,
      ...((configRow?.value as any) || {}),
    };

    // 5. Cek apakah peserta sudah terdaftar sebagai penerima reward khusus
    const { data: recRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_recipients")
      .maybeSingle();

    const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
      ? (recRow.value as unknown as StandSpecialRewardRecipient[])
      : [];

    const existingRecipient = recipients.find((r) => validIds.has(r.participantId)) || null;
    const grantedCount = recipients.filter((r) => r.status === "diterima").length;
    const remainingQuota = Math.max(0, config.quota - grantedCount);

    // Peserta dianggap selesai jika sudah menuntaskan seluruh stand aktif ATAU sudah tercatat sebagai penerima reward
    const allCompleted =
      Boolean(existingRecipient) ||
      (standsCompletedCount >= totalActiveStands && totalActiveStands > 0);

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

/**
 * Mengambil informasi sesi menonton aktif peserta beserta perhitungan waktu server.
 */
export async function getParticipantStandSession(participantId: string) {
  try {
    const supabase = createAdminClient();

    // 1. Ambil stand aktif
    const { data: dbStands } = await supabase
      .from("stands")
      .select("id, name, code, booth_location, qr_token, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true });

    const activeStands = (dbStands && dbStands.length > 0)
      ? dbStands
      : STANDS.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          booth_location: s.location,
          qr_token: s.qrToken,
          is_active: true,
        }));

    const totalActiveStands = activeStands.length;

    // 2. Ambil konfigurasi
    const { data: configRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    const config: StandSpecialRewardConfig = {
      ...DEFAULT_CONFIG,
      ...((configRow?.value as any) || {}),
    };

    // 3. Ambil daftar sesi dari event_settings
    const { data: sessionRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_viewer_sessions")
      .maybeSingle();

    const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
      ? (sessionRow.value as unknown as StandViewerSession[])
      : [];

    // Dapatkan semua ID terkait peserta (id dan user_id)
    const validIds = new Set<string>([participantId]);
    try {
      const { data: partRow } = await supabase
        .from("participants")
        .select("id, user_id")
        .or(`id.eq.${participantId},user_id.eq.${participantId}`)
        .maybeSingle();

      if (partRow) {
        if (partRow.id) validIds.add(partRow.id);
        if (partRow.user_id) validIds.add(partRow.user_id);
      }
    } catch { }

    const userSessions = allSessions.filter((s) => validIds.has(s.participantId));
    const activeSession = userSessions.find((s) => s.status === "sedang_menonton") || null;

    // Ambil stand yang sudah selesai
    const sessionCompletedIds = userSessions
      .filter((s) => s.status === "selesai")
      .map((s) => s.standId);

    // Kunjungan legacy jika ada
    const { data: userVisits } = await supabase
      .from("point_transactions")
      .select("stand_id")
      .in("participant_id", Array.from(validIds))
      .eq("source", "kode_unik")
      .not("stand_id", "is", null);

    const legacyVisitedIds = (userVisits || [])
      .map((v) => v.stand_id)
      .filter((id): id is string => Boolean(id));

    const completedStandIds = Array.from(
      new Set([...sessionCompletedIds, ...legacyVisitedIds])
    );

    // Hitung timer server jika ada sesi aktif
    let sessionTiming: {
      serverTime: string;
      elapsedSeconds: number;
      requiredSeconds: number;
      remainingSeconds: number;
      isDurationMet: boolean;
      progressPercent: number;
    } | null = null;

    if (activeSession) {
      const startedAtTime = new Date(activeSession.startedAt).getTime();
      const nowTime = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((nowTime - startedAtTime) / 1000));
      const requiredSeconds = (activeSession.minDurationMinutes || config.minDurationMinutes || 15) * 60;
      const remainingSeconds = Math.max(0, requiredSeconds - elapsedSeconds);
      const isDurationMet = elapsedSeconds >= requiredSeconds;
      const progressPercent = Math.min(100, Math.floor((elapsedSeconds / requiredSeconds) * 100));

      sessionTiming = {
        serverTime: new Date().toISOString(),
        elapsedSeconds,
        requiredSeconds,
        remainingSeconds,
        isDurationMet,
        progressPercent,
      };
    }

    // 4. Ambil status reward khusus jika sudah selesai semua
    const { data: recRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_recipients")
      .maybeSingle();

    const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
      ? (recRow.value as unknown as StandSpecialRewardRecipient[])
      : [];

    const existingRecipient = recipients.find((r) => validIds.has(r.participantId)) || null;
    const grantedCount = recipients.filter((r) => r.status === "diterima").length;
    const remainingQuota = Math.max(0, config.quota - grantedCount);
    const allCompleted =
      Boolean(existingRecipient) ||
      (completedStandIds.length >= totalActiveStands && totalActiveStands > 0);

    return {
      success: true,
      activeSession,
      sessionTiming,
      completedStandIds,
      standsCompletedCount: completedStandIds.length,
      totalActiveStands,
      activeStandsList: activeStands.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        location: s.booth_location || "Area Pameran",
        isCompleted: completedStandIds.includes(s.id),
        checkoutCode: getStandCheckoutCode(s.code),
      })),
      allCompleted,
      config,
      grantedCount,
      remainingQuota,
      existingRecipient,
    };
  } catch (err: unknown) {
    return {
      success: false,
      activeSession: null,
      sessionTiming: null,
      completedStandIds: [],
      standsCompletedCount: 0,
      totalActiveStands: 8,
      activeStandsList: [],
      allCompleted: false,
      config: DEFAULT_CONFIG,
      grantedCount: 0,
      remainingQuota: 50,
      existingRecipient: null,
    };
  }
}

/**
 * Check-in ke dalam stand untuk memulai sesi menonton (1 sesi aktif dalam satu waktu).
 */
export async function checkInStandSession(payload: {
  participantId: string;
  standInput: string;
}): Promise<{
  success: boolean;
  session?: StandViewerSession;
  error?: string;
  message?: string;
}> {
  if (!payload.participantId) {
    return { success: false, error: "Peserta tidak valid." };
  }

  // Validasi aturan keikutsertaan lomba vs partisipasi challenge
  const eligibility = await checkParticipantChallengeEligibility(payload.participantId);
  if (!eligibility.allowed) {
    return {
      success: false,
      error:
        eligibility.reason ||
        "Peserta yang mengikuti cabang lomba tidak diperkenankan mengikuti misi tantangan.",
    };
  }

  let cleanInput = (payload.standInput || "").trim();

  // Defensively extract if user passed JSON or URL payload
  if (cleanInput.startsWith("{") && cleanInput.endsWith("}")) {
    try {
      const obj = JSON.parse(cleanInput);
      if (obj.code) cleanInput = String(obj.code).trim();
      else if (obj.token) cleanInput = String(obj.token).trim();
      else if (obj.standCode) cleanInput = String(obj.standCode).trim();
    } catch { }
  }
  if (cleanInput.includes("http://") || cleanInput.includes("https://")) {
    try {
      const parsedUrl = new URL(cleanInput);
      const codeParam =
        parsedUrl.searchParams.get("code") ||
        parsedUrl.searchParams.get("stand") ||
        parsedUrl.searchParams.get("token");
      if (codeParam) cleanInput = codeParam.trim();
    } catch { }
  }

  try {
    const supabase = createAdminClient();

    // 1. Dapatkan daftar stand aktif
    const { data: dbStands } = await supabase
      .from("stands")
      .select("id, name, code, booth_location, qr_token, is_active")
      .eq("is_active", true);

    const activeStands = (dbStands && dbStands.length > 0)
      ? dbStands
      : STANDS.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          booth_location: s.location,
          qr_token: s.qrToken,
          is_active: true,
        }));

    const cleanUpper = cleanInput.toUpperCase();
    const matchedStand = activeStands.find(
      (s) =>
        s.id.toLowerCase() === cleanInput.toLowerCase() ||
        s.code.toUpperCase() === cleanUpper ||
        (s.qr_token && s.qr_token.toUpperCase() === cleanUpper)
    );

    if (!matchedStand) {
      return {
        success: false,
        error: `Kode atau QR masuk "${cleanInput}" tidak ditemukan atau stand sedang nonaktif.`,
      };
    }

    // 2. Ambil konfigurasi durasi minimal
    const { data: configRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_config")
      .maybeSingle();

    const config: StandSpecialRewardConfig = {
      ...DEFAULT_CONFIG,
      ...((configRow?.value as any) || {}),
    };

    const minMinutes = config.minDurationMinutes || 15;

    // 3. Ambil daftar sesi dari event_settings
    const { data: sessionRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_viewer_sessions")
      .maybeSingle();

    const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
      ? (sessionRow.value as unknown as StandViewerSession[])
      : [];

    // Dapatkan semua ID terkait peserta (id dan user_id)
    const validIds = new Set<string>([payload.participantId]);
    try {
      const { data: partRow } = await supabase
        .from("participants")
        .select("id, user_id")
        .or(`id.eq.${payload.participantId},user_id.eq.${payload.participantId}`)
        .maybeSingle();

      if (partRow) {
        if (partRow.id) validIds.add(partRow.id);
        if (partRow.user_id) validIds.add(partRow.user_id);
      }
    } catch { }

    // Cek apakah peserta sudah menyelesaikan SELURUH stand aktif atau sudah mendapatkan reward
    const totalActiveStands = activeStands.length;
    const completedStandIds = new Set(
      allSessions
        .filter((s) => validIds.has(s.participantId) && s.status === "selesai")
        .map((s) => s.standId)
    );

    const { data: recRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_special_reward_recipients")
      .maybeSingle();

    const recipients: StandSpecialRewardRecipient[] = Array.isArray(recRow?.value)
      ? (recRow.value as unknown as StandSpecialRewardRecipient[])
      : [];

    const isAllStandsFinished =
      (totalActiveStands > 0 && completedStandIds.size >= totalActiveStands) ||
      recipients.some((r) => validIds.has(r.participantId));

    if (isAllStandsFinished) {
      return {
        success: false,
        error: "Selamat! Anda telah menyelesaikan kunjungan di seluruh stand pameran budaya. Misi ini sudah tuntas.",
      };
    }

    // Cek apakah stand ini sudah pernah selesai
    const isAlreadyCompleted = allSessions.some(
      (s) =>
        validIds.has(s.participantId) &&
        s.standId === matchedStand.id &&
        s.status === "selesai"
    );

    if (isAlreadyCompleted) {
      return {
        success: false,
        error: `Anda sudah pernah menyelesaikan kunjungan di stand "${matchedStand.name}". Silakan kunjungi stand lainnya.`,
      };
    }

    // Cek apakah peserta memiliki sesi lain yang sedang berlangsung
    const activeSession = allSessions.find(
      (s) => validIds.has(s.participantId) && s.status === "sedang_menonton"
    );

    if (activeSession) {
      if (activeSession.standId === matchedStand.id) {
        return {
          success: true,
          session: activeSession,
          message: `Anda sedang berada di sesi menonton stand "${matchedStand.name}".`,
        };
      } else {
        return {
          success: false,
          error: `Anda masih memiliki sesi menonton aktif di "${activeSession.standName}". Selesaikan atau batalkan sesi tersebut terlebih dahulu sebelum check-in ke stand lain.`,
        };
      }
    }

    // 4. Buat sesi baru di server
    const newSession: StandViewerSession = {
      id: `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantId: payload.participantId,
      standId: matchedStand.id,
      standName: matchedStand.name,
      standCode: matchedStand.code,
      location: matchedStand.booth_location || "Area Pameran",
      startedAt: new Date().toISOString(),
      minDurationMinutes: minMinutes,
      status: "sedang_menonton",
    };

    allSessions.push(newSession);

    await supabase.from("event_settings").upsert({
      key: "stand_viewer_sessions",
      value: allSessions as any,
      updated_at: new Date().toISOString(),
    });

    await broadcastStandUpdate("session_started", {
      participantId: payload.participantId,
      standId: matchedStand.id,
      standName: matchedStand.name,
    });

    revalidatePath("/peserta/scan");

    return {
      success: true,
      session: newSession,
      message: `Check-in berhasil! Anda mulai menonton di "${matchedStand.name}". Durasi minimal menonton adalah ${minMinutes} menit.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memulai sesi menonton stand.";
    return { success: false, error: message };
  }
}

/**
 * Validasi checkout kehadiran di dalam stand setelah durasi terpenuhi.
 * Tidak menambahkan poin per stand (aturan utama).
 */
export async function checkOutStandSession(payload: {
  participantId: string;
  standId?: string;
  checkoutInput?: string;
  validationInput?: string;
}): Promise<{
  success: boolean;
  standName?: string;
  standCompleted?: boolean;
  allCompleted?: boolean;
  standsCompletedCount?: number;
  totalActiveStands?: number;
  specialReward?: any;
  error?: string;
  message?: string;
}> {
  if (!payload.participantId) {
    return { success: false, error: "Peserta tidak valid." };
  }

  // Validasi aturan keikutsertaan lomba vs partisipasi challenge
  const eligibility = await checkParticipantChallengeEligibility(payload.participantId);
  if (!eligibility.allowed) {
    return {
      success: false,
      error:
        eligibility.reason ||
        "Peserta yang mengikuti cabang lomba tidak diperkenankan mengikuti misi tantangan.",
    };
  }

  let cleanInput = (payload.checkoutInput || payload.validationInput || "").trim();

  // Defensively extract if JSON or URL
  if (cleanInput.startsWith("{") && cleanInput.endsWith("}")) {
    try {
      const obj = JSON.parse(cleanInput);
      if (obj.checkoutCode) cleanInput = String(obj.checkoutCode).trim();
      else if (obj.code) cleanInput = String(obj.code).trim();
      else if (obj.token) cleanInput = String(obj.token).trim();
    } catch { }
  }
  if (cleanInput.includes("http://") || cleanInput.includes("https://")) {
    try {
      const parsedUrl = new URL(cleanInput);
      const codeParam =
        parsedUrl.searchParams.get("checkout") ||
        parsedUrl.searchParams.get("code") ||
        parsedUrl.searchParams.get("token");
      if (codeParam) cleanInput = codeParam.trim();
    } catch { }
  }

  try {
    const supabase = createAdminClient();

    // 1. Ambil daftar sesi
    const { data: sessionRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_viewer_sessions")
      .maybeSingle();

    const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
      ? (sessionRow.value as unknown as StandViewerSession[])
      : [];

    const sessionIndex = allSessions.findIndex(
      (s) =>
        s.participantId === payload.participantId &&
        s.status === "sedang_menonton" &&
        (!payload.standId || s.standId === payload.standId)
    );

    if (sessionIndex === -1) {
      return {
        success: false,
        error: "Tidak ditemukan sesi menonton aktif untuk stand ini. Pastikan Anda sudah check-in terlebih dahulu.",
      };
    }

    const session = allSessions[sessionIndex];
    const targetStandId = session.standId;

    // 2. Validasi Durasi Minimal di Server
    const startedAtTime = new Date(session.startedAt).getTime();
    const nowTime = Date.now();
    const elapsedSeconds = Math.floor((nowTime - startedAtTime) / 1000);
    const requiredSeconds = (session.minDurationMinutes || 15) * 60;

    if (elapsedSeconds < requiredSeconds) {
      const remainingMinutes = Math.ceil((requiredSeconds - elapsedSeconds) / 60);
      return {
        success: false,
        error: `Durasi menonton belum mencukupi! Anda baru menonton selama ${Math.floor(elapsedSeconds / 60)} menit. Wajib menonton minimal ${session.minDurationMinutes} menit (kurang ${remainingMinutes} menit lagi).`,
      };
    }

    // 3. Ambil data stand untuk verifikasi checkout
    const { data: dbStand } = await supabase
      .from("stands")
      .select("id, name, code, qr_token, is_active")
      .eq("id", targetStandId)
      .maybeSingle();

    const standName = dbStand?.name || session.standName;
    const expectedCheckoutCode = getStandCheckoutCode(dbStand?.code || session.standCode);
    const expectedCheckoutToken = getStandCheckoutToken(targetStandId, dbStand?.qr_token);

    const inputUpper = cleanInput.toUpperCase();
    const isCodeValid =
      inputUpper === expectedCheckoutCode ||
      inputUpper === expectedCheckoutToken.toUpperCase() ||
      inputUpper === (dbStand?.code || session.standCode).toUpperCase();

    if (!isCodeValid) {
      return {
        success: false,
        error: `Kode di dalam stand / QR checkout "${cleanInput}" tidak sesuai untuk ${standName}. Pastikan memindai QR checkout atau memasukkan kode yang dipajang di dalam area stand.`,
      };
    }

    // 4. Tandai Sesi Selesai (TANPA MENAMBAHKAN POIN APAPUN)
    allSessions[sessionIndex] = {
      ...session,
      status: "selesai",
      completedAt: new Date().toISOString(),
    };

    await supabase.from("event_settings").upsert({
      key: "stand_viewer_sessions",
      value: allSessions as any,
      updated_at: new Date().toISOString(),
    });

    await broadcastStandUpdate("session_completed", {
      participantId: payload.participantId,
      standId: targetStandId,
      standName,
    });

    // 5. Cek apakah seluruh stand aktif sudah tuntas
    const completionResult = await checkAndProcessStandCompletionReward(payload.participantId);

    revalidatePath("/peserta/scan");
    revalidatePath("/dashboard/challenge/stand");

    return {
      success: true,
      standName,
      standCompleted: true,
      allCompleted: completionResult.allStandsCompleted,
      standsCompletedCount: completionResult.standsCompletedCount,
      totalActiveStands: completionResult.totalActiveStands,
      specialReward: completionResult.specialReward,
      message: `🎉 Selamat! Stand "${standName}" berhasil diselesaikan (${completionResult.standsCompletedCount}/${completionResult.totalActiveStands} stand tuntas).`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses checkout stand.";
    return { success: false, error: message };
  }
}

/**
 * Batalkan sesi menonton jika peserta keluar atau berpindah stand lebih awal.
 */
export async function cancelStandSession(
  param: string | { participantId: string; standId?: string }
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const payload = typeof param === "string" ? { participantId: param } : param;

  if (!payload.participantId) {
    return { success: false, error: "Peserta tidak valid." };
  }

  try {
    const supabase = createAdminClient();
    const { data: sessionRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "stand_viewer_sessions")
      .maybeSingle();

    const allSessions: StandViewerSession[] = Array.isArray(sessionRow?.value)
      ? (sessionRow.value as unknown as StandViewerSession[])
      : [];

    const sessionIndex = allSessions.findIndex(
      (s) =>
        s.participantId === payload.participantId &&
        s.status === "sedang_menonton" &&
        (!payload.standId || s.standId === payload.standId)
    );

    if (sessionIndex === -1) {
      return { success: true, message: "Tidak ada sesi aktif untuk dibatalkan." };
    }

    const cancelled = allSessions[sessionIndex];
    allSessions[sessionIndex] = {
      ...cancelled,
      status: "dibatalkan",
      completedAt: new Date().toISOString(),
    };

    await supabase.from("event_settings").upsert({
      key: "stand_viewer_sessions",
      value: allSessions as any,
      updated_at: new Date().toISOString(),
    });

    await broadcastStandUpdate("session_cancelled", {
      participantId: payload.participantId,
      standId: cancelled.standId,
    });

    revalidatePath("/peserta/scan");

    return {
      success: true,
      message: `Sesi menonton di stand "${cancelled.standName}" telah dibatalkan.`,
    };
  } catch (err: unknown) {
    return { success: false, error: "Gagal membatalkan sesi menonton." };
  }
}

