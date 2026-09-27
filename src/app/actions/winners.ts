"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const WinnerItemSchema = z.object({
  registrationId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  winnerName: z.string().min(2),
  institution: z.string().optional(),
  rank: z.number().int().min(1).max(5),
  title: z.string().default("Juara"),
  finalScore: z.number(),
  prize: z.string().optional(),
});

const PublishWinnersSchema = z.object({
  competitionId: z.string().uuid("ID Lomba tidak valid"),
  competitionName: z.string(),
  winners: z.array(WinnerItemSchema).min(1, "Minimal harus ada 1 pemenang"),
});

export async function publishCompetitionWinners(data: z.infer<typeof PublishWinnersSchema>) {
  const parsed = PublishWinnersSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message };
  }

  try {
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    const supabase = createAdminClient();

    // Hapus pemenang lama untuk lomba ini jika ada (idempotent)
    await supabase.from("winners").delete().eq("competition_id", parsed.data.competitionId);

    // Insert pemenang baru
    const toInsert = parsed.data.winners.map((w) => ({
      category: "lomba" as const,
      competition_id: parsed.data.competitionId,
      registration_id: w.registrationId,
      participant_id: w.participantId || null,
      winner_name: w.winnerName,
      institution: w.institution || null,
      rank: w.rank,
      title: w.title,
      final_score: w.finalScore,
      prize: w.prize || null,
      is_published: true,
      announced_at: new Date().toISOString(),
      created_by: user?.id || null,
    }));

    const { error: wErr } = await supabase.from("winners").insert(toInsert);
    if (wErr) return { success: false, error: wErr.message };

    // Update status lomba menjadi 'selesai'
    await supabase
      .from("competitions")
      .update({ status: "selesai" })
      .eq("id", parsed.data.competitionId);

    // Otomatis buat pengumuman resmi bertipe 'pemenang'
    const winnerSummary = parsed.data.winners
      .map((w) => `${w.title} (${w.rank}): ${w.winnerName} - ${w.institution || ""} (${w.finalScore} pts)`)
      .join("\n");

    const slug = `pengumuman-juara-${parsed.data.competitionName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    await supabase.from("announcements").insert({
      slug,
      title: `Keputusan Dewan Juri: Juara Resmi ${parsed.data.competitionName}`,
      category: "pemenang",
      body: `Berdasarkan rekapitulasi penilaian dewan juri, telah ditetapkan para pemenang ${parsed.data.competitionName} Gebyar Bulan Bahasa 2025:\n\n${winnerSummary}\n\nSelamat kepada seluruh pemenang!`,
      is_published: true,
      is_pinned: true,
      show_on_monitor: true,
      author_id: user?.id || null,
    });

    revalidatePath("/dashboard/pemenang");
    revalidatePath("/pemenang");
    revalidatePath("/monitor");
    revalidatePath("/monitor/pemenang");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mempublikasikan pemenang.";
    return { success: false, error: message };
  }
}
