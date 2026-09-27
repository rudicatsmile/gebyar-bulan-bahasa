import { getWinners, getCompetitions } from "@/lib/supabase/queries";
import { PemenangClient } from "./pemenang-client";

export const revalidate = 60;

export default async function PemenangPage() {
  const [winners, competitions] = await Promise.all([
    getWinners(),
    getCompetitions(),
  ]);

  return <PemenangClient initialWinners={winners} competitions={competitions} />;
}
