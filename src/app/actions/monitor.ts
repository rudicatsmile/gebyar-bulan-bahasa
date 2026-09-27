"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const UpdateMonitorConfigSchema = z.object({
  displaySlug: z.string().default("utama"),
  rotationIntervalSeconds: z.number().int().min(5).max(120),
  layoutType: z.enum(["rotasi", "tunggal"]).default("rotasi"),
  theme: z.enum(["dark", "light"]).default("dark"),
  emergencyMessage: z.string().optional().nullable(),
});

export const PlaylistItemSchema = z.object({
  moduleKey: z.string(),
  durationSeconds: z.number().int().min(5).max(120),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export const SavePlaylistSchema = z.object({
  displayId: z.string().uuid("ID Display monitor tidak valid"),
  items: z.array(PlaylistItemSchema).min(1, "Playlist minimal harus memiliki 1 modul aktif"),
});

export async function updateMonitorConfig(data: z.infer<typeof UpdateMonitorConfigSchema>) {
  const parsed = UpdateMonitorConfigSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("monitor_displays")
      .update({
        rotation_interval_seconds: parsed.data.rotationIntervalSeconds,
        layout_type: parsed.data.layoutType,
        theme: parsed.data.theme,
        emergency_message: parsed.data.emergencyMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", parsed.data.displaySlug);

    if (error) return { success: false, error: error.message };

    revalidatePath("/monitor");
    revalidatePath("/media/monitor");
    revalidatePath("/dashboard/pengaturan");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui konfigurasi monitor.";
    return { success: false, error: message };
  }
}

export async function setEmergencyAlert(message: string | null) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("monitor_displays")
      .update({
        emergency_message: message || null,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", "utama");

    if (error) return { success: false, error: error.message };

    revalidatePath("/monitor");
    revalidatePath("/media/monitor");
    revalidatePath("/dashboard/broadcast");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengatur siaran darurat.";
    return { success: false, error: message };
  }
}
