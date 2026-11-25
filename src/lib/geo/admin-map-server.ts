/**
 * Cartes administratives de répartition des membres — serveur (service_role, APRÈS requireAdmin).
 *
 * Source : fonctions SQL de 20261125_geo_admin_member_map.sql (population commune geo_admin_member_pool).
 * Effectifs exacts, sans seuil. Aucune donnée individuelle n'est lue ici : les fonctions SQL ne renvoient que
 * des identifiants de zones, des codes pays et des nombres.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { countryNameFr, isIsoCountry } from "./iso-countries";
import {
  ADMIN_MAP_SCOPES, type AdminMapScope, type CameroonMapResponse, type CountryStat,
  type InternationalMapResponse, type MemberSummary,
} from "./admin-map";
import type { MapLevel } from "./zone-counts";

type Db = SupabaseClient;

export const MISSING_MIGRATION = "Statistiques indisponibles : appliquez la migration supabase/migrations/20261125_geo_admin_member_map.sql.";

export type ServerResult<T> = { ok: true; data: T } | { ok: false; status: 500 | 503; error: string };

interface RawSummary {
  total?: number; noLocation?: number; cameroon?: number; cameroonWithRegion?: number;
  cameroonWithoutRegion?: number; outsideCameroon?: number;
}
interface RawCountry { country_code: string; member_count: number; with_city: number }
interface RawUnit { unit_id: string | null; member_count: number; kind: string }

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

/** Fonction RPC absente (migration non appliquée) ? */
function isMissingFunction(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === "PGRST202" || err.code === "42883" || /could not find the function|does not exist/i.test(err.message || "");
}

function rpcArgs(scope: AdminMapScope) {
  return { p_statuses: [...ADMIN_MAP_SCOPES[scope]], p_exclude_email: ADMIN_SYSTEM_EMAIL };
}

/**
 * Répartit les lignes par code pays : ISO valide → pays ; sinon → indéterminé.
 * Catégories exclusives : total = cameroon + abroad + undetermined + noLocation.
 */
export function splitCountries(rows: RawCountry[]): { countries: CountryStat[]; undetermined: Array<{ code: string; count: number }> } {
  const countries: CountryStat[] = [];
  const undetermined: Array<{ code: string; count: number }> = [];
  for (const r of rows) {
    const code = typeof r.country_code === "string" ? r.country_code.trim().toUpperCase() : "";
    const count = n(r.member_count);
    if (count === 0) continue;
    if (code !== "CM" && isIsoCountry(code)) {
      countries.push({ code, name: countryNameFr(code), count, withCity: Math.min(count, n(r.with_city)) });
    } else {
      undetermined.push({ code: code || "—", count });
    }
  }
  countries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  undetermined.sort((a, b) => b.count - a.count);
  return { countries, undetermined };
}

export function buildSummary(raw: RawSummary, countries: CountryStat[], undetermined: Array<{ count: number }>): MemberSummary {
  return {
    total: n(raw.total),
    noLocation: n(raw.noLocation),
    cameroon: n(raw.cameroon),
    cameroonWithRegion: n(raw.cameroonWithRegion),
    cameroonWithoutRegion: n(raw.cameroonWithoutRegion),
    abroad: countries.reduce((s, c) => s + c.count, 0),
    undetermined: undetermined.reduce((s, c) => s + c.count, 0),
  };
}

async function loadSummary(db: Db, scope: AdminMapScope) {
  const [sum, ctry] = await Promise.all([
    db.rpc("geo_admin_member_summary", rpcArgs(scope)),
    db.rpc("geo_admin_country_counts", rpcArgs(scope)),
  ]);
  return { sum, ctry };
}

export async function getCameroonMap(
  db: Db, q: { level: MapLevel; parent: string | null; scope: AdminMapScope },
): Promise<ServerResult<CameroonMapResponse>> {
  const [units, { sum, ctry }] = await Promise.all([
    db.rpc("geo_admin_member_counts", { p_level: q.level, p_parent: q.parent, ...rpcArgs(q.scope) }),
    loadSummary(db, q.scope),
  ]);
  const err = units.error || sum.error || ctry.error;
  if (err) {
    if (isMissingFunction(err)) return { ok: false, status: 503, error: MISSING_MIGRATION };
    console.error("[admin/geography/map]", err.message);
    return { ok: false, status: 500, error: "Lecture des effectifs impossible." };
  }
  const rows = (units.data ?? []) as RawUnit[];
  const { countries, undetermined } = splitCountries((ctry.data ?? []) as RawCountry[]);
  return {
    ok: true,
    data: {
      level: q.level,
      parent: q.parent,
      scope: q.scope,
      counts: rows.filter((r) => r.kind === "unit" && r.unit_id).map((r) => ({ unitId: r.unit_id as string, count: n(r.member_count) })),
      unattached: rows.filter((r) => r.kind === "unattached").reduce((s, r) => s + n(r.member_count), 0),
      inconsistent: rows.filter((r) => r.kind === "inconsistent").reduce((s, r) => s + n(r.member_count), 0),
      summary: buildSummary((sum.data ?? {}) as RawSummary, countries, undetermined),
    },
  };
}

export async function getInternationalMap(db: Db, scope: AdminMapScope): Promise<ServerResult<InternationalMapResponse>> {
  const { sum, ctry } = await loadSummary(db, scope);
  const err = sum.error || ctry.error;
  if (err) {
    if (isMissingFunction(err)) return { ok: false, status: 503, error: MISSING_MIGRATION };
    console.error("[admin/geography/international]", err.message);
    return { ok: false, status: 500, error: "Lecture des effectifs impossible." };
  }
  const { countries, undetermined } = splitCountries((ctry.data ?? []) as RawCountry[]);
  const summary = buildSummary((sum.data ?? {}) as RawSummary, countries, undetermined);
  return {
    ok: true,
    data: {
      scope,
      countries,
      indicators: {
        abroad: summary.abroad,
        countriesRepresented: countries.length,
        top: countries[0] ?? null,
        abroadWithoutCity: countries.reduce((s, c) => s + (c.count - c.withCity), 0),
      },
      undetermined,
      summary,
    },
  };
}
