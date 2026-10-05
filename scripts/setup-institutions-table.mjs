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
    CREATE TABLE IF NOT EXISTS public.institutions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      category TEXT DEFAULT 'sekolah',
      sort_order INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_institutions_active ON public.institutions(is_active, sort_order, name);

    ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "institutions_read_all" ON public.institutions;
    CREATE POLICY "institutions_read_all" ON public.institutions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "institutions_write_staff" ON public.institutions;
    CREATE POLICY "institutions_write_staff" ON public.institutions FOR ALL USING (true) WITH CHECK (true);

    INSERT INTO public.institutions (name, category, sort_order, is_active)
    VALUES
      ('SMK DINAMIKA PEMBANGUNAN 2 JAKARTA', 'sekolah', 1, true),
      ('SMKN 3 Jakarta', 'sekolah', 2, true),
      ('SMAN 8 Jakarta', 'sekolah', 3, true),
      ('SMA Kristen 1 BPK Penabur', 'sekolah', 4, true),
      ('SMA Taman Siswa Yogyakarta', 'sekolah', 5, true),
      ('SMA Taruna Nusantara', 'sekolah', 6, true),
      ('MAN 2 Malang', 'sekolah', 7, true),
      ('Universitas Indonesia', 'kampus', 8, true),
      ('Universitas Padjadjaran', 'kampus', 9, true),
      ('Sanggar Seni Si Pitung Rawa Belong', 'instansi', 10, true),
      ('Lainnya / Umum', 'umum', 99, true)
    ON CONFLICT (name) DO NOTHING;
  `;

  const ok = await runSQL(sql, "create_institutions");
  console.log("Creation result:", ok);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.from("institutions").select("*").order("sort_order", { ascending: true });
  console.log("Verify from client:", { count: data?.length, sample: data?.slice(0, 3), error });
}

main();
