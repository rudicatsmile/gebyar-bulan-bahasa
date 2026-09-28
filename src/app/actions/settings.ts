"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EventSettingsMap {
  eventName: string;
  eventTheme: string;
  eventYear: string;
  scoreGapThreshold: string;
  maxCompetitions: string;
  rotationInterval: string;
}

const SaveEventSettingsSchema = z.object({
  eventName: z.string().min(3, "Nama acara minimal 3 karakter"),
  eventTheme: z.string().min(5, "Tema acara minimal 5 karakter"),
  eventYear: z.string().regex(/^\d{4}$/, "Tahun harus berupa 4 digit angka"),
  scoreGapThreshold: z.coerce.number().min(1, "Ambang selisih skor minimal 1").max(100, "Ambang selisih skor maksimal 100"),
  maxCompetitions: z.coerce.number().min(1, "Batas maksimal lomba minimal 1").max(10, "Batas maksimal lomba maksimal 10"),
  rotationInterval: z.coerce.number().min(5, "Durasi rotasi monitor minimal 5 detik").max(120, "Durasi rotasi monitor maksimal 120 detik"),
});

export type SaveEventSettingsInput = z.infer<typeof SaveEventSettingsSchema>;

export async function getEventSettings(): Promise<{
  success: boolean;
  settings?: EventSettingsMap;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("event_settings").select("*");

    if (error) {
      console.error("Gagal mengambil event_settings:", error);
      return { success: false, error: error.message };
    }

    const map: Record<string, any> = {};
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });

    const general = map["general"] || {};
    const registration = map["registration"] || {};
    const monitor = map["monitor"] || {};

    const settings: EventSettingsMap = {
      eventName: general.name || "Gebyar Bulan Bahasa dan Kebudayaan",
      eventTheme: general.theme || "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
      eventYear: String(general.year || "2025"),
      scoreGapThreshold: String(registration.scoreGapThreshold ?? 20),
      maxCompetitions: String(registration.maxCompetitions ?? registration.maxTeamsPerSchool ?? 3),
      rotationInterval: String(monitor.refreshIntervalSeconds ?? 15),
    };

    return { success: true, settings };
  } catch (err: unknown) {
    console.error("Error getEventSettings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kendala saat membaca pengaturan.",
    };
  }
}

export async function saveEventSettings(formData: SaveEventSettingsInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const parsed = SaveEventSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Data pengaturan tidak valid.",
    };
  }

  const {
    eventName,
    eventTheme,
    eventYear,
    scoreGapThreshold,
    maxCompetitions,
    rotationInterval,
  } = parsed.data;

  const supabase = createAdminClient();

  try {
    // 1. Ambil data settings yang ada saat ini agar tidak menghapus konfigurasi lain
    const { data: existingRows } = await supabase.from("event_settings").select("*");
    const existingMap: Record<string, any> = {};
    (existingRows || []).forEach((row) => {
      existingMap[row.key] = row.value;
    });

    const currentGeneral = existingMap["general"] || {};
    const currentRegistration = existingMap["registration"] || {};
    const currentMonitor = existingMap["monitor"] || {};

    const now = new Date().toISOString();

    // 2. Update key 'general'
    const updatedGeneral = {
      ...currentGeneral,
      name: eventName.trim(),
      theme: eventTheme.trim(),
      year: Number(eventYear),
    };

    const { error: errGeneral } = await supabase
      .from("event_settings")
      .upsert(
        {
          key: "general",
          value: updatedGeneral,
          description: "Pengaturan umum acara dan tema Gebyar Bulan Bahasa",
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (errGeneral) {
      console.error("Gagal update general settings:", errGeneral);
      return { success: false, error: "Gagal menyimpan identitas acara: " + errGeneral.message };
    }

    // 3. Update key 'registration'
    const updatedRegistration = {
      ...currentRegistration,
      scoreGapThreshold,
      maxCompetitions,
      maxTeamsPerSchool: maxCompetitions,
    };

    const { error: errReg } = await supabase
      .from("event_settings")
      .upsert(
        {
          key: "registration",
          value: updatedRegistration,
          description: "Konfigurasi pendaftaran peserta lomba dan persyaratan berkas",
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (errReg) {
      console.error("Gagal update registration settings:", errReg);
      return { success: false, error: "Gagal menyimpan aturan penjurian/peserta: " + errReg.message };
    }

    // 4. Update key 'monitor'
    const updatedMonitor = {
      ...currentMonitor,
      refreshIntervalSeconds: rotationInterval,
    };

    const { error: errMonitor } = await supabase
      .from("event_settings")
      .upsert(
        {
          key: "monitor",
          value: updatedMonitor,
          description: "Konfigurasi tampilan monitor panggung dan signage aula",
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (errMonitor) {
      console.error("Gagal update monitor settings:", errMonitor);
      return { success: false, error: "Gagal menyimpan konfigurasi monitor: " + errMonitor.message };
    }

    // 5. Sinkronkan juga tabel public.monitor_displays agar rotasi monitor TV langsung terupdate
    try {
      await supabase
        .from("monitor_displays")
        .update({
          rotation_interval_seconds: rotationInterval,
          updated_at: now,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // update all active displays
    } catch {
      // Non-fatal fallback
    }

    // 6. Revalidasi path Next.js
    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard");
      revalidatePath("/monitor");
      revalidatePath("/media/monitor");
      revalidatePath("/");
    } catch {
      // Safe fallback
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Kesalahan server saat saveEventSettings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan internal sistem saat menyimpan pengaturan.",
    };
  }
}
