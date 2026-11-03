import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const envPath = existsSync(".env.production") ? ".env.production" : ".env.local";
const content = readFileSync(envPath, "utf-8");
const env = {};
for (const line of content.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0) {
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    env[k] = v;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("=== MEMERIKSA STATUS DATABASE SUPABASE BARU ===");
  console.log("URL:", env.NEXT_PUBLIC_SUPABASE_URL);

  const tables = [
    "event_settings",
    "competitions",
    "competition_criteria",
    "competition_judges",
    "profiles",
    "participants",
    "registrations",
    "participant_documents",
    "assessments",
    "assessment_scores",
    "stands",
    "challenges",
    "rewards",
    "schedules",
    "announcements",
    "winners",
    "institutions",
    "puzzle_items",
    "puzzle_attempts",
    "qr_letter_challenges",
    "twibbon_templates",
    "twibbons",
    "jigsaw_puzzles",
    "jigsaw_attempts",
  ];

  console.log("\n--- Jumlah Baris Tabel ---");
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`❌ ${table.padEnd(25)}: Error (${error.message})`);
      } else {
        console.log(`✓  ${table.padEnd(25)}: ${count} baris`);
      }
    } catch (e) {
      console.log(`❌ ${table.padEnd(25)}: Exception (${e.message})`);
    }
  }

  console.log("\n--- Memeriksa Storage Buckets ---");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log("❌ Storage buckets error:", bErr.message);
  } else {
    for (const b of buckets || []) {
      console.log(`✓  Bucket '${b.id}': public=${b.public}`);
    }
  }

  console.log("\n--- Memeriksa Auth Users ---");
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers({ perPage: 50 });
  if (uErr) {
    console.log("❌ Auth users error:", uErr.message);
  } else {
    console.log(`✓  Total Auth Users: ${users.users.length}`);
    for (const u of users.users) {
      console.log(`   - ${u.email} [ID: ${u.id}]`);
    }
  }

  console.log("\n--- Memeriksa Dewan Juri & Penugasan ---");
  const { data: judges } = await supabase
    .from("competition_judges")
    .select("competition:competitions(name, slug), judge:profiles(full_name, email), is_chief_judge, status");
  if (judges) {
    for (const j of judges) {
      console.log(`   - [${j.competition?.name}] ${j.judge?.full_name} (${j.judge?.email}) ${j.is_chief_judge ? '(Ketua)' : ''}`);
    }
  }

  console.log("\n--- Selesai Memeriksa ---");
}

main().catch(console.error);

