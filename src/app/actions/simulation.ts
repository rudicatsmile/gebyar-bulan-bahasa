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
  winnersCount: number;
  isFinalized: boolean;
}

export interface SimulationOverview {
  totalCompetitions: number;
  totalSimulationRegistrations: number;
  totalAssessmentsSubmitted: number;
  totalWinnersDeclared: number;
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
    throw new Error("Akses ditolak. Fitur Simulasi Juri & Panitia hanya dapat diakses oleh akun Super Admin.");
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

    // 5. Ambil data pemenang yang sudah terdaftar di tabel winners
    let simWinners: { id: string; competition_id: string | null; registration_id: string | null }[] = [];
    if (simRegIds.length > 0) {
      const { data: winData } = await admin
        .from("winners")
        .select("id, competition_id, registration_id")
        .in("registration_id", simRegIds);
      simWinners = winData || [];
    }

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

    const winnerCountMap: Record<string, number> = {};
    (simWinners || []).forEach((w) => {
      if (w.competition_id) {
        winnerCountMap[w.competition_id] = (winnerCountMap[w.competition_id] || 0) + 1;
      }
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
      winnersCount: winnerCountMap[c.id] || 0,
      isFinalized: c.status === "selesai",
    }));

    const overview: SimulationOverview = {
      totalCompetitions: competitionItems.length,
      totalSimulationRegistrations: simRegs?.length || 0,
      totalAssessmentsSubmitted: simAssessments.length,
      totalWinnersDeclared: simWinners.length,
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
        actor_id: null,
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
    revalidatePath("/dashboard/pemenang");
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
 * Otomatis mengisi nilai juri untuk keperluan sosialisasi panitia (rekap nilai & penetapan juara).
 * Jika peserta simulasi belum dibuat, otomatis dibuatkan terlebih dahulu.
 * Jika onlyIfEmpty = true, penilaian juri yang sudah diinput manual saat sosialisasi juri dipertahankan!
 */
export async function generateSimulationJudgeScores(payload?: {
  competitionId?: string;
  onlyIfEmpty?: boolean;
}): Promise<{
  success: boolean;
  message?: string;
  countScoresGenerated?: number;
  error?: string;
}> {
  try {
    const { profile } = await verifySuperAdmin();
    const admin = createAdminClient();

    // 1. Ambil kompetisi sasaran
    let compQuery = admin.from("competitions").select("id, name, slug, status");
    if (payload?.competitionId) {
      compQuery = compQuery.eq("id", payload.competitionId);
    }
    const { data: comps, error: compErr } = await compQuery;
    if (compErr) throw compErr;

    if (!comps || comps.length === 0) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }

    // 2. Ambil juri cadangan jika ada cabang lomba yang belum ditugaskan juri
    const { data: allJuriProfiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("role", "juri");

    const fallbackJudges = allJuriProfiles || [];

    let totalAssessmentsCreated = 0;

    for (const comp of comps) {
      // a. Ambil pendaftaran simulasi lomba ini
      let { data: simRegs } = await admin
        .from("registrations")
        .select("id, participant_id, performance_order")
        .eq("competition_id", comp.id)
        .like("notes", "%[SIMULASI_JURI]%")
        .order("performance_order", { ascending: true });

      // Jika belum ada pendaftar simulasi pada lomba ini, otomatis buatkan 3 peserta
      if (!simRegs || simRegs.length === 0) {
        await generateSimulationParticipants({
          competitionId: comp.id,
          countPerComp: 3,
        });

        const reQuery = await admin
          .from("registrations")
          .select("id, participant_id, performance_order")
          .eq("competition_id", comp.id)
          .like("notes", "%[SIMULASI_JURI]%")
          .order("performance_order", { ascending: true });
        simRegs = reQuery.data || [];
      }

      if (simRegs.length === 0) continue;

      // b. Ambil juri aktif untuk lomba ini
      const { data: cjList } = await admin
        .from("competition_judges")
        .select("judge_id")
        .eq("competition_id", comp.id)
        .eq("status", "aktif");

      let targetJudges = (cjList || []).map((cj) => cj.judge_id);

      // Jika lomba belum memiliki juri yang ditugaskan, gunakan 2 juri dari profil juri terdaftar
      if (targetJudges.length === 0 && fallbackJudges.length > 0) {
        targetJudges = fallbackJudges.slice(0, 2).map((j) => j.id);
      }

      if (targetJudges.length === 0) {
        console.warn(`Cabang lomba ${comp.name} tidak memiliki juri aktif.`);
        continue;
      }

      // c. Ambil kriteria penilaian lomba
      const { data: criteria } = await admin
        .from("competition_criteria")
        .select("id, name, weight, max_score")
        .eq("competition_id", comp.id)
        .order("sort_order", { ascending: true });

      const criteriaList = criteria && criteria.length > 0 ? criteria : [
        { id: "default-crit-1", name: "Penguasaan Materi & Teknik", weight: 40, max_score: 100 },
        { id: "default-crit-2", name: "Artikulasi & Penghayatan", weight: 35, max_score: 100 },
        { id: "default-crit-3", name: "Kreativitas & Penampilan", weight: 25, max_score: 100 },
      ];

      // d. Tentukan rentang nilai bertingkat agar terbentuk ranking alami (Juara 1, 2, 3...)
      // Peserta #1: 91 - 96
      // Peserta #2: 84 - 89
      // Peserta #3: 77 - 82
      // Peserta #4+: 71 - 76
      const baseScores = [93.5, 86.5, 79.5, 74.0, 71.0, 68.0];

      for (let rIdx = 0; rIdx < simRegs.length; rIdx++) {
        const reg = simRegs[rIdx];
        const participantTargetBase = baseScores[rIdx] || 72.0;

        for (let jIdx = 0; jIdx < targetJudges.length; jIdx++) {
          const judgeId = targetJudges[jIdx];

          // Jika opsi onlyIfEmpty aktif, cek apakah juri sudah mengisi nilai sebelumnya
          if (payload?.onlyIfEmpty) {
            const { data: existingAss } = await admin
              .from("assessments")
              .select("id")
              .eq("registration_id", reg.id)
              .eq("judge_id", judgeId)
              .maybeSingle();

            if (existingAss) {
              // Nilai asli dari juri dipertahankan!
              continue;
            }
          }

          // Variasi slight per juri (+/- 1.5) agar juri tidak memberikan nilai identik persis
          const judgeOffset = (jIdx === 0 ? 1.0 : -1.0) * (Math.random() * 1.5);
          let sumWeighted = 0;
          let sumWeight = 0;
          const scoresToInsert: { criterion_id: string; score: number; comment: string }[] = [];

          for (const crit of criteriaList) {
            const critWeight = Number(crit.weight) || 100 / criteriaList.length;
            const jitter = (Math.random() - 0.5) * 3; // -1.5 s.d. +1.5
            const finalScore = Math.min(99, Math.max(65, Math.round((participantTargetBase + judgeOffset + jitter) * 10) / 10));

            sumWeighted += finalScore * (critWeight / 100);
            sumWeight += critWeight;

            scoresToInsert.push({
              criterion_id: crit.id,
              score: finalScore,
              comment: `Penilaian simulasi aspek ${crit.name} (Peringkat #${rIdx + 1})`,
            });
          }

          const weightedTotal = sumWeight > 0 ? Math.round(sumWeighted * 100) / 100 : participantTargetBase;

          // Upsert assessment
          const { data: savedAss, error: aErr } = await admin
            .from("assessments")
            .upsert(
              {
                registration_id: reg.id,
                competition_id: comp.id,
                judge_id: judgeId,
                status: "terkirim",
                weighted_total: weightedTotal,
                notes: `[SIMULASI_JURI] Nilai simulasi sosialisasi juri & panitia (Peringkat #${rIdx + 1})`,
              },
              { onConflict: "registration_id,judge_id" }
            )
            .select("id")
            .single();

          if (aErr) {
            console.warn("Gagal simpan assessment simulasi:", aErr.message);
            continue;
          }

          // Hapus skor lama dan simpan skor kriteria baru
          await admin.from("assessment_scores").delete().eq("assessment_id", savedAss.id);

          const scorePayloads = scoresToInsert.map((s) => ({
            assessment_id: savedAss.id,
            criterion_id: s.criterion_id,
            score: s.score,
            comment: s.comment,
          }));

          const { error: sErr } = await admin.from("assessment_scores").insert(scorePayloads);
          if (sErr) {
            console.warn("Gagal simpan assessment_scores simulasi:", sErr.message);
          }

          totalAssessmentsCreated++;
        }
      }
    }

    // Catat ke activity_logs
    try {
      await admin.from("activity_logs").insert({
        actor_id: null,
        actor_role: "super_admin",
        action: "generate_simulasi_nilai_juri",
        entity: "simulation",
        entity_id: null,
        description: `Super Admin menghasilkan ${totalAssessmentsCreated} penilaian juri otomatis untuk simulasi rekap & penetapan juara panitia.`,
        metadata: {
          totalAssessmentsCreated,
          competitionId: payload?.competitionId || "ALL",
          timestamp: new Date().toISOString(),
        } as any,
      });
    } catch {
      // Non-fatal
    }

    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/pemenang");
    revalidatePath("/dashboard/pengaturan/simulasi-juri");

    return {
      success: true,
      countScoresGenerated: totalAssessmentsCreated,
      message: `Berhasil mengisi ${totalAssessmentsCreated} lembar penilaian juri. Data siap direkap dan ditetapkan juaranya oleh panitia/seksi acara.`,
    };
  } catch (err: unknown) {
    console.error("generateSimulationJudgeScores error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghasilkan nilai juri otomatis.",
    };
  }
}

/**
 * Mengosongkan data penetapan juara pada tabel winners dan membuka kembali kunci nilai (status ke 'pendaftaran').
 * Peserta simulasi dan nilai juri tetap aman sehingga panitia dapat mengulang latihan berkali-kali.
 */
export async function clearSimulationWinners(payload?: {
  competitionId?: string;
}): Promise<{
  success: boolean;
  countCleared?: number;
  message?: string;
  error?: string;
}> {
  try {
    await verifySuperAdmin();
    const admin = createAdminClient();

    let regQuery = admin
      .from("registrations")
      .select("id, competition_id")
      .like("notes", "%[SIMULASI_JURI]%");

    if (payload?.competitionId) {
      regQuery = regQuery.eq("competition_id", payload.competitionId);
    }

    const { data: simRegs } = await regQuery;
    const regIds = (simRegs || []).map((r) => r.id);

    let clearedWinnersCount = 0;

    // 1. Hapus entri pemenang terkait
    if (regIds.length > 0) {
      const { data: deletedWin, error: wErr } = await admin
        .from("winners")
        .delete()
        .in("registration_id", regIds)
        .select("id");

      if (wErr) throw wErr;
      clearedWinnersCount = deletedWin?.length || 0;
    } else if (!payload?.competitionId) {
      // Jika global dan tidak ada regIds spesifik, bersihkan tabel winners
      const { data: allDeletedWin } = await admin
        .from("winners")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000")
        .select("id");
      clearedWinnersCount = allDeletedWin?.length || 0;
    }

    // 2. Kembalikan status lomba dari 'selesai' ke 'pendaftaran' (membuka kembali kunci nilai)
    let compUpdateQuery = admin
      .from("competitions")
      .update({ status: "pendaftaran", updated_at: new Date().toISOString() });

    if (payload?.competitionId) {
      compUpdateQuery = compUpdateQuery.eq("id", payload.competitionId);
    } else {
      compUpdateQuery = compUpdateQuery.neq("id", "00000000-0000-0000-0000-000000000000");
    }

    await compUpdateQuery;

    // Catat ke activity_logs
    try {
      await admin.from("activity_logs").insert({
        actor_id: null,
        actor_role: "super_admin",
        action: "reset_simulasi_pemenang",
        entity: "simulation",
        entity_id: null,
        description: `Super Admin mengosongkan penetapan pemenang simulasi (${clearedWinnersCount} juara dihapus, status lomba dikembalikan ke 'pendaftaran')`,
        metadata: {
          clearedWinnersCount,
          competitionId: payload?.competitionId || "ALL",
          timestamp: new Date().toISOString(),
        } as any,
      });
    } catch {
      // Non-fatal
    }

    revalidatePath("/dashboard/penilaian");
    revalidatePath("/dashboard/pemenang");
    revalidatePath("/pemenang");
    revalidatePath("/dashboard/pengaturan/simulasi-juri");

    return {
      success: true,
      countCleared: clearedWinnersCount,
      message: `Berhasil mengosongkan ${clearedWinnersCount} penetapan juara lomba dan membuka kembali kunci nilai. Panitia dapat mengulang latihan penetapan juara.`,
    };
  } catch (err: unknown) {
    console.error("clearSimulationWinners error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengosongkan data pemenang.",
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
 * Mengosongkan data peserta simulasi sosialisasi juri (dan nilai serta juara yang sempat diinput) agar lomba kembali bersih total.
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
    await verifySuperAdmin();
    const admin = createAdminClient();

    const clearedCount = await cleanSimulationForCompetition(admin, payload?.competitionId);

    // Reset status lomba dari 'selesai' ke 'pendaftaran'
    let compResetQuery = admin
      .from("competitions")
      .update({ status: "pendaftaran", updated_at: new Date().toISOString() });

    if (payload?.competitionId) {
      compResetQuery = compResetQuery.eq("id", payload.competitionId);
    } else {
      compResetQuery = compResetQuery.neq("id", "00000000-0000-0000-0000-000000000000");
    }
    await compResetQuery;

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
        action: "reset_simulasi_juri_total",
        entity: "simulation",
        entity_id: null,
        description: `Super Admin mengosongkan seluruh data simulasi (${clearedCount} pendaftaran, nilai, dan penetapan juara dibersihkan, lomba kembali 0 pendaftar)`,
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
    revalidatePath("/dashboard/pemenang");
    revalidatePath("/pemenang");
    revalidatePath("/dashboard/pengaturan/simulasi-juri");

    return {
      success: true,
      countCleared: clearedCount,
      message: `Berhasil mengosongkan seluruh data simulasi (${clearedCount} pendaftar). Cabang lomba telah kembali bersih ke 0 pendaftar.`,
    };
  } catch (err: unknown) {
    console.error("clearSimulationData error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengosongkan data simulasi.",
    };
  }
}
