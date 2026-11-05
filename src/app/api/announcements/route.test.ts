import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

let mockMember: { id: string } | null = null;
let mockAdmin: { adminId: string } | null = null;
let mockSettings: { key: string; value: unknown }[] = [];
let mockStates: Record<string, { dismissed: boolean; discovered: boolean }> = {};

const base = {
  active: true,
  activatesAt: "2020-01-01T00:00:00Z",
  expiresAt: "2999-01-01T00:00:00Z",
  availability: "always" as const,
  href: "/dashboard/forum",
  fr: { title: "Titre", description: "Description" },
  en: { title: "Title", description: "Description" },
};
const fixtures = [
  { ...base, id: "pour-visiteurs", surface: "public" as const },
  { ...base, id: "pour-membres", surface: "member" as const },
  { ...base, id: "pour-admins", surface: "admin" as const, href: "/admin/announcements" },
  { ...base, id: "parrainage", surface: "member" as const, availability: "referral" as const },
  { ...base, id: "desactivee", surface: "member" as const, active: false },
];

vi.mock("@/lib/whats-new", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/whats-new")>();
  return { ...actual, ANNOUNCEMENTS: fixtures, getAnnouncement: (id: string) => fixtures.find((a) => a.id === id) };
});

vi.mock("@/lib/api-auth", () => ({ getApprovedUser: async () => mockMember }));
vi.mock("@/lib/admin-auth", () => ({ getAdminSession: async () => mockAdmin }));
vi.mock("@/lib/whats-new-store", () => ({ readStates: async () => mockStates }));
vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ select: () => ({ eq: async () => ({ data: mockSettings, error: null }) }) }),
  }),
}));

const get = (surface?: string) =>
  new NextRequest(`http://x/api/announcements${surface ? `?surface=${surface}` : ""}`);

const ids = async (res: Response) => ((await res.json()).announcements as { id: string }[]).map((a) => a.id);

beforeEach(() => {
  mockMember = null;
  mockAdmin = null;
  mockSettings = [];
  mockStates = {};
});

describe("GET /api/announcements", () => {
  test("rejette une surface inconnue ou absente", async () => {
    const { GET } = await import("./route");
    expect((await GET(get())).status).toBe(400);
    expect((await GET(get("autre"))).status).toBe(400);
  });

  test("un visiteur ne reçoit que des annonces publiques", async () => {
    const { GET } = await import("./route");
    const res = await GET(get("public"));
    expect(res.status).toBe(200);
    expect(await ids(res)).toEqual(["pour-visiteurs"]);
  });

  test("un visiteur ne peut pas lire les annonces membres ni admin", async () => {
    const { GET } = await import("./route");
    expect((await GET(get("member"))).status).toBe(401);
    expect((await GET(get("admin"))).status).toBe(401);
  });

  test("un membre approuvé reçoit ses annonces, sans celles des autres audiences", async () => {
    mockMember = { id: "u1" };
    const { GET } = await import("./route");
    const list = await ids(await GET(get("member")));
    expect(list).toContain("pour-membres");
    expect(list).not.toContain("pour-visiteurs");
    expect(list).not.toContain("pour-admins");
  });

  test("n'envoie jamais une annonce désactivée, même si sa fonctionnalité est activée", async () => {
    mockMember = { id: "u1" };
    mockSettings = [{ key: "enabled", value: true }];
    const { GET } = await import("./route");
    const list = await ids(await GET(get("member")));
    expect(list).toContain("parrainage"); // programme activé et annonce active
    expect(list).not.toContain("desactivee"); // annonce désactivée : invisible
  });

  test("n'envoie pas l'annonce d'une fonctionnalité qui n'est pas activée", async () => {
    mockMember = { id: "u1" };
    mockSettings = [{ key: "enabled", value: false }];
    const { GET } = await import("./route");
    expect(await ids(await GET(get("member")))).not.toContain("parrainage");
  });

  test("reporte l'état fermé / découvert du membre", async () => {
    mockMember = { id: "u1" };
    mockStates = { "pour-membres": { dismissed: true, discovered: false } };
    const { GET } = await import("./route");
    const body = await (await GET(get("member"))).json();
    const mine = body.announcements.find((a: { id: string }) => a.id === "pour-membres");
    expect(mine.dismissed).toBe(true);
    expect(mine.discovered).toBe(false);
  });

  test("un administrateur reçoit les annonces admin", async () => {
    mockAdmin = { adminId: "a1" };
    const { GET } = await import("./route");
    expect(await ids(await GET(get("admin")))).toEqual(["pour-admins"]);
  });

  test("ne divulgue ni `active` ni `availability`", async () => {
    const { GET } = await import("./route");
    const body = await (await GET(get("public"))).json();
    expect(body.announcements[0]).not.toHaveProperty("active");
    expect(body.announcements[0]).not.toHaveProperty("availability");
  });

  test("n'est jamais mis en cache", async () => {
    const { GET } = await import("./route");
    expect((await GET(get("public"))).headers.get("Cache-Control")).toBe("no-store");
  });
});
