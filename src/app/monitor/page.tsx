import { getMonitorData } from "@/lib/supabase/queries";
import { MonitorClient } from "./monitor-client";

export const revalidate = 15; // Revalidate every 15 seconds

export default async function MonitorUtamaPage() {
  const data = await getMonitorData();

  return <MonitorClient initialData={data} />;
}
