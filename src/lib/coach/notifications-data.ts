import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { toActivityDto, type ActivityDto } from "@/lib/coach/members-view";

type Db = ReturnType<typeof getSupabaseAdmin>;

/**
 * Notifications du coach connecté, en DTO à 4 champs.
 * Les colonnes `title`, `body` et `link` ne sont JAMAIS lues : un texte libre de la base ne quitte pas le serveur.
 * Filtré sur `recipient_id` = le coach de la session : aucun identifiant fourni par le client n'intervient.
 */
export async function loadCoachNotifications(
  db: Db,
  coachId: string,
  limit: number
): Promise<{ items: ActivityDto[]; unread: number }> {
  const { data, error } = await db
    .from("coach_notifications")
    .select("id, kind, created_at, read_at")
    .eq("recipient_id", coachId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw new Error("coach notifications: query failed");

  const { count, error: unreadError } = await db
    .from("coach_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", coachId)
    .is("read_at", null);
  if (unreadError) throw new Error("coach notifications: unread count failed");

  const items = ((data ?? []) as Record<string, unknown>[])
    .map((row) => toActivityDto(row))
    .filter((dto): dto is ActivityDto => dto !== null);
  return { items, unread: count ?? 0 };
}
