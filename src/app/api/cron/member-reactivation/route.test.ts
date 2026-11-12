import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({ calls: 0 }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/email", () => ({ sendInactivityReminderEmail: async () => true }));
vi.mock("@/lib/member-reactivation-run", () => ({
  runReactivation: async () => { w.calls++; return { eligible: 3, attempted: 2, sent: 2, failed: 0, errors: 0, perRunLimit: 8 }; },
}));

const req = (auth?: string) => new NextRequest("http://x/api/cron/member-reactivation", { headers: auth ? { authorization: auth } : {} });
const saved = { ...process.env };

beforeEach(() => { w.calls = 0; process.env.CRON_SECRET = "s3cret"; process.env.REACTIVATION_EMAILS_ENABLED = "true"; });
afterEach(() => { process.env = { ...saved }; });

describe("GET /api/cron/member-reactivation", () => {
  test("sans CRON_SECRET configuré : 503, rien n'est exécuté", async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import("./route");
    expect((await GET(req("Bearer s3cret"))).status).toBe(503);
    expect(w.calls).toBe(0);
  });
  test("secret absent ou faux : 401", async () => {
    const { GET } = await import("./route");
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer faux"))).status).toBe(401);
    expect(w.calls).toBe(0);
  });
  test("l'activation globale relève de la plateforme : sans REACTIVATION_EMAILS_ENABLED=true, aucun envoi", async () => {
    process.env.REACTIVATION_EMAILS_ENABLED = "false";
    const { GET } = await import("./route");
    const body = await (await GET(req("Bearer s3cret"))).json();
    expect(body).toMatchObject({ enabled: false, sent: 0 });
    expect(w.calls).toBe(0);
  });
  test("activé et autorisé : exécute le traitement pour tous les membres éligibles (aucune préférence individuelle requise)", async () => {
    const { GET } = await import("./route");
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ enabled: true, sent: 2, perRunLimit: 8 });
    expect(w.calls).toBe(1);
  });
});
