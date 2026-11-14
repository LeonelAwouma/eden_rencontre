import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const w = vi.hoisted(() => ({
  jitsi: true,
  inserted: [] as Record<string, unknown>[],
  emails: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdmin: async () => ({ adminId: "a1", email: "a@x.fr", role: "admin" }) }));
vi.mock("@/lib/email", () => ({ sendMeetInvitationEmail: async (p: Record<string, unknown>) => { w.emails.push(p); return true; } }));
vi.mock("@/lib/jitsi", () => ({
  isJitsiConfigured: () => w.jitsi,
  newRoomName: () => "room-x",
  memberJoinUrl: (id: string) => `https://eden.test/reunion/${id}`,
  JITSI_SPACE_PREFIX: "jitsi:",
}));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      insert: (rows: unknown) => {
        if (table === "meets") w.inserted.push(rows as Record<string, unknown>);
        const arr = Array.isArray(rows) ? rows : [rows];
        const res = {
          data: table === "meet_invitations" ? arr.map((r, i) => ({ ...(r as object), id: `inv${i}` })) : null,
          error: null,
        };
        const p: Record<string, unknown> = {
          select: () => ({ single: async () => ({ data: rows, error: null }), then: (f: (v: unknown) => unknown) => f(res) }),
          then: (f: (v: unknown) => unknown) => f({ data: null, error: null }),
        };
        return p;
      },
      select: () => ({ in: async () => ({ data: [{ id: "u1", email: "m@x.fr", name: "M" }], error: null }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

import { POST } from "./route";

const start = new Date(Date.now() + 86_400_000).toISOString();
const post = (over: Record<string, unknown>) =>
  POST(new NextRequest("http://localhost/api/admin/meets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Culte", start_time: start, duration: 60, user_ids: ["u1"], ...over }),
  }));

beforeEach(() => { w.jitsi = true; w.inserted = []; w.emails = []; });

describe("POST /api/admin/meets", () => {
  test("réunion Jitsi sans JaaS configuré : 503 (comportement existant)", async () => {
    w.jitsi = false;
    expect((await post({})).status).toBe(503);
  });

  test("réunion Jitsi : pas de colonne externe dans l'insertion", async () => {
    const res = await post({});
    expect(res.status).toBe(200);
    expect(w.inserted[0]).not.toHaveProperty("meet_type");
    expect(w.inserted[0].space_name).toBe("jitsi:room-x");
  });

  test("lien Google Meet sans JaaS : accepté, invitation = lien Eden", async () => {
    w.jitsi = false;
    const res = await post({ meet_type: "external", external_url: "https://meet.google.com/abc-defg-hij" });
    expect(res.status).toBe(200);
    expect(w.inserted[0]).toMatchObject({ meet_type: "external", external_url: "https://meet.google.com/abc-defg-hij", space_name: null });
    expect(String(w.emails[0].meetLink)).toContain("https://eden.test/reunion/");
    expect(w.emails[0].meetLink).not.toContain("google.com");
  });

  test("lien Zoom accepté", async () => {
    expect((await post({ meet_type: "external", external_url: "https://us02web.zoom.us/j/123?pwd=x" })).status).toBe(200);
  });

  test.each([
    ["http://meet.google.com/abc"],
    ["https://user:pw@meet.google.com/abc"],
    ["pas un lien"],
    [""],
  ])("lien externe refusé : %s", async (url) => {
    const res = await post({ meet_type: "external", external_url: url });
    expect(res.status).toBe(400);
    expect(w.inserted).toHaveLength(0);
  });
});
