import { notFound, redirect } from "next/navigation";
import { getCompetitionBySlug } from "@/lib/supabase/queries";
import { getCompetitionJudgesBySlug } from "@/app/actions/competitions";
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

  // Jika diakses menggunakan UUID, arahkan ke canonical slug URL
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  if (isUuid && competition.slug && competition.slug !== slug) {
    redirect(`/lomba/${competition.slug}`);
  }

  const assignedJudges = await getCompetitionJudgesBySlug(competition.slug || slug);

  return (
    <LombaDetailClient
      competition={competition}
      initialJudges={assignedJudges}
    />
  );
}
