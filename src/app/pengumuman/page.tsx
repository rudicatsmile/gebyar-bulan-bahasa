import { getAnnouncements } from "@/lib/supabase/queries";
import { PengumumanClient } from "./pengumuman-client";

export const revalidate = 60;

export default async function PengumumanPage() {
  const announcements = await getAnnouncements();

  return <PengumumanClient initialAnnouncements={announcements} />;
}
