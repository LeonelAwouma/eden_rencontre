import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

let globalAllowed = true;
let perAnnouncementAllowed = true;
const bumpSpy = vi.fn(async () => true);
const recordSpy = vi.fn(async () => {});
const checkSpy = vi.fn();

const fixtures = [
  { id: "active-un", surface: "public", active: true },
  { id: "inactive-un", surface: "public", active: false },
];

vi.mock("@/lib/whats-new", () => ({ getAnnouncement: (id: string) => fixtures.find((a) => a.id === id) }));
vi.mock("@/lib/api-auth", () => ({ clientIp: () => "1.2.3.4" }));
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/whats-new-store", () => ({ bumpStat: (...args: unknown[]) => (bumpSpy as (...a: unknown[]) => Promise<boolean>)(...args) }));
vi.mock("@/lib/otp", () => ({
  checkRateLimit: async (key: string, action: string, max: number) => {
    checkSpy(key, action, max);
    return action === "announce_event" ? globalAllowed : perAnnouncementAllowed;
  },
  recordRateLimit: (...args: unknown[]) => (recordSpy as (...a: unknown[]) => Promise<void>)(...args),
}));

const post = (body: unknown) =>
  new NextRequest("http://x/api/announcements/event", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  globalAllowed = true;
  perAnnouncementAllowed = true;
  bumpSpy.mockClear();
  recordSpy.mockClear();
  checkSpy.mockClear();
});

describe("POST /api/announcements/event", () => {
  test("compte un affichage, un clic et une fermeture", async () => {
    const { POST } = await import("./route");
    for (const event of ["view", "click", "dismiss"]) {
      const res = await POST(post({ id: "active-un", event }));
      expect(res.status).toBe(200);
      expect(bumpSpy).toHaveBeenLastCalledWith(expect.anything(), "active-un", event);
    }
  });

  test("n'enregistre aucun identifiant de personne : le compteur ne reçoit que l'annonce et l'événement", async () => {
    const { POST } = await import("./route");
    await POST(post({ id: "active-un", event: "view", userId: "u1", email: "a@b.c" }));
    const args = bumpSpy.mock.calls[0] as unknown[];
    expect(args).toHaveLength(3); // db, id, event — rien d'autre
    expect(JSON.stringify(args.slice(1))).not.toMatch(/u1|a@b\.c/);
  });

  test("rejette un événement inconnu", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ id: "active-un", event: "hack" }))).status).toBe(400);
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  test("rejette un identifiant hors du registre : aucune ligne pour une clé arbitraire", async () => {
    const { POST } = await import("./route");
    expect((await POST(post({ id: "n-importe-quoi", event: "view" }))).status).toBe(400);
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  test("ne compte rien pour une annonce désactivée", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ id: "inactive-un", event: "view" }));
    expect(res.status).toBe(200);
    expect((await res.json()).counted).toBe(false);
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  test("répond 429 au-delà du plafond global par IP", async () => {
    globalAllowed = false;
    const { POST } = await import("./route");
    expect((await POST(post({ id: "active-un", event: "view" }))).status).toBe(429);
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  test("n'incrémente plus, sans erreur visible, au-delà du plafond par annonce et par jour", async () => {
    perAnnouncementAllowed = false;
    const { POST } = await import("./route");
    const res = await POST(post({ id: "active-un", event: "view" }));
    expect(res.status).toBe(200);
    expect((await res.json()).counted).toBe(false);
    expect(bumpSpy).not.toHaveBeenCalled();
  });

  test("applique deux plafonds distincts : par IP, et par IP × annonce × événement", async () => {
    const { POST } = await import("./route");
    await POST(post({ id: "active-un", event: "click" }));
    const keys = checkSpy.mock.calls.map((c) => c[0] as string);
    expect(keys).toContain("announce-event:1.2.3.4");
    expect(keys).toContain("announce-event:1.2.3.4:active-un:click");
  });
});
