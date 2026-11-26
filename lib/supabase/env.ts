/** Variabel publik Supabase. Hanya kunci publishable/anon; service_role tidak pernah dipakai. */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diatur. Salin .env.example ke .env.local.",
    );
  }
  return { url, anonKey };
}
