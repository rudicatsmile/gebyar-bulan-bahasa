import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

const FALLBACK_URL = "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NjU0MDcsImV4cCI6MjEwNjA0MTQwN30.icWubZZEdIk1aX_TvcYn8xuS4_WabCSDvokDVvfXz0E";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

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
