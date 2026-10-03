import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("event_settings").select("*");

    if (error) {
      console.error("API GET /api/settings error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const map: Record<string, any> = {};
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });

    const general = map["general"] || {};
    const registration = map["registration"] || {};
    const monitor = map["monitor"] || {};

    const settings = {
      eventName: general.name || "Gebyar Bulan Bahasa dan Kebudayaan",
      eventTheme: general.theme || "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
      eventDate: general.date || `11 November ${general.year || "2026"}`,
      eventYear: String(general.year || "2026"),
      heroImageUrl: general.heroImageUrl || "",
      scoreGapThreshold: String(registration.scoreGapThreshold ?? 20),
      maxCompetitions: String(registration.maxCompetitions ?? registration.maxTeamsPerSchool ?? 3),
      rotationInterval: String(monitor.refreshIntervalSeconds ?? 15),
    };

    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    console.error("API GET /api/settings exception:", err);
    const message = err instanceof Error ? err.message : "Gagal membaca pengaturan.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventName,
      eventTheme,
      eventDate,
      eventYear,
      heroImageUrl,
      scoreGapThreshold,
      maxCompetitions,
      rotationInterval,
    } = body;

    if (!eventName || !eventTheme) {
      return NextResponse.json(
        { success: false, error: "Nama acara dan tema acara wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Ambil data settings yang ada saat ini
    const { data: existingRows } = await supabase.from("event_settings").select("*");
    const existingMap: Record<string, any> = {};
    (existingRows || []).forEach((row) => {
      existingMap[row.key] = row.value;
    });

    const currentGeneral = existingMap["general"] || {};
    const currentRegistration = existingMap["registration"] || {};
    const currentMonitor = existingMap["monitor"] || {};

    const now = new Date().toISOString();

    // 2. Simpan key 'general'
    const updatedGeneral = {
      ...currentGeneral,
      name: String(eventName).trim(),
      theme: String(eventTheme).trim(),
      date: String(eventDate || "11 November 2026").trim(),
      year: Number(eventYear) || 2026,
      heroImageUrl: String(heroImageUrl || "").trim(),
    };

    const { error: errGeneral } = await supabase.from("event_settings").upsert(
      {
        key: "general",
        value: updatedGeneral,
        description: "Pengaturan umum acara dan tema Gebyar Bulan Bahasa",
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (errGeneral) {
      console.error("API POST errGeneral:", errGeneral);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan general settings: " + errGeneral.message },
        { status: 500 }
      );
    }

    // 3. Simpan key 'registration'
    const updatedRegistration = {
      ...currentRegistration,
      scoreGapThreshold: Number(scoreGapThreshold) || 20,
      maxCompetitions: Number(maxCompetitions) || 3,
      maxTeamsPerSchool: Number(maxCompetitions) || 3,
    };

    const { error: errReg } = await supabase.from("event_settings").upsert(
      {
        key: "registration",
        value: updatedRegistration,
        description: "Konfigurasi pendaftaran peserta lomba dan persyaratan berkas",
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (errReg) {
      console.error("API POST errReg:", errReg);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan registration settings: " + errReg.message },
        { status: 500 }
      );
    }

    // 4. Simpan key 'monitor'
    const rotIntervalNum = Number(rotationInterval) || 15;
    const updatedMonitor = {
      ...currentMonitor,
      refreshIntervalSeconds: rotIntervalNum,
    };

    const { error: errMonitor } = await supabase.from("event_settings").upsert(
      {
        key: "monitor",
        value: updatedMonitor,
        description: "Konfigurasi tampilan monitor panggung dan signage aula",
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (errMonitor) {
      console.error("API POST errMonitor:", errMonitor);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan monitor settings: " + errMonitor.message },
        { status: 500 }
      );
    }

    // 5. Sinkronkan ke tabel monitor_displays
    try {
      await supabase
        .from("monitor_displays")
        .update({
          rotation_interval_seconds: rotIntervalNum,
          updated_at: now,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn("Notice updating monitor_displays:", e);
    }

    // 6. Revalidate cache Next.js
    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard");
      revalidatePath("/monitor");
      revalidatePath("/media/monitor");
      revalidatePath("/");
    } catch {
      // Safe fallback
    }

    return NextResponse.json({
      success: true,
      message: "Seluruh pengaturan acara berhasil disimpan ke tabel event_settings.",
      data: {
        general: updatedGeneral,
        registration: updatedRegistration,
        monitor: updatedMonitor,
      },
    });
  } catch (err: unknown) {
    console.error("API POST /api/settings exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
