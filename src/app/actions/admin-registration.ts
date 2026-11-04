"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventSettings } from "@/app/actions/settings";
import {
  parseRegistrationExcelBuffer,
  type ExcelRegistrationRow,
} from "@/lib/excel-registration";

export interface AdminParticipantOption {
  id: string;
  registrationNumber: string;
  fullName: string;
  institution: string;
  email: string | null;
  phone: string | null;
  status: string;
  enrolledCompetitions: string[];
}

export interface AdminCompetitionOption {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  type: "individu" | "kelompok";
  status: string;
  minMembers: number;
  maxMembers: number;
  maxParticipants: number | null;
  currentCount: number;
}

export interface AdminEnrollParticipantInput {
  participantMode: "existing" | "new";
  participantId?: string;
  newParticipant?: {
    fullName: string;
    institution: string;
    email?: string;
    phone?: string;
  };
  competitionId: string;
  teamName?: string;
  teamMembers?: Array<{
    name: string;
    role?: "ketua" | "anggota";
    institution?: string;
    studentId?: string;
  }>;
  status?: "terverifikasi" | "menunggu_verifikasi";
  notes?: string;
}

export interface ExcelRowPreviewResult {
  rowNumber: number;
  fullName: string;
  institution: string;
  competitionName: string;
  email?: string;
  phone?: string;
  category?: string;
  teamName?: string;
  teamMembersCount: number;
  isValid: boolean;
  participantAction: "daftar_baru" | "peserta_terdaftar";
  errorMessage?: string;
}

export interface ExcelImportExecutionResult {
  rowNumber: number;
  participantName: string;
  institution: string;
  competitionName: string;
  status: "berhasil" | "gagal";
  message: string;
}

/**
 * Verifikasi otorisasi pengguna saat ini (hanya Super Admin & Seksi Acara)
 */
async function authorizeAdminOrSeksiAcara(): Promise<{
  authorized: boolean;
  user?: any;
  role?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        authorized: false,
        error: "Sesi Anda telah berakhir. Silakan masuk kembali.",
      };
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    const isAllowed = role === "super_admin" || role === "seksi_acara";

    if (!isAllowed) {
      return {
        authorized: false,
        error:
          "Akses ditolak: Hanya Administrator atau Seksi Acara yang diizinkan mendaftarkan peserta ke lomba.",
      };
    }

    return { authorized: true, user, role };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memverifikasi hak akses.";
    return { authorized: false, error: msg };
  }
}

/**
 * Ambil daftar peserta untuk dropdown pencarian saat admin mendaftarkan secara manual.
 */
export async function getAvailableParticipantsForAdmin(): Promise<{
  success: boolean;
  participants: AdminParticipantOption[];
  error?: string;
}> {
  try {
    const auth = await authorizeAdminOrSeksiAcara();
    if (!auth.authorized) {
      return { success: false, participants: [], error: auth.error };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("participants")
      .select(`
        id,
        registration_number,
        full_name,
        institution,
        email,
        phone,
        status,
        registrations (
          competition_id,
          competitions (
            name
          )
        )
      `)
      .order("full_name", { ascending: true });

    if (error) throw error;

    const participants: AdminParticipantOption[] = (data || []).map((p: any) => {
      const compNames = (p.registrations || [])
        .map((r: any) => r.competitions?.name)
        .filter(Boolean);

      return {
        id: p.id,
        registrationNumber: p.registration_number,
        fullName: p.full_name,
        institution: p.institution || "-",
        email: p.email,
        phone: p.phone,
        status: p.status,
        enrolledCompetitions: compNames,
      };
    });

    return { success: true, participants };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar peserta.";
    return { success: false, participants: [], error: message };
  }
}

/**
 * Ambil daftar cabang lomba aktif beserta kuota untuk pendaftaran admin.
 */
export async function getAvailableCompetitionsForAdmin(): Promise<{
  success: boolean;
  competitions: AdminCompetitionOption[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("competitions")
      .select(`
        id,
        name,
        short_name,
        slug,
        type,
        status,
        min_team_members,
        max_team_members,
        max_participants,
        registrations (id)
      `)
      .neq("status", "dibatalkan")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const competitions: AdminCompetitionOption[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      shortName: c.short_name || c.name,
      slug: c.slug,
      type: c.type || "individu",
      status: c.status,
      minMembers: c.min_team_members || 1,
      maxMembers: c.max_team_members || 1,
      maxParticipants: c.max_participants || null,
      currentCount: Array.isArray(c.registrations) ? c.registrations.length : 0,
    }));

    return { success: true, competitions };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat cabang lomba.";
    return { success: false, competitions: [], error: message };
  }
}

/**
 * Pendaftaran manual peserta ke cabang lomba oleh Admin / Seksi Acara.
 */
export async function adminEnrollParticipant(
  input: AdminEnrollParticipantInput
): Promise<{ success: boolean; error?: string; registrationId?: string }> {
  try {
    const auth = await authorizeAdminOrSeksiAcara();
    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const admin = createAdminClient();

    // 1. Ambil data cabang lomba tujuan
    const { data: comp, error: compErr } = await admin
      .from("competitions")
      .select("id, name, short_name, slug, type, status, min_team_members, max_team_members, max_participants")
      .eq("id", input.competitionId)
      .maybeSingle();

    if (compErr || !comp) {
      return { success: false, error: "Cabang lomba yang dipilih tidak ditemukan." };
    }

    if (comp.status === "dibatalkan") {
      return { success: false, error: `Cabang lomba "${comp.name}" telah dibatalkan.` };
    }

    // Cek kuota peserta pada lomba ini
    if (comp.max_participants && comp.max_participants > 0) {
      const { count: currentRegCount } = await admin
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", comp.id);

      if ((currentRegCount || 0) >= comp.max_participants) {
        return {
          success: false,
          error: `Kuota cabang lomba "${comp.name}" sudah penuh (${currentRegCount}/${comp.max_participants} peserta/tim).`,
        };
      }
    }

    // 2. Tentukan atau buat profil peserta
    let participantId = input.participantId;
    let participantName = "";
    let institution = "";

    if (input.participantMode === "new") {
      const newPart = input.newParticipant;
      if (!newPart?.fullName?.trim()) {
        return { success: false, error: "Nama lengkap peserta wajib diisi." };
      }
      if (!newPart?.institution?.trim()) {
        return { success: false, error: "Asal instansi / sekolah peserta wajib diisi." };
      }

      participantName = newPart.fullName.trim();
      institution = newPart.institution.trim();

      const shortCode = comp.short_name
        ? comp.short_name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
        : "PES";
      const regNum = `GBB-${shortCode}-${Math.floor(1000 + Math.random() * 9000)}`;

      const email =
        newPart.email?.trim() ||
        `peserta.${Date.now()}.${Math.floor(Math.random() * 1000)}@gebyarbulanbahasa.id`;
      const phone = newPart.phone?.trim() || "081234567890";
      const initialStatus = input.status || "terverifikasi";

      const { data: createdPart, error: partErr } = await admin
        .from("participants")
        .insert({
          registration_number: regNum,
          full_name: participantName,
          institution,
          email,
          phone,
          status: initialStatus,
          total_points: 0,
        })
        .select("id, full_name, institution")
        .single();

      if (partErr || !createdPart) {
        return {
          success: false,
          error: `Gagal membuat data peserta baru: ${partErr?.message || "Kesalahan database"}`,
        };
      }

      participantId = createdPart.id;
    } else {
      if (!participantId) {
        return { success: false, error: "Peserta belum dipilih." };
      }

      const { data: existingPart, error: existErr } = await admin
        .from("participants")
        .select("id, full_name, institution, status")
        .eq("id", participantId)
        .maybeSingle();

      if (existErr || !existingPart) {
        return { success: false, error: "Data peserta yang dipilih tidak ditemukan." };
      }

      participantName = existingPart.full_name;
      institution = existingPart.institution || "-";

      // Jika statusnya belum terverifikasi dan admin mendaftarkan dengan status terverifikasi, update status
      if (input.status === "terverifikasi" && existingPart.status !== "terverifikasi") {
        await admin
          .from("participants")
          .update({ status: "terverifikasi" })
          .eq("id", participantId);
      }
    }

    // 3. Validasi duplikasi: apakah peserta sudah terdaftar di cabang lomba ini?
    const { data: duplicateReg } = await admin
      .from("registrations")
      .select("id")
      .eq("participant_id", participantId)
      .eq("competition_id", comp.id)
      .maybeSingle();

    if (duplicateReg) {
      return {
        success: false,
        error: `Peserta "${participantName}" sudah terdaftar pada cabang lomba "${comp.name}".`,
      };
    }

    // 4. Validasi batas maksimal lomba per peserta (dari pengaturan acara)
    const settingsRes = await getEventSettings();
    const maxCompLimit = settingsRes.success && settingsRes.settings?.maxCompetitions
      ? Number(settingsRes.settings.maxCompetitions) || 3
      : 3;

    const { count: userEnrollCount } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participantId);

    if ((userEnrollCount || 0) >= maxCompLimit) {
      return {
        success: false,
        error: `Peserta "${participantName}" telah mencapai batas maksimal pendaftaran lomba (${maxCompLimit} cabang lomba).`,
      };
    }

    // 5. Validasi lomba kelompok (jika beregu)
    const isKelompok = comp.type === "kelompok";
    let teamName = input.teamName?.trim() || null;
    const teamMembers = input.teamMembers || [];

    if (isKelompok) {
      if (!teamName) {
        teamName = `Tim ${participantName}`;
      }

      const totalMembers = 1 + teamMembers.length; // 1 ketua + anggota
      if (comp.min_team_members && totalMembers < comp.min_team_members) {
        return {
          success: false,
          error: `Cabang lomba "${comp.name}" membutuhkan minimal ${comp.min_team_members} anggota tim (1 ketua + ${
            comp.min_team_members - 1
          } anggota). Saat ini: ${totalMembers} orang.`,
        };
      }
    }

    // 6. Masukkan pendaftaran ke tabel registrations
    const isConfirmed = input.status !== "menunggu_verifikasi";

    const { data: newReg, error: regInsertErr } = await admin
      .from("registrations")
      .insert({
        participant_id: participantId,
        competition_id: comp.id,
        team_name: teamName,
        is_confirmed: isConfirmed,
        notes: input.notes?.trim() || `Didaftarkan manual oleh ${auth.role} (${auth.user?.email || "Admin"})`,
      })
      .select("id")
      .single();

    if (regInsertErr || !newReg) {
      return {
        success: false,
        error: `Gagal mendaftarkan ke lomba: ${regInsertErr?.message || "Kesalahan database"}`,
      };
    }

    // 7. Simpan anggota tim jika lomba kelompok
    if (isKelompok) {
      const membersToInsert = [
        {
          registration_id: newReg.id,
          member_name: participantName,
          member_role: "ketua",
          is_leader: true,
          institution: institution,
          student_id: null,
        },
        ...teamMembers
          .filter((m) => m.name.trim().length > 0)
          .map((m) => ({
            registration_id: newReg.id,
            member_name: m.name.trim(),
            member_role: m.role || "anggota",
            is_leader: false,
            institution: m.institution?.trim() || institution,
            student_id: m.studentId?.trim() || null,
          })),
      ];

      await admin.from("registration_members").insert(membersToInsert);
    }

    // 8. Catat log aktivitas
    try {
      await admin.from("activity_logs").insert({
        action: "admin_enroll_participant",
        entity: "registrations",
        entity_id: newReg.id,
        description: `Peserta "${participantName}" (${institution}) berhasil didaftarkan ke cabang lomba "${comp.name}" oleh ${auth.user?.email}.`,
      });
    } catch {}

    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/peserta/pendaftaran");
    revalidatePath("/peserta");

    return { success: true, registrationId: newReg.id };
  } catch (err: unknown) {
    console.error("Error adminEnrollParticipant:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat mendaftarkan peserta.",
    };
  }
}

/**
 * Preview dan pra-validasi data Excel yang diunggah sebelum diproses import permanen.
 */
export async function adminPreviewExcelRegistrations(
  formData: FormData
): Promise<{
  success: boolean;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  items: ExcelRowPreviewResult[];
  error?: string;
}> {
  try {
    const auth = await authorizeAdminOrSeksiAcara();
    if (!auth.authorized) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        items: [],
        error: auth.error,
      };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        items: [],
        error: "File Excel wajib dipilih.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = parseRegistrationExcelBuffer(Buffer.from(arrayBuffer));

    if (rows.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validCount: 0,
        invalidCount: 0,
        items: [],
        error: "File Excel kosong atau tidak memiliki data peserta pada lembar kerja.",
      };
    }

    const admin = createAdminClient();

    // 1. Ambil semua kompetisi untuk pencocokan cepat
    const { data: dbComps } = await admin
      .from("competitions")
      .select("id, name, short_name, slug, type, status, min_team_members, max_team_members, max_participants")
      .neq("status", "dibatalkan");

    const compList = dbComps || [];

    // Helper pencocokan lomba fleksibel (nama, shortName, slug)
    const findCompetition = (inputName: string) => {
      const clean = inputName.trim().toLowerCase();
      return compList.find((c) => {
        const cName = c.name.toLowerCase();
        const cShort = (c.short_name || "").toLowerCase();
        const cSlug = c.slug.toLowerCase().replace(/-/g, " ");
        return (
          cName === clean ||
          cShort === clean ||
          cName.includes(clean) ||
          clean.includes(cName) ||
          cSlug === clean
        );
      });
    };

    // 2. Ambil data peserta existing untuk mendeteksi apakah sudah terdaftar
    const { data: dbParticipants } = await admin
      .from("participants")
      .select("id, full_name, institution, email, phone");

    const partList = dbParticipants || [];

    // 3. Ambil data registrasi existing untuk deteksi duplikasi
    const { data: dbRegistrations } = await admin
      .from("registrations")
      .select("participant_id, competition_id");

    const regSet = new Set(
      (dbRegistrations || []).map((r) => `${r.participant_id}_${r.competition_id}`)
    );

    const previewItems: ExcelRowPreviewResult[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (const r of rows) {
      let isValid = true;
      let errorMessage = "";
      let participantAction: "daftar_baru" | "peserta_terdaftar" = "daftar_baru";

      if (!r.fullName) {
        isValid = false;
        errorMessage = "Nama peserta tidak boleh kosong.";
      } else if (!r.institution) {
        isValid = false;
        errorMessage = "Asal instansi / sekolah tidak boleh kosong.";
      } else if (!r.competitionName) {
        isValid = false;
        errorMessage = "Cabang lomba tidak boleh kosong.";
      } else {
        const matchedComp = findCompetition(r.competitionName);
        if (!matchedComp) {
          isValid = false;
          errorMessage = `Cabang lomba "${r.competitionName}" tidak ditemukan di sistem.`;
        } else {
          // Cari apakah peserta sudah ada di database
          const cleanName = r.fullName.trim().toLowerCase();
          const cleanInst = r.institution.trim().toLowerCase();
          const cleanEmail = r.email ? r.email.trim().toLowerCase() : null;
          const cleanPhone = r.phone ? r.phone.trim().replace(/[^0-9]/g, "") : null;

          const existing = partList.find((p) => {
            if (cleanEmail && p.email && p.email.toLowerCase() === cleanEmail) return true;
            if (cleanPhone && p.phone && p.phone.replace(/[^0-9]/g, "") === cleanPhone) return true;
            return (
              p.full_name.trim().toLowerCase() === cleanName &&
              (p.institution || "").trim().toLowerCase() === cleanInst
            );
          });

          if (existing) {
            participantAction = "peserta_terdaftar";
            // Cek apakah sudah terdaftar pada lomba ini
            if (regSet.has(`${existing.id}_${matchedComp.id}`)) {
              isValid = false;
              errorMessage = `Peserta sudah terdaftar pada cabang lomba "${matchedComp.name}".`;
            }
          }
        }
      }

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      previewItems.push({
        rowNumber: r.rowNumber,
        fullName: r.fullName || "-",
        institution: r.institution || "-",
        competitionName: r.competitionName || "-",
        email: r.email,
        phone: r.phone,
        category: r.category,
        teamName: r.teamName,
        teamMembersCount: r.teamMembers?.length || 0,
        isValid,
        participantAction,
        errorMessage: errorMessage || undefined,
      });
    }

    return {
      success: true,
      totalRows: rows.length,
      validCount,
      invalidCount,
      items: previewItems,
    };
  } catch (err: unknown) {
    console.error("Error adminPreviewExcelRegistrations:", err);
    return {
      success: false,
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      items: [],
      error: err instanceof Error ? err.message : "Gagal memproses file Excel.",
    };
  }
}

/**
 * Eksekusi pendaftaran massal peserta ke lomba dari file Excel yang diunggah.
 */
export async function adminImportRegistrationsFromExcel(
  formData: FormData
): Promise<{
  success: boolean;
  summary: {
    total: number;
    successCount: number;
    failedCount: number;
  };
  results: ExcelImportExecutionResult[];
  error?: string;
}> {
  try {
    const auth = await authorizeAdminOrSeksiAcara();
    if (!auth.authorized) {
      return {
        success: false,
        summary: { total: 0, successCount: 0, failedCount: 0 },
        results: [],
        error: auth.error,
      };
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return {
        success: false,
        summary: { total: 0, successCount: 0, failedCount: 0 },
        results: [],
        error: "File Excel wajib diunggah.",
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = parseRegistrationExcelBuffer(Buffer.from(arrayBuffer));

    if (rows.length === 0) {
      return {
        success: false,
        summary: { total: 0, successCount: 0, failedCount: 0 },
        results: [],
        error: "File Excel tidak memuat baris data peserta.",
      };
    }

    const admin = createAdminClient();

    // 1. Ambil data kompetisi
    const { data: dbComps } = await admin
      .from("competitions")
      .select("id, name, short_name, slug, type, status, min_team_members, max_team_members, max_participants")
      .neq("status", "dibatalkan");

    const compList = dbComps || [];

    const findCompetition = (inputName: string) => {
      const clean = inputName.trim().toLowerCase();
      return compList.find((c) => {
        const cName = c.name.toLowerCase();
        const cShort = (c.short_name || "").toLowerCase();
        const cSlug = c.slug.toLowerCase().replace(/-/g, " ");
        return (
          cName === clean ||
          cShort === clean ||
          cName.includes(clean) ||
          clean.includes(cName) ||
          cSlug === clean
        );
      });
    };

    // Ambil batas maksimal lomba dari settings acara
    const settingsRes = await getEventSettings();
    const maxCompLimit = settingsRes.success && settingsRes.settings?.maxCompetitions
      ? Number(settingsRes.settings.maxCompetitions) || 3
      : 3;

    const results: ExcelImportExecutionResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const r of rows) {
      const rowNum = r.rowNumber;
      const participantName = r.fullName?.trim() || "";
      const institution = r.institution?.trim() || "";
      const compInput = r.competitionName?.trim() || "";

      // Validasi kolom esensial
      if (!participantName) {
        failedCount++;
        results.push({
          rowNumber: rowNum,
          participantName: "-",
          institution: institution || "-",
          competitionName: compInput || "-",
          status: "gagal",
          message: "Nama peserta kosong pada baris ini.",
        });
        continue;
      }

      if (!institution) {
        failedCount++;
        results.push({
          rowNumber: rowNum,
          participantName,
          institution: "-",
          competitionName: compInput || "-",
          status: "gagal",
          message: "Asal instansi / sekolah kosong.",
        });
        continue;
      }

      if (!compInput) {
        failedCount++;
        results.push({
          rowNumber: rowNum,
          participantName,
          institution,
          competitionName: "-",
          status: "gagal",
          message: "Cabang lomba kosong.",
        });
        continue;
      }

      const comp = findCompetition(compInput);
      if (!comp) {
        failedCount++;
        results.push({
          rowNumber: rowNum,
          participantName,
          institution,
          competitionName: compInput,
          status: "gagal",
          message: `Cabang lomba "${compInput}" tidak terdaftar di sistem.`,
        });
        continue;
      }

      if (comp.status === "dibatalkan") {
        failedCount++;
        results.push({
          rowNumber: rowNum,
          participantName,
          institution,
          competitionName: comp.name,
          status: "gagal",
          message: `Cabang lomba "${comp.name}" dibatalkan.`,
        });
        continue;
      }

      // Cek kuota peserta pada lomba
      if (comp.max_participants && comp.max_participants > 0) {
        const { count: currentRegCount } = await admin
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .eq("competition_id", comp.id);

        if ((currentRegCount || 0) >= comp.max_participants) {
          failedCount++;
          results.push({
            rowNumber: rowNum,
            participantName,
            institution,
            competitionName: comp.name,
            status: "gagal",
            message: `Kuota lomba "${comp.name}" sudah penuh (${comp.max_participants} peserta).`,
          });
          continue;
        }
      }

      try {
        // Cari atau buat peserta di tabel participants
        const cleanName = participantName.toLowerCase();
        const cleanInst = institution.toLowerCase();
        const cleanEmail = r.email?.trim().toLowerCase() || null;
        const cleanPhone = r.phone?.trim() || null;

        let targetParticipantId: string | null = null;
        let isNewParticipant = false;

        // Query cari peserta existing
        let query = admin
          .from("participants")
          .select("id, full_name, institution, email, phone, status");

        if (cleanEmail) {
          query = query.or(`email.ilike.${cleanEmail},and(full_name.ilike.${participantName},institution.ilike.${institution})`);
        } else {
          query = query
            .ilike("full_name", participantName)
            .ilike("institution", institution);
        }

        const { data: matchedParts } = await query.limit(1);
        const existingPart = matchedParts && matchedParts.length > 0 ? matchedParts[0] : null;

        if (existingPart) {
          targetParticipantId = existingPart.id;
          // Pastikan statusnya terverifikasi
          if (existingPart.status !== "terverifikasi") {
            await admin
              .from("participants")
              .update({ status: "terverifikasi" })
              .eq("id", existingPart.id);
          }
        } else {
          // Buat peserta baru
          isNewParticipant = true;
          const shortCode = comp.short_name
            ? comp.short_name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
            : "IMP";
          const regNum = `GBB-${shortCode}-${Math.floor(1000 + Math.random() * 9000)}`;

          const email =
            cleanEmail ||
            `peserta.${Date.now()}.${Math.floor(Math.random() * 1000)}@gebyarbulanbahasa.id`;
          const phone = cleanPhone || "081234567890";

          const { data: newPart, error: partInsertErr } = await admin
            .from("participants")
            .insert({
              registration_number: regNum,
              full_name: participantName,
              institution,
              email,
              phone,
              status: "terverifikasi",
              total_points: 0,
            })
            .select("id")
            .single();

          if (partInsertErr || !newPart) {
            failedCount++;
            results.push({
              rowNumber: rowNum,
              participantName,
              institution,
              competitionName: comp.name,
              status: "gagal",
              message: `Gagal membuat data peserta: ${partInsertErr?.message || "Kesalahan database"}`,
            });
            continue;
          }

          targetParticipantId = newPart.id;
        }

        // Cek duplikasi: apakah sudah terdaftar di cabang lomba ini?
        const { data: dupCheck } = await admin
          .from("registrations")
          .select("id")
          .eq("participant_id", targetParticipantId)
          .eq("competition_id", comp.id)
          .maybeSingle();

        if (dupCheck) {
          failedCount++;
          results.push({
            rowNumber: rowNum,
            participantName,
            institution,
            competitionName: comp.name,
            status: "gagal",
            message: `Peserta sudah terdaftar pada cabang lomba "${comp.name}".`,
          });
          continue;
        }

        // Cek batas maksimal lomba per peserta
        const { count: enrolledCount } = await admin
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .eq("participant_id", targetParticipantId);

        if ((enrolledCount || 0) >= maxCompLimit) {
          failedCount++;
          results.push({
            rowNumber: rowNum,
            participantName,
            institution,
            competitionName: comp.name,
            status: "gagal",
            message: `Peserta telah mencapai batas maksimal pendaftaran (${maxCompLimit} cabang lomba).`,
          });
          continue;
        }

        // Siapkan pendaftaran lomba
        const isKelompok = comp.type === "kelompok";
        const teamName = isKelompok
          ? r.teamName?.trim() || `Tim ${participantName}`
          : null;

        const { data: reg, error: regErr } = await admin
          .from("registrations")
          .insert({
            participant_id: targetParticipantId,
            competition_id: comp.id,
            team_name: teamName,
            is_confirmed: true,
            notes: `Import Excel oleh ${auth.role} (${auth.user?.email || "Admin"})`,
          })
          .select("id")
          .single();

        if (regErr || !reg) {
          failedCount++;
          results.push({
            rowNumber: rowNum,
            participantName,
            institution,
            competitionName: comp.name,
            status: "gagal",
            message: `Gagal menyimpan pendaftaran: ${regErr?.message || "Kesalahan database"}`,
          });
          continue;
        }

        // Jika lomba kelompok, simpan anggota tim
        if (isKelompok) {
          const membersList = [
            {
              registration_id: reg.id,
              member_name: participantName,
              member_role: "ketua",
              is_leader: true,
              institution,
              student_id: null,
            },
            ...(r.teamMembers || []).map((memberName) => ({
              registration_id: reg.id,
              member_name: memberName,
              member_role: "anggota",
              is_leader: false,
              institution,
              student_id: null,
            })),
          ];

          await admin.from("registration_members").insert(membersList);
        }

        successCount++;
        results.push({
          rowNumber: rowNum,
          participantName,
          institution,
          competitionName: comp.name,
          status: "berhasil",
          message: isNewParticipant
            ? `Berhasil didaftarkan (Peserta baru dibuat & dikonfirmasi).`
            : `Berhasil didaftarkan (Menghubungkan ke data peserta terdaftar).`,
        });
      } catch (rowErr: unknown) {
        failedCount++;
        const msg = rowErr instanceof Error ? rowErr.message : "Kesalahan tidak terduga";
        results.push({
          rowNumber: rowNum,
          participantName,
          institution,
          competitionName: comp.name,
          status: "gagal",
          message: `Gagal memproses baris: ${msg}`,
        });
      }
    }

    // Catat log aktivitas impor massal
    try {
      await admin.from("activity_logs").insert({
        action: "admin_import_registrations_excel",
        entity: "registrations",
        description: `Import pendaftaran Excel selesai: ${successCount} berhasil, ${failedCount} gagal dari total ${rows.length} baris oleh ${auth.user?.email}.`,
      });
    } catch {}

    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/peserta/pendaftaran");
    revalidatePath("/peserta");

    return {
      success: true,
      summary: {
        total: rows.length,
        successCount,
        failedCount,
      },
      results,
    };
  } catch (err: unknown) {
    console.error("Error adminImportRegistrationsFromExcel:", err);
    return {
      success: false,
      summary: { total: 0, successCount: 0, failedCount: 0 },
      results: [],
      error: err instanceof Error ? err.message : "Gagal memproses import Excel.",
    };
  }
}

