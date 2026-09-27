import { getSchedules } from "@/lib/supabase/queries";
import { JadwalManageClient } from "./jadwal-manage-client";

export const dynamic = "force-dynamic";

export default async function DashboardJadwalPage() {
  const schedules = await getSchedules();

  return <JadwalManageClient initialSchedules={schedules} />;
}
