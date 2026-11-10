import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

// const FALLBACK_URL = "https://roejrppfppjuxqalzsuo.supabase.co";
// const FALLBACK_SERVICE_ROLE_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWpycHBmcHBqdXhxYWx6c3VvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzY0NDkxOSwiZXhwIjoyMTA5MjIwOTE5fQ.FCLnf-gaQl3kjlO_zC2DoCm3fgkTW_3Nt9rXU2gADEU";

const FALLBACK_URL = "https://xdfwxvsgbopapwlrbzwj.supabase.co";
const FALLBACK_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZnd4dnNnYm9wYXB3bHJiendqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDI0MDU1NiwiZXhwIjoyMTA5ODE2NTU2fQ.nv45cugxPxOCu_cEZX5OWPK_nvgrHNhTcdmhgvWfcnQ";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_ROLE_KEY;

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
