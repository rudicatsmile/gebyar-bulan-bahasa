import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

const FALLBACK_URL = "https://lumrqtxmdcrjxjxzrqau.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NjU0MDcsImV4cCI6MjEwNjA0MTQwN30.icWubZZEdIk1aX_TvcYn8xuS4_WabCSDvokDVvfXz0E";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { publicClient } from "./public";
