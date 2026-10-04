"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ─── Storage Upload (via service role — bypass storage RLS) ───────────────────

/**
 * Upload file template ke bucket twibbon-templates menggunakan service_role
 * agar tidak terblokir oleh storage policies.
 */
export async function uploadTemplateFile(
  path: string,
  fileBase64: string,
  mimeType: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const adminSupabase = createAdminClient();

    // Decode base64 → Buffer
    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: mimeType });

    const { data, error } = await adminSupabase.storage
      .from("twibbon-templates")
      .upload(path, blob, { upsert: true, contentType: mimeType });

    if (error) return { url: null, error: error.message };

    const { data: { publicUrl } } = adminSupabase.storage
      .from("twibbon-templates")
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengunggah file.";
    return { url: null, error: message };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TwibbonTemplate {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateTemplateSchema = z.object({
  name: z.string().min(2, "Nama template minimal 2 karakter"),
  description: z.string().optional(),
  imageUrl: z.string().url("URL gambar tidak valid"),
  thumbnailUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const UpdateTemplateSchema = z.object({
  id: z.string().uuid("ID template tidak valid"),
  name: z.string().min(2, "Nama template minimal 2 karakter").optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Ambil semua template (untuk admin — termasuk yang tidak aktif)
 */
export async function getAllTwibbonTemplates(): Promise<{
  success: boolean;
  data?: TwibbonTemplate[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("twibbon_templates")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TwibbonTemplate[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat template.";
    return { success: false, error: message };
  }
}

/**
 * Ambil template yang aktif saja (untuk user publik)
 */
export async function getActiveTwibbonTemplates(): Promise<{
  success: boolean;
  data?: TwibbonTemplate[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("twibbon_templates")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TwibbonTemplate[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal memuat template.";
    return { success: false, error: message };
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Buat template baru (admin only)
 */
export async function createTwibbonTemplate(
  data: z.infer<typeof CreateTemplateSchema>
) {
  const parsed = CreateTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    // Gunakan server client untuk autentikasi user
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Anda harus login terlebih dahulu." };
    }

    // Gunakan admin client (service_role) untuk operasi database — bypass RLS
    const adminSupabase = createAdminClient();
    const { data: template, error } = await adminSupabase
      .from("twibbon_templates")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
        image_url: parsed.data.imageUrl,
        thumbnail_url: parsed.data.thumbnailUrl || null,
        is_active: parsed.data.isActive,
        sort_order: parsed.data.sortOrder,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[createTwibbonTemplate] DB error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/twibbon");
    revalidatePath("/twibbon/unggah");
    return { success: true, data: template };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal membuat template.";
    return { success: false, error: message };
  }
}

/**
 * Update template (admin only)
 */
export async function updateTwibbonTemplate(
  data: z.infer<typeof UpdateTemplateSchema>
) {
  const parsed = UpdateTemplateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const adminSupabase = createAdminClient();

    type TemplateUpdate = {
      updated_at: string;
      name?: string;
      description?: string | null;
      is_active?: boolean;
      sort_order?: number;
    };

    const updateData: TemplateUpdate = {
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updateData.description = parsed.data.description;
    if (parsed.data.isActive !== undefined)
      updateData.is_active = parsed.data.isActive;
    if (parsed.data.sortOrder !== undefined)
      updateData.sort_order = parsed.data.sortOrder;

    const { error } = await adminSupabase
      .from("twibbon_templates")
      .update(updateData)
      .eq("id", parsed.data.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/twibbon");
    revalidatePath("/twibbon/unggah");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui template.";
    return { success: false, error: message };
  }
}

/**
 * Hapus template (admin only)
 */
export async function deleteTwibbonTemplate(id: string) {
  if (!id) return { success: false, error: "ID template diperlukan." };

  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("twibbon_templates")
      .delete()
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/twibbon");
    revalidatePath("/twibbon/unggah");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal menghapus template.";
    return { success: false, error: message };
  }
}

/**
 * Toggle aktif/nonaktif template (admin only)
 */
export async function toggleTwibbonTemplateStatus(
  id: string,
  isActive: boolean
) {
  return updateTwibbonTemplate({ id, isActive });
}
