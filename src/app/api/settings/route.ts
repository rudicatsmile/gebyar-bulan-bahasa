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
    const contact = map["contact"] || {};

    const autoApproveTwibbon = Boolean(
      map["auto_approve_twibbon"] !== undefined
        ? map["auto_approve_twibbon"]
        : general.autoApproveTwibbon ?? false
    );

    const settings = {
      eventName: general.name || "Gebyar Bulan Bahasa dan Kebudayaan",
      eventShortName: general.shortName || "GebyarBulanBahasa",
      eventOrganizer: general.organizer || "SMK DP 2 Jakarta",
      eventTheme: general.theme || "Berkarya dengan Bahasa, Bersatu dalam Budaya, Menginspirasi Indonesia.",
      eventDate: general.date || `11 November ${general.year || "2026"}`,
      eventYear: String(general.year || "2026"),
      heroImageUrl: general.heroImageUrl || "",
      logoImageUrl: general.logoImageUrl || "",
      scoreGapThreshold: String(registration.scoreGapThreshold ?? 20),
      maxCompetitions: String(registration.maxCompetitions ?? registration.maxTeamsPerSchool ?? 3),
      rotationInterval: String(monitor.refreshIntervalSeconds ?? 15),
      autoApproveTwibbon,
      contactLocation: contact.location || "Gedung Kesenian & Pusat Kebudayaan Lt. 1, Ruang Panitia A.",
      contactHours: contact.hours || "07.30 - 21.00 WIB (Selama Acara Berlangsung)",
      contactEmail: contact.email || "panitia@gebyarbulanbahasa.id",
      contactPhone: contact.phone || "0812-3456-7890 (Seksi Acara)",
      contactStageMap:
        contact.stageMap ||
        "• Panggung Utama (Stage A): Puisi, MC Formal, Vokal Grup\n• Ruang Bioskop Mini Lt. 2: Lomba Film Pendek\n• Aula Serbaguna: Pidato Bahasa Indonesia\n• Area Kreatif Selasar: Melukis Tas Kanvas\n• Ruang Teater A: Seni Teater Monolog\n• Pelataran Budaya: Seni Tradisi Palang Pintu Betawi",
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
      eventShortName,
      eventOrganizer,
      eventTheme,
      eventDate,
      eventYear,
      heroImageUrl,
      logoImageUrl,
      scoreGapThreshold,
      maxCompetitions,
      rotationInterval,
      autoApproveTwibbon,
      contactLocation,
      contactHours,
      contactEmail,
      contactPhone,
      contactStageMap,
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
    const currentContact = existingMap["contact"] || {};

    const now = new Date().toISOString();

    // 2. Simpan key 'general'
    const updatedGeneral = {
      ...currentGeneral,
      name: String(eventName).trim(),
      shortName: String(eventShortName || "GebyarBulanBahasa").trim(),
      organizer: String(eventOrganizer || "SMK DP 2 Jakarta").trim(),
      theme: String(eventTheme).trim(),
      date: String(eventDate || "11 November 2026").trim(),
      year: Number(eventYear) || 2026,
      heroImageUrl: String(heroImageUrl || "").trim(),
      logoImageUrl: String(logoImageUrl || "").trim(),
      autoApproveTwibbon: Boolean(autoApproveTwibbon),
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

    // Simpan key 'auto_approve_twibbon'
    await supabase.from("event_settings").upsert(
      {
        key: "auto_approve_twibbon",
        value: Boolean(autoApproveTwibbon),
        description: "Pengaturan auto-approve twibbon tanpa moderasi manual",
        updated_at: now,
      },
      { onConflict: "key" }
    );

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

    // 5. Simpan key 'contact'
    const updatedContact = {
      ...currentContact,
      location: String(contactLocation || "").trim(),
      hours: String(contactHours || "").trim(),
      email: String(contactEmail || "").trim(),
      phone: String(contactPhone || "").trim(),
      stageMap: String(contactStageMap || "").trim(),
    };

    const { error: errContact } = await supabase.from("event_settings").upsert(
      {
        key: "contact",
        value: updatedContact,
        description: "Informasi kontak, sekretariat, dan narahubung panitia",
        updated_at: now,
      },
      { onConflict: "key" }
    );

    if (errContact) {
      console.error("API POST errContact:", errContact);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan contact settings: " + errContact.message },
        { status: 500 }
      );
    }

    // 6. Sinkronkan ke tabel monitor_displays
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

    // 7. Revalidate cache Next.js
    try {
      revalidatePath("/dashboard/pengaturan");
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/twibbon");
      revalidatePath("/media/twibbon");
      revalidatePath("/twibbon/unggah");
      revalidatePath("/galeri/twibbon");
      revalidatePath("/monitor");
      revalidatePath("/media/monitor");
      revalidatePath("/kontak");
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
        contact: updatedContact,
      },
    });
  } catch (err: unknown) {
    console.error("API POST /api/settings exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
