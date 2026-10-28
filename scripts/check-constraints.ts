import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  // Test if there's unique constraint on registration_id, judge_id in assessments
  // We can query pg_indexes or information_schema via RPC, or test an upsert with dummy or rollback.
  // Or test a dry run or query postgres metadata if available.
  const { data, error } = await supabase.rpc("get_table_info" as any);
  console.log("RPC get_table_info:", { data, error });
}

main().catch(console.error);
