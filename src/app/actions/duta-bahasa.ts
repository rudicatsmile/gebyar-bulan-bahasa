"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ======================================================================
// TYPE DEFINITIONS
// ======================================================================

export interface DutaBahasaStage {
  id: string;
  stageOrder: number;
  title: string;
  description: string;
  stageDate: string; // ISO date string "2026-10-10"
  stageDayLabel: string; // "Sabtu, 10 Oktober 2026"
  status: "upcoming" | "active" | "completed";
}

export type DutaBahasaParticipantStatus =
  | "terdaftar"
  | "lolos"
  | "tidak_lolos"
  | "menunggu";

export interface DutaBahasaParticipantProgress {
  participantId: string;
  stageId: string;
  status: DutaBahasaParticipantStatus;
  score?: number | null;
  notes?: string;
  reviewedAt?: string;
}

export interface DutaBahasaParticipantInfo {
  participantId: string;
  fullName: string;
  institution: string;
  registrationNumber: string;
  currentStageId: string;
  currentStageOrder: number;
  overallStatus: "aktif" | "tereliminasi" | "finalis" | "pemenang";
  progress: Record<string, DutaBahasaParticipantProgress>; // stageId -> progress
}

// ======================================================================
// DEFAULT STAGE DEFINITIONS
// ======================================================================

const DEFAULT_STAGES: DutaBahasaStage[] = [
  {
    id: "db-stage-1",
    stageOrder: 1,
    title: "Pendaftaran dan Pengumpulan Berkas",
    description:
      "Tahap pendaftaran peserta Duta Bahasa dan Budaya. Peserta melengkapi formulir, berkas administrasi, dan foto resmi.",
    stageDate: "2026-10-10",
    stageDayLabel: "Sabtu, 10 Oktober 2026",
    status: "upcoming",
  },
  {
    id: "db-stage-2",
    stageOrder: 2,
    title: "Seleksi Administrasi, Wawancara, dan Paparan Visi-Misi, serta Program Unggulan",
    description:
      "Seleksi administrasi, wawancara, dan paparan visi-misi, serta program unggulan.",
    stageDate: "2026-10-17",
    stageDayLabel: "Sabtu, 17 Oktober 2026",
    status: "upcoming",
  },
  {
    id: "db-stage-3",
    stageOrder: 3,
    title: "Seleksi Akademik dan Unjuk Bakat",
    description:
      "Uji kemampuan akademik dan unjuk bakat di bidang bahasa, sastra, dan kebudayaan.",
    stageDate: "2026-10-24",
    stageDayLabel: "Sabtu, 24 Oktober 2026",
    status: "upcoming",
  },
  {
    id: "db-stage-4",
    stageOrder: 4,
    title: "Semi Final dan Pengumuman 3 Besar",
    description:
      "Semi final dan pengumuman tiga finalis terbaik yang berhak maju ke tahap Grand Final.",
    stageDate: "2026-10-31",
    stageDayLabel: "Sabtu, 31 Oktober 2026",
    status: "upcoming",
  },
  {
    id: "db-stage-5",
    stageOrder: 5,
    title: "Grand Final Penetapan Duta Bahasa",
    description:
      "Penampilan akhir dan penetapan Duta Bahasa terpilih di panggung utama acara.",
    stageDate: "2026-11-11",
    stageDayLabel: "Rabu, 11 November 2026",
    status: "upcoming",
  },
];

// ======================================================================
// GET STAGES
// ======================================================================

export async function getDutaBahasaStages(): Promise<{
  success: boolean;
  stages: DutaBahasaStage[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "duta_bahasa")
      .single();

    if (error || !data?.value) {
      // First time: seed defaults
      await supabase.from("event_settings").upsert(
        {
          key: "duta_bahasa",
          value: { stages: DEFAULT_STAGES } as any,
          description: "Konfigurasi tahapan lomba Duta Bahasa dan Budaya",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      return { success: true, stages: DEFAULT_STAGES };
    }

    const val = (data.value as unknown) as Record<string, unknown>;
    const stages = (val?.stages as DutaBahasaStage[]) || DEFAULT_STAGES;
    return { success: true, stages };
  } catch (err: unknown) {
    console.error("getDutaBahasaStages error:", err);
    return {
      success: true,
      stages: DEFAULT_STAGES,
      error: err instanceof Error ? err.message : "Gagal memuat tahapan.",
    };
  }
}

// ======================================================================
// SAVE STAGES (admin edit stage definitions & status)
// ======================================================================

export async function saveDutaBahasaStages(
  stages: DutaBahasaStage[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("event_settings").upsert(
      {
        key: "duta_bahasa",
        value: { stages } as any,
        description: "Konfigurasi tahapan lomba Duta Bahasa dan Budaya",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/lomba/duta-bahasa");
    revalidatePath("/lomba/duta-bahasa");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan tahapan.",
    };
  }
}

// ======================================================================
// GET PARTICIPANT PROGRESS
// ======================================================================

export async function getDutaBahasaProgress(): Promise<{
  success: boolean;
  participants: DutaBahasaParticipantInfo[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Get stage definitions
    const stagesResult = await getDutaBahasaStages();
    const stages = stagesResult.stages;

    // 2. Get saved progress data from event_settings
    const { data: progressData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "duta_bahasa_progress")
      .maybeSingle();

    const progressMap: Record<
      string,
      Record<string, DutaBahasaParticipantProgress>
    > = ((progressData?.value as unknown) as Record<string, Record<string, DutaBahasaParticipantProgress>>) || {};

    // 3. Get all participants registered in Duta Bahasa from public.registrations
    const { data: dutaComps } = await supabase
      .from("competitions")
      .select("id")
      .or("name.ilike.%Duta Bahasa%,slug.eq.pidato,slug.ilike.%duta%");

    const dutaCompIds = (dutaComps || []).map((c) => c.id);

    let registeredParticipantIds: string[] = [];
    if (dutaCompIds.length > 0) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("participant_id")
        .in("competition_id", dutaCompIds);
      registeredParticipantIds = (regs || []).map((r) => r.participant_id).filter(Boolean);
    }

    // 4. Combine participant IDs from progressMap AND registeredParticipantIds
    const allParticipantIds = Array.from(
      new Set([...Object.keys(progressMap), ...registeredParticipantIds])
    );

    if (allParticipantIds.length === 0) {
      return { success: true, participants: [] };
    }

    // 5. Fetch participant details
    const { data: participantsData } = await supabase
      .from("participants")
      .select("id, full_name, institution, registration_number")
      .in("id", allParticipantIds);

    const participantLookup: Record<
      string,
      { fullName: string; institution: string; registrationNumber: string }
    > = {};

    (participantsData || []).forEach((p) => {
      participantLookup[p.id] = {
        fullName: p.full_name,
        institution: p.institution || "",
        registrationNumber: p.registration_number,
      };
    });

    // 6. Build participant info & progress per stage
    const firstStageId = stages[0]?.id || "db-stage-1";

    const participants: DutaBahasaParticipantInfo[] = allParticipantIds
      .filter((pid) => participantLookup[pid])
      .map((pid) => {
        const info = participantLookup[pid];
        const progress: Record<string, DutaBahasaParticipantProgress> = { ...(progressMap[pid] || {}) };

        // Ensure Stage 1 progress exists by default for every registered participant
        if (!progress[firstStageId]) {
          progress[firstStageId] = {
            participantId: pid,
            stageId: firstStageId,
            status: "terdaftar",
            score: null,
            notes: "Terdaftar pada pendaftaran awal Duta Bahasa",
            reviewedAt: new Date().toISOString(),
          };
        }

        // Auto-propagate progress to subsequent stages if previous stage is "lolos"
        for (let i = 0; i < stages.length - 1; i++) {
          const currentStage = stages[i];
          const nextStage = stages[i + 1];

          const currentProg = progress[currentStage.id];
          if (currentProg && currentProg.status === "lolos" && !progress[nextStage.id]) {
            progress[nextStage.id] = {
              participantId: pid,
              stageId: nextStage.id,
              status: "menunggu",
              score: null,
              notes: `Lolos dari tahap ${currentStage.stageOrder} (${currentStage.title})`,
              reviewedAt: new Date().toISOString(),
            };
          }
        }

        // Determine current stage & overall status
        let currentStageId = firstStageId;
        let currentStageOrder = 1;
        let overallStatus: DutaBahasaParticipantInfo["overallStatus"] = "aktif";

        for (const stage of stages) {
          const stageProgress = progress[stage.id];
          if (stageProgress) {
            currentStageId = stage.id;
            currentStageOrder = stage.stageOrder;

            if (stageProgress.status === "tidak_lolos") {
              overallStatus = "tereliminasi";
              break;
            }
            if (stage.stageOrder === 4 && stageProgress.status === "lolos") {
              overallStatus = "finalis";
            }
            if (stage.stageOrder === 5 && stageProgress.status === "lolos") {
              overallStatus = "pemenang";
            }
          }
        }

        return {
          participantId: pid,
          fullName: info.fullName,
          institution: info.institution,
          registrationNumber: info.registrationNumber,
          currentStageId,
          currentStageOrder,
          overallStatus,
          progress,
        };
      });

    return { success: true, participants };
  } catch (err: unknown) {
    console.error("getDutaBahasaProgress error:", err);
    return {
      success: true,
      participants: [],
      error: err instanceof Error ? err.message : "Gagal memuat progress.",
    };
  }
}

// ======================================================================
// UPDATE PARTICIPANT STAGE STATUS (admin action)
// ======================================================================

export async function updateParticipantStageStatus(input: {
  participantId: string;
  stageId: string;
  status: DutaBahasaParticipantStatus;
  score?: number | null;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Validate: target stage exists
    const stagesResult = await getDutaBahasaStages();
    const stages = stagesResult.stages;
    const targetStage = stages.find((s) => s.id === input.stageId);
    if (!targetStage) {
      return { success: false, error: "Tahapan tidak ditemukan." };
    }

    // 2. Get current progress
    const { data: progressData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "duta_bahasa_progress")
      .single();

    const progressMap: Record<
      string,
      Record<string, DutaBahasaParticipantProgress>
    > = ((progressData?.value as unknown) as Record<string, Record<string, DutaBahasaParticipantProgress>>) || {};

    const participantProgress = progressMap[input.participantId] || {};

    // 3. Check prerequisites: all previous stages must be "lolos"
    if (targetStage.stageOrder > 1) {
      for (const stage of stages) {
        if (stage.stageOrder >= targetStage.stageOrder) break;
        const prevProgress = participantProgress[stage.id];
        if (!prevProgress || prevProgress.status !== "lolos") {
          return {
            success: false,
            error: `Peserta belum lolos tahap "${stage.title}" (tahap ${stage.stageOrder}). Tidak bisa mengupdate tahap ${targetStage.stageOrder}.`,
          };
        }
      }
    }

    // 4. Update progress
    participantProgress[input.stageId] = {
      participantId: input.participantId,
      stageId: input.stageId,
      status: input.status,
      score: input.score ?? null,
      notes: input.notes || "",
      reviewedAt: new Date().toISOString(),
    };

    progressMap[input.participantId] = participantProgress;

    // 5. Save to event_settings
    const { error } = await supabase.from("event_settings").upsert(
      {
        key: "duta_bahasa_progress",
        value: progressMap as any,
        description: "Progress peserta per tahapan lomba Duta Bahasa dan Budaya",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/lomba/duta-bahasa");
    revalidatePath("/lomba/duta-bahasa");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal update status peserta.",
    };
  }
}

// ======================================================================
// ADD PARTICIPANT TO DUTA BAHASA (register to stage 1)
// ======================================================================

export async function addParticipantToDutaBahasa(
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Verify participant exists
    const { data: participant, error: pErr } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("id", participantId)
      .single();

    if (pErr || !participant) {
      return { success: false, error: "Peserta tidak ditemukan." };
    }

    // Get stages
    const stagesResult = await getDutaBahasaStages();
    const firstStage = stagesResult.stages[0];
    if (!firstStage) {
      return { success: false, error: "Tahapan belum dikonfigurasi." };
    }

    // Get current progress
    const { data: progressData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "duta_bahasa_progress")
      .single();

    const progressMap: Record<
      string,
      Record<string, DutaBahasaParticipantProgress>
    > = ((progressData?.value as unknown) as Record<string, Record<string, DutaBahasaParticipantProgress>>) || {};

    if (progressMap[participantId]) {
      return { success: false, error: "Peserta sudah terdaftar di Duta Bahasa." };
    }

    // Register to first stage
    progressMap[participantId] = {
      [firstStage.id]: {
        participantId,
        stageId: firstStage.id,
        status: "terdaftar",
        score: null,
        notes: "",
        reviewedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from("event_settings").upsert(
      {
        key: "duta_bahasa_progress",
        value: progressMap as any,
        description: "Progress peserta per tahapan lomba Duta Bahasa dan Budaya",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/lomba/duta-bahasa");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menambahkan peserta.",
    };
  }
}

// ======================================================================
// REMOVE PARTICIPANT FROM DUTA BAHASA
// ======================================================================

export async function removeParticipantFromDutaBahasa(
  participantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: progressData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", "duta_bahasa_progress")
      .single();

    const progressMap: Record<
      string,
      Record<string, DutaBahasaParticipantProgress>
    > = ((progressData?.value as unknown) as Record<string, Record<string, DutaBahasaParticipantProgress>>) || {};

    delete progressMap[participantId];

    const { error } = await supabase.from("event_settings").upsert(
      {
        key: "duta_bahasa_progress",
        value: progressMap as any,
        description: "Progress peserta per tahapan lomba Duta Bahasa dan Budaya",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/lomba/duta-bahasa");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus peserta.",
    };
  }
}
