"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const RegisterInputSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  institution: z.string().min(2, "Asal instansi / sekolah minimal 2 karakter"),
  email: z.string().email("Format alamat email tidak valid"),
  phone: z.string().optional().nullable(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
});

export async function registerUser(formData: {
  fullName: string;
  institution: string;
  email: string;
  phone?: string | null;
  password: string;
}) {
  const parsed = RegisterInputSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Data pendaftaran tidak valid." };
  }

  const { fullName, institution, email, phone, password } = parsed.data;
  const adminSupabase = createAdminClient();

  try {
    // 1. Cek apakah email sudah terdaftar di profiles
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingProfile) {
      return {
        success: false,
        error: "Alamat email ini sudah terdaftar. Silakan gunakan menu 'Masuk' atau gunakan email lain.",
      };
    }

    // 2. Buat user di Supabase Auth via admin (auto-confirm email untuk bypass rate limit SMTP)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        institution: institution.trim(),
        phone: phone?.trim() || null,
        role: "peserta",
      },
    });

    if (authError || !authData?.user) {
      console.error("Gagal membuat akun auth:", authError);
      return {
        success: false,
        error: authError?.message || "Gagal membuat akun pengguna di sistem autentikasi.",
      };
    }

    const userId = authData.user.id;

    // 3. Simpan data profil lengkap ke public.profiles
    const { error: profileError } = await adminSupabase.from("profiles").upsert(
      {
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        institution: institution.trim(),
        phone: phone?.trim() || null,
        role: "peserta",
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Gagal menyimpan ke public.profiles:", profileError);
      return {
        success: false,
        error: "Akun berhasil dibuat namun gagal melengkapi profil: " + profileError.message,
      };
    }

    // 4. Generate nomor registrasi peserta unik (format: GBB-2025-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const regNumber = `GBB-2025-${randomSuffix}`;

    // 5. Buat entitas awal peserta di public.participants
    const { error: participantError } = await adminSupabase.from("participants").insert({
      user_id: userId,
      registration_number: regNumber,
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      institution: institution.trim(),
      status: "terverifikasi",
      total_points: 0,
    });

    if (participantError) {
      console.warn("Notice: Gagal otomatis membuat entitas participants:", participantError.message);
      // Non-fatal, profil utama sudah tersimpan
    }

    try {
      revalidatePath("/dashboard/pengguna");
      revalidatePath("/dashboard/peserta");
      revalidatePath("/peserta");
    } catch {
      // Safe fallback when executed outside Next.js request lifecycle
    }

    return {
      success: true,
      userId,
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      registrationNumber: regNumber,
    };
  } catch (err: unknown) {
    console.error("Kesalahan server saat registerUser:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mendaftar.";
    return { success: false, error: message };
  }
}
