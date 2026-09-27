"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const ScheduleInputSchema = z.object({
  id: z.string().optional(),
  competitionId: z.string().uuid().optional().nullable(),
  title: z.string().min(3, "Judul jadwal minimal 3 karakter"),
  description: z.string().optional(),
  eventDay: z.number().int().min(1).max(3),
  eventDate: z.string().min(10, "Format tanggal YYYY-MM-DD"),
  startTime: z.string().min(4, "Format waktu HH:mm"),
  endTime: z.string().optional(),
  venue: z.string().min(2, "Nama venue wajib diisi"),
  stage: z.string().optional(),
  hostName: z.string().optional(),
  status: z.enum(["terjadwal", "berlangsung", "selesai", "ditunda", "dibatalkan"]).default("terjadwal"),
});

export async function upsertSchedule(data: z.infer<typeof ScheduleInputSchema>) {
  const parsed = ScheduleInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await createClient();

    // Validasi Anti-Bentrok Panggung jika status = 'berlangsung'
    if (parsed.data.status === "berlangsung" && parsed.data.stage) {
      const { data: conflictSchedule } = await supabase
        .from("schedules")
        .select("id, title")
        .eq("stage", parsed.data.stage)
        .eq("status", "berlangsung")
        .neq("id", parsed.data.id || "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (conflictSchedule) {
        return {
          success: false,
          error: `Panggung "${parsed.data.stage}" sedang digunakan oleh sesi "${conflictSchedule.title}". Hanya 1 agenda boleh berstatus 'Berlangsung' pada panggung yang sama.`,
        };
      }
    }

    const payload = {
      competition_id: parsed.data.competitionId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      event_day: parsed.data.eventDay,
      event_date: parsed.data.eventDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime || null,
      venue: parsed.data.venue,
      stage: parsed.data.stage || null,
      host_name: parsed.data.hostName || null,
      status: parsed.data.status,
    };

    if (parsed.data.id) {
      const { error } = await supabase
        .from("schedules")
        .update(payload)
        .eq("id", parsed.data.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("schedules").insert(payload);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/jadwal");
    revalidatePath("/monitor");
    revalidatePath("/monitor/jadwal");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal menyimpan jadwal." };
  }
}

export async function setScheduleStatus(
  scheduleId: string,
  status: "terjadwal" | "berlangsung" | "selesai"
) {
  try {
    const supabase = await createClient();

    // Jika ingin dijadikan 'berlangsung', pastikan tidak ada bentrok di panggung yang sama
    if (status === "berlangsung") {
      const { data: current } = await supabase
        .from("schedules")
        .select("stage")
        .eq("id", scheduleId)
        .single();

      if (current?.stage) {
        const { data: conflict } = await supabase
          .from("schedules")
          .select("title")
          .eq("stage", current.stage)
          .eq("status", "berlangsung")
          .neq("id", scheduleId)
          .maybeSingle();

        if (conflict) {
          return {
            success: false,
            error: `Bentrok panggung: "${conflict.title}" sedang berlangsung di ${current.stage}.`,
          };
        }
      }
    }

    const { error } = await supabase
      .from("schedules")
      .update({ status })
      .eq("id", scheduleId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard/jadwal");
    revalidatePath("/jadwal");
    revalidatePath("/monitor");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
