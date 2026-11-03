import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

const FALLBACK_URL = "https://roejrppfppjuxqalzsuo.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZWpycHBmcHBqdXhxYWx6c3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NDQ5MTksImV4cCI6MjEwOTIyMDkxOX0.RwTpaIF-sIKWvr_AuhJgHwjZ_QGOlyJFyOC_85jG9sE";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { publicClient } from "./public";
