/**
 * Écriture de la localisation d'un membre — UNIQUE point d'entrée (serveur, service_role).
 * Utilisé par PUT /api/member/location et par les routes d'inscription.
 *
 * Règles :
 *  - member_locations = source de vérité (privée) ;
 *  - profiles.country (nom français du pays) mis à jour ; profiles.city reçoit UNIQUEMENT l'étiquette
 *    publique conforme au consentement (publicCityLabel) ; profiles.region n'est JAMAIS touché ;
 *  - aucun consentement n'est activé automatiquement : absent du corps = valeur existante (ou false) ;
 *  - on n'invente jamais un arrondissement : une localité non répertoriée reste « unverified ».
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { findCountry } from "@/lib/geo";
import { validateSelection, type AdminUnit, type AdminLevel } from "./hierarchy";
import { DISPLAY_LEVELS, GENERIC_CITY_LABEL, publicCityLabel, type DisplayLevel } from "./public-label";

const uuid = z.string().uuid();

export const locationInputSchema = z.object({
  /** Nom français du pays tel que stocké dans profiles.country (« Cameroun », « France »…). */
  country: z.string().trim().min(1).max(80),
  regionId: uuid.nullish(),
  departmentId: uuid.nullish(),
  arrondissementId: uuid.nullish(),
  placeId: uuid.nullish(),
  /** Ville saisie à la main (localité non répertoriée) ou ville d'un pays hors référentiel. */
  city: z.string().trim().max(120).nullish(),
  displayLevel: z.enum(DISPLAY_LEVELS as unknown as [DisplayLevel, ...DisplayLevel[]]).optional(),
  nearbySearchEnabled: z.boolean().optional(),
  locationDiscoverable: z.boolean().optional(),
});
export type LocationInput = z.infer<typeof locationInputSchema>;

export type SaveLocationResult =
  | { ok: true; publicCity: string; verification: "verified" | "unverified" }
  | { ok: false; status: number; error: string };

type Db = SupabaseClient;

interface UnitRow {
  id: string;
  code: string;
  level: number;
  parent_id: string | null;
  name_fr: string;
  name_en: string | null;
}
const toUnit = (r: UnitRow): AdminUnit => ({
  id: r.id,
  code: r.code,
  level: r.level as AdminLevel,
  parentId: r.parent_id,
  nameFr: r.name_fr,
  nameEn: r.name_en,
});

export const consentInputSchema = z
  .object({
    nearbySearchEnabled: z.boolean().optional(),
    locationDiscoverable: z.boolean().optional(),
    displayLevel: z.enum(DISPLAY_LEVELS as unknown as [DisplayLevel, ...DisplayLevel[]]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Aucun réglage fourni.");

export type SaveConsentResult =
  | { ok: true; publicCity: string | null }
  | { ok: false; status: number; error: string };

/**
 * Réglages de confidentialité (consentements + niveau d'affichage), indépendants les uns des autres.
 * Effet IMMÉDIAT : la découverte relit la base à chaque appel et ne met rien en cache.
 * Le niveau d'affichage met aussi à jour l'étiquette publique profiles.city (jamais la ville privée).
 */
export async function saveMemberConsent(db: Db, userId: string, raw: unknown): Promise<SaveConsentResult> {
  const parsed = consentInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Réglages invalides." };
  const input = parsed.data;

  const { data: row, error } = await db.from("member_locations").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { ok: false, status: 500, error: "Réglages indisponibles." };
  if (!row) return { ok: false, status: 409, error: "Renseignez d'abord votre localisation." };

  const patch: Record<string, unknown> = { location_consent_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (input.nearbySearchEnabled !== undefined) patch.nearby_search_enabled = input.nearbySearchEnabled;
  if (input.locationDiscoverable !== undefined) patch.location_discoverable = input.locationDiscoverable;
  if (input.displayLevel !== undefined) patch.display_level = input.displayLevel;

  await db.from("member_location_history").insert({ user_id: userId, previous: row });
  const { error: upErr } = await db.from("member_locations").update(patch).eq("user_id", userId);
  if (upErr) return { ok: false, status: 500, error: "Enregistrement impossible." };

  let publicCity: string | null = null;
  if (input.displayLevel !== undefined) {
    let cityName: string | null = row.free_text_city ?? null;
    if (row.place_id) {
      const { data: place } = await db.from("geo_places").select("name").eq("id", row.place_id).maybeSingle();
      cityName = place?.name ?? cityName;
    }
    publicCity = publicCityLabel(cityName, input.displayLevel);
    const { error: pErr } = await db.from("profiles").update({ city: publicCity }).eq("id", userId);
    if (pErr) return { ok: false, status: 500, error: "Profil non mis à jour." };
    try {
      await db.auth?.admin?.updateUserById(userId, { user_metadata: { city: publicCity } });
    } catch { /* non bloquant */ }
  }
  return { ok: true, publicCity };
}

export async function saveMemberLocation(db: Db, userId: string, raw: unknown): Promise<SaveLocationResult> {
  const parsed = locationInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: "Localisation invalide." };
  const input = parsed.data;

  const country = findCountry(input.country);
  if (!country) return { ok: false, status: 400, error: "Pays inconnu." };
  const countryCode = country.iso.toUpperCase();

  let regionId = input.regionId ?? null;
  let departmentId = input.departmentId ?? null;
  let arrondissementId = input.arrondissementId ?? null;
  let placeId = input.placeId ?? null;
  let cityName = input.city?.trim() || null;
  let verification: "verified" | "unverified" = "unverified";

  const structured = countryCode === "CM" && (regionId || departmentId || arrondissementId || placeId);
  if (!structured && (regionId || departmentId || arrondissementId || placeId)) {
    return { ok: false, status: 400, error: "Référentiel indisponible pour ce pays." };
  }

  if (structured) {
    // 1. Localité (ses rattachements administratifs viennent de la base, pas du navigateur).
    let place: { id: string; name: string; admin_unit_id: string | null; verification_status: string } | null = null;
    if (placeId) {
      const { data, error } = await db
        .from("geo_places")
        .select("id, name, admin_unit_id, verification_status, country_code")
        .eq("id", placeId)
        .maybeSingle();
      if (error || !data || data.country_code !== countryCode) return { ok: false, status: 400, error: "Localité inconnue." };
      place = data;
      cityName = data.name;
      if (data.admin_unit_id) arrondissementId = arrondissementId ?? data.admin_unit_id;
    }

    // 2. Chaîne d'ancêtres de l'arrondissement/département déduite de la base.
    const wanted = [regionId, departmentId, arrondissementId].filter((x): x is string => !!x);
    const units = new Map<string, AdminUnit>();
    if (wanted.length) {
      const { data, error } = await db
        .from("geo_admin_units")
        .select("id, code, level, parent_id, name_fr, name_en")
        .in("id", wanted);
      if (error) return { ok: false, status: 500, error: "Référentiel indisponible." };
      for (const r of (data ?? []) as UnitRow[]) units.set(r.id, toUnit(r));
    }
    // Remplit les parents manquants depuis la base (jamais depuis le client).
    if (arrondissementId && !departmentId) departmentId = units.get(arrondissementId)?.parentId ?? null;
    if (departmentId && !units.has(departmentId)) {
      const { data } = await db
        .from("geo_admin_units")
        .select("id, code, level, parent_id, name_fr, name_en")
        .eq("id", departmentId)
        .maybeSingle();
      if (data) units.set(data.id, toUnit(data as UnitRow));
    }
    if (departmentId && !regionId) regionId = units.get(departmentId)?.parentId ?? null;
    if (regionId && !units.has(regionId)) {
      const { data } = await db
        .from("geo_admin_units")
        .select("id, code, level, parent_id, name_fr, name_en")
        .eq("id", regionId)
        .maybeSingle();
      if (data) units.set(data.id, toUnit(data as UnitRow));
    }

    const err = validateSelection(
      { countryCode, regionId, departmentId, arrondissementId, placeId },
      units,
      place ? { id: place.id, adminUnitId: place.admin_unit_id } : null,
    );
    if (err) return { ok: false, status: 400, error: "Localisation incohérente." };
    verification = place && place.verification_status === "verified" && arrondissementId ? "verified" : "unverified";
  }

  // 3. Anciennes valeurs (historique + consentements conservés si non fournis).
  const { data: previous } = await db.from("member_locations").select("*").eq("user_id", userId).maybeSingle();
  const displayLevel: DisplayLevel = input.displayLevel ?? ((previous?.display_level as DisplayLevel) || "none");
  const consentTouched =
    input.displayLevel !== undefined || input.nearbySearchEnabled !== undefined || input.locationDiscoverable !== undefined;

  const row = {
    user_id: userId,
    country_code: countryCode,
    region_id: regionId,
    department_id: departmentId,
    arrondissement_id: arrondissementId,
    place_id: placeId,
    free_text_city: structured && placeId ? null : cityName,
    verification_status: verification,
    nearby_search_enabled: input.nearbySearchEnabled ?? previous?.nearby_search_enabled ?? false,
    location_discoverable: input.locationDiscoverable ?? previous?.location_discoverable ?? false,
    display_level: displayLevel,
    location_consent_at: consentTouched ? new Date().toISOString() : (previous?.location_consent_at ?? null),
    updated_at: new Date().toISOString(),
  };

  if (previous) {
    await db.from("member_location_history").insert({ user_id: userId, previous });
  }
  const { error: upErr } = await db.from("member_locations").upsert(row, { onConflict: "user_id" });
  if (upErr) return { ok: false, status: 500, error: "Enregistrement impossible." };

  // 4. profiles : pays + étiquette publique de ville. JAMAIS region.
  const publicCity = publicCityLabel(cityName, displayLevel);
  const { error: pErr } = await db
    .from("profiles")
    .update({ country: country.name, city: publicCity })
    .eq("id", userId);
  if (pErr) return { ok: false, status: 500, error: "Profil non mis à jour." };

  // Métadonnées de session : même étiquette publique que profiles (jamais la ville privée). Non bloquant.
  try {
    await db.auth?.admin?.updateUserById(userId, { user_metadata: { country: country.name, city: publicCity } });
  } catch {
    /* la session se rafraîchira à la prochaine connexion */
  }

  return { ok: true, publicCity, verification };
}

/**
 * Suppression de MA localisation (droit à l'effacement) : la ligne privée ET son historique disparaissent,
 * donc le membre cesse immédiatement d'apparaître dans les recherches et les comptes. profiles.city
 * retombe sur l'étiquette générique (jamais une ville) ; le pays est conservé.
 */
export async function deleteMemberLocation(db: Db, userId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const h = await db.from("member_location_history").delete().eq("user_id", userId);
  if (h.error) return { ok: false, status: 500, error: "Suppression impossible." };
  const l = await db.from("member_locations").delete().eq("user_id", userId);
  if (l.error) return { ok: false, status: 500, error: "Suppression impossible." };
  const { error: pErr } = await db.from("profiles").update({ city: GENERIC_CITY_LABEL }).eq("id", userId);
  if (pErr) return { ok: false, status: 500, error: "Profil non mis à jour." };
  try {
    await db.auth?.admin?.updateUserById(userId, { user_metadata: { city: GENERIC_CITY_LABEL } });
  } catch { /* non bloquant */ }
  return { ok: true };
}

/**
 * Export de MES données de localisation (droit d'accès) : noms lisibles, réglages, historique de mes changements.
 * Aucune coordonnée (il n'y en a pas : la position d'un membre est le point de sa localité déclarée).
 */
export async function exportMemberLocation(db: Db, userId: string) {
  const { data: row, error } = await db.from("member_locations").select("*").eq("user_id", userId).maybeSingle();
  if (error) return { ok: false as const, status: 500, error: "Export indisponible." };
  const { data: hist } = await db
    .from("member_location_history")
    .select("changed_at, previous")
    .eq("user_id", userId)
    .order("changed_at", { ascending: false })
    .limit(200);

  const unitIds = [row?.region_id, row?.department_id, row?.arrondissement_id].filter((x): x is string => !!x);
  const names = new Map<string, string>();
  if (unitIds.length) {
    const { data } = await db.from("geo_admin_units").select("id, name_fr").in("id", unitIds);
    for (const u of data ?? []) names.set(u.id as string, u.name_fr as string);
  }
  let placeName: string | null = null;
  if (row?.place_id) {
    const { data } = await db.from("geo_places").select("name").eq("id", row.place_id).maybeSingle();
    placeName = data?.name ?? null;
  }
  return {
    ok: true as const,
    data: {
      exportedAt: new Date().toISOString(),
      location: row
        ? {
            country: row.country_code,
            region: names.get(row.region_id) ?? null,
            department: names.get(row.department_id) ?? null,
            arrondissement: names.get(row.arrondissement_id) ?? null,
            city: placeName ?? row.free_text_city ?? null,
            verification: row.verification_status,
            useMyLocationToSearch: row.nearby_search_enabled,
            appearInOthersSearches: row.location_discoverable,
            displayLevel: row.display_level,
            consentRecordedAt: row.location_consent_at,
            updatedAt: row.updated_at,
          }
        : null,
      history: (hist ?? []).map((h) => {
        const p = (h.previous ?? {}) as Record<string, unknown>;
        return {
          changedAt: h.changed_at,
          country: p.country_code ?? null,
          city: p.free_text_city ?? null,
          displayLevel: p.display_level ?? null,
          useMyLocationToSearch: p.nearby_search_enabled ?? null,
          appearInOthersSearches: p.location_discoverable ?? null,
        };
      }),
    },
  };
}
