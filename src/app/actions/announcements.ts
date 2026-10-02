"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle calls outside Next.js request context
  }
}

const AnnouncementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(5, "Judul pengumuman minimal 5 karakter"),
  category: z.enum(["umum", "jadwal", "pemenang", "penting", "media"]).default("umum"),
  body: z.string().min(10, "Isi pengumuman minimal 10 karakter"),
  coverUrl: z.string().optional(),
  attachmentUrl: z.string().optional(),
  targetRoles: z.array(z.enum(["super_admin", "seksi_acara", "juri", "media_center", "peserta"])).optional(),
  isPublished: z.boolean().default(true),
  isPinned: z.boolean().default(false),
  showOnMonitor: z.boolean().default(false),
  publishAt: z.string().optional(),
  expireAt: z.string().optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertAnnouncement(data: z.infer<typeof AnnouncementSchema>) {
  const parsed = AnnouncementSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    let authorId: string | null = null;
    try {
      const serverClient = await createClient();
      const {
        data: { user },
      } = await serverClient.auth.getUser();
      authorId = user?.id || null;
    } catch {
      // ignore when outside request context or anonymous
    }

    const baseSlug = slugify(parsed.data.title);
    const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      title: parsed.data.title,
      category: parsed.data.category,
      body: parsed.data.body,
      cover_url: parsed.data.coverUrl || null,
      attachment_url: parsed.data.attachmentUrl || null,
      target_roles: parsed.data.targetRoles || ["peserta", "juri", "media_center", "seksi_acara"],
      is_published: parsed.data.isPublished,
      is_pinned: parsed.data.isPinned,
      show_on_monitor: parsed.data.showOnMonitor,
      publish_at: parsed.data.publishAt || new Date().toISOString(),
      expire_at: parsed.data.expireAt || null,
      author_id: authorId,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", parsed.data.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("announcements").insert({
        ...payload,
        slug,
      });

      if (error) return { success: false, error: error.message };
    }

    safeRevalidate("/dashboard/pengumuman");
    safeRevalidate("/pengumuman");
    safeRevalidate("/monitor");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan pengumuman.";
    return { success: false, error: message };
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    safeRevalidate("/dashboard/pengumuman");
    safeRevalidate("/pengumuman");
    safeRevalidate("/monitor");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus pengumuman.";
    return { success: false, error: message };
  }
}
