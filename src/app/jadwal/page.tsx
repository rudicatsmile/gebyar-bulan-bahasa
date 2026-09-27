import { getSchedules, getCompetitions } from "@/lib/supabase/queries";
import { JadwalClient } from "./jadwal-client";

export const revalidate = 60;

export default async function JadwalPage() {
  const [schedules, competitions] = await Promise.all([
    getSchedules(),
    getCompetitions(),
  ]);

  return <JadwalClient initialSchedules={schedules} competitions={competitions} />;
}
