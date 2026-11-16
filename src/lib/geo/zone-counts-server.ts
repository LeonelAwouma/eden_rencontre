/**
 * Comptes par zone — logique serveur (service_role). Appelée par GET /api/geo/zone-counts.
 * `viewerId` vient TOUJOURS du jeton authentifié.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { maskCounts, parseMapQuery, type RawZoneCount, type ZoneCount } from "./zone-counts";

export const MAP_RATE_LIMIT = 60;
/** Fenêtre distincte (90 s) de celle de la découverte (60 s) : les deux limites ne se partagent pas le compteur. */
export const MAP_RATE_WINDOW_SECONDS = 90;
export const MAP_MAX_DISTINCT_ZONES_PER_DAY = 150;

export interface MyZones {
  regionId: string | null;
  departmentId: string | null;
  arrondissementId: string | null;
}

export type ZoneCountsResult =
  | { ok: true; counts: ZoneCount[]; mine: MyZones; reason?: "viewer_no_location" | "viewer_not_enabled" }
  | { ok: false; status: 400 | 429 | 503; error: string };

const NOBODY: MyZones = { regionId: null, departmentId: null, arrondissementId: null };

export async function runZoneCounts(
  db: SupabaseClient,
  viewerId: string,
  params: { level: unknown; parent: unknown },
): Promise<ZoneCountsResult> {
  const q = parseMapQuery(params.level, params.parent);
  if (!q) return { ok: false, status: 400, error: "Paramètres invalides." };

  const rl = await db.rpc("geo_rate_limit_hit", { p_user: viewerId, p_limit: MAP_RATE_LIMIT, p_window_seconds: MAP_RATE_WINDOW_SECONDS });
  if (rl.error) return { ok: false, status: 503, error: "Carte indisponible." };
  if (rl.data === false) return { ok: false, status: 429, error: "Trop de requêtes. Réessayez dans un instant." };
  const sc = await db.rpc("geo_scope_hit", {
    p_user: viewerId,
    p_scope_key: `m${q.level}:${q.parent ?? ""}`,
    p_max: MAP_MAX_DISTINCT_ZONES_PER_DAY,
  });
  if (sc.error) return { ok: false, status: 503, error: "Carte indisponible." };
  if (sc.data === false) return { ok: false, status: 429, error: "Trop de zones explorées aujourd'hui. Réessayez demain." };

  const { data: me, error: meErr } = await db
    .from("member_locations")
    .select("nearby_search_enabled, region_id, department_id, arrondissement_id")
    .eq("user_id", viewerId)
    .maybeSingle();
  if (meErr) return { ok: false, status: 503, error: "Carte indisponible." };
  if (!me) return { ok: true, counts: [], mine: NOBODY, reason: "viewer_no_location" };
  const mine: MyZones = {
    regionId: me.region_id ?? null,
    departmentId: me.department_id ?? null,
    arrondissementId: me.arrondissement_id ?? null,
  };
  // Sans l'activation de « utiliser ma localisation pour chercher », aucun compte n'est communiqué.
  if (!me.nearby_search_enabled) return { ok: true, counts: [], mine, reason: "viewer_not_enabled" };

  const { data, error } = await db.rpc("geo_zone_counts", {
    p_viewer: viewerId,
    p_level: q.level,
    p_parent: q.parent,
    p_exclude_email: ADMIN_SYSTEM_EMAIL,
  });
  if (error) return { ok: false, status: 503, error: "Carte indisponible." };
  return { ok: true, counts: maskCounts((data ?? []) as RawZoneCount[]), mine };
}
