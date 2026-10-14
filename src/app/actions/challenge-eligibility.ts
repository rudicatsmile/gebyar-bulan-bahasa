"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { PARTICIPANTS } from "@/lib/dummy-data";

export interface ChallengeParticipationSettingResult {
  success: boolean;
  allowCompetitionParticipants: boolean;
  error?: string;
}

export interface ChallengeEligibilityResult {
  allowed: boolean;
  isCompetitionParticipant: boolean;
  competitionNames?: string[];
  reason?: string;
}

export interface ParticipantCompetitionStatusResult {
  isCompetitionParticipant: boolean;
  competitionNames: string[];
  allowCompetitionParticipants: boolean;
  isBlocked: boolean;
  reason?: string;
}

/**
 * Mengambil konfigurasi toggle pembatasan challenge untuk peserta lomba:
 * - true (ON): Peserta lomba boleh mengikuti challenge/misi.
 * - false (OFF): Peserta lomba dilarang mengikuti challenge/misi.
 */
export async function getChallengeParticipationSettings(): Promise<ChallengeParticipationSettingResult> {
  try {
    const supabase = createAdminClient();

    // 1. Cek key khusus 'allow_competition_participants_in_challenges'
    const { data: row } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "allow_competition_participants_in_challenges")
      .maybeSingle();

    if (row && row.value !== null && row.value !== undefined) {
      if (typeof row.value === "boolean") {
        return { success: true, allowCompetitionParticipants: row.value };
      }
      if (typeof row.value === "object" && "allowed" in (row.value as any)) {
        return {
          success: true,
          allowCompetitionParticipants: Boolean((row.value as any).allowed),
        };
      }
    }

    // 2. Fallback cek key 'registration'
    const { data: regRow } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "registration")
      .maybeSingle();

    if (
      regRow?.value &&
      typeof (regRow.value as any).allowCompetitionParticipantsInChallenges === "boolean"
    ) {
      return {
        success: true,
        allowCompetitionParticipants: (regRow.value as any).allowCompetitionParticipantsInChallenges,
      };
    }

    // Default ON (boleh/diizinkan) bila belum pernah diatur
    return { success: true, allowCompetitionParticipants: true };
  } catch (err: unknown) {
    console.error("Error getChallengeParticipationSettings:", err);
    // Graceful fallback ke default diizinkan
    return { success: true, allowCompetitionParticipants: true };
  }
}

/**
 * Menyimpan konfigurasi toggle pembatasan challenge untuk peserta lomba.
 */
export async function saveChallengeParticipationSettings(
  allow: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. Simpan ke key khusus
    const { error: errDedicated } = await supabase.from("event_settings").upsert(
      {
        key: "allow_competition_participants_in_challenges",
        value: Boolean(allow),
        description:
          "Menentukan apakah peserta yang terdaftar di cabang lomba boleh mengikuti challenge/misi",
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (errDedicated) {
      console.error("Gagal simpan allow_competition_participants_in_challenges:", errDedicated);
      return { success: false, error: errDedicated.message };
    }

    // 2. Sinkronkan juga ke key 'registration'
    try {
      const { data: regRow } = await supabase
        .from("event_settings")
        .select("value")
        .eq("key", "registration")
        .maybeSingle();

      const currentReg =
        regRow?.value && typeof regRow.value === "object" ? (regRow.value as any) : {};

      await supabase.from("event_settings").upsert(
        {
          key: "registration",
          value: {
            ...currentReg,
            allowCompetitionParticipantsInChallenges: Boolean(allow),
          },
          description: "Konfigurasi pendaftaran peserta lomba dan persyaratan berkas",
          updated_at: now,
        },
        { onConflict: "key" }
      );
    } catch (e) {
      console.warn("Notice: sync to registration key skipped:", e);
    }

    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/peserta/challenge");
      revalidatePath("/peserta/scan");
      revalidatePath("/peserta");
    } catch {
      // safe fallback
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Error saveChallengeParticipationSettings:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Gagal menyimpan pengaturan partisipasi challenge.",
    };
  }
}

/**
 * Memvalidasi apakah seorang peserta diizinkan mengikuti/menyelesaikan misi challenge
 * berdasarkan status keikutsertaannya dalam cabang lomba dan toggle pengaturan panitia.
 */
export async function checkParticipantChallengeEligibility(
  participantIdOrUserId?: string
): Promise<ChallengeEligibilityResult> {
  try {
    // 1. Dapatkan pengaturan toggle global
    const { allowCompetitionParticipants } = await getChallengeParticipationSettings();

    // 2. Jika toggle ON (diizinkan), peserta manapun boleh mengikuti challenge
    if (allowCompetitionParticipants) {
      return { allowed: true, isCompetitionParticipant: false };
    }

    // 3. Toggle OFF: Kita harus memeriksa apakah peserta ini sudah terdaftar di cabang lomba
    let targetId = (participantIdOrUserId || "").trim();
    const adminSupabase = createAdminClient();

    // Jika tidak ada ID yang diberikan, coba baca user aktif dari sesi
    if (!targetId) {
      try {
        const userClient = await createClient();
        const {
          data: { user },
        } = await userClient.auth.getUser();
        if (user?.id) {
          targetId = user.id;
        }
      } catch {
        // Abaikan jika tidak ada sesi
      }
    }

    if (!targetId) {
      // Tidak dapat mengidentifikasi peserta, izinkan secara default
      return { allowed: true, isCompetitionParticipant: false };
    }

    // Cari baris peserta asli di tabel participants
    let actualParticipantId: string | null = null;
    let participantEmail: string | null = null;

    // Coba by id
    const { data: pById } = await adminSupabase
      .from("participants")
      .select("id, email, full_name")
      .eq("id", targetId)
      .maybeSingle();

    if (pById) {
      actualParticipantId = pById.id;
      participantEmail = pById.email;
    } else {
      // Coba by user_id
      const { data: pByUser } = await adminSupabase
        .from("participants")
        .select("id, email, full_name")
        .eq("user_id", targetId)
        .maybeSingle();

      if (pByUser) {
        actualParticipantId = pByUser.id;
        participantEmail = pByUser.email;
      }
    }

    let competitionNames: string[] = [];

    // Jika ID peserta ditemukan di database, periksa ke tabel public.registrations
    if (actualParticipantId) {
      const { data: regRows, error: regErr } = await adminSupabase
        .from("registrations")
        .select(`
          id,
          competition_id,
          competitions (
            id,
            name,
            status
          )
        `)
        .eq("participant_id", actualParticipantId);

      if (!regErr && regRows && regRows.length > 0) {
        const validRegs = regRows.filter((r: any) => {
          const comp = Array.isArray(r.competitions) ? r.competitions[0] : r.competitions;
          return comp && comp.status !== "dibatalkan";
        });

        if (validRegs.length > 0) {
          competitionNames = validRegs
            .map((r: any) => {
              const comp = Array.isArray(r.competitions) ? r.competitions[0] : r.competitions;
              return comp?.name || "Cabang Lomba";
            })
            .filter(Boolean);
        }
      }
    }

    // Fallback: jika belum ada di database, periksa mock/demo PARTICIPANTS
    if (competitionNames.length === 0) {
      const mockP = PARTICIPANTS.find(
        (p) =>
          p.id === targetId ||
          p.id === actualParticipantId ||
          (participantEmail && p.email?.toLowerCase() === participantEmail.toLowerCase())
      );
      if (mockP && mockP.competitionName) {
        competitionNames = [mockP.competitionName];
      }
    }

    // Evaluasi hasil
    if (competitionNames.length > 0) {
      const namesJoined = competitionNames.join(", ");
      return {
        allowed: false,
        isCompetitionParticipant: true,
        competitionNames,
        reason: `Partisipasi challenge ditolak: Anda terdeteksi sudah terdaftar dalam cabang lomba (${namesJoined}). Berdasarkan regulasi panitia, peserta lomba tidak diperkenankan mengikuti misi tantangan/challenge.`,
      };
    }

    // Peserta belum/tidak mengikuti cabang lomba, maka diizinkan!
    return {
      allowed: true,
      isCompetitionParticipant: false,
      competitionNames: [],
    };
  } catch (err: unknown) {
    console.error("Error checkParticipantChallengeEligibility:", err);
    // Jika terjadi kendala koneksi, izinkan fallback agar tidak mengunci sistem
    return { allowed: true, isCompetitionParticipant: false };
  }
}

/**
 * Helper untuk halaman peserta guna mendapatkan status keikutsertaan lomba
 * sekaligus status apakah challenge diblokir untuknya.
 */
export async function getParticipantCompetitionStatus(
  participantIdOrUserId?: string
): Promise<ParticipantCompetitionStatusResult> {
  const { allowCompetitionParticipants } = await getChallengeParticipationSettings();
  const eligibility = await checkParticipantChallengeEligibility(participantIdOrUserId);

  return {
    isCompetitionParticipant: eligibility.isCompetitionParticipant,
    competitionNames: eligibility.competitionNames || [],
    allowCompetitionParticipants,
    isBlocked: !eligibility.allowed,
    reason: eligibility.reason,
  };
}
