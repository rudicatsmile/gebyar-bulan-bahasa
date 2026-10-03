"use server";

import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EventSettingsMap {
  eventName: string;
  eventTheme: string;
  eventDate: string;
  eventYear: string;
  heroImageUrl: string;
  scoreGapThreshold: string;
  maxCompetitions: string;
  rotationInterval: string;
}

const SaveEventSettingsSchema = z.object({
  eventName: z.string().min(3, "Nama acara minimal 3 karakter"),
  eventTheme: z.string().min(5, "Tema acara minimal 5 karakter"),
  eventDate: z.string().min(2, "Tanggal acara minimal 2 karakter").default("11 November 2026"),
  eventYear: z.string().regex(/^\d{4}$/, "Tahun harus berupa 4 digit angka"),
  heroImageUrl: z.string().optional().default(""),
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
      eventDate: general.date || `11 November ${general.year || "2026"}`,
      eventYear: String(general.year || "2026"),
      heroImageUrl: general.heroImageUrl || "",
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
    eventDate,
    eventYear,
    heroImageUrl,
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
      date: (eventDate || "11 November 2026").trim(),
      year: Number(eventYear),
      heroImageUrl: (heroImageUrl || "").trim(),
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

/**
 * Server action untuk mengunggah berkas gambar Hero Beranda ke Supabase Storage
 * dengan fallback penyimpanan lokal (public/uploads/hero).
 */
export async function uploadHeroImageAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const file = formData.get("file") as File | null;
    if (!file || typeof file === "string") {
      return { success: false, error: "Berkas gambar belum dipilih." };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Ukuran berkas melebihi batas 5MB." };
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      return { success: false, error: "Format gambar harus berupa JPG, PNG, WEBP, atau SVG." };
    }

    const ext = file.name.split(".").pop() || "png";
    const uniqueFileName = `hero-banner-${Date.now()}.${ext}`;
    const storagePath = `hero/${uniqueFileName}`;

    // 1. Coba upload ke Supabase Storage terlebih dahulu
    try {
      const supabase = createAdminClient();
      const bucketName = process.env.NEXT_PUBLIC_BUCKET_MEDIA || "media-acara";

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!error && data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(data.path);

        return { success: true, url: publicUrl };
      }
    } catch (e) {
      console.warn("Notice: Supabase storage upload hero fallback to local:", e);
    }

    // 2. Fallback: Simpan file ke direktori public/uploads/hero/
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "hero");
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, uniqueFileName);
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(localFilePath, Buffer.from(arrayBuffer));

      const localUrl = `/uploads/hero/${uniqueFileName}`;
      return { success: true, url: localUrl };
    } catch (fsErr) {
      return {
        success: false,
        error: fsErr instanceof Error ? fsErr.message : "Gagal menyimpan berkas gambar ke server.",
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengunggah berkas gambar.",
    };
  }
}
