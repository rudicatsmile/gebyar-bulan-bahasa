import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

// const FALLBACK_URL = "https://roejrppfppjuxqalzsuo.supabase.co";
// const FALLBACK_ANON_KEY =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWpycHBmcHBqdXhxYWx6c3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDQ5MTksImV4cCI6MjEwOTIyMDkxOX0.RwTpaIF-sIKWvr_AuhJgHwjZ_QGOlyJFyOC_85jG9sE";

const FALLBACK_URL = "https://xdfwxvsgbopapwlrbzwj.supabase.co";
const FALLBACK_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZnd4dnNnYm9wYXB3bHJiendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDA1NTYsImV4cCI6MjEwOTgxNjU1Nn0.1yfQRlP_LPYw0AyFSPZ3iafIZs_KzULr250rSxlKo5o";


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
