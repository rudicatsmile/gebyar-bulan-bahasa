import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: parts, error: pErr } = await supabase
    .from("participants")
    .select("id, registration_number, full_name, institution, status, user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  console.log("Participants count:", parts?.length);
  console.log("Participants:", parts);

  const { data: users, error: uErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .limit(10);

  console.log("Profiles count:", users?.length);
  console.log("Profiles:", users);
}

main().catch(console.error);
