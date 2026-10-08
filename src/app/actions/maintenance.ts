"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface MaintenanceCounts {
  registrations: number;
  registrationMembers: number;
  participantDocuments: number;
  assessments: number;
  assessmentScores: number;
  winners: number;
  challengeSubmissions: number;
  pointTransactions: number;
  rewardRedemptions: number;
  twibbons: number;
  activityLogs: number;
  notifications: number;
  participants: number;
  participantProfiles: number;
  storageDocumentsCount: number;
  storageTwibbonCount: number;
}

export interface ResetOptions {
  cleanCompetitions: boolean;
  cleanChallenges: boolean;
  cleanLogs: boolean;
  cleanStorage: boolean;
  cleanParticipantAccounts: boolean;
  resetCompetitionStatus: boolean;
}

/**
 * Fetch real-time count of transactional & test data across Supabase tables and buckets
 */
export async function getMaintenanceDataCounts(): Promise<{
  success: boolean;
  counts?: MaintenanceCounts;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const [
      regRes,
      memRes,
      docRes,
      assRes,
      scoreRes,
      winRes,
      chalRes,
      pointRes,
      rewRes,
      twiRes,
      actRes,
      notifRes,
      partRes,
      profRes,
    ] = await Promise.all([
      admin.from("registrations").select("*", { count: "exact", head: true }),
      admin.from("registration_members").select("*", { count: "exact", head: true }),
      admin.from("participant_documents").select("*", { count: "exact", head: true }),
      admin.from("assessments").select("*", { count: "exact", head: true }),
      admin.from("assessment_scores").select("*", { count: "exact", head: true }),
      admin.from("winners").select("*", { count: "exact", head: true }),
      admin.from("challenge_submissions").select("*", { count: "exact", head: true }),
      admin.from("point_transactions").select("*", { count: "exact", head: true }),
      admin.from("reward_redemptions").select("*", { count: "exact", head: true }),
      admin.from("twibbons").select("*", { count: "exact", head: true }),
      admin.from("activity_logs").select("*", { count: "exact", head: true }),
      admin.from("notifications").select("*", { count: "exact", head: true }),
      admin.from("participants").select("*", { count: "exact", head: true }),
      admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "peserta"),
    ]);

    // Check storage bucket file counts
    let storageDocumentsCount = 0;
    let storageTwibbonCount = 0;

    try {
      const { data: docFiles } = await admin.storage.from("dokumen-peserta").list("", { limit: 1000 });
      storageDocumentsCount = (docFiles || []).filter((f) => f.name && !f.name.startsWith(".")).length;
    } catch {
      // Bucket might be empty or permissions
    }

    try {
      const { data: twiFiles } = await admin.storage.from("twibbon").list("", { limit: 1000 });
      storageTwibbonCount = (twiFiles || []).filter((f) => f.name && !f.name.startsWith(".")).length;
    } catch {
      // Bucket might be empty
    }

    const counts: MaintenanceCounts = {
      registrations: regRes.count ?? 0,
      registrationMembers: memRes.count ?? 0,
      participantDocuments: docRes.count ?? 0,
      assessments: assRes.count ?? 0,
      assessmentScores: scoreRes.count ?? 0,
      winners: winRes.count ?? 0,
      challengeSubmissions: chalRes.count ?? 0,
      pointTransactions: pointRes.count ?? 0,
      rewardRedemptions: rewRes.count ?? 0,
      twibbons: twiRes.count ?? 0,
      activityLogs: actRes.count ?? 0,
      notifications: notifRes.count ?? 0,
      participants: partRes.count ?? 0,
      participantProfiles: profRes.count ?? 0,
      storageDocumentsCount,
      storageTwibbonCount,
    };

    return { success: true, counts };
  } catch (err: unknown) {
    console.error("getMaintenanceDataCounts error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membaca metrik data sistem.",
    };
  }
}

/**
 * Generate full JSON snapshot of all transactional data before reset
 */
export async function exportBackupSnapshotAction(): Promise<{
  success: boolean;
  snapshot?: any;
  filename?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const [
      registrations,
      registrationMembers,
      participantDocuments,
      assessments,
      assessmentScores,
      winners,
      challengeSubmissions,
      pointTransactions,
      rewardRedemptions,
      twibbons,
      participants,
      activityLogs,
      dutaBahasaProgress,
    ] = await Promise.all([
      admin.from("registrations").select("*"),
      admin.from("registration_members").select("*"),
      admin.from("participant_documents").select("*"),
      admin.from("assessments").select("*"),
      admin.from("assessment_scores").select("*"),
      admin.from("winners").select("*"),
      admin.from("challenge_submissions").select("*"),
      admin.from("point_transactions").select("*"),
      admin.from("reward_redemptions").select("*"),
      admin.from("twibbons").select("*"),
      admin.from("participants").select("*"),
      admin.from("activity_logs").select("*").limit(500),
      admin.from("event_settings").select("*").eq("key", "duta_bahasa_progress").maybeSingle(),
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-gebyar-bulan-bahasa-${timestamp}.json`;

    const snapshot = {
      meta: {
        exportedAt: new Date().toISOString(),
        event: "Gebyar Bulan Bahasa dan Kebudayaan",
        version: "1.0",
      },
      data: {
        registrations: registrations.data || [],
        registrationMembers: registrationMembers.data || [],
        participantDocuments: participantDocuments.data || [],
        assessments: assessments.data || [],
        assessmentScores: assessmentScores.data || [],
        winners: winners.data || [],
        challengeSubmissions: challengeSubmissions.data || [],
        pointTransactions: pointTransactions.data || [],
        rewardRedemptions: rewardRedemptions.data || [],
        twibbons: twibbons.data || [],
        participants: participants.data || [],
        activityLogs: activityLogs.data || [],
        dutaBahasaProgress: dutaBahasaProgress.data?.value || {},
      },
    };

    return { success: true, snapshot, filename };
  } catch (err: unknown) {
    console.error("exportBackupSnapshotAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengekspor snapshot data cadangan.",
    };
  }
}

/**
 * Execute data cleanup with safety verification phrase
 */
export async function executeDataResetAction(
  options: ResetOptions,
  confirmationPhrase: string
): Promise<{
  success: boolean;
  message?: string;
  deletedCounts?: Record<string, number>;
  error?: string;
}> {
  try {
    const requiredPhrase = "BERSIHKAN DATA HARI H";
    if (confirmationPhrase.trim().toUpperCase() !== requiredPhrase) {
      return {
        success: false,
        error: `Frasa konfirmasi tidak valid. Harap ketik "${requiredPhrase}" persis sama.`,
      };
    }

    const admin = createAdminClient();
    const deletedCounts: Record<string, number> = {};

    // 1. Pembersihan Data Lomba & Penilaian
    if (options.cleanCompetitions) {
      // a. Assessment scores (foreign key to assessments)
      const { error: errScores } = await admin.from("assessment_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errScores) console.warn("Score delete error:", errScores.message);

      // b. Assessments
      const { error: errAss } = await admin.from("assessments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errAss) console.warn("Assessment delete error:", errAss.message);

      // c. Participant documents
      const { error: errDocs } = await admin.from("participant_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errDocs) console.warn("Doc delete error:", errDocs.message);

      // d. Winners
      const { error: errWin } = await admin.from("winners").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errWin) console.warn("Winner delete error:", errWin.message);

      // e. Registration members
      const { error: errMem } = await admin.from("registration_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errMem) console.warn("Reg member delete error:", errMem.message);

      // f. Registrations
      const { error: errReg } = await admin.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (errReg) console.warn("Reg delete error:", errReg.message);

      deletedCounts["dataLomba"] = 1;
    }

    // 2. Pembersihan Gamifikasi & Challenge
    if (options.cleanChallenges) {
      // a. Challenge submissions
      await admin.from("challenge_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // b. Reward redemptions
      await admin.from("reward_redemptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // c. Point transactions
      await admin.from("point_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // d. Twibbons
      await admin.from("twibbons").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // e. Reset total points on remaining participants
      await admin.from("participants").update({ total_points: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");

      deletedCounts["dataGamifikasi"] = 1;
    }

    // 3. Pembersihan Log & Notifikasi
    if (options.cleanLogs) {
      await admin.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("activity_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      deletedCounts["logDanNotifikasi"] = 1;
    }

    // 4. Pembersihan File Supabase Storage
    if (options.cleanStorage) {
      try {
        const { data: docFiles } = await admin.storage.from("dokumen-peserta").list("", { limit: 1000 });
        if (docFiles && docFiles.length > 0) {
          const docPaths = docFiles.map((f) => f.name).filter(Boolean);
          if (docPaths.length > 0) {
            await admin.storage.from("dokumen-peserta").remove(docPaths);
          }
        }
      } catch (stErr) {
        console.warn("Storage clean dokumen-peserta warning:", stErr);
      }

      try {
        const { data: twiFiles } = await admin.storage.from("twibbon").list("", { limit: 1000 });
        if (twiFiles && twiFiles.length > 0) {
          const twiPaths = twiFiles.map((f) => f.name).filter(Boolean);
          if (twiPaths.length > 0) {
            await admin.storage.from("twibbon").remove(twiPaths);
          }
        }
      } catch (stErr) {
        console.warn("Storage clean twibbon warning:", stErr);
      }

      deletedCounts["storageFiles"] = 1;
    }

    // 5. Hapus Akun Peserta Testing (Hanya pertahankan Admin, Panitia, Juri)
    if (options.cleanParticipantAccounts) {
      // a. Hapus baris di tabel participants
      await admin.from("participants").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // b. Ambil user ID profil dengan role 'peserta'
      const { data: pesertaProfiles } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "peserta");

      if (pesertaProfiles && pesertaProfiles.length > 0) {
        const pIds = pesertaProfiles.map((p) => p.id);
        // Hapus profiles
        await admin.from("profiles").delete().in("id", pIds);

        // Hapus juga akun auth.users jika memungkinkan
        for (const pid of pIds) {
          try {
            await admin.auth.admin.deleteUser(pid);
          } catch {
            // Ignore error if user already deleted
          }
        }
      }
      deletedCounts["akunPeserta"] = pesertaProfiles?.length ?? 0;
    }

    // 6. Reset Status Lomba & Tahapan
    if (options.resetCompetitionStatus) {
      // a. Reset status seluruh lomba menjadi 'pendaftaran'
      await admin
        .from("competitions")
        .update({ status: "pendaftaran", updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // b. Reset progress duta bahasa
      await admin.from("event_settings").upsert(
        {
          key: "duta_bahasa_progress",
          value: {},
          description: "Progress peserta seleksi Duta Bahasa per tahap",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      // c. Reset competition transfer history
      await admin.from("event_settings").upsert(
        {
          key: "competition_transfer_history",
          value: [],
          description: "Riwayat pemindahan pendaftaran peserta antar cabang lomba",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      // d. Reset tahapan duta bahasa: Tahap 1 active, 2-5 upcoming
      const { data: dbSetting } = await admin
        .from("event_settings")
        .select("value")
        .eq("key", "duta_bahasa")
        .maybeSingle();

      const settingVal = dbSetting?.value as any;
      if (settingVal && Array.isArray(settingVal.stages)) {
        const resetStages = settingVal.stages.map((stage: any) => ({
          ...stage,
          status: stage.stageOrder === 1 ? "active" : "upcoming",
          participantCount: 0,
        }));
        await admin.from("event_settings").upsert(
          {
            key: "duta_bahasa",
            value: { ...settingVal, stages: resetStages },
            description: "Pengaturan tahapan seleksi Duta Bahasa",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }

      deletedCounts["statusLombaDanTahapan"] = 1;
    }

    // Log the reset event to activity_logs
    try {
      await admin.from("activity_logs").insert({
        actor_id: null,
        actor_role: "super_admin",
        action: "reset_data_acara",
        entity: "system_maintenance",
        entity_id: null,
        description: `Super Admin melakukan pembersihan dan reset data untuk persiapan Hari-H (Opsi: ${Object.entries(
          options
        )
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ")})`,
        metadata: {
          options: Object.fromEntries(Object.entries(options)),
          executedAt: new Date().toISOString(),
        } as any,
      });
    } catch {
      // Non-fatal
    }

    // Revalidate relevant cache paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/lomba/duta-bahasa");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/kriteria");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/dashboard/challenge/verifikasi");
    revalidatePath("/dashboard/twibbon");
    revalidatePath("/dashboard/pengaturan");
    revalidatePath("/dashboard/pengaturan/reset-data");
    revalidatePath("/peserta");
    revalidatePath("/peserta/pendaftaran");
    revalidatePath("/juri");
    revalidatePath("/monitor");

    return {
      success: true,
      message: "Data berhasil dibersihkan! Sistem kini dalam kondisi bersih dan siap dimulai untuk hari-H perlombaan.",
      deletedCounts,
    };
  } catch (err: unknown) {
    console.error("executeDataResetAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat mengeksekusi pembersihan data.",
    };
  }
}
