import { getCompetitions, getWinners } from "@/lib/supabase/queries";
import { getDutaBahasaStages, getDutaBahasaProgress } from "@/app/actions/duta-bahasa";
import { PapanSkorClient } from "./papan-skor-client";

export const revalidate = 10; // 10 seconds revalidation for live score board

export default async function PapanSkorPage() {
  const [competitions, winners, dutaStagesRes, dutaProgressRes] = await Promise.all([
    getCompetitions(),
    getWinners(),
    getDutaBahasaStages(),
    getDutaBahasaProgress(),
  ]);

  return (
    <PapanSkorClient
      competitions={competitions}
      winners={winners}
      dutaStages={dutaStagesRes.stages || []}
      dutaParticipants={dutaProgressRes.participants || []}
    />
  );
}
