import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(__dirname, "../../../supabase/migrations/20261125_geo_admin_member_map.sql"), "utf8");
const code = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
const FUNCS = [
  "geo_admin_member_pool(text[], text)",
  "geo_admin_member_counts(int, uuid, text[], text)",
  "geo_admin_country_counts(text[], text)",
  "geo_admin_member_summary(text[], text)",
];

describe("migration 20261125_geo_admin_member_map", () => {
  it("fonctions SECURITY DEFINER à search_path vide", () => {
    const defs = code.match(/create or replace function[\s\S]*?\$\$;/g) ?? [];
    expect(defs).toHaveLength(4);
    for (const d of defs) {
      expect(d).toMatch(/security definer/);
      expect(d).toMatch(/set search_path = ''/);
    }
  });
  it("droits : retirés à public/anon/authenticated, accordés au seul service_role", () => {
    for (const f of FUNCS) {
      expect(code).toContain(`revoke all on function public.${f} from public, anon, authenticated;`);
      expect(code).toContain(`grant execute on function public.${f} to service_role;`);
    }
    expect(code).not.toMatch(/grant execute[^;]*to (anon|authenticated)/);
  });
  it("statistiques administratives : ni geo_zone_counts, ni consentement, rejected exclu", () => {
    expect(code).not.toMatch(/geo_zone_counts/);
    expect(code).not.toMatch(/location_discoverable|nearby_search_enabled|gender/);
    expect(code).toMatch(/p\.account_type = 'member'/);
    expect(code).toMatch(/p\.status <> 'rejected'/);
  });
  it("ne renvoie aucune colonne personnelle", () => {
    const returns = code.match(/returns table \(([^)]*)\)/g) ?? [];
    for (const r of returns) expect(r).not.toMatch(/user_id|email|name|phone|free_text_city|point/);
  });
  it("additive : aucune suppression de table ni modification de geo_zone_counts", () => {
    expect(code).not.toMatch(/drop table|alter table|drop function/i);
  });
});
