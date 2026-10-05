"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
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
  reject_reason?: string | null;
  participant_number?: string | null;
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
    rejectReason: t.reject_reason || undefined,
    participantNumber: t.participant_number || undefined,
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
 * Ambil baris twibbons memakai service role (bypass RLS) dengan pembatasan
 * hak akses yang SELALU dihitung di server, bukan dari input klien.
 */
async function fetchTwibbonsAs(
  opts: { all?: boolean; userId?: string; approvedOnly?: boolean }
): Promise<TwibbonItem[]> {
  const admin = createAdminClient();

  let query = admin.from("twibbons").select("*").order("created_at", { ascending: false });
  if (opts.userId) query = query.eq("user_id", opts.userId);
  else if (opts.approvedOnly) query = query.eq("status", "disetujui");

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("Gagal memuat data twibbon:", error.message);
    return [];
  }

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
      reject_reason: t.reject_reason,
    })
  );
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

  if (isStaff) return fetchTwibbonsAs({ all: true });
  if (user) return fetchTwibbonsAs({ userId: user.id });
  return fetchTwibbonsAs({ approvedOnly: true });
}

/**
 * Kiriman twibbon milik user yang sedang login — SEMUA status
 * (menunggu / disetujui / ditolak), terbaru lebih dulu.
 *
 * Kenapa action ini (bukan query langsung dari klien):
 *  - halaman /peserta/twibbon sebelumnya tidak membaca database sama sekali,
 *    melainkan menempel `TWIBBONS[0]` dari dummy-data, sehingga hasil unggah
 *    asli tidak pernah tampil;
 *  - user_id diambil dari sesi server, bukan dari argumen klien, sehingga
 *    kiriman milik user lain tidak mungkin ikut terbaca.
 */
export async function getMyTwibbons(): Promise<TwibbonItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tanpa sesi tidak ada pemiliknya: jangan kembalikan apa pun.
  if (!user) return [];

  return fetchTwibbonsAs({ userId: user.id });
}

// ─── Pembatasan frekuensi unggah (kuota harian) ──────────────────────────────

const TWIBBON_DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_TWIBBON_DAILY_LIMIT || 3);
// GMT+7 (WIB): kuota dihitung per hari lokal peserta, reset 00.00 WIB.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface TwibbonUploadQuota {
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
  /** true bila identitas pembatasnya alamat IP (pengunjung tanpa login) */
  byIp: boolean;
  /** milidetik menuju reset berikutnya (tengah malam WIB) */
  resetInMs: number;
}

/** Batas awal hari berjalan dalam WIB, dihitung dari epoch UTC. */
function wibDayWindow(now = new Date()): { startUtcMs: number; resetInMs: number } {
  const shifted = now.getTime() + WIB_OFFSET_MS;
  const dayFloor = Math.floor(shifted / 86400000) * 86400000;
  const startUtcMs = dayFloor - WIB_OFFSET_MS;
  const resetInMs = startUtcMs + 86400000 - now.getTime();
  return { startUtcMs, resetInMs };
}

/** IP pengunjung dari header proxy (x-forwarded-for / x-real-ip), ternormalisasi. */
async function resolveClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const raw = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim();
    if (!raw) return null;
    const isV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(raw);
    const isV6 = raw.includes(":") && /^[0-9a-fA-F:.]+$/.test(raw);
    return isV4 || isV6 ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Inti perhitungan kuota harian. Identitas pembatas:
 *  - user login  → user_id
 *  - tanpa login → alamat IP (uploader_ip)
 *  - IP tak terbaca → anggap boleh (tak ada identitas yang bisa dikunci)
 */
async function computeQuota(
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string } | null,
  ip: string | null
): Promise<TwibbonUploadQuota> {
  const { startUtcMs, resetInMs } = wibDayWindow();

  if (!user && !ip) {
    return {
      limit: TWIBBON_DAILY_LIMIT,
      used: 0,
      remaining: TWIBBON_DAILY_LIMIT,
      allowed: true,
      byIp: false,
      resetInMs,
    };
  }

  let query = admin
    .from("twibbons")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(startUtcMs).toISOString());

  if (user) query = query.eq("user_id", user.id);
  else if (ip) query = query.eq("uploader_ip", ip);

  const { count, error } = await query;
  const used = error ? 0 : (count ?? 0);

  return {
    limit: TWIBBON_DAILY_LIMIT,
    used,
    remaining: Math.max(0, TWIBBON_DAILY_LIMIT - used),
    allowed: used < TWIBBON_DAILY_LIMIT,
    byIp: !user,
    resetInMs,
  };
}

/** Pesan human-readable saat kuota harian habis. */
function buildQuotaMessage(q: TwibbonUploadQuota): string {
  const totalMin = Math.max(0, Math.ceil(q.resetInMs / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const when = h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`;
  const scope = q.byIp ? "dari jaringan ini" : "untuk akun ini";
  return `Batas unggah twibbon tercapai: sudah ${q.used} dari ${q.limit} unggahan ${scope} hari ini. Anda bisa mengunggah lagi ${when} (kuota reset tiap 00.00 WIB).`;
}

/**
 * Kuota unggah harian untuk pengunggah saat ini (dipakai UI /twibbon/unggah).
 * Angka dihitung ulang di server memakai service role agar tidak bisa
 * dimanipulasi dari klien.
 */
export async function getTwibbonUploadQuota(): Promise<TwibbonUploadQuota> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ip = user ? null : await resolveClientIp();
  return computeQuota(createAdminClient(), user, ip);
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

    const adminClient = createAdminClient();
    const clientIp = await resolveClientIp();

    // ── Kuota harian: cek ulang di server agar tidak bisa dilewati dari UI ──
    const quota = await computeQuota(adminClient, user, clientIp);
    if (!quota.allowed) {
      return { success: false, error: buildQuotaMessage(quota), quota };
    }

    // Tulis memakai admin client (service role).
    // Penyebab error awal: policy INSERT pada public.twibbons tidak mengizinkan
    // peran `anon`, sehingga insert dari halaman publik ditolak RLS (42501).
    // user_id dipaksa sesuai sesi agar tidak bisa memalsukan milik user lain.
    const { data: twibbon, error } = await adminClient
      .from("twibbons")
      .insert({
        uploader_name: parsed.data.uploaderName,
        uploader_institution: parsed.data.uploaderInstitution,
        caption: parsed.data.caption || null,
        image_url: parsed.data.imageUrl,
        user_id: user?.id || null,
        uploader_ip: clientIp,
        status: "menunggu",
        is_featured: false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/galeri/twibbon");
    revalidatePath("/dashboard/twibbon");
    revalidatePath("/media/twibbon");
    // Halaman "Twibbon Saya" milik peserta yang mengirim
    revalidatePath("/peserta/twibbon");
    revalidatePath("/peserta");
    // Sisa kuota setelah kiriman ini tersimpan (untuk memperbarui UI tanpa fetch lagi).
    return { success: true, data: twibbon, remaining: Math.max(0, quota.remaining - 1) };
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
