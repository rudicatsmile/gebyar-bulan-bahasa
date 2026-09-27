import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { getCompetitions } from "@/lib/supabase/queries";
import { KriteriaManageClient } from "./kriteria-manage-client";

export const dynamic = "force-dynamic";

export default async function DashboardKriteriaPage() {
  const competitions = await getCompetitions();

  return (
    <DashboardLayout role="seksi_acara">
      <KriteriaManageClient initialCompetitions={competitions} />
    </DashboardLayout>
  );
}
