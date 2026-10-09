import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Memastikan tabel point_transactions (ledger) tersinkronisasi dengan total_points pada tabel participants.
 *
 * Latar belakang:
 * Database memiliki trigger PostgreSQL `trg_sync_points` yang otomatis menghitung:
 * `total_points = coalesce((select sum(points) from public.point_transactions where participant_id = p.id), 0)`.
 *
 * Jika seorang peserta memiliki saldo awal di `participants.total_points` (misalnya dari data awal atau simulasi)
 * yang belum ada baris transaksinya di `point_transactions`, maka saat transaksi baru (misal Twibbon +20)
 * dimasukkan, trigger akan menghitung ulang sum(points) dari awal dan menimpa saldo awal peserta tersebut.
 *
 * Helper ini memastikan selisih saldo awal tersebut dicatatkan terlebih dahulu ke ledger secara idempoten
 * sebelum transaksi baru dicatat.
 */
export async function ensureParticipantLedgerSynced(
  supabase: SupabaseClient<any, any, any>,
  participantId: string
): Promise<number> {
  if (!participantId) return 0;

  try {
    const { data: part } = await supabase
      .from("participants")
      .select("id, total_points")
      .eq("id", participantId)
      .maybeSingle();

    if (!part) return 0;

    const { data: txs } = await supabase
      .from("point_transactions")
      .select("points")
      .eq("participant_id", participantId);

    const currentLedgerSum = (txs || []).reduce((acc: number, t: any) => acc + (Number(t.points) || 0), 0);
    const currentTotal = Number(part.total_points) || 0;
    const discrepancy = currentTotal - currentLedgerSum;

    if (discrepancy > 0) {
      await supabase.from("point_transactions").insert({
        participant_id: participantId,
        points: discrepancy,
        source: "penyesuaian",
        note: "Sinkronisasi saldo awal poin peserta",
      });
      return currentTotal;
    }

    return currentLedgerSum;
  } catch (err) {
    console.error("Error in ensureParticipantLedgerSynced:", err);
    return 0;
  }
}
