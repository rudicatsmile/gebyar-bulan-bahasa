import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: comp } = await supabase
    .from("competitions")
    .select("*")
    .eq("slug", "pidato")
    .single();

  console.log("Competition:", comp?.name, comp?.slug, comp?.id);

  const { data: regs } = await supabase
    .from("registrations")
    .select(`
      id,
      team_name,
      participant_id,
      participants (
        full_name,
        institution
      ),
      registration_members (
        id,
        member_name,
        member_role,
        is_leader
      )
    `)
    .eq("competition_id", comp.id);

  const { data: prog } = await supabase
    .from("event_settings")
    .select("*")
    .eq("key", "progress_pidato")
    .maybeSingle();

  console.log("Progress pidato:", JSON.stringify(prog, null, 2));

  const { data: stages } = await supabase
    .from("competition_stages")
    .select("*")
    .eq("competition_id", comp.id)
    .order("stage_order");
  console.log("Stages:", JSON.stringify(stages, null, 2));
}

main().catch(console.error);

