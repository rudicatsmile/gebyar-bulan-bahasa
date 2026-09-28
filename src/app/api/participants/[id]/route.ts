import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Participant } from "@/lib/dummy-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID peserta tidak valid" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: row, error } = await (supabase.from("participants") as any)
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
      .eq("id", id)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { success: false, error: error?.message || "Peserta tidak ditemukan" },
        { status: 404 }
      );
    }

    const firstReg = row.registrations && row.registrations.length > 0 ? row.registrations[0] : null;
    const compName = firstReg?.competitions?.name || "Belum Memilih Lomba";
    const compId = firstReg?.competition_id || "";
    const isKelompok = firstReg?.competitions?.type === "kelompok" || !!firstReg?.team_name;
    const category: "individu" | "kelompok" = isKelompok ? "kelompok" : "individu";

    const members: string[] = [];
    if (firstReg?.registration_members && firstReg.registration_members.length > 0) {
      firstReg.registration_members.forEach((m: any) => {
        members.push(m.is_leader ? `${m.member_name} (Ketua)` : m.member_name);
      });
    }

    const docs = (row.participant_documents || []).map((d: any) => ({
      id: d.id,
      type: (d.doc_type || "kartu_pelajar") as "kartu_pelajar" | "surat_izin" | "karya",
      fileName: d.file_name || "Dokumen Persyaratan",
      fileUrl: d.file_url || undefined,
      status: (d.status === "valid" ? "valid" : d.status === "tidak_valid" ? "tidak_valid" : "menunggu") as "valid" | "menunggu" | "tidak_valid",
    }));

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

    const participant: Participant = {
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

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (err: unknown) {
    console.error("API GET /api/participants/[id] exception:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
