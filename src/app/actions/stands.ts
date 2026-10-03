"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { STANDS } from "@/lib/dummy-data";

export interface AdminStandItem {
  id: string;
  name: string;
  code: string;
  location: string;
  points: number;
  description: string;
  qrToken: string;
  visitCount: number;
  isActive: boolean;
  competitionId?: string | null;
}

const StandInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nama stand minimal 3 karakter"),
  code: z
    .string()
    .min(3, "Kode unik stand minimal 3 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "Kode hanya boleh huruf, angka, dan underscore"),
  location: z.string().min(2, "Lokasi booth minimal 2 karakter"),
  points: z.coerce.number().min(1, "Poin per kunjungan minimal 1").default(10),
  description: z.string().optional().default(""),
  qrToken: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type StandInput = z.infer<typeof StandInputSchema>;

export async function getAdminStands(): Promise<{
  success: boolean;
  stands: AdminStandItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    // 1. Ambil data stands
    const { data: dbStands, error: sErr } = await supabase
      .from("stands")
      .select("*")
      .order("code", { ascending: true });

    if (sErr) throw sErr;

    // 2. Jika database stands masih kosong, seed dari data standar STANDS
    if (!dbStands || dbStands.length === 0) {
      const seedPayload = STANDS.map((s) => ({
        name: s.name,
        code: s.code,
        booth_location: s.location,
        points_per_visit: s.points,
        description: s.description,
        qr_token: s.qrToken,
        is_active: true,
      }));

      const { data: seeded, error: seedErr } = await supabase
        .from("stands")
        .insert(seedPayload)
        .select();

      if (!seedErr && seeded) {
        return {
          success: true,
          stands: seeded.map((row: any) => ({
            id: row.id,
            name: row.name,
            code: row.code,
            location: row.booth_location || "Area Pameran",
            points: Number(row.points_per_visit) || 10,
            description: row.description || "",
            qrToken: row.qr_token,
            visitCount: 0,
            isActive: Boolean(row.is_active),
            competitionId: row.competition_id,
          })),
        };
      }
    }

    // 3. Ambil total kunjungan per stand dari point_transactions
    const { data: transactions } = await supabase
      .from("point_transactions")
      .select("stand_id")
      .not("stand_id", "is", null);

    const visitMap: Record<string, number> = {};
    (transactions || []).forEach((t) => {
      if (t.stand_id) {
        visitMap[t.stand_id] = (visitMap[t.stand_id] || 0) + 1;
      }
    });

    const mapped: AdminStandItem[] = (dbStands || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      location: row.booth_location || "Area Pameran",
      points: Number(row.points_per_visit) || 10,
      description: row.description || "",
      qrToken: row.qr_token,
      visitCount: visitMap[row.id] || 0,
      isActive: Boolean(row.is_active),
      competitionId: row.competition_id,
    }));

    return { success: true, stands: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat daftar stand.";
    return { success: false, stands: [], error: message };
  }
}

export async function upsertStand(data: StandInput) {
  const parsed = StandInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const cleanCode = parsed.data.code.trim().toUpperCase();
    const qrToken =
      parsed.data.qrToken?.trim() || `QR-STAND-${cleanCode}-${Date.now().toString(36)}`;

    // Cek duplikasi kode stand
    const query = supabase
      .from("stands")
      .select("id, name")
      .ilike("code", cleanCode);

    if (parsed.data.id) {
      query.neq("id", parsed.data.id);
    }

    const { data: duplicate } = await query.maybeSingle();
    if (duplicate) {
      return {
        success: false,
        error: `Kode stand "${cleanCode}" sudah digunakan oleh stand "${duplicate.name}".`,
      };
    }

    const payload = {
      name: parsed.data.name.trim(),
      code: cleanCode,
      booth_location: parsed.data.location.trim(),
      points_per_visit: parsed.data.points,
      description: parsed.data.description?.trim() || null,
      qr_token: qrToken,
      is_active: parsed.data.isActive,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("stands")
        .update(payload)
        .eq("id", parsed.data.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("stands").insert(payload);
      if (error) throw error;
    }

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/peserta/scan");
    revalidatePath("/challenge");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan data stand.";
    return { success: false, error: message };
  }
}

export async function deleteStand(standId: string) {
  try {
    const supabase = createAdminClient();

    // Hapus point_transactions terkait stand ini bila ada (agar tidak melanggar foreign key)
    await supabase.from("point_transactions").delete().eq("stand_id", standId);

    const { error } = await supabase.from("stands").delete().eq("id", standId);

    if (error) throw error;

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/peserta/scan");
    revalidatePath("/challenge");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus stand.";
    return { success: false, error: message };
  }
}

export async function toggleStandStatus(standId: string, isActive: boolean) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("stands")
      .update({ is_active: isActive })
      .eq("id", standId);

    if (error) throw error;

    revalidatePath("/dashboard/challenge/stand");
    revalidatePath("/dashboard/challenge");
    revalidatePath("/peserta/scan");
    revalidatePath("/challenge");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengubah status stand.";
    return { success: false, error: message };
  }
}
