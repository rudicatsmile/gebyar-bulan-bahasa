import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, action, rejectionReason } = body;

    if (!participantId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Parameter tidak valid" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (action === "approve") {
      // 1. Update status peserta ke terverifikasi
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
        console.error("Gagal update participant status:", partErr.message);
        return NextResponse.json(
          { success: false, error: partErr.message },
          { status: 500 }
        );
      }

      // 2. Set is_confirmed = true pada registrations peserta
      const { error: regErr } = await supabase
        .from("registrations")
        .update({ is_confirmed: true })
        .eq("participant_id", participantId);

      if (regErr) {
        console.error("Gagal konfirmasi registrations:", regErr.message);
      }

      // 3. Set dokumen berkas menjadi valid
      await supabase
        .from("participant_documents")
        .update({
          status: "valid",
          reviewed_at: new Date().toISOString(),
        })
        .eq("participant_id", participantId);

      // 4. Catat aktivitas
      try {
        await supabase.from("activity_logs").insert({
          action: "approve_participant",
          entity: "participant",
          entity_id: participantId,
          description: "Berkas dan pendaftaran peserta berhasil disetujui (terverifikasi).",
        });
      } catch (logErr) {
        console.warn("Log activity error:", logErr);
      }
    } else {
      const reason = rejectionReason || "Berkas persyaratan tidak lengkap atau tidak valid.";

      // 1. Update status peserta ke ditolak
      const { error: partErr } = await supabase
        .from("participants")
        .update({
          status: "ditolak",
          rejection_reason: reason,
        })
        .eq("id", participantId);

      if (partErr) {
        console.error("Gagal menolak participant:", partErr.message);
        return NextResponse.json(
          { success: false, error: partErr.message },
          { status: 500 }
        );
      }

      // 2. Registrations is_confirmed = false
      await supabase
        .from("registrations")
        .update({ is_confirmed: false })
        .eq("participant_id", participantId);

      // 3. Dokumen ditolak
      await supabase
        .from("participant_documents")
        .update({
          status: "tidak_valid",
          note: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("participant_id", participantId);

      // 4. Catat aktivitas
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

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("POST /api/participants/verify error:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
