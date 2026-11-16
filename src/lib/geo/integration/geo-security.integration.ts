/**
 * Tests d'intégration SUR UN PROJET SUPABASE DE TEST (jamais la production).
 *
 *   SUPABASE_TEST_URL=… SUPABASE_TEST_ANON_KEY=… SUPABASE_TEST_SERVICE_KEY=… npm run test:integration
 *
 * Prérequis : migrations 20261115_geo_*.sql appliquées sur ce projet (y compris le verrou
 * 20261115_geo_guard_profile_location.sql). Sans variables, la suite est ignorée.
 * Ils vérifient avec les VRAIS rôles anon / authenticated ce que les tests statiques ne peuvent pas prouver.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const SERVICE = process.env.SUPABASE_TEST_SERVICE_KEY;
const enabled = !!(URL && ANON && SERVICE);
const d = enabled ? describe : describe.skip;

const stamp = Date.now();
const PASSWORD = `Pw-${stamp}-Aa1!`;
const emails = { a: `geo-a-${stamp}@example.test`, b: `geo-b-${stamp}@example.test` };

d("sécurité géographique (Supabase réel)", () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  let A: SupabaseClient; // membre A (rôle authenticated)
  let B: SupabaseClient;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    admin = createClient(URL!, SERVICE!, { auth: { persistSession: false } });
    anon = createClient(URL!, ANON!, { auth: { persistSession: false } });
    for (const k of ["a", "b"] as const) {
      const { data, error } = await admin.auth.admin.createUser({ email: emails[k], password: PASSWORD, email_confirm: true });
      if (error) throw error;
      ids[k] = data.user!.id;
      await admin.from("profiles").upsert({ id: ids[k], email: emails[k], status: "approved", account_type: "member", city: "Douala", country: "Cameroun", gender: k === "a" ? "homme" : "femme" });
    }
    const login = async (email: string) => {
      const c = createClient(URL!, ANON!, { auth: { persistSession: false } });
      const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
      if (error) throw error;
      return c;
    };
    A = await login(emails.a);
    B = await login(emails.b);
    await admin.from("member_locations").upsert({
      user_id: ids.b, country_code: "CM", display_level: "none", nearby_search_enabled: true, location_discoverable: true,
    });
  });

  afterAll(async () => {
    for (const id of Object.values(ids)) {
      await admin.from("member_locations").delete().eq("user_id", id);
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("anon ne peut pas lire member_locations", async () => {
    const { data, error } = await anon.from("member_locations").select("*");
    expect(error || (data ?? []).length === 0).toBeTruthy();
    expect(data ?? []).toHaveLength(0);
  });

  it("un membre authentifié ne lit ni sa propre ligne ni celle d'un autre", async () => {
    for (const c of [A, B]) {
      const { data } = await c.from("member_locations").select("*");
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("un membre ne peut pas modifier la localisation d'un autre (ni insérer)", async () => {
    const upd = await A.from("member_locations").update({ display_level: "city" }).eq("user_id", ids.b).select();
    expect(upd.data ?? []).toHaveLength(0);
    const ins = await A.from("member_locations").insert({ user_id: ids.a, country_code: "CM" });
    expect(ins.error).toBeTruthy();
    const { data } = await admin.from("member_locations").select("display_level").eq("user_id", ids.b).single();
    expect(data?.display_level).toBe("none");
  });

  it("les RPC privées sont refusées à anon et authenticated", async () => {
    for (const c of [anon, A]) {
      const r = await c.rpc("geo_search_places", { p_query: "yaoundé", p_country: "CM", p_limit: 5 });
      expect(r.error).toBeTruthy();
    }
  });

  it("les tables du référentiel sont fermées aux rôles clients", async () => {
    for (const t of ["geo_admin_units", "geo_places", "geo_import_runs", "member_location_history"]) {
      const { data } = await A.from(t).select("*").limit(1);
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("les fonctions de découverte et de limitation sont refusées à anon et authenticated", async () => {
    for (const c of [anon, A]) {
      for (const [fn, args] of [
        ["geo_candidates_in_scope", { p_viewer: ids.a, p_scope: "country", p_radius_km: null, p_include_unlocated: true, p_exclude_email: null, p_limit: 10, p_offset: 0 }],
        ["geo_rate_limit_hit", { p_user: ids.a, p_limit: 5, p_window_seconds: 60 }],
        ["geo_scope_hit", { p_user: ids.a, p_scope_key: "x", p_max: 5 }],
      ] as const) {
        const r = await c.rpc(fn, args as never);
        expect(r.error, fn).toBeTruthy();
      }
    }
  });

  it("découverte : exige le consentement des deux côtés ; la révocation est appliquée au résultat suivant", async () => {
    const call = () => admin.rpc("geo_candidates_in_scope", {
      p_viewer: ids.a, p_scope: "country", p_radius_km: null, p_include_unlocated: false,
      p_exclude_email: null, p_limit: 50, p_offset: 0,
    });
    // A (demandeur) n'a pas activé nearby_search_enabled : rien.
    await admin.from("member_locations").upsert({ user_id: ids.a, country_code: "CM", nearby_search_enabled: false, location_discoverable: false, display_level: "none" });
    expect((await call()).data ?? []).toHaveLength(0);
    // A active sa recherche ; B est discoverable : B apparaît.
    await admin.from("member_locations").update({ nearby_search_enabled: true }).eq("user_id", ids.a);
    expect(((await call()).data ?? []).map((r: { user_id: string }) => r.user_id)).toContain(ids.b);
    // B révoque : disparaît IMMÉDIATEMENT (aucun cache).
    await admin.from("member_locations").update({ location_discoverable: false }).eq("user_id", ids.b);
    expect(((await call()).data ?? []).map((r: { user_id: string }) => r.user_id)).not.toContain(ids.b);
    // Sans localisation, B ne peut apparaître que dans la catégorie « non localisé », sans zone.
    const withUnlocated = await admin.rpc("geo_candidates_in_scope", {
      p_viewer: ids.a, p_scope: "country", p_radius_km: null, p_include_unlocated: true,
      p_exclude_email: null, p_limit: 50, p_offset: 0,
    });
    const rowB = (withUnlocated.data ?? []).find((r: { user_id: string }) => r.user_id === ids.b);
    expect(rowB?.category).toBe("unlocated");
  });

  it("limitation de débit atomique : 40 appels simultanés, limite 30 → exactement 30 autorisés", async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => admin.rpc("geo_rate_limit_hit", { p_user: ids.a, p_limit: 30, p_window_seconds: 3600 })),
    );
    expect(results.filter((r) => r.data === true)).toHaveLength(30);
    await admin.from("geo_rate_limits").delete().eq("user_id", ids.a);
  });


  it("carte : fonctions refusées aux rôles clients ; les comptes ne comptent que les membres consentants", async () => {
    for (const c of [anon, A]) {
      expect((await c.rpc("geo_zone_counts", { p_viewer: ids.a, p_level: 1, p_parent: null, p_exclude_email: null })).error).toBeTruthy();
      expect((await c.rpc("geo_units_geojson", { p_level: 1, p_parent: null })).error).toBeTruthy();
    }
    // B n'est plus discoverable (test précédent) : aucune zone ne doit le compter, même pour un demandeur autorisé.
    await admin.from("member_locations").update({ nearby_search_enabled: true }).eq("user_id", ids.a);
    const r = await admin.rpc("geo_zone_counts", { p_viewer: ids.a, p_level: 1, p_parent: null, p_exclude_email: null });
    expect((r.data ?? []).reduce((n: number, x: { member_count: number }) => n + x.member_count, 0)).toBe(0);
    // Demandeur sans activation : aucun compte du tout.
    await admin.from("member_locations").update({ nearby_search_enabled: false }).eq("user_id", ids.a);
    const off = await admin.rpc("geo_zone_counts", { p_viewer: ids.a, p_level: 1, p_parent: null, p_exclude_email: null });
    expect((off.data ?? []).every((x: { member_count: number }) => x.member_count === 0)).toBe(true);
  });

  it("admin : fonctions refusées aux rôles clients ; la vue d'ensemble ne contient aucune localisation individuelle", async () => {
    for (const c of [anon, A]) {
      expect((await c.rpc("geo_admin_overview")).error).toBeTruthy();
      expect((await c.rpc("geo_admin_inconsistencies", { p_limit: 5 })).error).toBeTruthy();
    }
    const r = await admin.rpc("geo_admin_overview");
    expect(r.error).toBeNull();
    expect(JSON.stringify(r.data)).not.toContain(ids.a);
    expect(JSON.stringify(r.data)).not.toContain(ids.b);
  });

  it("verrou : un update direct de profiles.city / country / region est sans effet", async () => {
    await A.from("profiles").update({ city: "Paris", country: "France", region: "Diaspora" }).eq("id", ids.a);
    const { data } = await admin.from("profiles").select("city, country, region").eq("id", ids.a).single();
    expect(data).toMatchObject({ city: "Douala", country: "Cameroun" });
    expect(data?.region).not.toBe("Diaspora");
  });
});
