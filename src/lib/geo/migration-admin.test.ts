import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const adm = readFileSync(join(process.cwd(), "supabase/migrations/20261118_geo_admin.sql"), "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");

describe("administration géographique (Lot 4) — migration", () => {
  test("fonctions privilégiées : search_path vide, service_role seulement", () => {
    expect((adm.match(/security definer\s+set search_path = ''/g) ?? []).length).toBe(2);
    for (const f of ["geo_admin_overview()", "geo_admin_inconsistencies(int)"]) {
      expect(adm).toContain(`revoke all on function public.${f} from public, anon, authenticated`);
      expect(adm).toContain(`grant execute on function public.${f} to service_role`);
    }
    expect(adm).not.toMatch(/grant execute[^;]*to (anon|authenticated)/);
  });
  test("aucune coordonnée ni localisation individuelle dans la vue admin", () => {
    expect(adm).not.toMatch(/representative_point|ST_AsText|ST_AsGeoJSON|ST_X|ST_Y|latitude|longitude/i);
    expect(adm).not.toMatch(/ml\.user_id|public\.profiles/i);
  });
});
