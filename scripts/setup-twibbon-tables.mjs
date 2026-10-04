import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

let envPath = existsSync(".env.production") ? ".env.production" : ".env.local";
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

const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = "lumrqtxmdcrjxjxzrqau";

async function runSQL(sql, label) {
  const endpoints = [
    `https://${projectRef}.supabase.co/pg-meta/default/query`,
    `https://${projectRef}.supabase.co/pg/query`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-connection-encrypted": serviceKey,
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (res.status < 300) {
        const text = await res.text();
        console.log(`[${label}] OK via ${url.split("/").pop()}:`, text.substring(0, 200));
        return true;
      } else {
        console.log(`[${label}] Status ${res.status} via ${url.split("/").pop()}`);
      }
    } catch (e) {
      console.log(`[${label}] Error:`, e.message);
    }
  }
  return false;
}

async function main() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.twibbon_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      preview_url TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_twibbon_templates_active ON public.twibbon_templates(is_active, sort_order);

    -- Ensure twibbons table has template_id column if not exists
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'twibbons' 
        AND column_name = 'template_id'
      ) THEN
        ALTER TABLE public.twibbons ADD COLUMN template_id UUID REFERENCES public.twibbon_templates(id) ON DELETE SET NULL;
      END IF;
    END $$;

    -- RLS policies
    ALTER TABLE public.twibbon_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "twibbon_templates_read_all" ON public.twibbon_templates;
    CREATE POLICY "twibbon_templates_read_all" ON public.twibbon_templates FOR SELECT USING (true);
    DROP POLICY IF EXISTS "twibbon_templates_write_staff" ON public.twibbon_templates;
    CREATE POLICY "twibbon_templates_write_staff" ON public.twibbon_templates FOR ALL USING (true) WITH CHECK (true);
  `;

  const ok = await runSQL(sql, "create_twibbon_templates");
  console.log("Creation result:", ok);

  // Verify
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from("twibbon_templates").select("*").limit(5);
  console.log("Verify from client:", { count: data?.length, error });
}

main();
