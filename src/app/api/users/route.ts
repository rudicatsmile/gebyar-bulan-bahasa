import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserRole } from "@/types/database.types";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, institution, is_active, phone, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("API GET /api/users error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const users = (data || []).map((row) => {
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

    return NextResponse.json({ success: true, count: users.length, users });
  } catch (err: unknown) {
    console.error("API GET /api/users exception:", err);
    const message = err instanceof Error ? err.message : "Gagal memuat pengguna.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, isActive } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ID pengguna diperlukan." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const updatePayload: {
      updated_at: string;
      role?: UserRole;
      is_active?: boolean;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (role !== undefined) updatePayload.role = role as UserRole;
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (profileError) {
      console.error("API PATCH /api/users error:", profileError);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    // Sync ke auth metadata jika role / active berubah
    try {
      const authMeta: Record<string, any> = {};
      if (role !== undefined) authMeta.role = role;
      if (isActive !== undefined) authMeta.is_active = isActive;

      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: authMeta,
      });
    } catch (e) {
      console.warn("Notice: Gagal update auth metadata:", e);
    }

    try {
      revalidatePath("/dashboard/pengguna");
    } catch {
      // Safe fallback
    }

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui.",
    });
  } catch (err: unknown) {
    console.error("API PATCH /api/users exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
