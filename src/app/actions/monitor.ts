"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UpdateMonitorConfigSchema = z.object({
  displaySlug: z.string().default("utama"),
  rotationIntervalSeconds: z.number().int().min(5).max(120),
  layoutType: z.enum(["rotasi", "tunggal"]).default("rotasi"),
  theme: z.enum(["dark", "light"]).default("dark"),
  emergencyMessage: z.string().optional().nullable(),
});

const PlaylistItemSchema = z.object({
  moduleKey: z.string(),
  durationSeconds: z.number().int().min(5).max(120),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

const SavePlaylistSchema = z.object({
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

export async function setEmergencyAlert(
  message: string | null,
  options?: { takeover?: boolean; durationSeconds?: number }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Gunakan admin client agar penulisan tidak gagal senyap akibat RLS.
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const clean = (message ?? "").trim();

    // Simpan sebagai payload terstruktur agar monitor tahu apakah perlu
    // melakukan takeover penuh & berapa lama. Fallback: teks polos diperlakukan
    // sebagai darurat biasa dengan takeover aktif.
    let emergencyValue: string | null = null;
    if (clean.length > 0) {
      const payload = {
        __v: 1,
        message: clean,
        takeover: options?.takeover !== false,
        durationSeconds: Math.min(Math.max(options?.durationSeconds ?? 20, 5), 120),
        sentAt: now,
      };
      emergencyValue = JSON.stringify(payload);
    }

    // 1. Update baris 'utama' bila sudah ada (mempertahankan konfigurasi rotasi)
    const { data: updated } = await supabase
      .from("monitor_displays")
      .update({ emergency_message: emergencyValue, updated_at: now })
      .eq("slug", "utama")
      .select("id");

    // 2. Buat baris 'utama' bila belum ada (seed tidak membuatnya)
    if (!updated || updated.length === 0) {
      const { error: insErr } = await supabase.from("monitor_displays").insert({
        slug: "utama",
        name: "Layar Monitor Utama (Panggung)",
        layout_type: "rotasi",
        rotation_interval_seconds: 15,
        theme: "dark",
        is_active: true,
        emergency_message: emergencyValue,
        updated_at: now,
      });
      if (insErr) return { success: false, error: insErr.message };
    }

    revalidatePath("/monitor");
    revalidatePath("/media/monitor");
    revalidatePath("/dashboard/broadcast");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengatur siaran darurat.";
    return { success: false, error: message };
  }
}

