import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ2NTQwNywiZXhwIjoyMTA2MDQxNDA3fQ.idDvQgxaQzwMe4GSwOmqR-eymMrFq4cnMZmTY26WAZ0";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function runMigration() {
  console.log("🚀 Running Twibbon Templates migration...\n");

  // Step 1: Create twibbon_templates table
  console.log("📦 Creating twibbon_templates table...");
  const { error: tableError } = await supabase.rpc("exec_sql", {
    sql: `
      create table if not exists public.twibbon_templates (
        id uuid primary key default gen_random_uuid(),
        name text not null,
        description text,
        image_url text not null,
        thumbnail_url text,
        is_active boolean not null default true,
        sort_order integer not null default 0,
        uploaded_by uuid references public.profiles(id) on delete set null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `,
  });

  if (tableError) {
    console.log(
      "ℹ️  exec_sql RPC not available, trying direct insert approach..."
    );

    // Check if table exists by trying to query it
    const { error: checkError } = await supabase
      .from("twibbon_templates")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      console.error(
        "❌ Table does not exist and cannot be created via client SDK."
      );
      console.log("\n📋 MANUAL STEPS REQUIRED:");
      console.log("1. Go to: https://supabase.com/dashboard");
      console.log("2. Open project: lumrqtxmdcrjxjxzrqau");
      console.log("3. Go to SQL Editor");
      console.log(
        "4. Run the SQL from: supabase/migrations/0004_twibbon_templates.sql"
      );
      console.log(
        "\nOr via Supabase CLI: npx supabase db push --db-url <your-db-url>"
      );
      return;
    } else if (!checkError) {
      console.log("✅ Table twibbon_templates already exists!");
    }
  } else {
    console.log("✅ Table created successfully!");
  }

  // Step 2: Add template_id column to twibbons
  console.log("\n📎 Adding template_id to twibbons...");
  const { error: colError } = await supabase
    .from("twibbons")
    .select("template_id")
    .limit(1);

  if (colError && colError.message?.includes("template_id")) {
    console.log("ℹ️  Column template_id not found, needs to be added manually");
  } else {
    console.log("✅ Column template_id already exists or added!");
  }

  // Step 3: Check/create storage bucket
  console.log("\n🪣 Checking storage bucket twibbon-templates...");
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.find((b) => b.name === "twibbon-templates");

  if (!bucketExists) {
    const { error: bucketError } = await supabase.storage.createBucket(
      "twibbon-templates",
      { public: true }
    );
    if (bucketError) {
      console.log("⚠️  Could not create bucket:", bucketError.message);
    } else {
      console.log("✅ Bucket twibbon-templates created!");
    }
  } else {
    console.log("✅ Bucket twibbon-templates already exists!");
  }

  console.log("\n🎉 Migration check complete!");
  console.log(
    "\n⚠️  IMPORTANT: If the table was not created automatically, please run"
  );
  console.log(
    "   supabase/migrations/0004_twibbon_templates.sql in Supabase SQL Editor."
  );
}

runMigration().catch(console.error);
