import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Klien Supabase untuk komponen klien (mis. pengiriman Magic Link, logout). */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
