import { getCompetitions } from "@/lib/supabase/queries";
import { LombaManageClient } from "./lomba-manage-client";

export const dynamic = "force-dynamic";

export default async function DashboardLombaPage() {
  const competitions = await getCompetitions();

  return <LombaManageClient initialCompetitions={competitions} />;
}
