"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const UploadTwibbonSchema = z.object({
  uploaderName: z.string().min(3, "Nama pengunggah minimal 3 karakter"),
  uploaderInstitution: z.string().min(2, "Nama instansi minimal 2 karakter"),
  caption: z.string().optional(),
  imageUrl: z.string().url("Tautan foto tidak valid"),
  participantNumber: z.string().optional(),
});

export const ModerateTwibbonSchema = z.object({
  twibbonId: z.string().uuid("ID Twibbon tidak valid"),
  status: z.enum(["disetujui", "ditolak"]),
  isFeatured: z.boolean().default(false),
  rejectReason: z.string().optional(),
});

export async function submitTwibbon(data: z.infer<typeof UploadTwibbonSchema>) {
  const parsed = UploadTwibbonSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: twibbon, error } = await supabase
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
