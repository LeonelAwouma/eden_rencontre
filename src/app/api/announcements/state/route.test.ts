import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

let mockMember: { id: string } | null = null;
let rateAllowed = true;
const writeSpy = vi.fn(async () => true);

const fixtures = [
  { id: "pour-membres", surface: "member", active: true },
  { id: "pour-admins", surface: "admin", active: true },
];

vi.mock("@/lib/whats-new", () => ({ getAnnouncement: (id: string) => fixtures.find((a) => a.id === id) }));
vi.mock("@/lib/api-auth", () => ({ getMemberOrCoach: async () => (mockMember ? { ...mockMember, kind: "member" } : null) }));
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => rateAllowed, recordRateLimit: async () => {} }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/whats-new-store", () => ({ writeState: (...args: unknown[]) => (writeSpy as (...a: unknown[]) => Promise<boolean>)(...args) }));

const post = (body: unknown) =>
  new NextRequest("http://x/api/announcements/state", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  mockMember = { id: "u1" };
  rateAllowed = true;
  writeSpy.mockClear();
  writeSpy.mockResolvedValue(true);
});

describe("POST /api/announcements/state", () => {
  test("refuse un appelant non connecté ou non approuvé", async () => {
    mockMember = null;
    const { POST } = await import("./route");
    expect((await POST(post({ id: "pour-membres", action: "dismiss" }))).status).toBe(401);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test("enregistre une fermeture avec l'identité du jeton, jamais celle du corps", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ id: "pour-membres", action: "dismiss", userId: "pirate" }));
    expect(res.status).toBe(200);
    expect(writeSpy).toHaveBeenCalledWith(expect.anything(), "u1", "pour-membres", "dismiss");
  });

  test("enregistre une découverte", async () => {
    const { POST } = await import("./route");
    await POST(post({ id: "pour-membres", action: "discover" }));
    expect(writeSpy).toHaveBeenCalledWith(expect.anything(), "u1", "pour-membres", "discover");
  });

  test("rejette une action inconnue", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ id: "pour-membres", action: "supprimer" }))).status).toBe(400);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test("rejette un identifiant hors du registre : aucune ligne pour une clé arbitraire", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ id: "inventee", action: "dismiss" }))).status).toBe(400);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test("rejette une annonce qui n'est pas destinée aux membres", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ id: "pour-admins", action: "dismiss" }))).status).toBe(400);
  });

  test("applique la limitation de débit", async () => {
    rateAllowed = false;
    const { POST } = await import("./route");
    expect((await POST(post({ id: "pour-membres", action: "dismiss" }))).status).toBe(429);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test("reste un succès si la migration n'est pas encore exécutée (rien ne casse)", async () => {
    writeSpy.mockResolvedValue(false);
    const { POST } = await import("./route");
    const res = await POST(post({ id: "pour-membres", action: "dismiss" }));
    expect(res.status).toBe(200);
    expect((await res.json()).saved).toBe(false);
  });
});
