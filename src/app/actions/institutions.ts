"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface InstitutionItem {
  id: string;
  name: string;
  category: "sekolah" | "kampus" | "instansi" | "umum";
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_INSTITUTIONS: InstitutionItem[] = [
  { id: "inst-1", name: "SMK DINAMIKA PEMBANGUNAN 2 JAKARTA", category: "sekolah", isActive: true, sortOrder: 1 },
  { id: "inst-2", name: "SMKN 3 Jakarta", category: "sekolah", isActive: true, sortOrder: 2 },
  { id: "inst-3", name: "SMAN 8 Jakarta", category: "sekolah", isActive: true, sortOrder: 3 },
  { id: "inst-4", name: "SMA Kristen 1 BPK Penabur", category: "sekolah", isActive: true, sortOrder: 4 },
  { id: "inst-5", name: "SMA Taman Siswa Yogyakarta", category: "sekolah", isActive: true, sortOrder: 5 },
  { id: "inst-6", name: "SMA Taruna Nusantara", category: "sekolah", isActive: true, sortOrder: 6 },
  { id: "inst-7", name: "MAN 2 Malang", category: "sekolah", isActive: true, sortOrder: 7 },
  { id: "inst-8", name: "Universitas Indonesia", category: "kampus", isActive: true, sortOrder: 8 },
  { id: "inst-9", name: "Universitas Padjadjaran", category: "kampus", isActive: true, sortOrder: 9 },
  { id: "inst-10", name: "Sanggar Seni Si Pitung Rawa Belong", category: "instansi", isActive: true, sortOrder: 10 },
  { id: "inst-11", name: "Lainnya / Umum", category: "umum", isActive: true, sortOrder: 99 },
];

const SETTINGS_KEY = "master_institutions";

const InstitutionInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Nama sekolah/kampus/instansi minimal 2 karakter"),
  category: z.enum(["sekolah", "kampus", "instansi", "umum"]).default("sekolah"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().min(0).default(0),
});

export type InstitutionInput = z.infer<typeof InstitutionInputSchema>;

/**
 * Mengambil daftar sekolah/instansi yang AKTIF untuk dropdown pendaftaran peserta di /daftar
 */
export async function getActiveInstitutions(): Promise<{
  success: boolean;
  institutions: InstitutionItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) throw error;

    let items: InstitutionItem[] = DEFAULT_INSTITUTIONS;

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      items = (data.value as unknown) as InstitutionItem[];
    } else {
      // Inisialisasi otomatis data awal jika belum ada di database
      await supabase.from("event_settings").upsert({
        key: SETTINGS_KEY,
        value: DEFAULT_INSTITUTIONS as unknown as any,
        description: "Daftar master asal sekolah/kampus/instansi untuk pendaftaran peserta",
        updated_at: new Date().toISOString(),
      });
    }

    const activeItems = items
      .filter((item) => item.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    return { success: true, institutions: activeItems };
  } catch (err: unknown) {
    console.error("Error getActiveInstitutions:", err);
    return {
      success: true,
      institutions: DEFAULT_INSTITUTIONS.filter((i) => i.isActive),
    };
  }
}

/**
 * Mengambil SELURUH daftar sekolah/instansi (aktif & nonaktif) untuk halaman manajemen admin
 */
export async function getAdminInstitutions(): Promise<{
  success: boolean;
  institutions: InstitutionItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (error) throw error;

    let items: InstitutionItem[] = DEFAULT_INSTITUTIONS;

    if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
      items = (data.value as unknown) as InstitutionItem[];
    } else {
      await supabase.from("event_settings").upsert({
        key: SETTINGS_KEY,
        value: DEFAULT_INSTITUTIONS as unknown as any,
        description: "Daftar master asal sekolah/kampus/instansi untuk pendaftaran peserta",
        updated_at: new Date().toISOString(),
      });
    }

    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    return { success: true, institutions: items };
  } catch (err: unknown) {
    console.error("Error getAdminInstitutions:", err);
    return {
      success: false,
      institutions: DEFAULT_INSTITUTIONS,
      error: err instanceof Error ? err.message : "Gagal memuat master instansi.",
    };
  }
}

/**
 * Tambah / Edit data sekolah/instansi oleh Admin
 */
export async function upsertInstitution(data: InstitutionInput) {
  const parsed = InstitutionInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = createAdminClient();
    const { data: existingData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    let items: InstitutionItem[] = (existingData?.value as unknown as InstitutionItem[]) || DEFAULT_INSTITUTIONS;

    if (parsed.data.id) {
      // Edit existing
      items = items.map((item) =>
        item.id === parsed.data.id
          ? {
              ...item,
              name: parsed.data.name.trim(),
              category: parsed.data.category,
              isActive: parsed.data.isActive,
              sortOrder: parsed.data.sortOrder,
            }
          : item
      );
    } else {
      // Cek duplikasi nama
      const duplicate = items.find(
        (i) => i.name.toLowerCase().trim() === parsed.data.name.toLowerCase().trim()
      );
      if (duplicate) {
        return { success: false, error: `Instansi dengan nama "${parsed.data.name}" sudah ada.` };
      }

      const newItem: InstitutionItem = {
        id: `inst-${Date.now()}`,
        name: parsed.data.name.trim(),
        category: parsed.data.category,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder || items.length + 1,
      };

      items.push(newItem);
    }

    const { error: saveErr } = await supabase.from("event_settings").upsert({
      key: SETTINGS_KEY,
      value: items as unknown as any,
      description: "Daftar master asal sekolah/kampus/instansi untuk pendaftaran peserta",
      updated_at: new Date().toISOString(),
    });

    if (saveErr) throw saveErr;

    revalidatePath("/daftar");
    revalidatePath("/dashboard/instansi");
    revalidatePath("/dashboard/pengguna");
    revalidatePath("/dashboard/peserta");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error upsertInstitution:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan data instansi.",
    };
  }
}

/**
 * Aktifkan / Nonaktifkan status instansi oleh Admin
 */
export async function toggleInstitutionStatus(id: string, isActive: boolean) {
  try {
    const supabase = createAdminClient();
    const { data: existingData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    let items: InstitutionItem[] = (existingData?.value as unknown as InstitutionItem[]) || DEFAULT_INSTITUTIONS;

    items = items.map((item) => (item.id === id ? { ...item, isActive } : item));

    const { error: saveErr } = await supabase.from("event_settings").upsert({
      key: SETTINGS_KEY,
      value: items as unknown as any,
      description: "Daftar master asal sekolah/kampus/instansi untuk pendaftaran peserta",
      updated_at: new Date().toISOString(),
    });

    if (saveErr) throw saveErr;

    revalidatePath("/daftar");
    revalidatePath("/dashboard/instansi");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal merubah status instansi.",
    };
  }
}

/**
 * Hapus instansi dari data master oleh Admin
 */
export async function deleteInstitution(id: string) {
  try {
    const supabase = createAdminClient();
    const { data: existingData } = await supabase
      .from("event_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    let items: InstitutionItem[] = (existingData?.value as unknown as InstitutionItem[]) || DEFAULT_INSTITUTIONS;

    items = items.filter((item) => item.id !== id);

    const { error: saveErr } = await supabase.from("event_settings").upsert({
      key: SETTINGS_KEY,
      value: items as unknown as any,
      description: "Daftar master asal sekolah/kampus/instansi untuk pendaftaran peserta",
      updated_at: new Date().toISOString(),
    });

    if (saveErr) throw saveErr;

    revalidatePath("/daftar");
    revalidatePath("/dashboard/instansi");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus data instansi.",
    };
  }
}
