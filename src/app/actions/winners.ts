"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompetitionScoringRecap } from "@/app/actions/assessments";

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

export interface DashboardWinnerItem {
  id: string;
  competitionId: string;
  competitionName: string;
  winnerName: string;
  teamName?: string;
  institution: string;
  rank: number;
  title: string;
  finalScore: number;
  prize: string;
  isPublished: boolean;
  announcedAt?: string | null;
}

export async function getDashboardWinners(): Promise<{
  success: boolean;
  winners: DashboardWinnerItem[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("winners")
      .select("*, competitions(id, name, slug)")
      .order("rank", { ascending: true });

    if (error) throw error;

    const mapped: DashboardWinnerItem[] = (data || []).map((w: any) => ({
      id: w.id,
      competitionId: w.competition_id || "",
      competitionName: w.competitions?.name || "Cabang Lomba",
      winnerName: w.winner_name,
      teamName: undefined,
      institution: w.institution || "-",
      rank: Number(w.rank),
      title: w.title || `Juara ${w.rank}`,
      finalScore: Number(w.final_score) || 0,
      prize: w.prize || "-",
      isPublished: Boolean(w.is_published),
      announcedAt: w.announced_at,
    }));

    return { success: true, winners: mapped };
  } catch (err: unknown) {
    console.error("Error getDashboardWinners:", err);
    return {
      success: false,
      winners: [],
      error: err instanceof Error ? err.message : "Gagal memuat daftar pemenang.",
    };
  }
}

export async function publishAllWinners(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const serverSupabase = await createClient();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    // 1. Cek apakah sudah ada data di tabel winners
    const { data: existingWinners, error: fetchErr } = await supabase
      .from("winners")
      .select("id");

    if (fetchErr) throw fetchErr;

    // 2. Jika belum ada pemenang di tabel winners, hasilkan secara otomatis dari rekapitulasi nilai juri seluruh lomba
    if (!existingWinners || existingWinners.length === 0) {
      const { data: competitions, error: cErr } = await supabase
        .from("competitions")
        .select("id, name, slug");

      if (cErr) throw cErr;

      const toInsert: any[] = [];
      const updatedCompIds: string[] = [];

      for (const comp of competitions || []) {
        const recapRes = await getCompetitionScoringRecap(comp.id);
        if (recapRes.success && recapRes.recaps && recapRes.recaps.length > 0) {
          // Filter peserta yang sudah memiliki skor akhir > 0
          const validRecaps = recapRes.recaps.filter((r) => r.finalScore > 0);
          if (validRecaps.length > 0) {
            updatedCompIds.push(comp.id);
            // Ambil hingga 4 besar (Juara 1, 2, 3, Harapan 1)
            const topFour = validRecaps.slice(0, 4);
            topFour.forEach((item, idx) => {
              const rank = idx + 1;
              const title =
                rank === 1
                  ? "Juara 1"
                  : rank === 2
                  ? "Juara 2"
                  : rank === 3
                  ? "Juara 3"
                  : "Juara Harapan 1";

              const prize =
                rank === 1
                  ? "Uang Pembinaan + Trophy + Sertifikat Juara 1"
                  : rank === 2
                  ? "Uang Pembinaan + Trophy + Sertifikat Juara 2"
                  : rank === 3
                  ? "Uang Pembinaan + Trophy + Sertifikat Juara 3"
                  : "Trophy + Sertifikat Harapan 1";

              toInsert.push({
                category: "lomba",
                competition_id: comp.id,
                registration_id: item.registrationId,
                winner_name: item.participantName,
                institution: item.institution,
                rank,
                title,
                final_score: item.finalScore,
                prize,
                is_published: true,
                announced_at: new Date().toISOString(),
                created_by: user?.id || null,
              });
            });
          }
        }
      }

      if (toInsert.length === 0) {
        return {
          success: false,
          error:
            "Belum ada formulir penilaian juri yang masuk di database. Mohon pastikan dewan juri telah menginput penilaian di menu Rekapitulasi Penilaian.",
        };
      }

      // Hapus pemenang lama jika ada lalu insert pemenang baru
      const { error: insErr } = await supabase.from("winners").insert(toInsert);
      if (insErr) throw insErr;

      // Update status kompetisi menjadi 'selesai'
      if (updatedCompIds.length > 0) {
        await supabase
          .from("competitions")
          .update({ status: "selesai" })
          .in("id", updatedCompIds);
      }

      // Buat pengumuman publikasi pemenang
      const slug = `pengumuman-juara-resmi-${Date.now()}`;
      await supabase.from("announcements").insert({
        slug,
        title: "Pengumuman Resmi Juara Gebyar Bulan Bahasa",
        category: "pemenang",
        body: "Dewan juri telah secara resmi menetapkan para pemenang seluruh cabang lomba Gebyar Bulan Bahasa. Selamat kepada seluruh pemenang!",
        is_published: true,
        is_pinned: true,
        show_on_monitor: true,
        author_id: user?.id || null,
      });

      revalidatePath("/dashboard/pemenang");
      revalidatePath("/pemenang");
      revalidatePath("/monitor");
      revalidatePath("/monitor/pemenang");
      return { success: true, count: toInsert.length };
    }

    // 3. Jika sudah ada data di tabel winners (draft), set is_published = true
    const { data, error } = await supabase
      .from("winners")
      .update({ is_published: true, announced_at: new Date().toISOString() })
      .select();

    if (error) throw error;

    const compIds: string[] = Array.from(
      new Set(
        (data || [])
          .map((w: any) => w.competition_id)
          .filter((id: any): id is string => typeof id === "string" && id.length > 0)
      )
    );
    if (compIds.length > 0) {
      await supabase
        .from("competitions")
        .update({ status: "selesai" })
        .in("id", compIds);
    }

    revalidatePath("/dashboard/pemenang");
    revalidatePath("/pemenang");
    revalidatePath("/monitor");
    revalidatePath("/monitor/pemenang");
    return { success: true, count: data?.length || 0 };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mempublikasikan pemenang.",
    };
  }
}

export async function saveTieBreakerNotes(notes: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();

    await supabase.from("activity_logs").insert({
      actor_id: user?.id || null,
      action: "tie_breaker_decision",
      entity: "winners",
      description: `Berita Acara Sidang Penetapan Juara Seri: ${notes}`,
    });

    revalidatePath("/dashboard/pemenang");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan berita acara.",
    };
  }
}
