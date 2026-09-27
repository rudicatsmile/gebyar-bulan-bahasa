import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Universal public Supabase client for reading publicly accessible data
 * (Competitions, Schedules, Announcements, Winners, Stands, Challenges, Rewards).
 * Does not depend on cookies/headers, so it works seamlessly across Server Components,
 * Static Generation, and Client Components.
 */
export const publicClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
