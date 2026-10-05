import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Participant } from "@/lib/dummy-data";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: dbParticipants, error } = await supabase
      .from("participants")
      .select(`
        id,
        user_id,
        registration_number,
        full_name,
        nickname,
        email,
        phone,
        institution,
        status,
        total_points,
        rejection_reason,
        created_at,
        profiles:user_id (
          role
        ),
        registrations (
          id,
          team_name,
          is_confirmed,
          competition_id,
          competitions (
            id,
            name,
            slug,
            type
          ),
          registration_members (
            id,
            member_name,
            member_role,
            is_leader
          )
        ),
        participant_documents (
          id,
          doc_type,
          file_name,
          file_url,
          status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API GET /api/participants error:", error.message);
      return NextResponse.json(
        { success: false, error: error.message, participants: [], count: 0 },
        { status: 500 }
      );
    }

    // Filter hanya user dengan role 'peserta' (atau berkas peserta tanpa akun profiles)
    const filteredDbParticipants = (dbParticipants || []).filter((row: any) => {
      if (row.profiles && row.profiles.role) {
        return row.profiles.role === "peserta";
      }
      return true;
    });

    // Map database participants to Participant model
    const mappedDbParticipants: Participant[] = filteredDbParticipants.map((row: any) => {
      // Cabang lomba pertama jika ada pendaftaran
      const firstReg = row.registrations && row.registrations.length > 0 ? row.registrations[0] : null;
      const compName = firstReg?.competitions?.name || "Belum Memilih Lomba";
      const compId = firstReg?.competition_id || "";
      const isKelompok = firstReg?.competitions?.type === "kelompok" || !!firstReg?.team_name;
      const category: "individu" | "kelompok" = isKelompok ? "kelompok" : "individu";

      // Team members formatting
      const members: string[] = [];
      if (firstReg?.registration_members && firstReg.registration_members.length > 0) {
        firstReg.registration_members.forEach((m: any) => {
          members.push(m.is_leader ? `${m.member_name} (Ketua)` : m.member_name);
        });
      }

      // Dokumen formatting
      const docs = (row.participant_documents || []).map((d: any) => ({
        id: d.id,
        type: (d.doc_type || "kartu_pelajar") as "kartu_pelajar" | "surat_izin" | "karya",
        fileName: d.file_name || "Dokumen Persyaratan",
        fileUrl: d.file_url || undefined,
        status: (d.status === "valid" ? "valid" : d.status === "tidak_valid" ? "tidak_valid" : "menunggu") as "valid" | "menunggu" | "tidak_valid",
      }));

      // Status pendaftaran:
      let effectiveStatus = row.status || "menunggu_verifikasi";
      if (firstReg && !firstReg.is_confirmed && effectiveStatus === "terverifikasi") {
        effectiveStatus = "menunggu_verifikasi";
      }

      const regDate = row.created_at
        ? new Date(row.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Baru saja";

      return {
        id: row.id,
        registrationNumber: row.registration_number || `GBB-PES-${row.id.substring(0, 4).toUpperCase()}`,
        fullName: row.full_name || "Peserta Lomba",
        institution: row.institution || "Umum",
        email: row.email || "-",
        phone: row.phone || "-",
        competitionId: compId,
        competitionName: compName,
        category,
        teamName: firstReg?.team_name || undefined,
        teamMembers: members.length > 0 ? members : undefined,
        status: effectiveStatus as "terverifikasi" | "menunggu_verifikasi" | "ditolak",
        rejectionReason: row.rejection_reason || undefined,
        totalPoints: row.total_points ?? 0,
        registeredAt: regDate,
        documents: docs,
      };
    });

    return NextResponse.json({
      success: true,
      participants: mappedDbParticipants,
      count: mappedDbParticipants.length,
    });
  } catch (err: unknown) {
    console.error("API GET /api/participants exception:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data peserta",
        participants: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
