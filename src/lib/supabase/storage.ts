import { createClient } from "./client";
import { createAdminClient } from "./admin";

export const STORAGE_BUCKETS = {
  TWIBBON: process.env.NEXT_PUBLIC_BUCKET_TWIBBON || "twibbon",
  MEDIA: process.env.NEXT_PUBLIC_BUCKET_MEDIA || "media-acara",
  DOKUMEN: process.env.NEXT_PUBLIC_BUCKET_DOKUMEN || "dokumen-peserta",
  POSTER: process.env.NEXT_PUBLIC_BUCKET_POSTER || "poster-lomba",
  AVATAR: process.env.NEXT_PUBLIC_BUCKET_AVATAR || "avatars",
} as const;

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

export async function uploadPublicFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { url: null, error: "Ukuran berkas melebihi batas maksimal 5MB." };
    }

    const supabase = createClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (error) {
      return { url: null, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah berkas.";
    return { url: null, error: message };
  }
}

export async function getPrivateDocumentSignedUrl(
  path: string,
  expiresInSeconds: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.DOKUMEN)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mendapatkan tautan dokumen.";
    return { url: null, error: message };
  }
}
