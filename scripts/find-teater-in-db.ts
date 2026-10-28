import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  // Search profiles
  const { data: p } = await supabase.from("profiles").select("*").or("full_name.ilike.%teater%,institution.ilike.%teater%,nickname.ilike.%teater%");
  console.log("Profiles matching teater:", p);

  // Search competitions
  const { data: c } = await supabase.from("competitions").select("*").or("name.ilike.%teater%,short_name.ilike.%teater%,description.ilike.%teater%,theme_link.ilike.%teater%");
  console.log("Competitions matching teater:", c?.map(x => ({ id: x.id, name: x.name, short_name: x.short_name, slug: x.slug, theme_link: x.theme_link })));

  // Search event_settings
  const { data: s } = await supabase.from("event_settings").select("key, value");
  const matchingSettings = s?.filter(item => JSON.stringify(item).toLowerCase().includes("teater"));
  console.log("Event settings matching teater:", matchingSettings);
}

main().catch(console.error);
