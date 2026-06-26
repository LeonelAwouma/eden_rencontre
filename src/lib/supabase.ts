"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Si les clés ne sont pas fournies, l'app retombe automatiquement
// sur la messagerie locale (mock) — aucun crash.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender: string;
  content: string;
  created_at: string;
}
