import { getSchedules, getCompetitions } from "@/lib/supabase/queries";
import { JadwalManageClient } from "./jadwal-manage-client";

export const dynamic = "force-dynamic";

export default async function DashboardJadwalPage() {
  const [schedules, competitions] = await Promise.all([
    getSchedules(),
    getCompetitions(),
  ]);

  return <JadwalManageClient initialSchedules={schedules} competitions={competitions} />;
}

