"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CompetitionSimulationItem {
  id: string;
  slug: string;
  name: string;
  type: "individu" | "kelompok";
  minTeamMembers: number;
  maxTeamMembers: number;
  status: string;
  simulationCount: number;
  assessedCount: number;
  totalJudges: number;
}

export interface SimulationOverview {
  totalCompetitions: number;
  totalSimulationRegistrations: number;
  totalAssessmentsSubmitted: number;
  competitions: CompetitionSimulationItem[];
}

const SIMULATION_FIRST_NAMES = [
  "Budi", "Siti", "Ahmad", "Dewi", "Rizky", "Nurul", "Dimas", "Putri", "Bayu", "Anisa",
  "Fajar", "Lestari", "Ilham", "Rina", "Dian", "Eko", "Maya", "Hendra", "Ratna", "Gilang"
];

const SIMULATION_LAST_NAMES = [
  "Santoso", "Rahmawati", "Fauzi", "Lestari", "Pratama", "Hidayah", "Anggara", "Maharani", "Setiawan", "Rahma",
  "Saputra", "Wulandari", "Kusuma", "Handayani", "Nugroho", "Permata", "Wijaya", "Susanti", "Firmansyah", "Fitriani"
];

const SCHOOL_NAME = "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA";

/**
 * Verifikasi apakah sesi pengguna saat ini memiliki hak akses Super Admin.
 */
async function verifySuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sesi login tidak ditemukan. Silakan login sebagai Super Admin.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Akses ditolak. Fitur Simulasi Juri hanya dapat diakses oleh akun Super Admin.");
  }

  return { user, profile };
}

/**
 * Mengambil ringkasan data simulasi per cabang lomba dan total sistem.
 */
export async function getSimulationStatus(): Promise<{
  success: boolean;
  data?: SimulationOverview;
  error?: string;
}> {
  try {
    await verifySuperAdmin();
    const admin = createAdminClient();

    // 1. Ambil seluruh cabang lomba aktif
    const { data: comps, error: compErr } = await admin
      .from("competitions")
      .select("id, slug, name, type, min_team_members, max_team_members, status, sort_order")
      .order("sort_order", { ascending: true });

    if (compErr) throw compErr;

    // 2. Ambil seluruh pendaftaran simulasi (berdasarkan tag [SIMULASI_JURI])
    const { data: simRegs, error: regErr } = await admin
      .from("registrations")
      .select("id, competition_id, participant_id, performance_order, notes")
      .like("notes", "%[SIMULASI_JURI]%");

    if (regErr) throw regErr;

    const simRegIds = (simRegs || []).map((r) => r.id);

    // 3. Ambil penilaian juri untuk pendaftaran simulasi
    let simAssessments: { id: string; competition_id: string; registration_id: string }[] = [];
    if (simRegIds.length > 0) {
      const { data: assData } = await admin
        .from("assessments")
        .select("id, competition_id, registration_id")
        .in("registration_id", simRegIds);
      simAssessments = assData || [];
    }

    // 4. Ambil juri aktif per cabang lomba
    const { data: judges } = await admin
      .from("competition_judges")
      .select("competition_id")
      .eq("status", "aktif");

    // Mapping per cabang lomba
    const regCountMap: Record<string, number> = {};
    (simRegs || []).forEach((r) => {
      regCountMap[r.competition_id] = (regCountMap[r.competition_id] || 0) + 1;
    });

    const assessedCountMap: Record<string, number> = {};
    (simAssessments || []).forEach((a) => {
      assessedCountMap[a.competition_id] = (assessedCountMap[a.competition_id] || 0) + 1;
    });

    const judgeCountMap: Record<string, number> = {};
    (judges || []).forEach((j) => {
      judgeCountMap[j.competition_id] = (judgeCountMap[j.competition_id] || 0) + 1;
    });

    const competitionItems: CompetitionSimulationItem[] = (comps || []).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      type: (c.type as "individu" | "kelompok") || "individu",
      minTeamMembers: c.min_team_members ?? 1,
      maxTeamMembers: c.max_team_members ?? 1,
      status: c.status || "pendaftaran",
      simulationCount: regCountMap[c.id] || 0,
      assessedCount: assessedCountMap[c.id] || 0,
      totalJudges: judgeCountMap[c.id] || 0,
    }));

    const overview: SimulationOverview = {
      totalCompetitions: competitionItems.length,
      totalSimulationRegistrations: simRegs?.length || 0,
      totalAssessmentsSubmitted: simAssessments.length,
      competitions: competitionItems,
    };

    return { success: true, data: overview };
  } catch (err: unknown) {
    console.error("getSimulationStatus error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat status simulasi.",
    };
  }
}

/**
 * Generate peserta dummy sosialisasi juri untuk semua lomba atau satu lomba spesifik.
 */
export async function generateSimulationParticipants(payload?: {
  competitionId?: string;
  countPerComp?: number;
}): Promise<{
  success: boolean;
  message?: string;
  countGenerated?: number;
  error?: string;
}> {
  try {
    const { profile } = await verifySuperAdmin();
    const admin = createAdminClient();

    const targetCount = Math.min(10, Math.max(1, payload?.countPerComp || 3));

    // 1. Ambil kompetisi sasaran
    let compQuery = admin.from("competitions").select("*");
    if (payload?.competitionId) {
      compQuery = compQuery.eq("id", payload.competitionId);
    }
    const { data: comps, error: compErr } = await compQuery;
    if (compErr) throw compErr;

    if (!comps || comps.length === 0) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }

    let totalCreated = 0;

    for (const comp of comps) {
      // a. Hapus peserta simulasi lomba ini yang sudah ada sebelumnya (idempotent / clean state)
      await cleanSimulationForCompetition(admin, comp.id);

      const isDuta =
        comp.slug === "pidato" ||
        comp.slug === "duta-bahasa" ||
        comp.name.toLowerCase().includes("duta");

      // b. Buat N peserta untuk lomba ini
      for (let i = 0; i < targetCount; i++) {
        const fName = SIMULATION_FIRST_NAMES[(totalCreated + i) % SIMULATION_FIRST_NAMES.length];
        const lName = SIMULATION_LAST_NAMES[(totalCreated + i * 2) % SIMULATION_LAST_NAMES.length];
        const fullName = `[Simulasi] ${fName} ${lName}`;
        const compCode = comp.slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3) || "LMB";
        const regNumber = `SIM-JURI-${compCode}-${String(i + 1).padStart(3, "0")}`;

        // Insert ke participants
        const { data: newPart, error: pErr } = await admin
          .from("participants")
          .insert({
            registration_number: regNumber,
            full_name: fullName,
            nickname: fName,
            institution: SCHOOL_NAME,
            status: "terverifikasi",
            phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: `simulasi.${compCode.toLowerCase()}.${i + 1}@smkdp2jkt.sch.id`,
            total_points: 0,
            verified_at: new Date().toISOString(),
            verified_by: profile?.full_name || "Super Admin",
          })
          .select("id")
          .single();

        if (pErr) throw pErr;

        const participantId = newPart.id;
        const teamName =
          comp.type === "kelompok"
            ? `[Simulasi] Regu ${i + 1} - ${fName} & Tim`
            : null;

        // Insert ke registrations
        const { data: newReg, error: rErr } = await admin
          .from("registrations")
          .insert({
            participant_id: participantId,
            competition_id: comp.id,
            team_name: teamName,
            performance_order: i + 1,
            is_confirmed: true,
            notes: `[SIMULASI_JURI] Peserta uji coba sosialisasi juri (${SCHOOL_NAME})`,
          })
          .select("id")
          .single();

        if (rErr) throw rErr;

        // Jika lomba kelompok, buatkan anggota tim
        if (comp.type === "kelompok") {
          const minMembers = Math.max(2, comp.min_team_members || 2);
          const membersToInsert = [];

          // Ketua
          membersToInsert.push({
            registration_id: newReg.id,
            member_name: fullName,
            member_role: "Ketua Tim",
            institution: SCHOOL_NAME,
            is_leader: true,
          });

          // Anggota lainnya
          for (let m = 1; m < minMembers; m++) {
            const mFirst = SIMULATION_FIRST_NAMES[(totalCreated + i + m * 3) % SIMULATION_FIRST_NAMES.length];
            const mLast = SIMULATION_LAST_NAMES[(totalCreated + i + m * 5) % SIMULATION_LAST_NAMES.length];
            membersToInsert.push({
              registration_id: newReg.id,
              member_name: `[Simulasi] ${mFirst} ${mLast}`,
              member_role: `Anggota Regu ${m}`,
              institution: SCHOOL_NAME,
              is_leader: false,
            });
          }

          const { error: memErr } = await admin
            .from("registration_members")
            .insert(membersToInsert);

          if (memErr) console.warn("Simulation registration_members error:", memErr.message);
        }

        // Jika Duta Bahasa (multi-stage), daftarkan ke progress babak
        if (isDuta) {
          try {
            const { data: curProgData } = await admin
              .from("event_settings")
              .select("value")
              .eq("key", "duta_bahasa_progress")
              .maybeSingle();

            const progMap: Record<string, Record<string, any>> =
              ((curProgData?.value as unknown) as Record<string, Record<string, any>>) || {};

            progMap[participantId] = {
              "db-stage-1": {
                participantId,
                stageId: "db-stage-1",
                status: "lolos",
                score: 90,
                notes: "Berkas simulasi lolos verifikasi",
                reviewedAt: new Date().toISOString(),
              },
              "db-stage-2": {
                participantId,
                stageId: "db-stage-2",
                status: "menunggu",
                score: null,
                notes: "Menunggu penilaian wawancara dewan juri",
                reviewedAt: new Date().toISOString(),
              },
            };

            await admin.from("event_settings").upsert(
              {
                key: "duta_bahasa_progress",
                value: progMap as any,
                description: "Progress peserta seleksi Duta Bahasa per tahap",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "key" }
            );
          } catch (dutaErr) {
            console.warn("Duta bahasa progress simulation init error:", dutaErr);
          }
        }

        totalCreated++;
      }

      // Jika Duta Bahasa, pastikan ada tahap yang aktif dan butuh juri (Stage 2)
      if (isDuta) {
        try {
          const { data: dbSetting } = await admin
            .from("event_settings")
            .select("value")
            .eq("key", "duta_bahasa")
            .maybeSingle();

          const settingVal = dbSetting?.value as any;
          if (settingVal && Array.isArray(settingVal.stages)) {
            const updatedStages = settingVal.stages.map((stage: any) => ({
              ...stage,
              status: stage.stageOrder === 2 ? "active" : stage.stageOrder === 1 ? "completed" : "upcoming",
            }));
            await admin.from("event_settings").upsert(
              {
                key: "duta_bahasa",
                value: { ...settingVal, stages: updatedStages },
                description: "Pengaturan tahapan seleksi Duta Bahasa",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "key" }
            );
          }
        } catch {
          // Non-fatal
        }
      }
    }

    // Catat ke activity_logs
    try {
      await admin.from("activity_logs").insert({
        actor_id: profile?.full_name ? null : null,
        actor_role: "super_admin",
        action: "generate_simulasi_juri",
        entity: "simulation",
        entity_id: null,
        description: `Super Admin membuat ${totalCreated} peserta simulasi untuk sosialisasi juri (Asal Sekolah: ${SCHOOL_NAME})`,
        metadata: {
          totalCreated,
          competitionId: payload?.competitionId || "ALL",
          countPerComp: targetCount,
          school: SCHOOL_NAME,
          timestamp: new Date().toISOString(),
        } as any,
      });
    } catch {
      // Non-fatal
    }

    // Revalidasi seluruh halaman juri dan dashboard
    revalidatePath("/juri");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/pengaturan/simulasi-juri");

    return {
      success: true,
      countGenerated: totalCreated,
      message: `Berhasil membuat ${totalCreated} peserta simulasi dari ${SCHOOL_NAME} untuk sosialisasi juri.`,
    };
  } catch (err: unknown) {
    console.error("generateSimulationParticipants error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal membuat peserta simulasi.",
    };
  }
}

/**
 * Helper untuk menghapus data simulasi pada satu kompetisi secara aman dan bersih.
 */
async function cleanSimulationForCompetition(admin: any, competitionId?: string) {
  let simQuery = admin
    .from("registrations")
    .select("id, participant_id")
    .like("notes", "%[SIMULASI_JURI]%");

  if (competitionId) {
    simQuery = simQuery.eq("competition_id", competitionId);
  }

  const { data: simRegs } = await simQuery;
  if (!simRegs || simRegs.length === 0) return 0;

  const regIds: string[] = simRegs.map((r: any) => r.id);
  const partIds: string[] = Array.from(
    new Set(
      simRegs
        .map((r: any) => r.participant_id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
    )
  );

  // 1. Hapus nilai juri & skor
  const { data: assData } = await admin
    .from("assessments")
    .select("id")
    .in("registration_id", regIds);

  if (assData && assData.length > 0) {
    const assIds = assData.map((a: any) => a.id);
    await admin.from("assessment_scores").delete().in("assessment_id", assIds);
    await admin.from("assessments").delete().in("id", assIds);
  }

  // 2. Hapus stage_assessments di event_settings jika ada
  try {
    const { data: stRow } = await admin
      .from("event_settings")
      .select("value")
      .eq("key", "stage_assessments")
      .maybeSingle();

    if (stRow?.value && typeof stRow.value === "object") {
      const stMap = { ...(stRow.value as Record<string, any>) };
      let changed = false;
      for (const [key, val] of Object.entries(stMap)) {
        if (regIds.includes((val as any)?.registrationId)) {
          delete stMap[key];
          changed = true;
        }
      }
      if (changed) {
        await admin.from("event_settings").upsert({
          key: "stage_assessments",
          value: stMap as any,
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch {
    // Non-fatal
  }

  // 3. Hapus pemenang terkait
  await admin.from("winners").delete().in("registration_id", regIds);

  // 4. Hapus anggota tim
  await admin.from("registration_members").delete().in("registration_id", regIds);

  // 5. Hapus berkas dokumen peserta simulasi
  if (partIds.length > 0) {
    await admin.from("participant_documents").delete().in("participant_id", partIds);
  }

  // 6. Hapus pendaftaran
  await admin.from("registrations").delete().in("id", regIds);

  // 7. Hapus biodata peserta simulasi
  if (partIds.length > 0) {
    await admin
      .from("participants")
      .delete()
      .in("id", partIds)
      .like("registration_number", "SIM-JURI%");
  }

  // 8. Bersihkan dari duta_bahasa_progress
  if (partIds.length > 0) {
    try {
      const { data: curProgData } = await admin
        .from("event_settings")
        .select("value")
        .eq("key", "duta_bahasa_progress")
        .maybeSingle();

      if (curProgData?.value && typeof curProgData.value === "object") {
        const progMap = { ...(curProgData.value as Record<string, any>) };
        let modified = false;
        for (const pid of partIds) {
          if (progMap[pid]) {
            delete progMap[pid];
            modified = true;
          }
        }
        if (modified) {
          await admin.from("event_settings").upsert({
            key: "duta_bahasa_progress",
            value: progMap as any,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-fatal
    }
  }

  return regIds.length;
}

/**
 * Mengosongkan data peserta simulasi sosialisasi juri (dan nilai yang sempat diinput) agar lomba kembali bersih.
 */
export async function clearSimulationData(payload?: {
  competitionId?: string;
}): Promise<{
  success: boolean;
  countCleared?: number;
  message?: string;
  error?: string;
}> {
  try {
    const { profile } = await verifySuperAdmin();
    const admin = createAdminClient();

    const clearedCount = await cleanSimulationForCompetition(admin, payload?.competitionId);

    // Reset status tahapan Duta Bahasa ke kondisi awal jika semua dibersihkan
    if (!payload?.competitionId) {
      try {
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
          await admin.from("event_settings").upsert({
            key: "duta_bahasa",
            value: { ...settingVal, stages: resetStages },
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        // Non-fatal
      }
    }

    // Catat ke activity_logs
    try {
      await admin.from("activity_logs").insert({
        actor_id: null,
        actor_role: "super_admin",
        action: "reset_simulasi_juri",
        entity: "simulation",
        entity_id: null,
        description: `Super Admin mengosongkan data peserta simulasi sosialisasi juri (${clearedCount} pendaftaran dibersihkan, lomba kembali kosong)`,
        metadata: {
          clearedCount,
          competitionId: payload?.competitionId || "ALL",
          timestamp: new Date().toISOString(),
        } as any,
      });
    } catch {
      // Non-fatal
    }

    // Revalidasi seluruh halaman juri dan dashboard
    revalidatePath("/juri");
    revalidatePath("/dashboard/lomba");
    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/pengaturan/simulasi-juri");

    return {
      success: true,
      countCleared: clearedCount,
      message: `Berhasil mengosongkan ${clearedCount} pendaftar simulasi sosialisasi juri. Cabang lomba telah kembali bersih.`,
    };
  } catch (err: unknown) {
    console.error("clearSimulationData error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengosongkan data simulasi.",
    };
  }
}
