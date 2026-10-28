import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: comps } = await supabase.from("competitions").select("id, name, slug, type");
  console.log("=== COMPETITIONS ===");
  console.table(comps);

  const { data: judges } = await supabase
    .from("competition_judges")
    .select("id, competition_id, judge_id, is_chief_judge, status, competitions(name, slug), judge:profiles!competition_judges_judge_id_fkey(full_name, email, avatar_url, institution)");
  console.log("=== COMPETITION JUDGES ===");
  console.log(JSON.stringify(judges, null, 2));
}

main().catch(console.error);
