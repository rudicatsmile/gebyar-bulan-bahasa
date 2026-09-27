import { getCompetitions, getWinners } from "@/lib/supabase/queries";
import { PapanSkorClient } from "./papan-skor-client";

export const revalidate = 30; // 30 seconds revalidation for live score board

export default async function PapanSkorPage() {
  const [competitions, winners] = await Promise.all([
    getCompetitions(),
    getWinners(),
  ]);

  return <PapanSkorClient competitions={competitions} winners={winners} />;
}
