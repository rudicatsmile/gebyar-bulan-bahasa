import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  // 1. Get competition
  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", "monolog")
    .single();

  if (compErr || !comp) {
    console.error("Competition monolog not found:", compErr);
    return;
  }
  console.log("Competition Monolog:", {
    id: comp.id,
    name: comp.name,
    slug: comp.slug,
    type: comp.type,
    status: comp.status,
  });

  // 2. Get criteria
  const { data: criteria } = await supabase
    .from("competition_criteria")
    .select("*")
    .eq("competition_id", comp.id)
    .order("sort_order", { ascending: true });
  console.log("Criteria:", criteria?.map(c => ({ id: c.id, name: c.name, weight: c.weight, max_score: c.max_score })));

  // 3. Get judges
  const { data: judges } = await supabase
    .from("competition_judges")
    .select("id, judge_id, status, judge:profiles!competition_judges_judge_id_fkey(id, full_name, role)")
    .eq("competition_id", comp.id);
  console.log("Judges:", JSON.stringify(judges, null, 2));

  // 4. Get registrations
  const { data: regs } = await supabase
    .from("registrations")
    .select(`
      id,
      competition_id,
      participant_id,
      team_name,
      is_confirmed,
      performance_order,
      participant:participants(*)
    `)
    .eq("competition_id", comp.id);
  console.log("Registrations:", JSON.stringify(regs, null, 2));

  // 5. Existing assessments
  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .eq("competition_id", comp.id);
  console.log("Assessments count:", assessments?.length);
  console.log("Assessments:", JSON.stringify(assessments, null, 2));
}

main().catch(console.error);
