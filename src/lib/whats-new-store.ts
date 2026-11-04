import type { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Accès aux deux tables des annonces — SERVEUR UNIQUEMENT (clé de service).
 * Toutes les fonctions sont tolérantes à l'absence de la migration
 * `20261106_whats_new.sql` : elles dégradent en silence (état vide, écriture
 * ignorée) au lieu de casser la page.
 */

type Db = ReturnType<typeof getSupabaseAdmin>;

export interface StoredState {
  dismissed: boolean;
  discovered: boolean;
}

/** Table ou fonction absente (migration pas encore exécutée). */
export function isMissingRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" || // Postgres : undefined_table
    error.code === "42883" || // Postgres : undefined_function
    error.code === "PGRST205" || // PostgREST : table introuvable dans le cache de schéma
    error.code === "PGRST202" || // PostgREST : fonction introuvable
    /announcement_(states|stats)|bump_announcement_stat/.test(error.message ?? "")
  );
}

/** États d'un membre, indexés par identifiant d'annonce. */
export async function readStates(db: Db, userId: string): Promise<Record<string, StoredState>> {
  const { data, error } = await db
    .from("announcement_states")
    .select("announcement_id, dismissed_at, discovered_at")
    .eq("user_id", userId);
  if (error) {
    if (!isMissingRelation(error)) console.error("[whats-new] lecture des états :", error.message);
    return {};
  }
  const out: Record<string, StoredState> = {};
  for (const row of data || []) {
    out[row.announcement_id] = { dismissed: !!row.dismissed_at, discovered: !!row.discovered_at };
  }
  return out;
}

/** Marque une annonce comme fermée ou découverte pour ce membre. Renvoie `false` si rien n'a pu être écrit. */
export async function writeState(
  db: Db,
  userId: string,
  announcementId: string,
  action: "dismiss" | "discover",
): Promise<boolean> {
  const now = new Date().toISOString();
  // Upsert partiel : seule la colonne concernée est fournie, l'autre garde sa valeur.
  const patch: Record<string, string> = { user_id: userId, announcement_id: announcementId };
  patch[action === "dismiss" ? "dismissed_at" : "discovered_at"] = now;
  const { error } = await db.from("announcement_states").upsert(patch, { onConflict: "user_id,announcement_id" });
  if (error) {
    if (!isMissingRelation(error)) console.error("[whats-new] écriture de l'état :", error.message);
    return false;
  }
  return true;
}

/** Incrément atomique d'un compteur agrégé (aucun identifiant de personne). */
export async function bumpStat(db: Db, announcementId: string, event: "view" | "click" | "dismiss"): Promise<boolean> {
  const { error } = await db.rpc("bump_announcement_stat", { p_id: announcementId, p_event: event });
  if (error) {
    if (!isMissingRelation(error)) console.error("[whats-new] compteur :", error.message);
    return false;
  }
  return true;
}

export interface StatTotals {
  views: number;
  clicks: number;
  dismissals: number;
}

/** Totaux par annonce, tous jours confondus (écran d'administration). */
export async function readTotals(db: Db): Promise<Record<string, StatTotals>> {
  const { data, error } = await db.from("announcement_stats").select("announcement_id, views, clicks, dismissals");
  if (error) {
    if (!isMissingRelation(error)) console.error("[whats-new] lecture des compteurs :", error.message);
    return {};
  }
  const out: Record<string, StatTotals> = {};
  for (const r of data || []) {
    const t = (out[r.announcement_id] ??= { views: 0, clicks: 0, dismissals: 0 });
    t.views += r.views;
    t.clicks += r.clicks;
    t.dismissals += r.dismissals;
  }
  return out;
}
