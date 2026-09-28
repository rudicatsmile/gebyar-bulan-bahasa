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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, role, institution, phone } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: "Email, password, dan nama lengkap wajib diisi." },
        { status: 400 }
      );
    }

    if ((password as string).length < 6) {
      return NextResponse.json(
        { success: false, error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role || "peserta",
        institution: institution || "",
        phone: phone || "",
      },
    });

    if (authError) {
      console.error("API POST /api/users auth error:", authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    await supabase.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      role: (role as UserRole) || "peserta",
      institution: institution || null,
      phone: phone || null,
      is_active: true,
    });

    try { revalidatePath("/dashboard/pengguna"); } catch { /* safe */ }

    return NextResponse.json({
      success: true,
      message: "Akun pengguna berhasil dibuat.",
      userId,
    });
  } catch (err: unknown) {
    console.error("API POST /api/users exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, isActive, fullName, institution, phone, newPassword } = body;

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
      full_name?: string;
      institution?: string | null;
      phone?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (role !== undefined) updatePayload.role = role as UserRole;
    if (isActive !== undefined) updatePayload.is_active = Boolean(isActive);
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (institution !== undefined) updatePayload.institution = institution || null;
    if (phone !== undefined) updatePayload.phone = phone || null;

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (profileError) {
      console.error("API PATCH /api/users error:", profileError);
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    try {
      const authMeta: Record<string, string | boolean> = {};
      if (role !== undefined) authMeta.role = role;
      if (isActive !== undefined) authMeta.is_active = Boolean(isActive);
      if (fullName !== undefined) authMeta.full_name = fullName;

      const authUpdate: {
        user_metadata: Record<string, string | boolean>;
        password?: string;
      } = { user_metadata: authMeta };

      if (newPassword && (newPassword as string).length >= 6) {
        authUpdate.password = newPassword;
      }

      await supabase.auth.admin.updateUserById(userId, authUpdate);
    } catch (e) {
      console.warn("Notice: Gagal update auth metadata:", e);
    }

    try { revalidatePath("/dashboard/pengguna"); } catch { /* safe */ }

    return NextResponse.json({ success: true, message: "Data pengguna berhasil diperbarui." });
  } catch (err: unknown) {
    console.error("API PATCH /api/users exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { userId, requestorId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "ID pengguna diperlukan." }, { status: 400 });
    }

    if (requestorId && requestorId === userId) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menghapus akun Anda sendiri yang sedang aktif." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .single();

    if (profile?.role === "super_admin") {
      return NextResponse.json(
        { success: false, error: "Akun Super Admin tidak dapat dihapus untuk menjaga keamanan sistem." },
        { status: 403 }
      );
    }

    const [{ count: assessCount }, { count: participantCount }] = await Promise.all([
      supabase.from("assessments").select("id", { count: "exact", head: true }).eq("judge_id", userId),
      supabase.from("participants").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const hasRelations = (assessCount ?? 0) > 0 || (participantCount ?? 0) > 0;

    if (hasRelations) {
      await supabase
        .from("profiles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", userId);

      try { revalidatePath("/dashboard/pengguna"); } catch { /* safe */ }

      return NextResponse.json({
        success: true,
        softDeleted: true,
        message: "Akun memiliki riwayat data lomba/penilaian. Akun berhasil dinonaktifkan (tidak dihapus permanen).",
      });
    }

    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.auth.admin.deleteUser(userId);

    try { revalidatePath("/dashboard/pengguna"); } catch { /* safe */ }

    return NextResponse.json({ success: true, softDeleted: false, message: "Akun berhasil dihapus permanen." });
  } catch (err: unknown) {
    console.error("API DELETE /api/users exception:", err);
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
