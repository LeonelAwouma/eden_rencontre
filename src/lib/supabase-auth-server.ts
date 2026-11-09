import { createClient } from "@supabase/supabase-js";

/**
 * Client Auth isolé pour les connexions par mot de passe côté serveur.
 *
 * Ne jamais utiliser ce client pour lire/écrire les tables administratives :
 * signInWithPassword remplace son Authorization par le JWT de l'utilisateur.
 * Les lectures sensibles restent sur getSupabaseAdmin() (service_role).
 */
export function getSupabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or public anon key");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
