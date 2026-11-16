/**
 * Découverte géographique — logique serveur (service_role). Appelée par GET /api/discover/geo.
 * `viewerId` vient TOUJOURS du jeton authentifié, jamais d'un paramètre de la requête.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import {
  parseScope, toPublicCandidate, viewerNeeds,
  type CandidatePage, type RawCandidate,
} from "./discovery";

export const PAGE_SIZE = 100;
export const RATE_LIMIT_PER_MINUTE = 30;
export const MAX_DISTINCT_SCOPES_PER_DAY = 40;

export type GeoReason =
  | "viewer_no_location"      // le demandeur n'a pas renseigné de localisation structurée
  | "viewer_not_enabled"      // il n'a pas activé « utiliser ma localisation pour chercher »
  | "viewer_missing_zone";    // sa localisation ne permet pas cette portée (ex. pas de localité pour un rayon)

export type GeoResult =
  | { ok: true; page: CandidatePage; reason?: undefined }
  | { ok: true; page: CandidatePage; reason: GeoReason }
  | { ok: false; status: 400 | 429 | 503; error: string };

export interface GeoParams {
  scope: unknown;
  includeUnlocated: boolean;
  offset: number;
}

const EMPTY: CandidatePage = { candidates: [], nextOffset: null };

export async function runGeoDiscovery(db: SupabaseClient, viewerId: string, params: GeoParams): Promise<GeoResult> {
  const parsed = parseScope(params.scope);
  if (!parsed) return { ok: false, status: 400, error: "Portée invalide." };
  const offset = Number.isInteger(params.offset) && params.offset >= 0 ? Math.min(params.offset, 100_000) : 0;

  // 1. Limitation de débit persistante et atomique (base), avant tout calcul.
  const rl = await db.rpc("geo_rate_limit_hit", { p_user: viewerId, p_limit: RATE_LIMIT_PER_MINUTE, p_window_seconds: 60 });
  if (rl.error) return { ok: false, status: 503, error: "Recherche géographique indisponible." };
  if (rl.data === false) return { ok: false, status: 429, error: "Trop de recherches. Réessayez dans une minute." };
  const sc = await db.rpc("geo_scope_hit", {
    p_user: viewerId,
    p_scope_key: `${params.scope as string}${params.includeUnlocated ? "+u" : ""}`,
    p_max: MAX_DISTINCT_SCOPES_PER_DAY,
  });
  if (sc.error) return { ok: false, status: 503, error: "Recherche géographique indisponible." };
  if (sc.data === false) return { ok: false, status: 429, error: "Trop de zones explorées aujourd'hui. Réessayez demain." };

  // 2. Le demandeur : sa propre localisation (lue côté serveur, jamais fournie par le navigateur).
  const { data: me, error: meErr } = await db
    .from("member_locations")
    .select("nearby_search_enabled, country_code, region_id, department_id, arrondissement_id, place_id")
    .eq("user_id", viewerId)
    .maybeSingle();
  if (meErr) return { ok: false, status: 503, error: "Recherche géographique indisponible." };
  if (!me) return { ok: true, page: EMPTY, reason: "viewer_no_location" };
  if (!me.nearby_search_enabled) return { ok: true, page: EMPTY, reason: "viewer_not_enabled" };

  const need = viewerNeeds(parsed.sqlScope);
  const has =
    need === "place" ? !!me.place_id
    : need === "arrondissement" ? !!me.arrondissement_id
    : need === "department" ? !!me.department_id
    : need === "region" ? !!me.region_id
    : !!me.country_code;
  if (!has) return { ok: true, page: EMPTY, reason: "viewer_missing_zone" };

  // 3. Candidats (une ligne de plus que la page, pour savoir s'il y en a d'autres).
  const { data, error } = await db.rpc("geo_candidates_in_scope", {
    p_viewer: viewerId,
    p_scope: parsed.sqlScope,
    p_radius_km: parsed.radiusKm,
    p_include_unlocated: params.includeUnlocated,
    p_exclude_email: ADMIN_SYSTEM_EMAIL,
    p_limit: PAGE_SIZE + 1,
    p_offset: offset,
  });
  if (error) return { ok: false, status: 503, error: "Recherche géographique indisponible." };

  const rows = (data ?? []) as RawCandidate[];
  const hasMore = rows.length > PAGE_SIZE;
  return {
    ok: true,
    page: {
      candidates: rows.slice(0, PAGE_SIZE).map(toPublicCandidate), // expurgation AVANT toute réponse
      nextOffset: hasMore ? offset + PAGE_SIZE : null,
    },
  };
}
