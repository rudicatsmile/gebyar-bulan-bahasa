import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { getAllAnnouncements } from "@/lib/supabase/queries";
import { PengumumanManageClient } from "./pengumuman-manage-client";

export const dynamic = "force-dynamic";

export default async function DashboardPengumumanPage() {
  const announcements = await getAllAnnouncements();

  return (
    <DashboardLayout role="seksi_acara">
      <PengumumanManageClient initialAnnouncements={announcements} />
    </DashboardLayout>
  );
}
