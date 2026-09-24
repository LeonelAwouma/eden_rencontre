// Destinataires des notifications d'un événement (SERVEUR UNIQUEMENT).
//   - événement public        → tous les membres approuvés ;
//   - événement sur invitation → seulement les membres invités (et approuvés).
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export async function getEventAudience(db: Db, event: { id: string; is_public: boolean | null }): Promise<string[]> {
  if (event.is_public !== false) {
    const { data } = await db.from("profiles").select("id").eq("status", "approved");
    return (data || []).map((u: { id: string }) => u.id);
  }
  const { data: invited } = await db.from("event_participants").select("user_id").eq("event_id", event.id);
  const ids = (invited || []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
  if (!ids.length) return [];
  const { data } = await db.from("profiles").select("id").eq("status", "approved").in("id", ids);
  return (data || []).map((u: { id: string }) => u.id);
}
