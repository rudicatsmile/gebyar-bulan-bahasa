"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface BackupMeta {
  id: string;
  createdAt: string;
  createdByName: string;
  createdByEmail: string;
  appName: string;
  version: string;
  notes?: string;
  totalTables: number;
  totalRecords: number;
  tableSummary: Record<string, number>;
}

export interface BackupPayload {
  format: "GEBYAR_BULAN_BAHASA_BACKUP";
  version: "1.0";
  meta: BackupMeta;
  data: Record<string, any[]>;
}

export interface BackupHistoryEntry {
  id: string;
  filename: string;
  createdAt: string;
  createdByName: string;
  createdByEmail: string;
  status: "sukses" | "gagal";
  sizeBytes: number;
  totalRecords: number;
  tablesCount: number;
  notes?: string;
}

export interface RestoreHistoryEntry {
  id: string;
  filename: string;
  restoredAt: string;
  restoredByName: string;
  restoredByEmail: string;
  mode: "clean" | "merge";
  status: "sukses" | "gagal";
  totalRecordsRestored: number;
  details?: Record<string, number>;
  error?: string;
}

export interface BackupSystemMetrics {
  counts: Record<string, number>;
  totalRecords: number;
  lastBackupAt?: string;
  lastRestoreAt?: string;
}

const BACKUP_HISTORY_KEY = "backup_history";
const RESTORE_HISTORY_KEY = "restore_history";
const REQUIRED_RESTORE_CONFIRMATION = "RESTORE DATA ACARA";

/**
 * Daftar tabel operasional yang dicakup dalam Backup & Restore
 */
const CRITICAL_TABLES = [
  "event_settings",
  "institutions",
  "schedules",
  "announcements",
  "media_contents",
  "competitions",
  "competition_criteria",
  "competition_judges",
  "profiles",
  "participants",
  "registrations",
  "registration_members",
  "participant_documents",
  "assessments",
  "assessment_scores",
  "winners",
  "stands",
  "challenges",
  "challenge_submissions",
  "point_transactions",
  "rewards",
  "reward_redemptions",
  "puzzle_items",
  "puzzle_attempts",
  "qr_letter_challenges",
  "qr_letter_codes",
  "qr_letter_scans",
  "qr_letter_submissions",
  "jigsaw_puzzles",
  "jigsaw_attempts",
  "twibbon_templates",
  "twibbons",
  "activity_logs",
] as const;

/**
 * Verifikasi otorisasi pengguna (hanya super_admin yang diizinkan)
 */
async function checkAdminAuth() {
  const admin = createAdminClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    return {
      authorized: false,
      error: "Akses ditolak. Fitur Backup & Restore hanya dapat diakses oleh Super Admin.",
    };
  }

  return { authorized: true, user, profile };
}

/**
 * Ambil metrik ringkasan jumlah baris data sistem saat ini
 */
export async function getBackupSystemMetricsAction(): Promise<{
  success: boolean;
  metrics?: BackupSystemMetrics;
  error?: string;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const admin = createAdminClient();
    const counts: Record<string, number> = {};
    let totalRecords = 0;

    await Promise.all(
      CRITICAL_TABLES.map(async (table) => {
        try {
          const { count } = await (admin as any).from(table).select("*", { count: "exact", head: true });
          counts[table] = count ?? 0;
          totalRecords += count ?? 0;
        } catch {
          counts[table] = 0;
        }
      })
    );

    // Ambil histori terakhir
    const { data: histData } = await admin
      .from("event_settings")
      .select("key, value")
      .in("key", [BACKUP_HISTORY_KEY, RESTORE_HISTORY_KEY]);

    let lastBackupAt: string | undefined;
    let lastRestoreAt: string | undefined;

    for (const h of histData || []) {
      const valList = Array.isArray(h.value) ? (h.value as any[]) : [];
      if (h.key === BACKUP_HISTORY_KEY && valList.length > 0) {
        lastBackupAt = valList[0]?.createdAt;
      }
      if (h.key === RESTORE_HISTORY_KEY && valList.length > 0) {
        lastRestoreAt = valList[0]?.restoredAt;
      }
    }

    return {
      success: true,
      metrics: {
        counts,
        totalRecords,
        lastBackupAt,
        lastRestoreAt,
      },
    };
  } catch (err: unknown) {
    console.error("getBackupSystemMetricsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membaca metrik data sistem.",
    };
  }
}

/**
 * Buat file snapshot backup data aplikasi
 */
export async function createBackupAction(options?: { notes?: string }): Promise<{
  success: boolean;
  backupPayload?: BackupPayload;
  filename?: string;
  error?: string;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.profile) {
      return { success: false, error: auth.error };
    }

    const admin = createAdminClient();
    const backupData: Record<string, any[]> = {};
    const tableSummary: Record<string, number> = {};
    let totalRecords = 0;

    // Ambil data seluruh tabel secara paralel
    await Promise.all(
      CRITICAL_TABLES.map(async (tableName) => {
        try {
          let query = (admin as any).from(tableName).select("*");
          if (tableName === "activity_logs") {
            query = query.limit(2000); // Batasi log aktivitas agar tidak membengkak
          }
          const { data, error } = await query;
          if (error) {
            console.warn(`Peringatan backup tabel ${tableName}:`, error.message);
            backupData[tableName] = [];
            tableSummary[tableName] = 0;
          } else {
            // Khusus event_settings: filter riwayat backup/restore agar tidak redundant
            if (tableName === "event_settings" && Array.isArray(data)) {
              backupData[tableName] = (data as any[]).filter(
                (item) => item.key !== BACKUP_HISTORY_KEY && item.key !== RESTORE_HISTORY_KEY
              );
            } else {
              backupData[tableName] = (data as any[]) || [];
            }
            tableSummary[tableName] = backupData[tableName].length;
            totalRecords += backupData[tableName].length;
          }
        } catch (tableErr) {
          console.error(`Gagal query ${tableName}:`, tableErr);
          backupData[tableName] = [];
          tableSummary[tableName] = 0;
        }
      })
    );

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    const filename = `backup-gbb-${timestamp}.json`;
    const backupId = `bkp-${Date.now()}`;

    const meta: BackupMeta = {
      id: backupId,
      createdAt: now.toISOString(),
      createdByName: auth.profile.full_name || "Administrator",
      createdByEmail: auth.profile.email || "admin",
      appName: "Gebyar Bulan Bahasa dan Kebudayaan",
      version: "1.0",
      notes: options?.notes?.trim() || undefined,
      totalTables: Object.keys(backupData).length,
      totalRecords,
      tableSummary,
    };

    const payload: BackupPayload = {
      format: "GEBYAR_BULAN_BAHASA_BACKUP",
      version: "1.0",
      meta,
      data: backupData,
    };

    // Catat riwayat backup ke event_settings
    const jsonString = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(jsonString, "utf8");

    const newHistoryEntry: BackupHistoryEntry = {
      id: backupId,
      filename,
      createdAt: meta.createdAt,
      createdByName: meta.createdByName,
      createdByEmail: meta.createdByEmail,
      status: "sukses",
      sizeBytes,
      totalRecords,
      tablesCount: meta.totalTables,
      notes: meta.notes,
    };

    const { data: histSetting } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", BACKUP_HISTORY_KEY)
      .maybeSingle();

    const existingHistory: BackupHistoryEntry[] = Array.isArray(histSetting?.value)
      ? (histSetting.value as unknown as BackupHistoryEntry[])
      : [];
    const updatedHistory = [newHistoryEntry, ...existingHistory].slice(0, 50); // Simpan 50 riwayat terakhir

    await admin.from("event_settings").upsert(
      {
        key: BACKUP_HISTORY_KEY,
        value: updatedHistory as any,
        description: "Catatan riwayat pembuatan backup data sistem",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return {
      success: true,
      backupPayload: payload,
      filename,
    };
  } catch (err: unknown) {
    console.error("createBackupAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal saat membuat backup data.",
    };
  }
}

/**
 * Ambil daftar riwayat backup
 */
export async function getBackupHistoryAction(): Promise<{
  success: boolean;
  history?: BackupHistoryEntry[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", BACKUP_HISTORY_KEY)
      .maybeSingle();

    if (error) throw error;
    const history: BackupHistoryEntry[] = Array.isArray(data?.value)
      ? (data.value as unknown as BackupHistoryEntry[])
      : [];
    return { success: true, history };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat riwayat backup.",
    };
  }
}

/**
 * Hapus riwayat backup
 */
export async function clearBackupHistoryAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const admin = createAdminClient();
    await admin.from("event_settings").upsert(
      {
        key: BACKUP_HISTORY_KEY,
        value: [],
        description: "Catatan riwayat pembuatan backup data sistem",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    revalidatePath("/dashboard/pengaturan/backup-restore");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membersihkan riwayat backup.",
    };
  }
}

/**
 * Validasi dan baca isi file backup sebelum restore dieksekusi
 */
export async function validateBackupFileAction(fileContent: string): Promise<{
  success: boolean;
  validation?: {
    isValid: boolean;
    meta: BackupMeta;
    tableCounts: Record<string, number>;
    totalRecords: number;
    detectedTables: string[];
    missingTables: string[];
  };
  error?: string;
}> {
  try {
    if (!fileContent || typeof fileContent !== "string") {
      return { success: false, error: "Konten file backup kosong atau tidak terbaca." };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      return {
        success: false,
        error: "File yang diunggah bukan format JSON yang valid.",
      };
    }

    if (parsed.format !== "GEBYAR_BULAN_BAHASA_BACKUP") {
      return {
        success: false,
        error: "Format file tidak dikenali. Pastikan file backup berasal dari ekspor sistem Gebyar Bulan Bahasa.",
      };
    }

    if (!parsed.meta || !parsed.data || typeof parsed.data !== "object") {
      return {
        success: false,
        error: "Struktur file backup tidak lengkap (metadata atau data tidak ditemukan).",
      };
    }

    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;
    const detectedTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of CRITICAL_TABLES) {
      if (Array.isArray(parsed.data[table])) {
        const count = parsed.data[table].length;
        tableCounts[table] = count;
        totalRecords += count;
        detectedTables.push(table);
      } else {
        tableCounts[table] = 0;
        missingTables.push(table);
      }
    }

    return {
      success: true,
      validation: {
        isValid: true,
        meta: parsed.meta,
        tableCounts,
        totalRecords,
        detectedTables,
        missingTables,
      },
    };
  } catch (err: unknown) {
    console.error("validateBackupFileAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memvalidasi file backup.",
    };
  }
}

/**
 * Helper untuk upsert data dalam batch chunk agar aman dari payload limit PostgREST
 */
async function chunkedUpsert(
  supabase: any,
  table: string,
  rows: any[],
  onConflict?: string
): Promise<number> {
  if (!rows || rows.length === 0) return 0;
  const chunkSize = 50;
  let successCount = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const query = onConflict
      ? supabase.from(table).upsert(chunk, { onConflict })
      : supabase.from(table).upsert(chunk);

    const { error } = await query;
    if (error) {
      console.warn(`Peringatan upsert tabel ${table} baris ${i}-${i + chunk.length}:`, error.message);
      // Coba fallback baris per baris jika batch gagal (misal jika ada baris tertentu melanggar constraint)
      for (const singleRow of chunk) {
        try {
          const singleQuery = onConflict
            ? supabase.from(table).upsert(singleRow, { onConflict })
            : supabase.from(table).upsert(singleRow);
          const { error: sErr } = await singleQuery;
          if (!sErr) successCount++;
        } catch {
          // ignore individual conflict
        }
      }
    } else {
      successCount += chunk.length;
    }
  }

  return successCount;
}

/**
 * Eksekusi restore data dari file backup
 */
export async function executeRestoreAction(
  fileContent: string,
  mode: "clean" | "merge",
  confirmationText: string
): Promise<{
  success: boolean;
  totalRestored?: number;
  details?: Record<string, number>;
  message?: string;
  error?: string;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.profile) {
      return { success: false, error: auth.error };
    }

    if (confirmationText.trim().toUpperCase() !== REQUIRED_RESTORE_CONFIRMATION) {
      return {
        success: false,
        error: `Frasa konfirmasi tidak valid. Harap ketik "${REQUIRED_RESTORE_CONFIRMATION}" secara tepat.`,
      };
    }

    const valRes = await validateBackupFileAction(fileContent);
    if (!valRes.success || !valRes.validation) {
      return { success: false, error: valRes.error || "Validasi file backup gagal." };
    }

    const parsed: BackupPayload = JSON.parse(fileContent);
    const admin = createAdminClient();
    const restoredCounts: Record<string, number> = {};
    let totalRestored = 0;

    // JIKA MODE CLEAN: Hapus data tabel operasional dalam urutan reverse foreign key
    if (mode === "clean") {
      console.log("Memulai pembersihan data lama (clean restore)...");
      const cleanOrder = [
        "assessment_scores",
        "assessments",
        "winners",
        "registration_members",
        "registrations",
        "participant_documents",
        "qr_letter_submissions",
        "qr_letter_scans",
        "qr_letter_codes",
        "qr_letter_challenges",
        "puzzle_attempts",
        "jigsaw_attempts",
        "challenge_submissions",
        "reward_redemptions",
        "point_transactions",
        "twibbons",
        "participants",
        "competition_judges",
        "competition_criteria",
        "competitions",
        "stands",
        "challenges",
        "puzzle_items",
        "jigsaw_puzzles",
        "rewards",
        "schedules",
        "announcements",
        "twibbon_templates",
        "institutions",
        "media_contents",
      ];

      for (const table of cleanOrder) {
        try {
          await (admin as any).from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        } catch (delErr) {
          console.warn(`Peringatan clean tabel ${table}:`, delErr);
        }
      }
    }

    // PROSES RESTORE: Masukkan data dalam urutan dependency foreign key
    console.log("Memulai pemulihan data dari file backup...");

    // 1. Event Settings (upsert by key)
    if (Array.isArray(parsed.data["event_settings"]) && parsed.data["event_settings"].length > 0) {
      // Jangan timpa riwayat backup/restore yang sedang aktif
      const filteredSettings = parsed.data["event_settings"].filter(
        (s) => s.key !== BACKUP_HISTORY_KEY && s.key !== RESTORE_HISTORY_KEY
      );
      restoredCounts["event_settings"] = await chunkedUpsert(
        admin,
        "event_settings",
        filteredSettings,
        "key"
      );
      totalRestored += restoredCounts["event_settings"];
    }

    // 2. Institutions
    if (Array.isArray(parsed.data["institutions"]) && parsed.data["institutions"].length > 0) {
      restoredCounts["institutions"] = await chunkedUpsert(
        admin,
        "institutions",
        parsed.data["institutions"],
        "id"
      );
      totalRestored += restoredCounts["institutions"];
    }

    // 3. Competitions
    if (Array.isArray(parsed.data["competitions"]) && parsed.data["competitions"].length > 0) {
      restoredCounts["competitions"] = await chunkedUpsert(
        admin,
        "competitions",
        parsed.data["competitions"],
        "id"
      );
      totalRestored += restoredCounts["competitions"];
    }

    // 4. Competition Criteria
    if (Array.isArray(parsed.data["competition_criteria"]) && parsed.data["competition_criteria"].length > 0) {
      restoredCounts["competition_criteria"] = await chunkedUpsert(
        admin,
        "competition_criteria",
        parsed.data["competition_criteria"],
        "id"
      );
      totalRestored += restoredCounts["competition_criteria"];
    }

    // 5. Profiles (hanya perbarui profil yang auth user-nya sudah ada)
    if (Array.isArray(parsed.data["profiles"]) && parsed.data["profiles"].length > 0) {
      const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const existingAuthIds = new Set((userList?.users || []).map((u) => u.id));

      const validProfiles = parsed.data["profiles"].filter((p) => p.id && existingAuthIds.has(p.id));
      if (validProfiles.length > 0) {
        restoredCounts["profiles"] = await chunkedUpsert(admin, "profiles", validProfiles, "id");
        totalRestored += restoredCounts["profiles"];
      }
    }

    // 6. Competition Judges
    if (Array.isArray(parsed.data["competition_judges"]) && parsed.data["competition_judges"].length > 0) {
      restoredCounts["competition_judges"] = await chunkedUpsert(
        admin,
        "competition_judges",
        parsed.data["competition_judges"],
        "competition_id,judge_id"
      );
      totalRestored += restoredCounts["competition_judges"];
    }

    // 7. Participants
    if (Array.isArray(parsed.data["participants"]) && parsed.data["participants"].length > 0) {
      // Pastikan user_id yang tidak ada di auth/profiles dibuat null agar tidak gagal foreign key
      const { data: currentProfiles } = await admin.from("profiles").select("id");
      const existingProfileIds = new Set((currentProfiles || []).map((p) => p.id));

      const sanitizedParticipants = parsed.data["participants"].map((p) => ({
        ...p,
        user_id: p.user_id && existingProfileIds.has(p.user_id) ? p.user_id : null,
        verified_by: p.verified_by && existingProfileIds.has(p.verified_by) ? p.verified_by : null,
      }));

      restoredCounts["participants"] = await chunkedUpsert(
        admin,
        "participants",
        sanitizedParticipants,
        "id"
      );
      totalRestored += restoredCounts["participants"];
    }

    // 8. Registrations
    if (Array.isArray(parsed.data["registrations"]) && parsed.data["registrations"].length > 0) {
      restoredCounts["registrations"] = await chunkedUpsert(
        admin,
        "registrations",
        parsed.data["registrations"],
        "id"
      );
      totalRestored += restoredCounts["registrations"];
    }

    // 9. Registration Members
    if (Array.isArray(parsed.data["registration_members"]) && parsed.data["registration_members"].length > 0) {
      restoredCounts["registration_members"] = await chunkedUpsert(
        admin,
        "registration_members",
        parsed.data["registration_members"],
        "id"
      );
      totalRestored += restoredCounts["registration_members"];
    }

    // 10. Participant Documents
    if (Array.isArray(parsed.data["participant_documents"]) && parsed.data["participant_documents"].length > 0) {
      restoredCounts["participant_documents"] = await chunkedUpsert(
        admin,
        "participant_documents",
        parsed.data["participant_documents"],
        "id"
      );
      totalRestored += restoredCounts["participant_documents"];
    }

    // 11. Assessments
    if (Array.isArray(parsed.data["assessments"]) && parsed.data["assessments"].length > 0) {
      restoredCounts["assessments"] = await chunkedUpsert(
        admin,
        "assessments",
        parsed.data["assessments"],
        "registration_id,judge_id"
      );
      totalRestored += restoredCounts["assessments"];
    }

    // 12. Assessment Scores
    if (Array.isArray(parsed.data["assessment_scores"]) && parsed.data["assessment_scores"].length > 0) {
      restoredCounts["assessment_scores"] = await chunkedUpsert(
        admin,
        "assessment_scores",
        parsed.data["assessment_scores"],
        "assessment_id,criterion_id"
      );
      totalRestored += restoredCounts["assessment_scores"];
    }

    // 13. Winners
    if (Array.isArray(parsed.data["winners"]) && parsed.data["winners"].length > 0) {
      restoredCounts["winners"] = await chunkedUpsert(admin, "winners", parsed.data["winners"], "id");
      totalRestored += restoredCounts["winners"];
    }

    // 14. Schedules
    if (Array.isArray(parsed.data["schedules"]) && parsed.data["schedules"].length > 0) {
      restoredCounts["schedules"] = await chunkedUpsert(admin, "schedules", parsed.data["schedules"], "id");
      totalRestored += restoredCounts["schedules"];
    }

    // 15. Announcements
    if (Array.isArray(parsed.data["announcements"]) && parsed.data["announcements"].length > 0) {
      restoredCounts["announcements"] = await chunkedUpsert(
        admin,
        "announcements",
        parsed.data["announcements"],
        "id"
      );
      totalRestored += restoredCounts["announcements"];
    }

    // 16. Media Contents
    if (Array.isArray(parsed.data["media_contents"]) && parsed.data["media_contents"].length > 0) {
      restoredCounts["media_contents"] = await chunkedUpsert(
        admin,
        "media_contents",
        parsed.data["media_contents"],
        "id"
      );
      totalRestored += restoredCounts["media_contents"];
    }

    // 17. Stands
    if (Array.isArray(parsed.data["stands"]) && parsed.data["stands"].length > 0) {
      restoredCounts["stands"] = await chunkedUpsert(admin, "stands", parsed.data["stands"], "id");
      totalRestored += restoredCounts["stands"];
    }

    // 18. Challenges
    if (Array.isArray(parsed.data["challenges"]) && parsed.data["challenges"].length > 0) {
      restoredCounts["challenges"] = await chunkedUpsert(admin, "challenges", parsed.data["challenges"], "id");
      totalRestored += restoredCounts["challenges"];
    }

    // 19. Challenge Submissions
    if (Array.isArray(parsed.data["challenge_submissions"]) && parsed.data["challenge_submissions"].length > 0) {
      restoredCounts["challenge_submissions"] = await chunkedUpsert(
        admin,
        "challenge_submissions",
        parsed.data["challenge_submissions"],
        "id"
      );
      totalRestored += restoredCounts["challenge_submissions"];
    }

    // 20. Rewards
    if (Array.isArray(parsed.data["rewards"]) && parsed.data["rewards"].length > 0) {
      restoredCounts["rewards"] = await chunkedUpsert(admin, "rewards", parsed.data["rewards"], "id");
      totalRestored += restoredCounts["rewards"];
    }

    // 21. Reward Redemptions
    if (Array.isArray(parsed.data["reward_redemptions"]) && parsed.data["reward_redemptions"].length > 0) {
      restoredCounts["reward_redemptions"] = await chunkedUpsert(
        admin,
        "reward_redemptions",
        parsed.data["reward_redemptions"],
        "id"
      );
      totalRestored += restoredCounts["reward_redemptions"];
    }

    // 22. Point Transactions
    if (Array.isArray(parsed.data["point_transactions"]) && parsed.data["point_transactions"].length > 0) {
      restoredCounts["point_transactions"] = await chunkedUpsert(
        admin,
        "point_transactions",
        parsed.data["point_transactions"],
        "id"
      );
      totalRestored += restoredCounts["point_transactions"];
    }

    // 23. Puzzle Items & Attempts
    if (Array.isArray(parsed.data["puzzle_items"]) && parsed.data["puzzle_items"].length > 0) {
      restoredCounts["puzzle_items"] = await chunkedUpsert(
        admin,
        "puzzle_items",
        parsed.data["puzzle_items"],
        "id"
      );
      totalRestored += restoredCounts["puzzle_items"];
    }
    if (Array.isArray(parsed.data["puzzle_attempts"]) && parsed.data["puzzle_attempts"].length > 0) {
      restoredCounts["puzzle_attempts"] = await chunkedUpsert(
        admin,
        "puzzle_attempts",
        parsed.data["puzzle_attempts"],
        "id"
      );
      totalRestored += restoredCounts["puzzle_attempts"];
    }

    // 24. QR Letter Challenges, Codes, Scans, & Submissions
    if (Array.isArray(parsed.data["qr_letter_challenges"]) && parsed.data["qr_letter_challenges"].length > 0) {
      restoredCounts["qr_letter_challenges"] = await chunkedUpsert(
        admin,
        "qr_letter_challenges",
        parsed.data["qr_letter_challenges"],
        "id"
      );
      totalRestored += restoredCounts["qr_letter_challenges"];
    }
    if (Array.isArray(parsed.data["qr_letter_codes"]) && parsed.data["qr_letter_codes"].length > 0) {
      restoredCounts["qr_letter_codes"] = await chunkedUpsert(
        admin,
        "qr_letter_codes",
        parsed.data["qr_letter_codes"],
        "id"
      );
      totalRestored += restoredCounts["qr_letter_codes"];
    }
    if (Array.isArray(parsed.data["qr_letter_scans"]) && parsed.data["qr_letter_scans"].length > 0) {
      restoredCounts["qr_letter_scans"] = await chunkedUpsert(
        admin,
        "qr_letter_scans",
        parsed.data["qr_letter_scans"],
        "participant_id,qr_code_id"
      );
      totalRestored += restoredCounts["qr_letter_scans"];
    }
    if (Array.isArray(parsed.data["qr_letter_submissions"]) && parsed.data["qr_letter_submissions"].length > 0) {
      restoredCounts["qr_letter_submissions"] = await chunkedUpsert(
        admin,
        "qr_letter_submissions",
        parsed.data["qr_letter_submissions"],
        "id"
      );
      totalRestored += restoredCounts["qr_letter_submissions"];
    }

    // 25. Jigsaw Puzzles & Attempts
    if (Array.isArray(parsed.data["jigsaw_puzzles"]) && parsed.data["jigsaw_puzzles"].length > 0) {
      restoredCounts["jigsaw_puzzles"] = await chunkedUpsert(
        admin,
        "jigsaw_puzzles",
        parsed.data["jigsaw_puzzles"],
        "id"
      );
      totalRestored += restoredCounts["jigsaw_puzzles"];
    }
    if (Array.isArray(parsed.data["jigsaw_attempts"]) && parsed.data["jigsaw_attempts"].length > 0) {
      restoredCounts["jigsaw_attempts"] = await chunkedUpsert(
        admin,
        "jigsaw_attempts",
        parsed.data["jigsaw_attempts"],
        "id"
      );
      totalRestored += restoredCounts["jigsaw_attempts"];
    }

    // 26. Twibbon Templates & Twibbons
    if (Array.isArray(parsed.data["twibbon_templates"]) && parsed.data["twibbon_templates"].length > 0) {
      restoredCounts["twibbon_templates"] = await chunkedUpsert(
        admin,
        "twibbon_templates",
        parsed.data["twibbon_templates"],
        "id"
      );
      totalRestored += restoredCounts["twibbon_templates"];
    }
    if (Array.isArray(parsed.data["twibbons"]) && parsed.data["twibbons"].length > 0) {
      restoredCounts["twibbons"] = await chunkedUpsert(admin, "twibbons", parsed.data["twibbons"], "id");
      totalRestored += restoredCounts["twibbons"];
    }

    // Catat riwayat restore ke event_settings
    const restoreEntry: RestoreHistoryEntry = {
      id: `rst-${Date.now()}`,
      filename: parsed.meta?.id ? `${parsed.meta.id}.json` : "uploaded-backup.json",
      restoredAt: new Date().toISOString(),
      restoredByName: auth.profile.full_name || "Administrator",
      restoredByEmail: auth.profile.email || "admin",
      mode,
      status: "sukses",
      totalRecordsRestored: totalRestored,
      details: restoredCounts,
    };

    const { data: restoreHistSetting } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", RESTORE_HISTORY_KEY)
      .maybeSingle();

    const existingRestoreHist: RestoreHistoryEntry[] = Array.isArray(restoreHistSetting?.value)
      ? (restoreHistSetting.value as unknown as RestoreHistoryEntry[])
      : [];
    const updatedRestoreHist = [restoreEntry, ...existingRestoreHist].slice(0, 50);

    await admin.from("event_settings").upsert(
      {
        key: RESTORE_HISTORY_KEY,
        value: updatedRestoreHist as any,
        description: "Catatan riwayat restore data sistem dari file backup",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    // Revalidasi seluruh path halaman operasional terkait
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/kriteria");
    revalidatePath("/dashboard/juri");
    revalidatePath("/dashboard/pengaturan");
    revalidatePath("/dashboard/pengaturan/backup-restore");
    revalidatePath("/dashboard/pengaturan/reset-data");
    revalidatePath("/dashboard/instansi");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/daftar");
    revalidatePath("/pemenang");
    revalidatePath("/monitor");

    return {
      success: true,
      totalRestored,
      details: restoredCounts,
      message: `Berhasil memulihkan ${totalRestored} data dari ${Object.keys(restoredCounts).length} tabel dengan mode "${mode === "clean" ? "Timpa Bersih" : "Gabungkan / Upsert"}".`,
    };
  } catch (err: unknown) {
    console.error("executeRestoreAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memulihkan data backup.",
    };
  }
}

/**
 * Ambil daftar riwayat restore
 */
export async function getRestoreHistoryAction(): Promise<{
  success: boolean;
  history?: RestoreHistoryEntry[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", RESTORE_HISTORY_KEY)
      .maybeSingle();

    if (error) throw error;
    const history: RestoreHistoryEntry[] = Array.isArray(data?.value)
      ? (data.value as unknown as RestoreHistoryEntry[])
      : [];
    return { success: true, history };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat riwayat restore.",
    };
  }
}
