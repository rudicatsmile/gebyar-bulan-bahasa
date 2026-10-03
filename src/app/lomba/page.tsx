import { getCompetitions } from "@/lib/supabase/queries";
import { LombaClient } from "./lomba-client";

export const dynamic = "force-dynamic";

export default async function LombaPage() {
  const competitions = await getCompetitions();

  return <LombaClient initialCompetitions={competitions} />;
}
