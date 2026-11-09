import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";

/**
 * Académie du Mariage côté coach : vraie pile d'authentification (api-auth, coach-auth) contre un faux client ;
 * seul l'état du compte appelant change. Le stockage est simulé (bucket privé formation-media).
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  rpc: undefined as undefined | ((fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }),
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  files: new Map<string, Uint8Array>(),
  downloads: [] as { bucket: string; path: string }[],
}));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return {
    getSupabaseAdmin: () => ({
      ...createFakeDb(world as never),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            world.downloads.push({ bucket, path });
            const f = world.files.get(path);
            return f ? { data: new Blob([f]), error: null } : { data: null, error: { message: "not found" } };
          },
        }),
      },
    }),
  };
});

const COACH = "c0000000-0000-4000-8000-000000000001";
type Caller = "coach_active" | "coach_suspended" | "coach_desync" | "member" | "anonymous";
const DENIED: Caller[] = ["coach_suspended", "coach_desync", "member", "anonymous"];
const AUDIO_PATH = "audio/lecon-1-1-entre-eloge-et-realite.mp3";
const BYTES = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));

function seed(caller: Caller) {
  world.log.length = 0; world.rpcCalls.length = 0; world.failWhen = undefined; world.downloads.length = 0;
  world.files = new Map([[AUDIO_PATH, BYTES]]);
  const coachRow = (active: boolean): Row => ({ user_id: COACH, email: "coach@x.fr", display_name: "Coach Awa", active });
  const base: Record<string, Row[]> = { coach_accounts: [], profiles: [], coach_member_assignments: [], coach_audit_logs: [] };
  world.user = caller === "anonymous" ? null : { id: COACH, email: "coach@x.fr" };
  if (caller === "coach_active") { base.coach_accounts.push(coachRow(true)); base.profiles.push({ id: COACH, status: "approved", account_type: "coach" }); }
  if (caller === "coach_suspended") { base.coach_accounts.push(coachRow(false)); base.profiles.push({ id: COACH, status: "suspended", account_type: "coach" }); }
  if (caller === "coach_desync") { base.coach_accounts.push(coachRow(false)); base.profiles.push({ id: COACH, status: "approved", account_type: "coach" }); }
  if (caller === "member") base.profiles.push({ id: COACH, status: "approved", account_type: "member" });
  world.tables = base;
}

const req = (path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://x${path}`, { headers: { authorization: "Bearer jeton-de-test", ...headers } });
const slugCtx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const catalog = (p = "/api/coach/academie") => import("./route").then((m) => m.GET(req(p)));
const lesson = (slug: string, p = `/api/coach/academie/lesson/${slug}`) => import("./lesson/[slug]/route").then((m) => m.GET(req(p), slugCtx(slug)));
const audio = (slug: string, p = `/api/coach/academie/audio/${slug}`, h: Record<string, string> = {}) =>
  import("./audio/[slug]/route").then((m) => m.GET(req(p, h), slugCtx(slug)));

beforeEach(() => seed("coach_active"));

describe("accès : seul un coach ACTIF consulte l'Académie", () => {
  const all: [string, () => Promise<Response>][] = [
    ["catalogue", () => catalog()], ["leçon", () => lesson("1-1")], ["audio", () => audio("1-1")],
  ];
  for (const [name, run] of all) {
    it.each(DENIED)(`${name} : %s → 403, rien lu dans le stockage`, async (caller) => {
      seed(caller);
      const res = await run();
      expect(res.status).toBe(403);
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(world.downloads).toEqual([]);
      expect(await res.text()).not.toMatch(/Entre éloge|mp3|formation-media/);
    });
  }
});

describe("catalogue", () => {
  it("renvoie les piliers publiés (pas les piliers vides), sans corps de leçon ni fichier", async () => {
    const res = await catalog();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const body = await res.json() as { pillars: { number: number; lessons: { slug: string; hasAudio: boolean }[] }[] };
    expect(body.pillars.map((p) => p.number)).toEqual([1, 2, 3]);
    expect(body.pillars[0].lessons.find((l) => l.slug === "1-1")?.hasAudio).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/\.mp3|\.pdf|formation-media|\/formation\//);
  });
  it("recherche par titre ou mot-clé", async () => {
    const body = await (await catalog("/api/coach/academie?q=eloge")).json() as { pillars: { lessons: { slug: string }[] }[] };
    expect(body.pillars.flatMap((p) => p.lessons.map((l) => l.slug))).toContain("1-1");
    const none = await (await catalog("/api/coach/academie?q=zzzqqqxxx")).json() as { pillars: unknown[] };
    expect(none.pillars).toEqual([]);
  });
});

describe("leçon", () => {
  it("texte + audio associé, sans PDF, quiz ni lien de fichier", async () => {
    const res = await lesson("1-1");
    expect(res.status).toBe(200);
    const text = await res.text();
    const body = JSON.parse(text) as { lesson: { audio: { src: string; transcript: string | null } | null; parts: unknown[] } };
    expect(body.lesson.parts.length).toBeGreaterThan(0);
    expect(body.lesson.audio?.src).toBe("/api/coach/academie/audio/1-1");
    expect(text).not.toMatch(/"pdf"|"quiz"|\.mp3|\.pdf|formation-media|supabase/);
  });
  it("contenu non publié ou identifiant manipulé → 404", async () => {
    for (const slug of ["4-1", "9-9", "..%2F1-1", "1-1%2F..", "mediatheque"]) expect((await lesson(slug)).status).toBe(404);
  });
});

describe("audio protégé", () => {
  it("diffuse depuis le bucket privé, sans cache, sans téléchargement", async () => {
    const res = await audio("1-1");
    expect(res.status).toBe(200);
    expect(world.downloads).toEqual([{ bucket: "formation-media", path: AUDIO_PATH }]);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toBe("inline");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect((await res.arrayBuffer()).byteLength).toBe(100);
  });
  it("prend en charge les requêtes partielles (206) et refuse une plage invalide (416)", async () => {
    const part = await audio("1-1", "/api/coach/academie/audio/1-1", { range: "bytes=10-19" });
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 10-19/100");
    expect(Array.from(new Uint8Array(await part.arrayBuffer()))).toEqual(Array.from(BYTES.slice(10, 20)));
    const bad = await audio("1-1", "/api/coach/academie/audio/1-1", { range: "bytes=500-" });
    expect(bad.status).toBe(416);
  });
  it("identifiant manipulé ou leçon sans audio → 404, aucune lecture hors liste blanche", async () => {
    for (const slug of ["4-1", "..%2F..%2Fx", "x"]) expect((await audio(slug)).status).toBe(404);
    expect(world.downloads).toEqual([]);
  });
  it("fichier absent du bucket ET de l'emplacement public → 404 sans fuite", async () => {
    world.files.clear();
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const res = await audio("1-1");
    spy.mockRestore();
    expect(res.status).toBe(404);
    expect(await res.text()).not.toMatch(/mp3|formation-media/);
  });
});
