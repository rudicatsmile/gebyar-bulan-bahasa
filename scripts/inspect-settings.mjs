import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
const content = readFileSync(".env.production", "utf-8");
for (const line of content.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const res = await supabase.from("event_settings").select("*");
  console.log("event_settings rows:", res.data);
}

test();
