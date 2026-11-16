import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Contrôles STATIQUES des migrations géo (la base réelle est couverte par les tests d'intégration). */
const read = (f: string) =>
  readFileSync(join(process.cwd(), "supabase/migrations", f), "utf8")
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

const ref = read("20261115_geo_reference.sql");
const loc = read("20261115_geo_member_locations.sql");
const guard = read("20261115_geo_guard_profile_location.sql");

describe("référentiel géographique", () => {
  test("PostGIS installé dans le schéma extensions, pas public", () => {
    expect(ref).toContain("create extension if not exists postgis with schema extensions");
    expect(ref).not.toMatch(/create extension[^;]*schema public/);
  });
  test("index spatiaux GiST, FK et identifiants stables", () => {
    expect(ref).toMatch(/using gist \(geom\)/);
    expect(ref).toMatch(/using gist \(representative_point\)/);
    expect(ref).toContain("geo_admin_units_parent_idx");
    expect(ref).toContain("unique (country_code, level, code)");
    expect(ref).toContain("unique (source, source_id)");
  });
  test("géométrie originale conservée à côté de la version simplifiée", () => {
    expect(ref).toMatch(/\bgeom\s+extensions\.geometry\(MultiPolygon, 4326\)/);
    expect(ref).toMatch(/\bgeom_simplified\s+extensions\.geometry\(MultiPolygon, 4326\)/);
  });
  test("tables fermées aux rôles clients, RLS activée", () => {
    for (const t of ["geo_admin_units", "geo_places", "geo_import_runs"]) {
      expect(ref).toContain(`alter table public.${t}`);
      expect(ref).toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated`));
    }
  });
  test("fonction privilégiée : search_path vide, exécution service_role seulement", () => {
    expect(ref).toMatch(/security definer\s+set search_path = ''/);
    expect(ref).toContain("revoke all on function public.geo_search_places(text, text, int) from public, anon, authenticated");
    expect(ref).toContain("grant execute on function public.geo_search_places(text, text, int) to service_role");
  });
});

describe("localisation des membres", () => {
  test("aucune colonne GPS ni coordonnée saisie par le membre", () => {
    expect(loc).not.toMatch(/\b(latitude|longitude|lat|lng|geometry|geography)\b/i);
  });
  test("consentements indépendants, désactivés par défaut ; affichage « none » par défaut", () => {
    expect(loc).toMatch(/nearby_search_enabled boolean not null default false/);
    expect(loc).toMatch(/location_discoverable boolean not null default false/);
    expect(loc).toMatch(/display_level\s+text not null default 'none'/);
  });
  test("tables fermées aux rôles clients (même pour le propriétaire)", () => {
    for (const t of ["member_locations", "member_location_history"]) {
      expect(loc).toContain(`revoke all on public.${t}`);
      expect(loc).toContain(`${t}_no_client`);
    }
    expect(loc).not.toMatch(/grant [a-z, ]+ on public\.member_locations to (anon|authenticated)/);
  });
  test("aucune colonne géographique ajoutée à profiles", () => {
    expect(loc).not.toMatch(/alter table public\.profiles/i);
    expect(ref).not.toMatch(/alter table public\.profiles/i);
  });
});

describe("verrou profiles.city / country / region", () => {
  test("restaure city, country, region pour le rôle authenticated ; service_role exempté", () => {
    expect(guard).toContain("coalesce(auth.role(), '') <> 'authenticated'");
    expect(guard).toMatch(/new\.city\s+:= old\.city/);
    expect(guard).toMatch(/new\.country\s+:= old\.country/);
    expect(guard).toMatch(/new\.region\s+:= old\.region/);
    expect(guard).toMatch(/set search_path = ''/);
  });
});


const disc = read("20261116_geo_discovery.sql");

describe("découverte géographique (Lot 2)", () => {
  const fns = [
    "geo_rate_limit_hit(uuid, int, int)",
    "geo_scope_hit(uuid, text, int)",
    "geo_candidates_in_scope(uuid, text, int, boolean, text, int, int)",
  ];
  test("fonctions privilégiées : search_path vide, service_role seulement", () => {
    expect((disc.match(/security definer\s+set search_path = ''/g) ?? []).length).toBe(3);
    for (const f of fns) {
      expect(disc).toContain(`revoke all on function public.${f} from public, anon, authenticated`);
      expect(disc).toContain(`grant execute on function public.${f} to service_role`);
    }
    expect(disc).not.toMatch(/grant execute[^;]*to (anon|authenticated)/);
  });
  test("exige les deux consentements et le statut approuvé", () => {
    expect(disc).toMatch(/ml\.nearby_search_enabled/);
    expect(disc).toMatch(/location_discoverable/);
    expect(disc).toContain("p.status = 'approved'");
    expect(disc).toContain("p.account_type = 'member'");
  });
  test("ordre neutre : jamais trié par distance", () => {
    expect(disc).toMatch(/order by 2, b\.uid/);
    // le commentaire de fin de ligne est exclu : seule l'expression de tri compte
    expect(disc).not.toMatch(/order by[^-\n]*(distance|ST_Distance)/i);
  });
  test("rayon minimal de 25 km imposé côté base", () => {
    expect(disc).toMatch(/greatest\(coalesce\(p_radius_km, 0\), 25\)/);
  });
  test("limitation de débit persistante et atomique (upsert), jamais en mémoire", () => {
    expect(disc).toMatch(/insert into public\.geo_rate_limits[\s\S]*on conflict \(user_id, bucket\) do update set hits = r\.hits \+ 1/);
    expect(disc).toContain("revoke all on public.geo_rate_limits from anon, authenticated");
    expect(disc).toContain("revoke all on public.geo_scope_usage from anon, authenticated");
  });
  test("aucune fonction de lecture de coordonnées dans la sortie (distance brute réservée au serveur)", () => {
    expect(disc).not.toMatch(/\b(ST_AsText|ST_AsGeoJSON|ST_X|ST_Y)\b/i);
    expect(disc).not.toMatch(/\b(latitude|longitude)\b/i);
  });
});

const map = read("20261117_geo_map.sql");

describe("carte (Lot 3)", () => {
  const fns = ["geo_units_geojson(int, uuid)", "geo_zone_counts(uuid, int, uuid, text)"];
  test("fonctions privilégiées : search_path vide, service_role seulement", () => {
    expect((map.match(/security definer\s+set search_path = ''/g) ?? []).length).toBe(2);
    for (const f of fns) {
      expect(map).toContain(`revoke all on function public.${f} from public, anon, authenticated`);
      expect(map).toContain(`grant execute on function public.${f} to service_role`);
    }
    expect(map).not.toMatch(/grant execute[^;]*to (anon|authenticated)/);
  });
  test("le GeoJSON ne touche à aucune donnée de membre", () => {
    const geojsonFn = map.slice(map.indexOf("geo_units_geojson"), map.indexOf("geo_zone_counts"));
    expect(geojsonFn).not.toMatch(/member_locations|profiles/);
  });
  test("comptes : consentements des deux côtés, membre approuvé, aucune coordonnée lue", () => {
    expect(map).toMatch(/nearby_search_enabled/);
    expect(map).toMatch(/ml\.location_discoverable/);
    expect(map).toContain("p.status = 'approved'");
    expect(map).not.toMatch(/representative_point|place_id|latitude|longitude|ST_X|ST_Y/i);
  });
});
