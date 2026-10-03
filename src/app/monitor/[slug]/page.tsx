import { getMonitorData } from "@/lib/supabase/queries";
import { MonitorSpesifikClient } from "./monitor-spesifik-client";

export const revalidate = 15; // Revalidate every 15 seconds

interface MonitorSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function MonitorSpesifikPage({ params }: MonitorSlugPageProps) {
  const { slug } = await params;
  const data = await getMonitorData();

  return <MonitorSpesifikClient slug={slug} initialData={data} />;
}
