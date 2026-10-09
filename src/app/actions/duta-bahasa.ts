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
  requiresJudge?: boolean; // NEW: Apakah tahapan ini memerlukan penilaian juri
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

export interface DutaBahasaUploadedDoc {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  status: "menunggu" | "valid" | "tidak_valid" | string;
  note?: string | null;
  uploadedAt: string;
}

export interface DutaBahasaTeamMember {
  id?: string;
  name: string;
  role?: string;
  isLeader?: boolean;
}

export interface DutaBahasaParticipantInfo {
  participantId: string;
  fullName: string;
  teamName?: string;
  members?: DutaBahasaTeamMember[];
  institution: string;
  registrationNumber: string;
  currentStageId: string;
  currentStageOrder: number;
  overallStatus: "aktif" | "tereliminasi" | "finalis" | "pemenang";
  progress: Record<string, DutaBahasaParticipantProgress>; // stageId -> progress
  documents?: DutaBahasaUploadedDoc[];
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
    requiresJudge: false, // Berkas administrasi tidak perlu juri
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
    requiresJudge: true, // Wawancara perlu juri
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
    requiresJudge: true, // Unjuk bakat perlu juri
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
    requiresJudge: true, // Semifinal perlu juri
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
    requiresJudge: true, // Grand final perlu juri
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
    const rawStages = (val?.stages as DutaBahasaStage[]) || DEFAULT_STAGES;
    const stages: DutaBahasaStage[] = rawStages.map((s) => ({
      ...s,
      requiresJudge: s.requiresJudge !== undefined ? Boolean(s.requiresJudge) : (s.stageOrder !== 1),
    }));
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
// GENERIC GET & SAVE STAGES FOR ANY MULTI-STAGE COMPETITION
// ======================================================================

export async function getCompetitionStages(
  competitionSlugOrId: string
): Promise<{ success: boolean; stages: DutaBahasaStage[]; error?: string }> {
  const isDuta =
    competitionSlugOrId === "duta-bahasa" ||
    competitionSlugOrId === "pidato" ||
    competitionSlugOrId.toLowerCase().includes("duta");

  if (isDuta) {
    return getDutaBahasaStages();
  }

  try {
    const supabase = createAdminClient();
    const key = `stages_${competitionSlugOrId.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
    const { data } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (data?.value && typeof data.value === "object" && "stages" in (data.value as any)) {
      const rawStages = (data.value as any).stages as DutaBahasaStage[];
      const stages: DutaBahasaStage[] = rawStages.map((s) => ({
        ...s,
        requiresJudge: s.requiresJudge !== undefined ? Boolean(s.requiresJudge) : (s.stageOrder !== 1),
      }));
      return { success: true, stages };
    }

    // Default template for a new multi-stage competition
    const defaultMultiStages: DutaBahasaStage[] = [
      {
        id: `stage-1-${competitionSlugOrId}`,
        stageOrder: 1,
        title: "Pendaftaran dan Seleksi Berkas",
        description: "Pengumpulan berkas pendaftaran dan verifikasi administrasi.",
        stageDate: "2026-10-15",
        stageDayLabel: "Kamis, 15 Oktober 2026",
        status: "active",
        requiresJudge: false,
      },
      {
        id: `stage-2-${competitionSlugOrId}`,
        stageOrder: 2,
        title: "Babak Penyisihan",
        description: "Penilaian penampilan atau karya oleh dewan juri.",
        stageDate: "2026-10-25",
        stageDayLabel: "Minggu, 25 Oktober 2026",
        status: "upcoming",
        requiresJudge: true,
      },
      {
        id: `stage-3-${competitionSlugOrId}`,
        stageOrder: 3,
        title: "Grand Final",
        description: "Babak final penentuan pemenang dan juara kompetisi.",
        stageDate: "2026-11-10",
        stageDayLabel: "Selasa, 10 November 2026",
        status: "upcoming",
        requiresJudge: true,
      },
    ];

    return { success: true, stages: defaultMultiStages };
  } catch (err: unknown) {
    return {
      success: true,
      stages: DEFAULT_STAGES,
      error: err instanceof Error ? err.message : "Gagal memuat tahapan.",
    };
  }
}

export async function saveCompetitionStages(
  competitionSlugOrId: string,
  stages: DutaBahasaStage[]
): Promise<{ success: boolean; error?: string }> {
  const isDuta =
    competitionSlugOrId === "duta-bahasa" ||
    competitionSlugOrId === "pidato" ||
    competitionSlugOrId.toLowerCase().includes("duta");

  if (isDuta) {
    return saveDutaBahasaStages(stages);
  }

  try {
    const supabase = createAdminClient();
    const key = `stages_${competitionSlugOrId.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
    const { error } = await supabase.from("event_settings").upsert(
      {
        key,
        value: { stages } as any,
        description: `Konfigurasi tahapan lomba ${competitionSlugOrId}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/lomba");
    revalidatePath(`/dashboard/lomba/${competitionSlugOrId}`);
    revalidatePath(`/juri/lomba/${competitionSlugOrId}`);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan tahapan lomba.",
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
    revalidatePath("/juri");
    revalidatePath("/juri/lomba/pidato");
    revalidatePath("/juri/lomba/duta-bahasa");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan tahapan.",
    };
  }
}

// ======================================================================
// RESET STAGES TO DEFAULT
// ======================================================================

export async function resetDutaBahasaStagesToDefault(): Promise<{
  success: boolean;
  stages: DutaBahasaStage[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("event_settings").upsert(
      {
        key: "duta_bahasa",
        value: { stages: DEFAULT_STAGES } as any,
        description: "Konfigurasi tahapan lomba Duta Bahasa dan Budaya",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return { success: false, stages: DEFAULT_STAGES, error: error.message };
    }

    revalidatePath("/dashboard/lomba/duta-bahasa");
    revalidatePath("/lomba/duta-bahasa");
    revalidatePath("/juri");
    revalidatePath("/juri/lomba/pidato");
    revalidatePath("/juri/lomba/duta-bahasa");
    return { success: true, stages: DEFAULT_STAGES };
  } catch (err: unknown) {
    return {
      success: false,
      stages: DEFAULT_STAGES,
      error: err instanceof Error ? err.message : "Gagal mereset tahapan ke default.",
    };
  }
}

// ======================================================================
// GET DEFAULT STAGES (ASYNC FOR "use server")
// ======================================================================

export async function getDefaultDutaBahasaStages(): Promise<DutaBahasaStage[]> {
  return DEFAULT_STAGES;
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
    let regsData: Array<{ id: string; participant_id: string; team_name: string | null }> = [];
    if (dutaCompIds.length > 0) {
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, participant_id, team_name")
        .in("competition_id", dutaCompIds);
      regsData = regs || [];
      registeredParticipantIds = regsData.map((r) => r.participant_id).filter(Boolean);
    }

    // 4. Combine participant IDs from progressMap AND registeredParticipantIds
    const allParticipantIds = Array.from(
      new Set([...Object.keys(progressMap), ...registeredParticipantIds])
    );

    if (allParticipantIds.length === 0) {
      return { success: true, participants: [] };
    }

    // 5. Fetch participant details, documents, and team members in parallel
    const regIds = regsData.map((r) => r.id).filter(Boolean);
    const [participantsDataRes, docsDataRes, membersDataRes] = await Promise.all([
      supabase
        .from("participants")
        .select("id, full_name, institution, registration_number")
        .in("id", allParticipantIds),
      supabase
        .from("participant_documents")
        .select("id, participant_id, doc_type, file_name, file_url, status, note, uploaded_at")
        .in("participant_id", allParticipantIds)
        .order("uploaded_at", { ascending: false }),
      regIds.length > 0
        ? supabase
            .from("registration_members")
            .select("id, registration_id, member_name, member_role, institution, is_leader")
            .in("registration_id", regIds)
        : Promise.resolve({ data: [] }),
    ]);

    const participantLookup: Record<
      string,
      { fullName: string; institution: string; registrationNumber: string }
    > = {};

    (participantsDataRes.data || []).forEach((p) => {
      participantLookup[p.id] = {
        fullName: p.full_name,
        institution: p.institution || "",
        registrationNumber: p.registration_number,
      };
    });

    const teamInfoByParticipantId: Record<
      string,
      { teamName: string; members: DutaBahasaTeamMember[] }
    > = {};

    regsData.forEach((r) => {
      const teamMembers: DutaBahasaTeamMember[] = (((membersDataRes.data as any[]) || []))
        .filter((m) => m.registration_id === r.id)
        .map((m) => ({
          id: m.id,
          name: m.member_name,
          role: m.member_role || (m.is_leader ? "Ketua" : "Anggota"),
          isLeader: m.is_leader,
        }));

      teamInfoByParticipantId[r.participant_id] = {
        teamName: r.team_name || "",
        members: teamMembers,
      };
    });

    const docsByParticipant: Record<string, DutaBahasaUploadedDoc[]> = {};
    (docsDataRes.data || []).forEach((d) => {
      if (!docsByParticipant[d.participant_id]) {
        docsByParticipant[d.participant_id] = [];
      }
      docsByParticipant[d.participant_id].push({
        id: d.id,
        docType: d.doc_type || "berkas",
        fileName: d.file_name || "Dokumen",
        fileUrl: d.file_url || "#",
        status: d.status || "menunggu",
        note: d.note,
        uploadedAt: d.uploaded_at || new Date().toISOString(),
      });
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

        const teamData = teamInfoByParticipantId[pid];
        const teamName = teamData?.teamName || info.fullName;
        let members = teamData?.members || [];
        if (members.length === 0) {
          members = [{ name: info.fullName, role: "Ketua", isLeader: true }];
        }

        return {
          participantId: pid,
          fullName: info.fullName,
          teamName,
          members,
          institution: info.institution,
          registrationNumber: info.registrationNumber,
          currentStageId,
          currentStageOrder,
          overallStatus,
          progress,
          documents: docsByParticipant[pid] || [],
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

// ======================================================================
// SEARCH ELIGIBLE DUTA BAHASA CANDIDATES (FROM REGISTRATIONS / DASHBOARD PENDAFTARAN)
// ======================================================================

export interface DutaBahasaCandidate {
  registrationId: string;
  participantId: string;
  registrationNumber: string;
  teamName: string | null;
  leaderName: string;
  institution: string;
  competitionName: string;
  status: string;
  members: string[];
}

export async function searchDutaBahasaRegistrationCandidates(
  query: string = ""
): Promise<{
  success: boolean;
  candidates: DutaBahasaCandidate[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil ID kompetisi Duta Bahasa
    const { data: dutaComps, error: compErr } = await supabase
      .from("competitions")
      .select("id, name, slug")
      .or("name.ilike.%Duta Bahasa%,slug.eq.pidato,slug.ilike.%duta%");

    if (compErr) throw compErr;

    const dutaCompIds = (dutaComps || []).map((c) => c.id);
    if (dutaCompIds.length === 0) {
      return { success: true, candidates: [] };
    }

    // 2. Ambil data pendaftaran yang terdaftar di cabang lomba Duta Bahasa (sama seperti di /dashboard/pendaftaran)
    const { data: regs, error: regErr } = await supabase
      .from("registrations")
      .select(`
        id,
        team_name,
        competition_id,
        is_confirmed,
        competitions (
          id,
          name,
          slug
        ),
        participants (
          id,
          registration_number,
          full_name,
          institution,
          status
        ),
        registration_members (
          id,
          member_name,
          member_role,
          is_leader
        )
      `)
      .in("competition_id", dutaCompIds)
      .order("created_at", { ascending: false });

    if (regErr) throw regErr;

    const candidates: DutaBahasaCandidate[] = (regs || [])
      .filter((r: any) => r.participants && r.participants.id)
      .map((r: any) => {
        const part = r.participants;
        const comp = r.competitions;
        const members: string[] = (r.registration_members || []).map((m: any) =>
          m.is_leader ? `${m.member_name} (Ketua)` : m.member_name
        );

        return {
          registrationId: r.id,
          participantId: part.id,
          registrationNumber: part.registration_number || `REG-${r.id.substring(0, 8)}`,
          teamName: r.team_name || null,
          leaderName: part.full_name || "Peserta",
          institution: part.institution || "-",
          competitionName: comp?.name || "Duta Bahasa",
          status: part.status || (r.is_confirmed ? "terverifikasi" : "menunggu_verifikasi"),
          members,
        };
      });

    // 3. Filter berdasarkan kata kunci pencarian (jika diisi)
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      return {
        success: true,
        candidates: candidates.filter(
          (c) =>
            (c.teamName && c.teamName.toLowerCase().includes(q)) ||
            c.leaderName.toLowerCase().includes(q) ||
            c.institution.toLowerCase().includes(q) ||
            c.registrationNumber.toLowerCase().includes(q) ||
            c.members.some((m) => m.toLowerCase().includes(q))
        ),
      };
    }

    return {
      success: true,
      candidates,
    };
  } catch (err: unknown) {
    console.error("searchDutaBahasaRegistrationCandidates error:", err);
    return {
      success: false,
      candidates: [],
      error: err instanceof Error ? err.message : "Gagal memuat kandidat pendaftar Duta Bahasa.",
    };
  }
}

// ======================================================================
// GET MULTI-STAGE COMPETITION STATE & ACTIVE STAGE (GENERIC HELPER)
// ======================================================================

export async function getMultiStageCompetitionState(
  competitionSlugOrId: string
): Promise<{
  success: boolean;
  stages: DutaBahasaStage[];
  activeStage: DutaBahasaStage | null;
  participants: DutaBahasaParticipantInfo[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil tahapan untuk kompetisi ini
    const stagesRes = await getCompetitionStages(competitionSlugOrId);
    const stages = stagesRes.stages || [];

    // 2. Deteksi tahap yang berstatus "active"
    let activeStage = stages.find((s) => s.status === "active") || null;
    // Fallback jika belum ada yang diset active: cari tahap pertama yang bukan completed, atau tahap 1
    if (!activeStage && stages.length > 0) {
      activeStage = stages.find((s) => s.status !== "completed") || stages[0];
    }

    // 3. Cek apakah ini Duta Bahasa / Pidato
    const isDuta =
      competitionSlugOrId === "duta-bahasa" ||
      competitionSlugOrId === "pidato" ||
      competitionSlugOrId.toLowerCase().includes("duta");

    if (isDuta) {
      const progressRes = await getDutaBahasaProgress();
      return {
        success: true,
        stages,
        activeStage,
        participants: progressRes.participants || [],
      };
    }

    // Generic multi-stage competition
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      competitionSlugOrId
    );
    let compQuery = supabase.from("competitions").select("id, slug, name");
    if (isUuid) compQuery = compQuery.eq("id", competitionSlugOrId);
    else compQuery = compQuery.eq("slug", competitionSlugOrId);
    const { data: comp } = await compQuery.maybeSingle();

    if (!comp) {
      return {
        success: false,
        stages,
        activeStage,
        participants: [],
        error: "Cabang lomba tidak ditemukan",
      };
    }

    // Ambil progress dari event_settings key `progress_${comp.slug}`
    const progressKey = `progress_${comp.slug.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}`;
    const { data: progressSetting } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", progressKey)
      .maybeSingle();

    const progressMap: Record<string, Record<string, DutaBahasaParticipantProgress>> =
      (progressSetting?.value as any) || {};

    // Ambil registrasi lomba ini
    const { data: regs } = await supabase
      .from("registrations")
      .select("participant_id, id, team_name")
      .eq("competition_id", comp.id);

    const participantIds = (regs || []).map((r) => r.participant_id).filter(Boolean);
    const allParticipantIds = Array.from(new Set([...Object.keys(progressMap), ...participantIds]));

    if (allParticipantIds.length === 0) {
      return { success: true, stages, activeStage, participants: [] };
    }

    const { data: parts } = await supabase
      .from("participants")
      .select("id, full_name, institution, registration_number")
      .in("id", allParticipantIds);

    const firstStageId = stages[0]?.id || "stage-1";
    const mappedParticipants: DutaBahasaParticipantInfo[] = (parts || []).map((p) => {
      const pProgress = { ...(progressMap[p.id] || {}) };
      if (!pProgress[firstStageId]) {
        pProgress[firstStageId] = {
          participantId: p.id,
          stageId: firstStageId,
          status: "menunggu",
          score: null,
          notes: "Terdaftar pada babak awal",
          reviewedAt: new Date().toISOString(),
        };
      }

      // Propagate lolos
      for (let i = 0; i < stages.length - 1; i++) {
        const cur = stages[i];
        const nxt = stages[i + 1];
        if (pProgress[cur.id]?.status === "lolos" && !pProgress[nxt.id]) {
          pProgress[nxt.id] = {
            participantId: p.id,
            stageId: nxt.id,
            status: "menunggu",
            score: null,
            notes: `Lolos dari ${cur.title}`,
            reviewedAt: new Date().toISOString(),
          };
        }
      }

      let curStageId = firstStageId;
      let curStageOrder = 1;
      let overallStatus: DutaBahasaParticipantInfo["overallStatus"] = "aktif";

      for (const stg of stages) {
        if (pProgress[stg.id]) {
          curStageId = stg.id;
          curStageOrder = stg.stageOrder;
          if (pProgress[stg.id].status === "tidak_lolos") {
            overallStatus = "tereliminasi";
            break;
          }
        }
      }

      return {
        participantId: p.id,
        fullName: p.full_name,
        institution: p.institution || "",
        registrationNumber: p.registration_number,
        currentStageId: curStageId,
        currentStageOrder: curStageOrder,
        overallStatus,
        progress: pProgress,
      };
    });

    return {
      success: true,
      stages,
      activeStage,
      participants: mappedParticipants,
    };
  } catch (err: unknown) {
    console.error("getMultiStageCompetitionState error:", err);
    return {
      success: false,
      stages: [],
      activeStage: null,
      participants: [],
      error: err instanceof Error ? err.message : "Gagal memuat status multi-stage.",
    };
  }
}

