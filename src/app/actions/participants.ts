"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_COMPETITION_PER_PARTICIPANT = Number(
  process.env.NEXT_PUBLIC_MAX_COMPETITION_PER_PARTICIPANT || 3
);

const ParticipantSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  nickname: z.string().optional(),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(8, "Nomor telepon minimal 8 digit"),
  institution: z.string().min(2, "Nama instansi/sekolah wajib diisi"),
  birthDate: z.string().optional(),
  address: z.string().optional(),
});

const RegistrationSchema = z.object({
  participantId: z.string().uuid("ID Peserta tidak valid"),
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  teamName: z.string().optional(),
  teamMembers: z
    .array(
      z.object({
        name: z.string().min(2, "Nama anggota minimal 2 karakter"),
        role: z.enum(["ketua", "anggota"]).default("anggota"),
        studentId: z.string().optional(),
        institution: z.string().optional(),
      })
    )
    .optional(),
});

const VerifyDocumentSchema = z.object({
  documentId: z.string().uuid("ID Dokumen tidak valid"),
  participantId: z.string().uuid("ID Peserta tidak valid"),
  status: z.enum(["valid", "tidak_valid"]),
  note: z.string().optional(),
});

// Helper: Generate Nomor Registrasi GBB-{KODE_LOMBA}-{URUT}
export async function generateRegistrationNumber(competitionCode: string) {
  const code = competitionCode.toUpperCase().slice(0, 4);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `GBB-${code}-${randomSuffix}`;
}

export async function registerParticipant(data: z.infer<typeof ParticipantSchema>) {
  const parsed = ParticipantSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();
    const regNumber = `GBB-PES-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: participant, error } = await supabase
      .from("participants")
      .insert({
        registration_number: regNumber,
        full_name: parsed.data.fullName,
        nickname: parsed.data.nickname || null,
        email: parsed.data.email,
        phone: parsed.data.phone,
        institution: parsed.data.institution,
        birth_date: parsed.data.birthDate || null,
        address: parsed.data.address || null,
        status: "menunggu_verifikasi",
        total_points: 0,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/peserta");
    return { success: true, data: participant };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mendaftar peserta.";
    return { success: false, error: message };
  }
}

export async function enrollCompetition(data: z.infer<typeof RegistrationSchema>) {
  const parsed = RegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Sesi tidak valid. Silakan masuk kembali sebagai peserta." };
    }

    // Kepemilikan: policy RLS hanya menjamin "auth.uid() is not null", jadi validasi
    // bahwa participantId benar-benar milik akun ini harus dilakukan di sini.
    const { data: ownParticipant, error: ownErr } = await supabase
      .from("participants")
      .select("id, status")
      .eq("id", parsed.data.participantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownErr) {
      return { success: false, error: ownErr.message };
    }
    if (!ownParticipant) {
      return {
        success: false,
        error:
          "Data peserta Anda belum terdaftar pada sistem kepanitiaan. Lengkapi profil peserta atau hubungi panitia.",
      };
    }
    if (ownParticipant.status === "ditolak") {
      return { success: false, error: "Pendaftaran ditolak. Perbarui berkas persyaratan Anda lebih dulu." };
    }

    // Gerbang status: UI menyembunyikan tombol saat lomba tidak dibuka, namun
    // perintah langsung tetap harus ditolak agar status 'draft'/'selesai' tak bisa diselipki.
    const { data: competition, error: compErr } = await supabase
      .from("competitions")
      .select("id, name, status, type, min_team_members, max_team_members")
      .eq("id", parsed.data.competitionId)
      .maybeSingle();

    if (compErr) {
      return { success: false, error: compErr.message };
    }
    if (!competition) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }
    if (competition.status !== "pendaftaran") {
      return {
        success: false,
        error: `Pendaftaran lomba "${competition.name}" sedang tidak dibuka (status: ${competition.status}).`,
      };
    }

    // Validasi kuota tim untuk lomba berkelompok
    if (competition.type === "kelompok") {
      const memberCount = parsed.data.teamMembers?.length ?? 0;
      if (!parsed.data.teamName?.trim()) {
        return { success: false, error: "Nama tim wajib diisi untuk lomba berkelompok." };
      }
      if (memberCount < competition.min_team_members) {
        return {
          success: false,
          error: `Tim wajib memiliki minimal ${competition.min_team_members} anggota.`,
        };
      }
      if (competition.max_team_members > 0 && memberCount > competition.max_team_members) {
        return {
          success: false,
          error: `Tim boleh berisi maksimal ${competition.max_team_members} anggota.`,
        };
      }
    }

    // Validasi batas maksimal lomba per peserta
    const { count, error: countErr } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("participant_id", parsed.data.participantId);

    if (countErr) {
      return { success: false, error: countErr.message };
    }

    if ((count || 0) >= MAX_COMPETITION_PER_PARTICIPANT) {
      return {
        success: false,
        error: `Peserta telah mencapai batas maksimal pendaftaran (${MAX_COMPETITION_PER_PARTICIPANT} cabang lomba).`,
      };
    }

    // Cegah duplikasi lebih awal: unique (participant_id, competition_id) ada di database,
    // tapi pesan galinya perlu diterjemahkan agar dapat dimengerti peserta.
    const { data: duplicate } = await supabase
      .from("registrations")
      .select("id")
      .eq("participant_id", parsed.data.participantId)
      .eq("competition_id", parsed.data.competitionId)
      .maybeSingle();

    if (duplicate) {
      return { success: false, error: "Anda sudah terdaftar pada cabang lomba ini." };
    }

    // Insert pendaftaran
    const { data: reg, error: regErr } = await supabase
      .from("registrations")
      .insert({
        participant_id: parsed.data.participantId,
        competition_id: parsed.data.competitionId,
        team_name: parsed.data.teamName || null,
        is_confirmed: false,
      })
      .select()
      .single();

    if (regErr) {
      // 23505 = unique_violation (balapan submit ganda dari dua tab)
      if (regErr.code === "23505") {
        return { success: false, error: "Anda sudah terdaftar pada cabang lomba ini." };
      }
      return { success: false, error: regErr.message };
    }

    // Jika lomba kelompok, simpan anggota tim
    if (parsed.data.teamMembers && parsed.data.teamMembers.length > 0) {
      const membersToInsert = parsed.data.teamMembers.map((m) => ({
        registration_id: reg.id,
        member_name: m.name,
        member_role: m.role,
        student_id: m.studentId || null,
        institution: m.institution || null,
        is_leader: m.role === "ketua",
      }));

      await supabase.from("registration_members").insert(membersToInsert);
    }

    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/peserta/pendaftaran");
    revalidatePath("/peserta");
    revalidatePath("/lomba");
    return { success: true, data: reg };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mendaftar lomba.";
    return { success: false, error: message };
  }
}

export async function verifyParticipantDocument(data: z.infer<typeof VerifyDocumentSchema>) {
  const parsed = VerifyDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("participant_documents")
      .update({
        status: parsed.data.status,
        note: parsed.data.note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.documentId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat log aktivitas
    await supabase.from("activity_logs").insert({
      action: "verify_document",
      entity: "participant_document",
      entity_id: parsed.data.documentId,
      description: `Verifikasi berkas: ${parsed.data.status.toUpperCase()} ${
        parsed.data.note ? `(Catatan: ${parsed.data.note})` : ""
      }`,
    });

    // Update status peserta jika dokumen valid
    if (parsed.data.status === "valid") {
      await supabase
        .from("participants")
        .update({ status: "terverifikasi" })
        .eq("id", parsed.data.participantId);
    }

    revalidatePath("/dashboard/peserta/verifikasi");
    revalidatePath(`/dashboard/peserta/${parsed.data.participantId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memverifikasi dokumen.";
    return { success: false, error: message };
  }
}

export async function verifyParticipantRegistration(
  participantId: string,
  action: "approve" | "reject",
  rejectionReason?: string
) {
  try {
    const supabase = createAdminClient();

    if (action === "approve") {
      const { data: updatedPart, error: partErr } = await supabase
        .from("participants")
        .update({
          status: "terverifikasi",
          verified_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", participantId)
        .select();

      if (partErr) {
        return { success: false, error: partErr.message };
      }

      const { error: regErr } = await supabase
        .from("registrations")
        .update({ is_confirmed: true })
        .eq("participant_id", participantId);

      if (regErr) {
        console.error("Gagal update registrations:", regErr.message);
      }

      await supabase
        .from("participant_documents")
        .update({
          status: "valid",
          reviewed_at: new Date().toISOString(),
        })
        .eq("participant_id", participantId);

      try {
        await supabase.from("activity_logs").insert({
          action: "approve_participant",
          entity: "participant",
          entity_id: participantId,
          description: "Berkas dan pendaftaran peserta berhasil disetujui.",
        });
      } catch (logErr) {
        console.warn("Log activity error:", logErr);
      }
    } else {
      const reason = rejectionReason || "Berkas persyaratan tidak lengkap atau tidak valid.";

      const { error: partErr } = await supabase
        .from("participants")
        .update({
          status: "ditolak",
          rejection_reason: reason,
        })
        .eq("id", participantId);

      if (partErr) {
        return { success: false, error: partErr.message };
      }

      await supabase
        .from("registrations")
        .update({ is_confirmed: false })
        .eq("participant_id", participantId);

      await supabase
        .from("participant_documents")
        .update({
          status: "tidak_valid",
          note: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("participant_id", participantId);

      try {
        await supabase.from("activity_logs").insert({
          action: "reject_participant",
          entity: "participant",
          entity_id: participantId,
          description: `Pendaftaran dan berkas peserta ditolak. Alasan: ${reason}`,
        });
      } catch (logErr) {
        console.warn("Log activity error:", logErr);
      }
    }

    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/peserta/verifikasi");
    revalidatePath(`/dashboard/peserta/${participantId}`);
    revalidatePath("/peserta/pendaftaran");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses verifikasi berkas.";
    return { success: false, error: message };
  }
}

export interface TeamRegistrationRow {
  registrationId: string;
  participantId: string;
  registrationNumber: string;
  teamName: string;
  leaderName: string;
  competitionId: string;
  competitionName: string;
  institution: string;
  teamMembers: string[];
  status: "menunggu_verifikasi" | "terverifikasi" | "ditolak";
  registeredAt: string;
}

export interface GroupCompetitionItem {
  id: string;
  name: string;
  shortName: string;
  minMembers: number;
  maxMembers: number;
}

export async function getTeamRegistrationsData(): Promise<{
  success: boolean;
  teams: TeamRegistrationRow[];
  competitions: GroupCompetitionItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil seluruh kompetisi kelompok
    const { data: compRows, error: compErr } = await supabase
      .from("competitions")
      .select("id, name, short_name, min_team_members, max_team_members, type")
      .eq("type", "kelompok")
      .order("name");

    if (compErr) throw compErr;

    const groupComps: GroupCompetitionItem[] = (compRows || []).map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.short_name || c.name,
      minMembers: c.min_team_members || 2,
      maxMembers: c.max_team_members || 10,
    }));

    // 2. Ambil data pendaftaran tim
    let { data: regRows, error: regErr } = await supabase
      .from("registrations")
      .select(`
        id,
        competition_id,
        team_name,
        is_confirmed,
        notes,
        created_at,
        competitions (
          id,
          name,
          short_name,
          type
        ),
        participants (
          id,
          registration_number,
          full_name,
          institution,
          email,
          phone,
          status
        ),
        registration_members (
          id,
          member_name,
          member_role,
          is_leader
        )
      `)
      .order("created_at", { ascending: false });

    if (regErr) throw regErr;

    let filtered = (regRows || []).filter(
      (r: any) => r.competitions?.type === "kelompok" || Boolean(r.team_name)
    );

    const mappedTeams: TeamRegistrationRow[] = filtered.map((r: any) => {
      const part = r.participants;
      const comp = r.competitions;
      const members: string[] = (r.registration_members || []).map((m: any) =>
        m.is_leader ? `${m.member_name} (Ketua)` : m.member_name
      );

      return {
        registrationId: r.id,
        participantId: part?.id || "",
        registrationNumber: part?.registration_number || `REG-${r.id.substring(0, 8)}`,
        teamName: r.team_name || part?.full_name || "Tim Belum Bernama",
        leaderName: part?.full_name || "Ketua Tim",
        competitionId: r.competition_id || comp?.id || "",
        competitionName: comp?.name || "Cabang Beregu",
        institution: part?.institution || "-",
        teamMembers: members.length > 0 ? members : [part?.full_name || "Ketua Tim"],
        status: (part?.status || (r.is_confirmed ? "terverifikasi" : "menunggu_verifikasi")) as any,
        registeredAt: r.created_at || new Date().toISOString(),
      };
    });

    return {
      success: true,
      teams: mappedTeams,
      competitions: groupComps,
    };
  } catch (err: unknown) {
    console.error("Error getTeamRegistrationsData:", err);
    return {
      success: false,
      teams: [],
      competitions: [],
      error: err instanceof Error ? err.message : "Gagal memuat data pendaftaran tim.",
    };
  }
}

export async function createTeamRegistrationAdmin(input: {
  competitionId: string;
  teamName: string;
  leaderName: string;
  institution: string;
  email?: string;
  phone?: string;
  memberNames: string[];
  status?: "menunggu_verifikasi" | "terverifikasi";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: comp, error: cErr } = await supabase
      .from("competitions")
      .select("id, name, short_name, min_team_members, max_team_members")
      .eq("id", input.competitionId)
      .maybeSingle();

    if (cErr || !comp) {
      return { success: false, error: "Cabang lomba tidak ditemukan." };
    }

    const shortCode = comp.short_name
      ? comp.short_name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)
      : "TIM";
    const regNum = `GBB-${shortCode}-${Math.floor(100 + Math.random() * 900)}`;

    const email = input.email?.trim() || `tim.${Date.now()}@gebyarbulanbahasa.id`;
    const phone = input.phone?.trim() || "081234567890";
    const status = input.status || "terverifikasi";

    // 1. Simpan ketua di participants
    const { data: part, error: pErr } = await supabase
      .from("participants")
      .insert({
        registration_number: regNum,
        full_name: input.leaderName.trim(),
        institution: input.institution.trim(),
        email,
        phone,
        status,
        total_points: 0,
      })
      .select()
      .single();

    if (pErr) return { success: false, error: pErr.message };

    // 2. Simpan di registrations
    const { data: reg, error: rErr } = await supabase
      .from("registrations")
      .insert({
        participant_id: part.id,
        competition_id: input.competitionId,
        team_name: input.teamName.trim(),
        is_confirmed: status === "terverifikasi",
      })
      .select()
      .single();

    if (rErr) return { success: false, error: rErr.message };

    // 3. Simpan di registration_members
    const membersToInsert = [
      {
        registration_id: reg.id,
        member_name: input.leaderName.trim(),
        member_role: "ketua",
        is_leader: true,
        institution: input.institution.trim(),
      },
      ...input.memberNames
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
        .map((m) => ({
          registration_id: reg.id,
          member_name: m,
          member_role: "anggota",
          is_leader: false,
          institution: input.institution.trim(),
        })),
    ];

    const { error: mErr } = await supabase.from("registration_members").insert(membersToInsert);
    if (mErr) console.warn("Gagal simpan anggota:", mErr.message);

    try {
      await supabase.from("activity_logs").insert({
        action: "create_team_registration",
        entity: "registrations",
        entity_id: reg.id,
        description: `Pendaftaran tim baru "${input.teamName}" (${comp.name}) oleh Seksi Acara.`,
      });
    } catch {}

    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/lomba");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error createTeamRegistrationAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mendaftarkan tim baru.",
    };
  }
}

export async function updateTeamRegistrationAdmin(input: {
  registrationId: string;
  competitionId: string;
  teamName: string;
  leaderName: string;
  institution: string;
  memberNames: string[];
  status: "menunggu_verifikasi" | "terverifikasi" | "ditolak";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil pendaftaran
    const { data: reg, error: rErr } = await supabase
      .from("registrations")
      .select("id, participant_id, competition_id")
      .eq("id", input.registrationId)
      .maybeSingle();

    if (rErr || !reg) {
      return { success: false, error: "Pendaftaran tidak ditemukan." };
    }

    // 2. Update registrations
    const { error: upRegErr } = await supabase
      .from("registrations")
      .update({
        team_name: input.teamName.trim(),
        competition_id: input.competitionId,
        is_confirmed: input.status === "terverifikasi",
      })
      .eq("id", input.registrationId);

    if (upRegErr) return { success: false, error: upRegErr.message };

    // 3. Update participant
    if (reg.participant_id) {
      const { error: upPartErr } = await supabase
        .from("participants")
        .update({
          full_name: input.leaderName.trim(),
          institution: input.institution.trim(),
          status: input.status,
        })
        .eq("id", reg.participant_id);

      if (upPartErr) return { success: false, error: upPartErr.message };
    }

    // 4. Update registration_members: hapus lama, pasang baru
    await supabase.from("registration_members").delete().eq("registration_id", input.registrationId);

    const membersToInsert = [
      {
        registration_id: input.registrationId,
        member_name: input.leaderName.trim(),
        member_role: "ketua",
        is_leader: true,
        institution: input.institution.trim(),
      },
      ...input.memberNames
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
        .map((m) => ({
          registration_id: input.registrationId,
          member_name: m,
          member_role: "anggota",
          is_leader: false,
          institution: input.institution.trim(),
        })),
    ];

    await supabase.from("registration_members").insert(membersToInsert);

    try {
      await supabase.from("activity_logs").insert({
        action: "update_team_registration",
        entity: "registrations",
        entity_id: input.registrationId,
        description: `Pembaruan data tim "${input.teamName}" oleh Seksi Acara.`,
      });
    } catch {}

    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/lomba");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updateTeamRegistrationAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui data tim.",
    };
  }
}

export async function deleteTeamRegistrationAdmin(
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    const { data: reg, error: rErr } = await supabase
      .from("registrations")
      .select("id, participant_id, team_name")
      .eq("id", registrationId)
      .maybeSingle();

    if (rErr || !reg) {
      return { success: false, error: "Pendaftaran tim tidak ditemukan." };
    }

    // 1. Hapus anggota tim
    await supabase
      .from("registration_members")
      .delete()
      .eq("registration_id", registrationId);

    // 2. Hapus pendaftaran
    const { error: dErr } = await supabase
      .from("registrations")
      .delete()
      .eq("id", registrationId);

    if (dErr) return { success: false, error: dErr.message };

    // 3. Hapus participant jika hanya terdaftar di pendaftaran ini
    if (reg.participant_id) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", reg.participant_id);

      if ((count || 0) === 0) {
        await supabase
          .from("participants")
          .delete()
          .eq("id", reg.participant_id);
      }
    }

    try {
      await supabase.from("activity_logs").insert({
        action: "delete_team_registration",
        entity: "registrations",
        entity_id: registrationId,
        description: `Penghapusan pendaftaran tim "${reg.team_name || "Tim"}" oleh Seksi Acara.`,
      });
    } catch {}

    revalidatePath("/dashboard/pendaftaran");
    revalidatePath("/dashboard/peserta");
    revalidatePath("/dashboard/lomba");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error deleteTeamRegistrationAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus pendaftaran tim.",
    };
  }
}


