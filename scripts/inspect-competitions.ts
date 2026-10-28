import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: comps, error } = await supabase
    .from("competitions")
    .select("id, slug, name, short_name, poster_url, type, status")
    .order("sort_order", { ascending: true });

  console.log("Error:", error);
  console.log("Competitions in DB:");
  console.table(comps);
}

main().catch(console.error);
