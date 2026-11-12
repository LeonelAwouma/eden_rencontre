import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({ upserts: [] as Record<string, unknown>[], error: null as null | { message: string } }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (t: string) => ({
      upsert: async (row: Record<string, unknown>) => { w.upserts.push({ table: t, ...row }); return { error: w.error }; },
    }),
  }),
}));

const ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "x".repeat(40);
  w.upserts.length = 0; w.error = null;
});

async function link() {
  const { reactivationUnsubscribeUrl } = await import("@/lib/member-reactivation");
  return new URL(reactivationUnsubscribeUrl(ID));
}

describe("désinscription des rappels (conservée après le retrait de l'interface de préférences)", () => {
  test("GET ne modifie rien (les scanners de liens e-mail le visitent) et propose la confirmation", async () => {
    const { GET } = await import("./route");
    const u = await link();
    const res = await GET(new NextRequest(u));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Désactiver les rappels");
    expect(w.upserts).toEqual([]);
  });
  test("POST avec un jeton valide : enregistre l'opposition (email_opt_in=false) pour ce membre", async () => {
    const { POST } = await import("./route");
    const u = await link();
    const res = await POST(new NextRequest(u, { method: "POST" }));
    expect(res.status).toBe(200);
    expect(w.upserts).toHaveLength(1);
    expect(w.upserts[0]).toMatchObject({ table: "member_reactivation_preferences", user_id: ID, email_opt_in: false });
  });
  test("jeton invalide ou falsifié : 400, aucune écriture", async () => {
    const { POST, GET } = await import("./route");
    const u = await link();
    u.searchParams.set("t", "0".repeat(64));
    expect((await POST(new NextRequest(u, { method: "POST" }))).status).toBe(400);
    expect((await GET(new NextRequest(u))).status).toBe(400);
    const other = await link();
    other.searchParams.set("u", "33333333-3333-4333-8333-333333333333"); // jeton d'un autre membre
    expect((await POST(new NextRequest(other, { method: "POST" }))).status).toBe(400);
    expect(w.upserts).toEqual([]);
  });
  test("le lien de désinscription figure dans l'e-mail de rappel (corps, pied de page) sans mention d'un choix du membre", async () => {
    const { inactivityReminderEmail } = await import("@/lib/email-templates");
    const url = (await link()).toString();
    for (const days of [7, 21, 45] as const) {
      const mail = inactivityReminderEmail("Awa", days, url);
      const html = JSON.stringify(mail);
      expect(html).toContain("/api/member/reactivation/unsubscribe");
      expect(html).not.toMatch(/vous avez choisi de recevoir/i);
    }
  });
});
