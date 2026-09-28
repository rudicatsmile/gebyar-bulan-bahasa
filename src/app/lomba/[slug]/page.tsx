import { notFound } from "next/navigation";
import { getCompetitionBySlug } from "@/lib/supabase/queries";
import { LombaDetailClient } from "./lomba-detail-client";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LombaDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const competition = await getCompetitionBySlug(slug);
  if (!competition) {
    return notFound();
  }

  return <LombaDetailClient competition={competition} />;
}
