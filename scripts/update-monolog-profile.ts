import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ institution: "Monolog" })
    .eq("institution", "Teater & Monolog")
    .select();

  console.log("Updated profiles:", data, "Error:", error);
}

main().catch(console.error);
