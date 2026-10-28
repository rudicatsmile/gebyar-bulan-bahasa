import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const supabase = createAdminClient();

  const { data: pSample } = await supabase.from("participants").select("*").limit(2);
  console.log("participants sample:", pSample);

  const { data: rSample } = await supabase.from("registrations").select("*").limit(2);
  console.log("registrations sample:", rSample);

  const { data: aSample } = await supabase.from("assessments").select("*").limit(2);
  console.log("assessments sample:", aSample);

  const { data: asSample } = await supabase.from("assessment_scores").select("*").limit(2);
  console.log("assessment_scores sample:", asSample);
}

main().catch(console.error);
