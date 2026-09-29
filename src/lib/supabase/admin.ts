import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

let client: SupabaseClient | null | undefined;

export function getAdminSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  client = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  return client;
}