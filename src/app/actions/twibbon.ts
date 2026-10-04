"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TwibbonItem } from "@/lib/dummy-data";

const UploadTwibbonSchema = z.object({
  uploaderName: z.string().min(3, "Nama pengunggah minimal 3 karakter"),
  uploaderInstitution: z.string().min(2, "Nama instansi minimal 2 karakter"),
  caption: z.string().optional(),
  imageUrl: z.string().url("Tautan foto tidak valid"),
  participantNumber: z.string().optional(),
});

const ModerateTwibbonSchema = z.object({
  twibbonId: z.string().uuid("ID Twibbon tidak valid"),
  status: z.enum(["disetujui", "ditolak"]),
  isFeatured: z.boolean().default(false),
  rejectReason: z.string().optional(),
});

// ─── Upload berkas twibbon ke Storage ────────────────────────────────────────────

const TWIBBON_BUCKET = process.env.NEXT_PUBLIC_BUCKET_TWIBBON || "twibbon";
const MAX_TWIBBON_BYTES = 5 * 1024 * 1024; // 5 MB

const UploadTwibbonImageSchema = z.object({
  // Path harus berada di folder uploads/ dengan nama berkas yang aman
  filePath: z.string().regex(/^uploads\/[A-Za-z0-9._-]+$/, "Lokasi berkas tidak valid"),
  fileBase64: z.string().min(1, "Berkas kosong"),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/**
 * Unggah hasil komposisi twibbon memakai service role.
 *
 * Kenapa di server: upload langsung dari browser memakai anon key ditolak
 * policy RLS pada storage.objects ("new row violates row-level security
 * policy") karena bucket twibbon tidak mengizinkan peran `anon`.
 * Service role key tidak pernah ikut ter-bundle ke browser.
 */
export async function uploadTwibbonImage(
  data: z.infer<typeof UploadTwibbonImageSchema>
): Promise<{ url: string | null; error: string | null }> {
  const parsed = UploadTwibbonImageSchema.safeParse(data);
  if (!parsed.success) {
    return { url: null, error: parsed.error.issues[0]?.message || "Berkas tidak valid." };
  }

  try {
    const raw = parsed.data.fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");

    if (buffer.byteLength === 0) {
      return { url: null, error: "Berkas kosong." };
    }
    if (buffer.byteLength > MAX_TWIBBON_BYTES) {
      return { url: null, error: "Ukuran berkas melebihi batas maksimal 5MB." };
    }

    const admin = createAdminClient();
    const { data: uploaded, error } = await admin.storage
      .from(TWIBBON_BUCKET)
      .upload(parsed.data.filePath, buffer, {
        upsert: true,
        contentType: parsed.data.mimeType,
      });

    if (error) return { url: null, error: error.message };

    const {
      data: { publicUrl },
    } = admin.storage.from(TWIBBON_BUCKET).getPublicUrl(uploaded.path);

    return { url: publicUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah berkas.";
    return { url: null, error: message };
  }
}

const STAFF_ROLES = ["super_admin", "seksi_acara", "media_center"];

/** Bantu: samakan bentuk baris twibbons dengan tipe TwibbonItem di UI. */
function toTwibbonItem(t: {
  id: string;
  uploader_name: string;
  uploader_institution: string | null;
  caption: string | null;
  image_url: string;
  status: string | null;
  is_featured: boolean;
  likes_count: number | null;
  created_at: string;
}): TwibbonItem {
  return {
    id: t.id,
    uploaderName: t.uploader_name,
    institution: t.uploader_institution || "Umum",
    caption: t.caption || "",
    imageUrl: t.image_url,
    status: (t.status || "menunggu") as "disetujui" | "menunggu" | "ditolak",
    isFeatured: t.is_featured,
    likesCount: t.likes_count || 0,
    uploadedAt: new Date(t.created_at).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/**
 * Daftar twibbon untuk halaman moderasi (/dashboard/twibbon & /media/twibbon).
 *
 * Kenapa perlu action ini: halaman tersebut sebelumnya membaca lewat
 * publicClient (anon key) dari client component, sehingga RLS
 * `twibbons_read_approved` menyembunyikan kiriman berstatus `menunggu`
 * dan daftar selalu kosong ("Tidak ada twibbon ditemukan").
 *
 * Hak akses dihitung di server (bukan dari input klien):
 *  - staff (super_admin / seksi_acara / media_center): semua status
 *  - user login selain staff: hanya kiriman miliknya sendiri
 *  - tamu: hanya yang sudah disetujui
 */
export async function getTwibbonsForModeration(): Promise<TwibbonItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }
  const isStaff = role !== null && STAFF_ROLES.includes(role);

  let query = admin.from("twibbons").select("*").order("created_at", { ascending: false });
  if (!isStaff) {
    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("status", "disetujui");
    }
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((t) =>
    toTwibbonItem({
      id: t.id,
      uploader_name: t.uploader_name,
      uploader_institution: t.uploader_institution,
      caption: t.caption,
      image_url: t.image_url,
      status: t.status,
      is_featured: t.is_featured,
      likes_count: t.likes_count,
      created_at: t.created_at,
    })
  );
}

/**
 * Pastikan URL gambar hanya merujuk ke storage milik proyek.
 * Karena insert memakai service role (bypass RLS), validasi ini menjaga agar
 * formulir publik tidak dipakai menyisipkan tautan gambar pihak ketiga ke galeri.
 */
function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  try {
    const u = new URL(url);
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (base && u.origin === new URL(base).origin) return true;
    return u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export async function submitTwibbon(data: z.infer<typeof UploadTwibbonSchema>) {
  const parsed = UploadTwibbonSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  if (!isAllowedImageUrl(parsed.data.imageUrl)) {
    return { success: false, error: "Sumber gambar tidak diizinkan." };
  }

  try {
    // Ambil identitas user dari sesi (null untuk tamu). Client ini hanya untuk
    // membaca sesi, bukan untuk menulis.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Tulis memakai admin client (service role).
    // Penyebab error awal: policy INSERT pada public.twibbons tidak mengizinkan
    // peran `anon`, sehingga insert dari halaman publik ditolak RLS (42501).
    // user_id dipaksa sesuai sesi agar tidak bisa memalsukan milik user lain.
    const adminClient = createAdminClient();
    const { data: twibbon, error } = await adminClient
      .from("twibbons")
      .insert({
        uploader_name: parsed.data.uploaderName,
        uploader_institution: parsed.data.uploaderInstitution,
        caption: parsed.data.caption || null,
        image_url: parsed.data.imageUrl,
        user_id: user?.id || null,
        status: "menunggu",
        is_featured: false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/galeri/twibbon");
    revalidatePath("/dashboard/twibbon");
    revalidatePath("/media/twibbon");
    return { success: true, data: twibbon };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah twibbon.";
    return { success: false, error: message };
  }
}

export async function moderateTwibbon(data: z.infer<typeof ModerateTwibbonSchema>) {
  const parsed = ModerateTwibbonSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("twibbons")
      .update({
        status: parsed.data.status,
        is_featured: parsed.data.isFeatured,
        reject_reason: parsed.data.rejectReason || null,
        moderated_by: user?.id || null,
        moderated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.twibbonId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/twibbon");
    revalidatePath("/media/twibbon");
    revalidatePath("/galeri/twibbon");
    revalidatePath("/monitor");
    revalidatePath("/monitor/twibbon");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memoderasi twibbon.";
    return { success: false, error: message };
  }
}
