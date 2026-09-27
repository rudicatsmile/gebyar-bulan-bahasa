import { getCompetitions } from "@/lib/supabase/queries";
import { LombaClient } from "./lomba-client";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function LombaPage() {
  const competitions = await getCompetitions();

  return <LombaClient initialCompetitions={competitions} />;
}
