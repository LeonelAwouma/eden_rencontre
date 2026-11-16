/**
 * Administration du référentiel géographique — logique serveur (service_role, après requireAdmin).
 *
 * Règle d'or : l'administration ne voit ni coordonnée ni localisation individuelle. Elle voit le référentiel
 * (données publiques), des TOTAUX de membres, et les localités à valider. Les totaux par région suivent le
 * même seuil de 5 que la carte.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizePlaceName } from "./normalize";
import { maskCounts } from "./zone-counts";

type Db = SupabaseClient;

export const PLACES_PAGE_SIZE = 25;
export const PLACE_STATUSES = ["unverified", "verified", "rejected"] as const;
export type PlaceStatus = (typeof PLACE_STATUSES)[number];

export interface RegionCount { unitId: string; name: string; count: number | null }

interface RawRegionCount { unitId: string; name: string; count: number }

/** Remplace les comptes bruts par des comptes masqués sous 5 (+ suppression complémentaire). */
export function maskRegionCounts(raw: RawRegionCount[]): RegionCount[] {
  const masked = maskCounts(raw.map((r) => ({ unit_id: r.unitId, member_count: r.count })));
  const byId = new Map(masked.map((m) => [m.unitId, m.count]));
  return raw.map((r) => ({ unitId: r.unitId, name: r.name, count: byId.get(r.unitId) ?? null }));
}

export async function getGeoOverview(db: Db) {
  const [ov, runs, incons] = await Promise.all([
    db.rpc("geo_admin_overview"),
    db.from("geo_import_runs")
      .select("id, started_at, finished_at, source, source_version, mode, stats, anomalies, conflicts")
      .order("started_at", { ascending: false })
      .limit(10),
    db.rpc("geo_admin_inconsistencies", { p_limit: 200 }),
  ]);
  if (ov.error) return { ok: false as const, error: "Référentiel indisponible (migrations géographiques appliquées ?)." };
  const o = (ov.data ?? {}) as Record<string, unknown> & { regionCounts?: RawRegionCount[] };
  const { regionCounts, ...rest } = o;
  return {
    ok: true as const,
    overview: { ...rest, regionCounts: maskRegionCounts(regionCounts ?? []) },
    importRuns: (runs.data ?? []).map((r) => ({
      ...r,
      anomalies: Array.isArray(r.anomalies) ? r.anomalies.length : 0,
      conflicts: Array.isArray(r.conflicts) ? r.conflicts.length : 0,
      anomalyDetails: Array.isArray(r.anomalies) ? r.anomalies.slice(0, 20) : [],
    })),
    inconsistencies: (incons.data ?? []) as Array<{ kind: string; code: string; name: string; detail: string }>,
  };
}

export interface PlaceListParams { status: unknown; q: unknown; page: unknown }

export async function listPlaces(db: Db, params: PlaceListParams) {
  const status: PlaceStatus = (PLACE_STATUSES as readonly string[]).includes(params.status as string)
    ? (params.status as PlaceStatus) : "unverified";
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(params.page) || 1)));
  // Recherche : nom normalisé ; les caractères spéciaux du filtre PostgREST sont retirés.
  const q = typeof params.q === "string" ? normalizePlaceName(params.q).replace(/[%_,()*\\]/g, " ").trim().slice(0, 60) : "";

  let query = db
    .from("geo_places")
    .select("id, name, place_type, verification_status, admin_unit_id, population, source", { count: "exact" })
    .eq("country_code", "CM")
    .eq("verification_status", status)
    .order("population", { ascending: false, nullsFirst: false })
    .order("name")
    .range((page - 1) * PLACES_PAGE_SIZE, page * PLACES_PAGE_SIZE - 1);
  if (q) query = query.ilike("normalized_name", `%${q}%`);
  const { data, count, error } = await query;
  if (error) return { ok: false as const, error: "Lecture des localités impossible." };
  return { ok: true as const, places: data ?? [], total: count ?? 0, page, pageSize: PLACES_PAGE_SIZE };
}

/** Arrondissements (avec leur département) pour le rattachement manuel d'une localité. */
export async function arrondissementOptions(db: Db) {
  const [arr, dep] = await Promise.all([
    db.from("geo_admin_units").select("id, name_fr, parent_id").eq("country_code", "CM").eq("level", 3).order("name_fr").limit(1000),
    db.from("geo_admin_units").select("id, name_fr").eq("country_code", "CM").eq("level", 2).limit(1000),
  ]);
  if (arr.error || dep.error) return [];
  const depName = new Map((dep.data ?? []).map((d) => [d.id as string, d.name_fr as string]));
  return (arr.data ?? []).map((a) => ({
    id: a.id as string,
    label: `${a.name_fr}${a.parent_id && depName.get(a.parent_id as string) ? ` (${depName.get(a.parent_id as string)})` : ""}`,
  }));
}

export const placeActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("validate") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("attach"), arrondissementId: z.string().uuid() }),
]);

export type UpdatePlaceResult = { ok: true; status: PlaceStatus } | { ok: false; status: 400 | 404 | 500; error: string };

/** Valider / rejeter / rouvrir / rattacher une localité. Une localité n'est « vérifiée » qu'avec un arrondissement. */
export async function updatePlace(db: Db, id: unknown, raw: unknown): Promise<UpdatePlaceResult> {
  const idOk = z.string().uuid().safeParse(id);
  const body = placeActionSchema.safeParse(raw);
  if (!idOk.success || !body.success) return { ok: false, status: 400, error: "Requête invalide." };
  const act = body.data;

  const { data: place, error } = await db.from("geo_places").select("id, admin_unit_id, verification_status").eq("id", idOk.data).maybeSingle();
  if (error) return { ok: false, status: 500, error: "Lecture impossible." };
  if (!place) return { ok: false, status: 404, error: "Localité introuvable." };

  let patch: Record<string, unknown>;
  let next: PlaceStatus;
  if (act.action === "attach") {
    const { data: unit } = await db.from("geo_admin_units").select("id, level").eq("id", act.arrondissementId).maybeSingle();
    if (!unit || unit.level !== 3) return { ok: false, status: 400, error: "Arrondissement invalide." };
    patch = { admin_unit_id: unit.id, verification_status: "verified" };
    next = "verified";
  } else if (act.action === "validate") {
    if (!place.admin_unit_id) return { ok: false, status: 400, error: "Rattachez d'abord la localité à un arrondissement." };
    patch = { verification_status: "verified" };
    next = "verified";
  } else if (act.action === "reject") {
    patch = { verification_status: "rejected" };
    next = "rejected";
  } else {
    patch = { verification_status: "unverified" };
    next = "unverified";
  }
  const { error: upErr } = await db.from("geo_places").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", place.id);
  if (upErr) return { ok: false, status: 500, error: "Mise à jour impossible." };
  return { ok: true, status: next };
}
