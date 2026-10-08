import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const BUCKET_NAME = "dokumen-peserta";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json(
        { success: false, error: "ID Peserta tidak diberikan." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("participant_documents")
      .select("id, participant_id, doc_type, file_name, file_url, status, note, uploaded_at")
      .eq("participant_id", participantId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, documents: data || [] });
  } catch (err: unknown) {
    console.error("GET /api/participants/documents error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar dokumen." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const participantId = formData.get("participantId") as string | null;
    const isMulti = formData.get("isMulti") === "true";
    const rawDocType = (formData.get("docType") as string | null) || "kartu_pelajar";
    const docType = isMulti
      ? (rawDocType.startsWith("multi_") ? rawDocType : `multi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
      : rawDocType;

    if (!file || !participantId) {
      return NextResponse.json(
        { success: false, error: "File dan ID Peserta wajib disertakan." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "Ukuran berkas melebihi batas maksimal 10MB." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Pastikan participant memang ada di database
    const { data: participant, error: partErr } = await supabase
      .from("participants")
      .select("id, full_name, status")
      .eq("id", participantId)
      .maybeSingle();

    if (partErr || !participant) {
      return NextResponse.json(
        { success: false, error: "Data peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    // Buat nama file unik di storage
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const safeDocType = docType.replace(/[^a-zA-Z0-9_]/g, "_");
    const storagePath = `${participantId}/${safeDocType}_${Date.now()}.${ext}`;

    // Upload ke bucket dokumen-peserta
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Supabase storage upload error:", uploadErr.message);
      return NextResponse.json(
        { success: false, error: `Gagal mengunggah berkas: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    // Ambil Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // Cek apakah dokumen dengan doc_type ini sudah pernah ada untuk peserta ini (hanya jika bukan multi-upload)
    const { data: existingDoc } = isMulti
      ? { data: null }
      : await supabase
          .from("participant_documents")
          .select("id")
          .eq("participant_id", participantId)
          .eq("doc_type", docType)
          .maybeSingle();

    let savedDoc;
    if (existingDoc) {
      const { data: updated, error: updateErr } = await supabase
        .from("participant_documents")
        .update({
          file_name: file.name,
          file_url: publicUrl,
          status: "menunggu",
          note: null,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", existingDoc.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json(
          { success: false, error: updateErr.message },
          { status: 500 }
        );
      }
      savedDoc = updated;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("participant_documents")
        .insert({
          participant_id: participantId,
          doc_type: docType,
          file_name: file.name,
          file_url: publicUrl,
          status: "menunggu",
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json(
          { success: false, error: insertErr.message },
          { status: 500 }
        );
      }
      savedDoc = inserted;
    }

    // Revalidate halaman dashboard dan pendaftaran
    revalidatePath("/dashboard/peserta/verifikasi");
    revalidatePath("/dashboard/peserta");
    revalidatePath(`/dashboard/peserta/${participantId}`);
    revalidatePath("/peserta/pendaftaran");
    revalidatePath("/dashboard/lomba/duta-bahasa");

    return NextResponse.json({
      success: true,
      document: savedDoc,
      message: "Berkas berhasil diunggah!",
    });
  } catch (err: unknown) {
    console.error("POST /api/participants/documents error:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan internal saat mengunggah berkas." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "ID Dokumen wajib disertakan." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("participant_documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    revalidatePath("/dashboard/peserta/verifikasi");
    revalidatePath("/peserta/pendaftaran");

    return NextResponse.json({ success: true, message: "Dokumen berhasil dihapus." });
  } catch (err: unknown) {
    console.error("DELETE /api/participants/documents error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus dokumen." },
      { status: 500 }
    );
  }
}
