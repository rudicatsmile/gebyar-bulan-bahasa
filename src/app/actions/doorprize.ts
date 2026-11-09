"use server";

import { randomInt } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DoorprizeItem {
  id: string;
  name: string;
  description: string;
  rewardId?: string | null;
  totalQuantity: number;
  remainingQuantity: number;
  sponsor?: string | null;
  isActive: boolean;
}

export interface DoorprizeWinnerRecord {
  id: string;
  doorprizeName: string;
  prizeId?: string | null;
  rewardId?: string | null;
  participantId: string;
  participantName: string;
  participantRegNum: string;
  participantInstitution: string;
  participantPhone?: string;
  drawnAt: string;
  drawnBy?: string;
  status: "sah" | "dibatalkan" | "diserahkan";
  notes?: string;
}

export interface DoorprizeFilter {
  verificationStatus: "all" | "terverifikasi" | "menunggu_verifikasi";
  excludePreviousWinners: boolean;
  minPoints: number;
  participantType: "all" | "lomba" | "non_lomba";
  institutionKeyword?: string;
}

export interface EligibleParticipantItem {
  id: string;
  fullName: string;
  registrationNumber: string;
  institution: string;
  totalPoints: number;
  status: string;
  phone?: string | null;
}

const DEFAULT_PRIZES: DoorprizeItem[] = [
  {
    id: "55555555-5555-4555-8555-555555555501",
    name: "Grand Prize: Sepeda Gunung Polygon",
    description: "Hadiah utama penutupan Gebyar Bulan Bahasa untuk peserta beruntung",
    totalQuantity: 1,
    remainingQuantity: 1,
    sponsor: "Komite Acara",
    isActive: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555502",
    name: "Smart TV LED 32 Inch",
    description: "Doorprize elektronik hiburan keluarga berlayar HD",
    totalQuantity: 2,
    remainingQuantity: 2,
    sponsor: "Sponsor Utama",
    isActive: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555503",
    name: "Paket Buku Sastra Nusantara & Kaos Festival",
    description: "Koleksi karya sastra klasik Indonesia + merchandise resmi",
    totalQuantity: 5,
    remainingQuantity: 5,
    sponsor: "Balai Pustaka & Panitia",
    isActive: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555504",
    name: "Headset Wireless Bluetooth Super Bass",
    description: "Perangkat audio nirkabel untuk belajar dan hiburan",
    totalQuantity: 3,
    remainingQuantity: 3,
    sponsor: "Media Center",
    isActive: true,
  },
];

const STAFF_ROLES = ["super_admin", "seksi_acara", "media_center"];

/**
 * Cek otorisasi staf/panitia
 */
async function checkStaffAuth(): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { authorized: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isStaff = profile?.role && STAFF_ROLES.includes(profile.role);
    if (!isStaff) {
      return { authorized: false, error: "Hanya panitia yang berwenang mengakses undian doorprize." };
    }

    return { authorized: true, userId: user.id };
  } catch {
    return { authorized: false, error: "Terjadi kesalahan verifikasi akses." };
  }
}

/**
 * Broadcast event undian ke Realtime Channel untuk sinkronisasi layar monitor publik
 */
async function broadcastDoorprize(event: string, payload: Record<string, any>) {
  try {
    const admin = createAdminClient();
    const channel = admin.channel("doorprize-live-channel");
    await channel.send({
      type: "broadcast",
      event,
      payload: { ...payload, timestamp: new Date().toISOString() },
    });
    admin.removeChannel(channel);
  } catch (err) {
    console.warn("Gagal broadcast doorprize realtime:", err);
  }
}

/**
 * 1. Mengambil Daftar Hadiah Doorprize
 */
export async function getDoorprizePrizes(): Promise<{
  success: boolean;
  prizes: DoorprizeItem[];
  catalogRewards: { id: string; name: string; quota: number; claimed: number }[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // A. Ambil hadiah dari tabel doorprizes
    let prizes: DoorprizeItem[] = [];
    const { data: dbPrizes, error: pErr } = await admin
      .from("doorprizes")
      .select("*")
      .order("created_at", { ascending: true });

    if (!pErr && dbPrizes && dbPrizes.length > 0) {
      prizes = dbPrizes.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        rewardId: p.reward_id,
        totalQuantity: Number(p.total_quantity) || 1,
        remainingQuantity: Number(p.remaining_quantity) || 0,
        sponsor: p.sponsor || null,
        isActive: Boolean(p.is_active),
      }));
    } else {
      // Fallback ke event_settings atau bawaan
      const { data: settingRow } = await admin
        .from("event_settings")
        .select("value")
        .eq("key", "doorprize_prizes_list")
        .maybeSingle();

      if (settingRow?.value && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
        prizes = settingRow.value as unknown as DoorprizeItem[];
      } else {
        prizes = DEFAULT_PRIZES;
      }
    }

    // B. Ambil juga reward dari katalog rewards
    const { data: dbRewards } = await admin
      .from("rewards")
      .select("id, name, quota, claimed_count, is_active")
      .eq("is_active", true)
      .order("points_required", { ascending: true });

    const catalogRewards = (dbRewards || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      quota: Number(r.quota) || 0,
      claimed: Number(r.claimed_count) || 0,
    }));

    return { success: true, prizes, catalogRewards };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat hadiah doorprize.";
    return { success: false, prizes: DEFAULT_PRIZES, catalogRewards: [], error: message };
  }
}

/**
 * 2. Tambah / Ubah Hadiah Doorprize
 */
export async function saveDoorprizePrize(prize: {
  id?: string;
  name: string;
  description?: string;
  totalQuantity: number;
  remainingQuantity?: number;
  sponsor?: string;
  rewardId?: string | null;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();
    const id = prize.id || `prize-${Date.now()}`;
    const totalQty = Math.max(1, prize.totalQuantity);
    const remainingQty =
      prize.remainingQuantity !== undefined
        ? Math.max(0, prize.remainingQuantity)
        : totalQty;

    // Coba simpan ke tabel doorprizes
    const payload = {
      name: prize.name.trim(),
      description: prize.description?.trim() || null,
      total_quantity: totalQty,
      remaining_quantity: remainingQty,
      sponsor: prize.sponsor?.trim() || null,
      reward_id: prize.rewardId || null,
      is_active: prize.isActive !== undefined ? prize.isActive : true,
      updated_at: new Date().toISOString(),
    };

    let tableSaved = false;
    try {
      if (prize.id && !prize.id.startsWith("prize-")) {
        const { error } = await admin
          .from("doorprizes")
          .update(payload)
          .eq("id", prize.id);
        if (!error) tableSaved = true;
      } else {
        const { error } = await admin.from("doorprizes").insert(payload);
        if (!error) tableSaved = true;
      }
    } catch {
      tableSaved = false;
    }

    // Selalu sinkronkan cadangan ke event_settings
    if (!tableSaved) {
      const { data: settingRow } = await admin
        .from("event_settings")
        .select("value")
        .eq("key", "doorprize_prizes_list")
        .maybeSingle();

      let currentList: DoorprizeItem[] = Array.isArray(settingRow?.value)
        ? (settingRow.value as unknown as DoorprizeItem[])
        : [...DEFAULT_PRIZES];

      const existingIdx = currentList.findIndex((p) => p.id === id);
      const itemToSave: DoorprizeItem = {
        id,
        name: prize.name.trim(),
        description: prize.description?.trim() || "",
        totalQuantity: totalQty,
        remainingQuantity: remainingQty,
        sponsor: prize.sponsor?.trim() || null,
        rewardId: prize.rewardId || null,
        isActive: prize.isActive !== undefined ? prize.isActive : true,
      };

      if (existingIdx >= 0) {
        currentList[existingIdx] = itemToSave;
      } else {
        currentList.push(itemToSave);
      }

      await admin.from("event_settings").upsert({
        key: "doorprize_prizes_list",
        value: currentList as any,
        description: "Daftar master hadiah doorprize undian keberuntungan",
        updated_at: new Date().toISOString(),
      });
    }

    revalidatePath("/dashboard/doorprize");
    revalidatePath("/monitor/doorprize");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan hadiah doorprize.";
    return { success: false, error: message };
  }
}

/**
 * 3. Mengambil Riwayat Pemenang Doorprize
 */
export async function getDoorprizeHistory(): Promise<{
  success: boolean;
  winners: DoorprizeWinnerRecord[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // Coba baca dari tabel doorprize_winners
    try {
      const { data, error } = await admin
        .from("doorprize_winners")
        .select("*")
        .order("drawn_at", { ascending: false });

      if (!error && data) {
        const winners: DoorprizeWinnerRecord[] = data.map((w) => ({
          id: w.id,
          doorprizeName: w.doorprize_name,
          prizeId: w.doorprize_id,
          rewardId: w.reward_id,
          participantId: w.participant_id,
          participantName: w.participant_name,
          participantRegNum: w.participant_reg_num,
          participantInstitution: w.participant_institution || "Umum",
          participantPhone: w.participant_phone || undefined,
          drawnAt: w.drawn_at,
          drawnBy: w.drawn_by || undefined,
          status: (w.status as "sah" | "dibatalkan" | "diserahkan") || "sah",
          notes: w.notes || undefined,
        }));
        return { success: true, winners };
      }
    } catch {
      // fallback jika tabel belum ada
    }

    // Fallback baca dari event_settings
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_winners_history")
      .maybeSingle();

    const winners: DoorprizeWinnerRecord[] = Array.isArray(settingRow?.value)
      ? (settingRow.value as unknown as DoorprizeWinnerRecord[])
      : [];

    return { success: true, winners };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat riwayat pemenang.";
    return { success: false, winners: [], error: message };
  }
}

/**
 * 4. Mendapatkan Pool Peserta yang Eligible Berdasarkan Filter
 */
export async function getDoorprizeEligibleParticipants(
  filters: DoorprizeFilter
): Promise<{
  success: boolean;
  count: number;
  participants: EligibleParticipantItem[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Ambil ID peserta yang sudah pernah menang jika anti-duplikasi aktif
    const wonParticipantIds = new Set<string>();
    if (filters.excludePreviousWinners) {
      const historyRes = await getDoorprizeHistory();
      if (historyRes.success && historyRes.winners) {
        historyRes.winners
          .filter((w) => w.status !== "dibatalkan")
          .forEach((w) => wonParticipantIds.add(w.participantId));
      }
    }

    // 2. Query dasar tabel participants
    let query = admin
      .from("participants")
      .select("id, full_name, registration_number, institution, total_points, status, phone");

    // Filter status verifikasi
    if (filters.verificationStatus === "terverifikasi") {
      query = query.eq("status", "terverifikasi");
    } else if (filters.verificationStatus === "menunggu_verifikasi") {
      query = query.eq("status", "menunggu_verifikasi");
    } else {
      query = query.neq("status", "ditolak");
    }

    // Filter minimal poin
    if (filters.minPoints > 0) {
      query = query.gte("total_points", filters.minPoints);
    }

    const { data: allParticipants, error } = await query.order("full_name", { ascending: true });

    if (error) throw error;
    if (!allParticipants || allParticipants.length === 0) {
      return { success: true, count: 0, participants: [] };
    }

    // 3. Filter tipe peserta (lomba vs non-lomba) jika diperlukan
    let competitionParticipantIds = new Set<string>();
    if (filters.participantType !== "all") {
      const { data: regRows } = await admin
        .from("registrations")
        .select("participant_id");

      (regRows || []).forEach((r) => {
        if (r.participant_id) competitionParticipantIds.add(r.participant_id);
      });
    }

    // 4. Saring data peserta di memori
    let filtered = allParticipants.filter((p) => {
      // Kecualikan pemenang sebelumnya
      if (filters.excludePreviousWinners && wonParticipantIds.has(p.id)) {
        return false;
      }

      // Filter tipe peserta
      if (filters.participantType === "lomba" && !competitionParticipantIds.has(p.id)) {
        return false;
      }
      if (filters.participantType === "non_lomba" && competitionParticipantIds.has(p.id)) {
        return false;
      }

      // Filter instansi bila ada keyword
      if (filters.institutionKeyword && filters.institutionKeyword.trim()) {
        const kw = filters.institutionKeyword.toLowerCase().trim();
        const inst = (p.institution || "").toLowerCase();
        if (!inst.includes(kw)) return false;
      }

      return true;
    });

    const mapped: EligibleParticipantItem[] = filtered.map((p) => ({
      id: p.id,
      fullName: p.full_name,
      registrationNumber: p.registration_number,
      institution: p.institution || "Umum",
      totalPoints: Number(p.total_points) || 0,
      status: p.status,
      phone: p.phone || null,
    }));

    return {
      success: true,
      count: mapped.length,
      participants: mapped,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghitung pool peserta eligible.";
    return { success: false, count: 0, participants: [], error: message };
  }
}

/**
 * 5. Eksekusi Undian Roda Keberuntungan (Spin Lucky Wheel) di Server
 *
 * Mengundi 1 pemenang secara acak dari pool peserta yang eligible dengan
 * cryptographic randomization, menyimpan riwayat pemenang, serta mem-broadcast
 * event ke layar monitor publik secara serempak.
 */
export async function spinDoorprize(payload: {
  prizeName: string;
  prizeId?: string | null;
  rewardId?: string | null;
  filters: DoorprizeFilter;
  animationStyle?: "vip_card" | "matrix";
}): Promise<{
  success: boolean;
  winner?: EligibleParticipantItem;
  targetSegmentIndex?: number;
  poolCount?: number;
  drawnAt?: string;
  error?: string;
}> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  const prizeName = payload.prizeName?.trim();
  if (!prizeName) {
    return { success: false, error: "Nama hadiah doorprize wajib dipilih atau diisi." };
  }

  try {
    const admin = createAdminClient();

    // 1. Ambil pool peserta yang eligible
    const poolRes = await getDoorprizeEligibleParticipants(payload.filters);
    if (!poolRes.success || !poolRes.participants || poolRes.participants.length === 0) {
      return {
        success: false,
        error: "Tidak ada peserta yang memenuhi kriteria undian doorprize saat ini.",
      };
    }

    const pool = poolRes.participants;
    const poolCount = pool.length;

    // 2. Pilih pemenang secara acak di server (Cryptographically Secure Randomization)
    const winnerIndex = randomInt(0, poolCount);
    const winner = pool[winnerIndex];

    // 3. Tentukan segmen target roda keberuntungan (0 - 11 untuk 12 segmen)
    // agar animasi putaran roda di Admin dan Monitor Publik berhenti di titik yang seragam
    const targetSegmentIndex = randomInt(0, 12);
    const drawnAt = new Date().toISOString();
    const winnerRecordId = `win-${Date.now()}-${randomInt(100, 999)}`;

    const winnerRecord: DoorprizeWinnerRecord = {
      id: winnerRecordId,
      doorprizeName: prizeName,
      prizeId: payload.prizeId || null,
      rewardId: payload.rewardId || null,
      participantId: winner.id,
      participantName: winner.fullName,
      participantRegNum: winner.registrationNumber,
      participantInstitution: winner.institution,
      participantPhone: winner.phone || undefined,
      drawnAt,
      drawnBy: auth.userId,
      status: "sah",
    };

    // 4. Simpan ke database (tabel doorprize_winners)
    let savedToTable = false;
    try {
      const { error: insErr } = await admin.from("doorprize_winners").insert({
        doorprize_name: prizeName,
        doorprize_id: payload.prizeId && !payload.prizeId.startsWith("prize-") ? payload.prizeId : null,
        reward_id: payload.rewardId || null,
        participant_id: winner.id,
        participant_name: winner.fullName,
        participant_reg_num: winner.registrationNumber,
        participant_institution: winner.institution,
        drawn_at: drawnAt,
        drawn_by: auth.userId || null,
        status: "sah",
      });
      if (!insErr) savedToTable = true;
    } catch {
      savedToTable = false;
    }

    // Selalu simpan cadangan ke event_settings agar riwayat tidak hilang
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_winners_history")
      .maybeSingle();

    const historyList: DoorprizeWinnerRecord[] = Array.isArray(settingRow?.value)
      ? (settingRow.value as unknown as DoorprizeWinnerRecord[])
      : [];

    historyList.unshift(winnerRecord);

    await admin.from("event_settings").upsert({
      key: "doorprize_winners_history",
      value: historyList as any,
      description: "Daftar riwayat pemenang undian doorprize festival",
      updated_at: drawnAt,
    });

    // 5. Kurangi sisa kuota hadiah jika terdaftar di doorprizes
    if (payload.prizeId && !payload.prizeId.startsWith("prize-")) {
      try {
        const { data: pData } = await admin
          .from("doorprizes")
          .select("remaining_quantity")
          .eq("id", payload.prizeId)
          .maybeSingle();

        if (pData) {
          const newQty = Math.max(0, (Number(pData.remaining_quantity) || 1) - 1);
          await admin
            .from("doorprizes")
            .update({ remaining_quantity: newQty, updated_at: drawnAt })
            .eq("id", payload.prizeId);
        }
      } catch (qtyErr) {
        console.warn("Gagal mengurangi kuota hadiah doorprize:", qtyErr);
      }
    }

    // 6. Broadcast event ke Realtime Channel untuk sinkronisasi layar monitor publik
    await broadcastDoorprize("doorprize_spin_started", {
      winner: {
        id: winner.id,
        name: winner.fullName,
        fullName: winner.fullName,
        registrationNumber: winner.registrationNumber,
        institution: winner.institution,
        phone: winner.phone || null,
        totalPoints: winner.totalPoints,
      },
      prizeName,
      targetSegmentIndex,
      poolCount,
      drawnAt,
      spinDurationMs: 5500,
      animationStyle: payload.animationStyle || "matrix",
    });

    revalidatePath("/dashboard/doorprize");
    revalidatePath("/monitor/doorprize");
    revalidatePath("/monitor");

    return {
      success: true,
      winner,
      targetSegmentIndex,
      poolCount,
      drawnAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat mengundi pemenang.";
    return { success: false, error: message };
  }
}

/**
 * 6. Batalkan Pemenang (Misalnya peserta tidak hadir saat dipanggil)
 */
export async function cancelDoorprizeWinner(
  winnerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();

    // Update di tabel
    try {
      await admin
        .from("doorprize_winners")
        .update({
          status: "dibatalkan",
          notes: reason || "Dibatalkan oleh panitia (peserta tidak hadir / gugur)",
        })
        .eq("id", winnerId);
    } catch {
      // ignore
    }

    // Update di event_settings
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_winners_history")
      .maybeSingle();

    if (Array.isArray(settingRow?.value)) {
      const list = settingRow.value as unknown as DoorprizeWinnerRecord[];
      const updated = list.map((w: DoorprizeWinnerRecord) =>
        w.id === winnerId
          ? {
              ...w,
              status: "dibatalkan" as const,
              notes: reason || "Dibatalkan oleh panitia (peserta tidak hadir / gugur)",
            }
          : w
      );

      await admin.from("event_settings").upsert({
        key: "doorprize_winners_history",
        value: updated as any,
        description: "Daftar riwayat pemenang undian doorprize festival",
        updated_at: new Date().toISOString(),
      });
    }

    await broadcastDoorprize("doorprize_winner_cancelled", { winnerId });

    revalidatePath("/dashboard/doorprize");
    revalidatePath("/monitor/doorprize");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membatalkan pemenang.";
    return { success: false, error: message };
  }
}

/**
 * 7. Bersihkan / Reset Riwayat Pemenang Doorprize (Simulasi / Uji Coba Selesai)
 *
 * Mengosongkan seluruh riwayat pemenang (tabel doorprize_winners & event_settings),
 * mengembalikan sisa stok kuota seluruh hadiah ke jumlah awal, dan membersihkan status
 * ronde aktif buzzer.
 */
export async function resetDoorprizeHistory(): Promise<{ success: boolean; error?: string }> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Hapus seluruh data di tabel doorprize_winners
    try {
      const { data: rows } = await admin.from("doorprize_winners").select("id");
      if (rows && rows.length > 0) {
        const ids = rows.map((r: any) => r.id).filter(Boolean);
        if (ids.length > 0) {
          await admin.from("doorprize_winners").delete().in("id", ids);
        }
      }
      // Backup pembersihan universal
      await admin.from("doorprize_winners").delete().not("id", "is", null);
    } catch (delErr) {
      console.warn("Catatan delete tabel doorprize_winners:", delErr);
    }

    // 2. Kosongkan riwayat cadangan di event_settings
    await admin.from("event_settings").upsert({
      key: "doorprize_winners_history",
      value: [],
      description: "Daftar riwayat pemenang undian doorprize festival",
      updated_at: nowIso,
    });

    // 3. Reset status ronde aktif Buzzer F1
    await admin.from("event_settings").upsert({
      key: "doorprize_active_buzzer_round",
      value: {
        roundId: "",
        prizeName: "",
        status: "idle",
        greenDelayMs: 2800,
        startedAt: nowIso,
        leaderboard: [],
        falseStartsCount: 0,
      },
      description: "State ronde aktif permainan buzzer kilat panggung",
      updated_at: nowIso,
    });

    // 4. Pulihkan sisa kuota seluruh hadiah doorprize (remaining_quantity = total_quantity)
    try {
      const { data: dbPrizes } = await admin.from("doorprizes").select("id, total_quantity");
      if (dbPrizes && dbPrizes.length > 0) {
        for (const p of dbPrizes) {
          const totalQty = Math.max(1, Number(p.total_quantity) || 1);
          await admin
            .from("doorprizes")
            .update({
              remaining_quantity: totalQty,
              updated_at: nowIso,
            })
            .eq("id", p.id);
        }
      }
    } catch (qtyResetErr) {
      console.warn("Gagal reset kuota tabel doorprizes:", qtyResetErr);
    }

    try {
      const { data: pSetting } = await admin
        .from("event_settings")
        .select("value")
        .eq("key", "doorprize_prizes_list")
        .maybeSingle();

      if (Array.isArray(pSetting?.value)) {
        const restored = (pSetting.value as any[]).map((p) => ({
          ...p,
          remainingQuantity: Math.max(1, Number(p.totalQuantity) || 1),
        }));
        await admin.from("event_settings").upsert({
          key: "doorprize_prizes_list",
          value: restored,
          updated_at: nowIso,
        });
      }
    } catch (pSettingErr) {
      console.warn("Gagal reset kuota setting doorprize_prizes_list:", pSettingErr);
    }

    // 5. Broadcast reset ke seluruh layar panggung & monitor publik
    await broadcastDoorprize("doorprize_history_reset", {});

    revalidatePath("/dashboard/doorprize");
    revalidatePath("/monitor/doorprize");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membersihkan riwayat doorprize.";
    return { success: false, error: message };
  }
}

export interface BuzzerLeaderboardEntry {
  participantId?: string;
  fullName: string;
  institution: string;
  registrationNumber: string;
  phone?: string | null;
  reactionTimeMs: number; // e.g. 242
  rank: number;
  submittedAt: string;
}

export interface BuzzerRoundState {
  roundId: string;
  prizeId?: string | null;
  prizeName: string;
  status: "idle" | "countdown" | "green" | "finished";
  greenDelayMs: number; // Jeda acak (2000 - 4500 ms) sebelum lampu hijau
  startedAt: string;
  greenAt?: string | null;
  leaderboard: BuzzerLeaderboardEntry[];
  falseStartsCount: number;
}

/**
 * 8. Memulai Ronde Buzzer Kilat F1 Reflex di Panggung
 */
export async function startBuzzerRound(payload: {
  prizeName: string;
  prizeId?: string | null;
}): Promise<{ success: boolean; round?: BuzzerRoundState; error?: string }> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();
    const roundId = `f1-${Date.now()}`;
    const greenDelayMs = randomInt(2000, 4200); // 2.0 s/d 4.2 detik jeda acak
    const startedAt = new Date().toISOString();

    const roundState: BuzzerRoundState = {
      roundId,
      prizeId: payload.prizeId || null,
      prizeName: payload.prizeName.trim() || "Doorprize Utama",
      status: "countdown",
      greenDelayMs,
      startedAt,
      greenAt: null,
      leaderboard: [],
      falseStartsCount: 0,
    };

    await admin.from("event_settings").upsert({
      key: "doorprize_active_buzzer_round",
      value: roundState as any,
      description: "State ronde aktif permainan buzzer kilat panggung",
      updated_at: startedAt,
    });

    // Broadcast ke seluruh layar peserta & layar panggung
    await broadcastDoorprize("buzzer_round_starting", {
      roundId,
      prizeName: roundState.prizeName,
      greenDelayMs,
      startedAt,
    });

    return { success: true, round: roundState };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memulai ronde buzzer.";
    return { success: false, error: message };
  }
}

/**
 * 9. Peserta Mengirimkan Waktu Refleks (Milidetik) atau Laporan False Start
 */
export async function submitBuzzerReaction(payload: {
  roundId: string;
  fullName: string;
  institution?: string;
  registrationNumber?: string;
  phone?: string | null;
  reactionTimeMs: number;
  isFalseStart: boolean;
}): Promise<{ success: boolean; rank?: number; isFalseStart?: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_active_buzzer_round")
      .maybeSingle();

    if (!settingRow?.value) {
      return { success: false, error: "Tidak ada ronde buzzer yang sedang berlangsung." };
    }

    const currentRound = settingRow.value as unknown as BuzzerRoundState;
    if (currentRound.roundId !== payload.roundId) {
      return { success: false, error: "Ronde buzzer sudah berganti atau berakhir." };
    }

    // Jika False Start (menekan sebelum hijau)
    if (payload.isFalseStart) {
      currentRound.falseStartsCount = (currentRound.falseStartsCount || 0) + 1;
      await admin.from("event_settings").upsert({
        key: "doorprize_active_buzzer_round",
        value: currentRound as any,
        updated_at: new Date().toISOString(),
      });

      await broadcastDoorprize("buzzer_false_start_recorded", {
        fullName: payload.fullName,
        roundId: payload.roundId,
      });

      return { success: true, isFalseStart: true };
    }

    // Cek duplikasi entri
    const cleanReg = (payload.registrationNumber || payload.fullName).trim().toUpperCase();
    const existing = currentRound.leaderboard.find(
      (e) => (e.registrationNumber || e.fullName).trim().toUpperCase() === cleanReg
    );
    if (existing) {
      return { success: true, rank: existing.rank };
    }

    const newEntry: BuzzerLeaderboardEntry = {
      fullName: payload.fullName.trim(),
      institution: (payload.institution || "UMUM").trim(),
      registrationNumber: payload.registrationNumber?.trim() || "PESERTA",
      phone: payload.phone || null,
      reactionTimeMs: Math.max(80, Math.round(payload.reactionTimeMs)), // minimum manusiawi ~80ms
      rank: currentRound.leaderboard.length + 1,
      submittedAt: new Date().toISOString(),
    };

    currentRound.leaderboard.push(newEntry);
    // Urutkan tercepat (milidetik terkecil)
    currentRound.leaderboard.sort((a, b) => a.reactionTimeMs - b.reactionTimeMs);
    currentRound.leaderboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Simpan top 10 ke event_settings
    const topLeaderboard = currentRound.leaderboard.slice(0, 10);
    currentRound.leaderboard = topLeaderboard;

    await admin.from("event_settings").upsert({
      key: "doorprize_active_buzzer_round",
      value: currentRound as any,
      updated_at: new Date().toISOString(),
    });

    const userRank = topLeaderboard.find((e) => e.fullName === newEntry.fullName)?.rank || 99;

    // Broadcast pembaruan papan leaderboard panggung
    await broadcastDoorprize("buzzer_leaderboard_updated", {
      roundId: payload.roundId,
      leaderboard: topLeaderboard,
      latestWinner: newEntry,
    });

    return { success: true, rank: userRank };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mencatat refleks buzzer.";
    return { success: false, error: message };
  }
}

/**
 * 10. Kunci & Tetapkan Pemenang Ronde Buzzer ke Database Riwayat Doorprize
 */
export async function finishBuzzerRound(payload: {
  roundId: string;
}): Promise<{ success: boolean; winners?: BuzzerLeaderboardEntry[]; error?: string }> {
  const auth = await checkStaffAuth();
  if (!auth.authorized) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();

    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_active_buzzer_round")
      .maybeSingle();

    if (!settingRow?.value) {
      return { success: false, error: "Data ronde tidak ditemukan." };
    }

    const round = settingRow.value as unknown as BuzzerRoundState;
    round.status = "finished";

    await admin.from("event_settings").upsert({
      key: "doorprize_active_buzzer_round",
      value: round as any,
      updated_at: new Date().toISOString(),
    });

    // Ambil Juara 1 (Pemenang Utama)
    const topWinner = round.leaderboard[0];
    if (topWinner) {
      const drawnAt = new Date().toISOString();
      const winnerRecordId = `f1win-${Date.now()}`;

      // Simpan pemenang ke tabel doorprize_winners
      try {
        await admin.from("doorprize_winners").insert({
          id: winnerRecordId,
          doorprize_name: `${round.prizeName} (Juara 1 Buzzer F1: ${topWinner.reactionTimeMs}ms)`,
          doorprize_id: round.prizeId?.startsWith("prize-") ? null : round.prizeId || null,
          participant_id: topWinner.participantId || "00000000-0000-0000-0000-000000000000",
          participant_name: topWinner.fullName,
          participant_reg_num: topWinner.registrationNumber,
          participant_institution: topWinner.institution,
          participant_phone: topWinner.phone || null,
          drawn_at: drawnAt,
          drawn_by: auth.userId || null,
          status: "sah",
          notes: `Menang refleks tercepat buzzer panggung dengan waktu ${topWinner.reactionTimeMs} ms`,
        });
      } catch (dbErr) {
        console.warn("Gagal simpan pemenang buzzer ke tabel:", dbErr);
      }

      // Potong kuota hadiah
      if (round.prizeId && !round.prizeId.startsWith("prize-")) {
        try {
          const { data: pData } = await admin
            .from("doorprizes")
            .select("remaining_quantity")
            .eq("id", round.prizeId)
            .maybeSingle();

          if (pData) {
            const newQty = Math.max(0, (Number(pData.remaining_quantity) || 1) - 1);
            await admin
              .from("doorprizes")
              .update({ remaining_quantity: newQty, updated_at: drawnAt })
              .eq("id", round.prizeId);
          }
        } catch {}
      }
    }

    // Broadcast penutupan ronde ke panggung & penonton
    await broadcastDoorprize("buzzer_round_podium_locked", {
      roundId: payload.roundId,
      prizeName: round.prizeName,
      podium: round.leaderboard.slice(0, 3),
      allResults: round.leaderboard,
    });

    revalidatePath("/dashboard/doorprize");
    revalidatePath("/monitor/doorprize");
    return { success: true, winners: round.leaderboard.slice(0, 3) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengunci hasil ronde buzzer.";
    return { success: false, error: message };
  }
}

/**
 * 11. Ambil Status Ronde Buzzer Terkini
 */
export async function getBuzzerRoundState(): Promise<{
  success: boolean;
  round?: BuzzerRoundState | null;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_active_buzzer_round")
      .maybeSingle();

    if (!settingRow?.value) {
      return { success: true, round: null };
    }

    return { success: true, round: settingRow.value as unknown as BuzzerRoundState };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat status ronde buzzer.";
    return { success: false, error: message };
  }
}

/**
 * 12. Ganti Mode Layar Panggung Doorprize (Sinematik VIP vs Buzzer Kilat)
 */
export async function switchDoorprizeMode(
  mode: "vip_carousel" | "buzzer"
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    await admin.from("event_settings").upsert({
      key: "doorprize_stage_mode",
      value: { mode },
      description: "Mode tampilan aktif layar panggung undian doorprize",
      updated_at: new Date().toISOString(),
    });

    await broadcastDoorprize("doorprize_switch_mode", { mode });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengganti mode doorprize.";
    return { success: false, error: message };
  }
}

/**
 * 13. Ambil Mode Layar Panggung Doorprize Terkini
 */
export async function getDoorprizeStageMode(): Promise<{
  success: boolean;
  mode: "vip_carousel" | "buzzer";
}> {
  try {
    const admin = createAdminClient();
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_stage_mode")
      .maybeSingle();

    if (settingRow?.value && typeof settingRow.value === "object" && "mode" in settingRow.value) {
      const mode = (settingRow.value as any).mode;
      if (mode === "buzzer" || mode === "vip_carousel") {
        return { success: true, mode };
      }
    }

    return { success: true, mode: "vip_carousel" };
  } catch {
    return { success: true, mode: "vip_carousel" };
  }
}

export type DoorprizeAnimationStyle = "vip_card" | "matrix";

/**
 * 14. Ganti Gaya Animasi Undian Doorprize (VIP Card vs Matrix)
 */
export async function saveDoorprizeAnimationStyle(
  style: DoorprizeAnimationStyle
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    await admin.from("event_settings").upsert({
      key: "doorprize_animation_style",
      value: { style },
      description: "Gaya animasi pra-pemenang undian doorprize (VIP Card vs Matrix)",
      updated_at: new Date().toISOString(),
    });

    await broadcastDoorprize("doorprize_animation_style_changed", { style });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan gaya animasi doorprize.";
    return { success: false, error: message };
  }
}

/**
 * 15. Ambil Gaya Animasi Undian Doorprize Terkini
 */
export async function getDoorprizeAnimationStyle(): Promise<{
  success: boolean;
  style: DoorprizeAnimationStyle;
}> {
  try {
    const admin = createAdminClient();
    const { data: settingRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "doorprize_animation_style")
      .maybeSingle();

    if (
      settingRow?.value &&
      typeof settingRow.value === "object" &&
      "style" in settingRow.value
    ) {
      const style = (settingRow.value as any).style;
      if (style === "vip_card" || style === "matrix") {
        return { success: true, style };
      }
    }

    return { success: true, style: "matrix" };
  } catch {
    return { success: true, style: "matrix" };
  }
}

