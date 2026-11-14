import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

type Row = Record<string, unknown>;
const w = vi.hoisted(() => ({
  user: { id: "u1", email: "m@x.fr" } as null | { id: string; email: string },
  meet: null as null | Record<string, unknown>,
  invited: true,
}));

vi.mock("@/lib/api-auth", () => ({ getMemberOrCoach: async () => w.user }));
vi.mock("@/lib/avatar", () => ({ absoluteAvatarUrl: () => null }));
vi.mock("@/lib/jitsi", () => ({
  roomOf: (m: { space_name: string | null }) => (m.space_name?.startsWith("jitsi:") ? m.space_name.slice(6) : null),
  isJitsiConfigured: () => true,
  buildJoinInfo: () => ({ domain: "8x8.vc", roomName: "app/room", jwt: "jwt", scriptSrc: "s" }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const q: Record<string, unknown> = {};
      const self = () => q;
      q.select = self; q.eq = self;
      q.single = async () => ({ data: table === "meets" ? w.meet : null });
      q.maybeSingle = async () => ({ data: table === "meet_invitations" ? (w.invited ? { id: "i1" } : null) : { name: "Membre", avatar_url: null } });
      return q;
    },
  }),
}));

import { GET } from "./route";

const call = () => GET(new NextRequest("http://localhost/api/meets/m1/salle"), { params: Promise.resolve({ id: "m1" }) });
const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();
const base = (over: Row = {}): Row => ({
  id: "m1", title: "Réunion", description: "d", start_time: minutes(-5), duration: 60, status: "active",
  space_name: null, meet_type: "external", external_url: "https://meet.google.com/abc-defg-hij", ...over,
});

beforeEach(() => { w.user = { id: "u1", email: "m@x.fr" }; w.invited = true; w.meet = base(); });

describe("GET /api/meets/[id]/salle — réunion externe", () => {
  test("invité dans le créneau : reçoit le lien externe", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ kind: "external", externalUrl: "https://meet.google.com/abc-defg-hij" });
  });

  test("non authentifié : 401 sans lien", async () => {
    w.user = null;
    const res = await call();
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain("meet.google.com");
  });

  test("non invité : 403 sans lien", async () => {
    w.invited = false;
    const res = await call();
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("meet.google.com");
  });

  test("réunion annulée : 410 sans lien", async () => {
    w.meet = base({ status: "cancelled" });
    const res = await call();
    expect(res.status).toBe(410);
    expect(JSON.stringify(await res.json())).not.toContain("meet.google.com");
  });

  test("trop tôt : 425 sans lien", async () => {
    w.meet = base({ start_time: minutes(120) });
    const res = await call();
    expect(res.status).toBe(425);
    expect(JSON.stringify(await res.json())).not.toContain("meet.google.com");
  });

  test("expirée : 410 sans lien", async () => {
    w.meet = base({ start_time: minutes(-600) });
    const res = await call();
    expect(res.status).toBe(410);
    expect(JSON.stringify(await res.json())).not.toContain("meet.google.com");
  });
});

describe("GET /api/meets/[id]/salle — réunion Jitsi (inchangée)", () => {
  test("renvoie le jeton Jitsi, jamais de lien externe", async () => {
    w.meet = base({ meet_type: "jitsi", external_url: null, space_name: "jitsi:room1" });
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ kind: "jitsi", jwt: "jwt" });
    expect(body.externalUrl).toBeUndefined();
  });

  test("ancienne ligne sans colonne meet_type : parcours Jitsi", async () => {
    const m = base({ space_name: "jitsi:room1" }); delete m.meet_type; delete m.external_url;
    w.meet = m;
    expect((await call()).status).toBe(200);
  });

  test("ancienne réunion Google Meet (ni salle ni externe) : 409 legacy", async () => {
    w.meet = base({ meet_type: "jitsi", external_url: null, space_name: "spaces/abc" });
    const res = await call();
    expect(res.status).toBe(409);
  });
});
