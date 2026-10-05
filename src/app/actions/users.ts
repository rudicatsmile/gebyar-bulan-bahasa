"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/database.types";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  institution: string;
  isActive: boolean;
  createdAt: string;
  phone?: string | null;
}

export async function getAllUsers(): Promise<{
  success: boolean;
  users?: AppUser[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, institution, is_active, phone, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Gagal mengambil data profiles:", error);
      return { success: false, error: error.message };
    }

    const users: AppUser[] = (data || []).map((row) => {
      const dateObj = row.created_at ? new Date(row.created_at) : new Date();
      const formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name || "Pengguna",
        role: (row.role as UserRole) || "peserta",
        institution: row.institution || "Umum",
        isActive: row.is_active ?? true,
        createdAt: formattedDate,
        phone: row.phone,
      };
    });

    return { success: true, users };
  } catch (err: unknown) {
    console.error("Error getAllUsers:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Terjadi kesalahan saat memuat daftar pengguna.",
    };
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!userId) return { success: false, error: "ID pengguna tidak ditemukan" };

  try {
    const supabase = createAdminClient();

    // 1. Update di public.profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 2. Sinkronkan ke auth user_metadata
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: newRole },
      });
    } catch (e) {
      console.warn("Notice: Gagal update auth metadata role:", e);
    }

    // 3. Jika peran juri dicabut, bersihkan penugasan di competition_judges agar
    // tidak meninggalkan juri "bayangan" pada matriks penugasan & penilaian lomba.
    if (newRole !== "juri") {
      const { error: cleanupError } = await supabase
        .from("competition_judges")
        .delete()
        .eq("judge_id", userId);
      if (cleanupError) {
        console.warn("Peran juri dicabut namun gagal membersihkan competition_judges:", cleanupError);
      }
    }

    revalidatePath("/dashboard/pengguna");
    if (newRole !== "juri") {
      revalidatePath("/dashboard/juri");
      revalidatePath("/dashboard/juri/penugasan");
    }
    return { success: true };
  } catch (err: unknown) {
    console.error("Error updateUserRole:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui peran pengguna.",
    };
  }
}

export async function toggleUserActive(userId: string, isActive: boolean): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!userId) return { success: false, error: "ID pengguna tidak ditemukan" };

  try {
    const supabase = createAdminClient();

    // 1. Update di public.profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 2. Sinkronkan ke auth user_metadata
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { is_active: isActive },
      });
    } catch (e) {
      console.warn("Notice: Gagal update auth metadata is_active:", e);
    }

    revalidatePath("/dashboard/pengguna");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error toggleUserActive:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui status keaktifan pengguna.",
    };
  }
}
