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
