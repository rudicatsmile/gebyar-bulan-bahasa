/**
 * Jalankan SQL via Supabase pg-meta API
 * Ini memanfaatkan endpoint yang sama yang digunakan Supabase Dashboard
 */

const SUPABASE_URL = "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDQ2NTQwNywiZXhwIjoyMTA2MDQxNDA3fQ.idDvQgxaQzwMe4GSwOmqR-eymMrFq4cnMZmTY26WAZ0";

// SQL statements to run
const SQL_STATEMENTS = [
  // 1. Create twibbon_templates table
  `
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
  )
  `,

  // 2. Add template_id column to twibbons  
  `alter table public.twibbons add column if not exists template_id uuid references public.twibbon_templates(id) on delete set null`,

  // 3. Create indexes
  `create index if not exists idx_twibbon_templates_active on public.twibbon_templates(is_active, sort_order)`,
  `create index if not exists idx_twibbons_template_id on public.twibbons(template_id)`,

  // 4. Enable RLS
  `alter table public.twibbon_templates enable row level security`,

  // 5. Drop existing policies if any (to avoid conflicts)
  `drop policy if exists "Public can view active templates" on public.twibbon_templates`,
  `drop policy if exists "Admins can view all templates" on public.twibbon_templates`,
  `drop policy if exists "Admins can manage templates" on public.twibbon_templates`,

  // 6. Create policies
  `
  create policy "Public can view active templates"
    on public.twibbon_templates
    for select
    using (is_active = true)
  `,
  `
  create policy "Admins can manage templates"
    on public.twibbon_templates
    for all
    using (public.is_admin())
    with check (public.is_admin())
  `,
];

async function execSQL(sql) {
  const trimmed = sql.trim();
  
  // Try via REST API with service role - using the database REST endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ sql: trimmed }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: text, status: response.status };
  }

  return { success: true };
}

async function runSQLViaPostgRESTAdmin(sql) {
  // Try via pg-meta endpoint (Supabase management API)
  const response = await fetch(
    `${SUPABASE_URL.replace('.supabase.co', '')}/pg/query`,
    {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await response.text();
  return { status: response.status, body: text };
}

async function main() {
  console.log("🔧 Attempting to create twibbon_templates table...\n");

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i];
    const preview = sql.trim().substring(0, 60).replace(/\n/g, " ");
    
    process.stdout.write(`[${i + 1}/${SQL_STATEMENTS.length}] ${preview}... `);
    
    const result = await execSQL(sql);
    
    if (result.success) {
      console.log("✅");
    } else {
      console.log(`⚠️  (${result.status}: ${result.error?.substring(0, 100)})`);
    }
  }

  console.log("\n✅ Done. Check Supabase dashboard to verify table creation.");
}

main().catch(console.error);
