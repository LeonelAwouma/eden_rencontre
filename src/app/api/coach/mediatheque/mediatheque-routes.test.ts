import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";

/**
 * Routes `/api/coach/mediatheque*` contre un faux client Supabase (vraie pile d'authentification Coach).
 * Vérifie : accès réservé à un coach actif, publication seule, masquage des ressources sans accès réel (jamais
 * de 404 distinct d'un slug inconnu), aucune fuite de `formation-media`, et AUCUNE écriture (ni `view_count`,
 * ni favori, ni progression) — à la différence de l'API publique.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
}));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
const SUPABASE = "https://gteilnwnkeebgdgwrgvb.supabase.co";
const bucketUrl = (p: string) => `${SUPABASE}/storage/v1/object/public/mediatheque/${p}`;
const formationMediaUrl = (p: string) => `${SUPABASE}/storage/v1/object/public/formation-media/${p}`;

import { GET as listResources } from "./route";
import * as listModule from "./route";
import { GET as resourceDetail } from "./[slug]/route";
import * as detailModule from "./[slug]/route";

const COACH = "c0000000-0000-4000-8000-000000000001";
const MEMBER = "a0000001-0000-4000-8000-000000000000";
const CAT = "11111111-1111-4111-8111-000000000001";

/** `id` est toujours fourni explicitement par l'appelant (dans `over`) ; la valeur ci-dessous n'est qu'un repli. */
const resource = (over: Row = {}): Row => ({
  id: "r-unset",
  title: "Ressource", slug: "ressource", description: "Description", content: null, type: "guide",
  category_id: CAT, author: null, external_url: null, file_url: null, thumbnail_url: null, cover_url: null,
  duration: null, page_count: null, language: "fr", level: "beginner", status: "published", featured: false,
  recommended: false, view_count: 0, display_order: 0, created_at: "2026-01-01T00:00:00Z", ...over,
});

const PUB_VIDEO = resource({ id: "r-video", slug: "video-youtube", title: "Vidéo Youtube", type: "video", external_url: "https://www.youtube.com/watch?v=abc123", view_count: 5 });
const PUB_PDF = resource({ id: "r-pdf", slug: "guide-pdf", title: "Guide PDF", type: "pdf", file_url: bucketUrl("guides/x.pdf") });
const PUB_ARTICLE = resource({ id: "r-article", slug: "article-texte", title: "Article complet", type: "article", content: "Un contenu substantiel." });
const DRAFT = resource({ id: "r-draft", slug: "brouillon", title: "Brouillon", type: "pdf", file_url: bucketUrl("x.pdf"), status: "draft" });
const ARCHIVED = resource({ id: "r-archived", slug: "archive", title: "Archivé", type: "pdf", file_url: bucketUrl("x.pdf"), status: "archived" });
const LESSON = resource({
  id: "r-lesson", slug: "batir-sur-le-roc-1-1-entre-eloge-et-realite", title: "Leçon 1.1",
  type: "guide", external_url: "/dashboard/academie/batir-sur-le-roc/1-1",
  file_url: "/formation/batir-sur-le-roc/pdf/lecon-1-1.pdf", thumbnail_url: "/formation/batir-sur-le-roc/images/lecon-1-1-carte.webp",
});
const AUDIO_LEAK = resource({ id: "r-audio", slug: "audio-transcrit", title: "Audio transcrit", type: "audio", file_url: formationMediaUrl("audio/x.mp3"), content: "Transcription complète." });

function seed(caller: "coach" | "coach_suspended" | "member" | "anonymous" = "coach") {
  world.log.length = 0; world.failWhen = undefined;
  world.tables = {
    coach_accounts: [{ user_id: COACH, email: "coach@x.fr", display_name: "Coach Awa", active: caller !== "coach_suspended" }],
    profiles: [
      { id: COACH, status: caller === "coach_suspended" ? "suspended" : "approved", account_type: "coach", email: "coach@x.fr" },
      { id: MEMBER, status: "approved", account_type: "member", email: "membre@x.fr" },
    ],
    mediatheque_categories: [{ id: CAT, name: "Préparation", slug: "preparation", icon: null, color: "#486B46", is_active: true, sort_order: 0 }],
    mediatheque_resources: [PUB_VIDEO, PUB_PDF, PUB_ARTICLE, DRAFT, ARCHIVED, LESSON, AUDIO_LEAK],
    mediatheque_resource_tags: [{ resource_id: "r-video", tag_id: "tag-1" }],
    mediatheque_tags: [{ id: "tag-1", name: "Fondamentaux", slug: "fondamentaux" }],
  };
  world.user = caller === "anonymous" ? null : caller === "member" ? { id: MEMBER, email: "membre@x.fr" } : { id: COACH, email: "coach@x.fr" };
}

const listReq = (qs = "") => new NextRequest(`http://localhost/api/coach/mediatheque${qs}`, { headers: { authorization: "Bearer t" } });
const detailReq = (slug: string) => resourceDetail(new NextRequest(`http://localhost/api/coach/mediatheque/${slug}`, { headers: { authorization: "Bearer t" } }), { params: Promise.resolve({ slug }) });
const resourceRow = (id: string) => world.tables.mediatheque_resources.find((r) => r.id === id)!;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE); // valeur fixée explicitement, jamais celle (absente en CI) de .env.local
  seed();
});

describe("GET /api/coach/mediatheque — liste", () => {
  it("coach actif : seulement les ressources PUBLIÉES et consultables, jamais le brouillon, l'archive ni la leçon masquée", async () => {
    const res = await listResources(listReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    const slugs = body.resources.map((r: Row) => r.slug);
    expect(slugs).toEqual(expect.arrayContaining(["video-youtube", "guide-pdf", "article-texte", "audio-transcrit"]));
    expect(slugs).not.toContain("brouillon");
    expect(slugs).not.toContain("archive");
    expect(slugs).not.toContain("batir-sur-le-roc-1-1-entre-eloge-et-realite");
    expect(body.total).toBe(4);
  });

  it("jamais de référence à formation-media, même pour la ressource dont le fichier en vient (texte conservé, lien retiré)", async () => {
    const body = await (await listResources(listReq())).json();
    expect(JSON.stringify(body)).not.toContain("formation-media");
    const audio = body.resources.find((r: Row) => r.slug === "audio-transcrit");
    expect(audio.file_url).toBeNull();
    expect(audio.content).toBe("Transcription complète.");
  });

  it.each(["coach_suspended", "member", "anonymous"] as const)("%s : 403, aucune lecture de la médiathèque", async (caller) => {
    seed(caller);
    const res = await listResources(listReq());
    expect(res.status).toBe(403);
    expect(world.log.some((q) => q.table === "mediatheque_resources")).toBe(false);
  });

  it("filtre par type : seule la vidéo ressort", async () => {
    const body = await (await listResources(listReq("?type=video"))).json();
    expect(body.resources.map((r: Row) => r.slug)).toEqual(["video-youtube"]);
  });

  it("recherche : terme correspondant filtre, tentative d'injection neutralisée en texte inerte (aucune correspondance), recherche entièrement bloquée renvoie une liste VIDE", async () => {
    const hit = await (await listResources(listReq("?search=Youtube"))).json();
    expect(hit.resources.map((r: Row) => r.slug)).toEqual(["video-youtube"]);

    // La syntaxe de filtre est détruite (ponctuation retirée) : le texte inerte restant ne correspond à AUCUN
    // titre/description/auteur existant — jamais la liste complète, jamais une erreur de requête.
    const injection = await (await listResources(listReq(`?${new URLSearchParams({ search: ",status.eq.draft).or(id.neq.0" }).toString()}`))).json();
    expect(injection.resources).toEqual([]);

    // Recherche composée UNIQUEMENT de caractères réservés/jokers : neutralisée à vide → `blocked`, liste
    // explicitement renvoyée vide sans même interroger la base.
    const blocked = await (await listResources(listReq(`?${new URLSearchParams({ search: ",.()\"\\%_*" }).toString()}`))).json();
    expect(blocked.resources).toEqual([]);
    expect(blocked.total).toBe(0);
  });

  it("catégorie invalide (tentative d'injection) : ignorée sans erreur, comme « toutes »", async () => {
    const res = await listResources(listReq(`?${new URLSearchParams({ category: "'; drop table mediatheque_resources;--" }).toString()}`));
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(4);
  });

  it("pagination calculée APRÈS le masquage : le total n'inclut jamais une ressource cachée", async () => {
    const res = await listResources(listReq("?limit=2&page=1"));
    const body = await res.json();
    expect(body.total).toBe(4);
    expect(body.totalPages).toBe(2);
    expect(body.resources).toHaveLength(2);
  });

  it("étiquettes et catégorie jointes correctement (sans embed relationnel)", async () => {
    const body = await (await listResources(listReq())).json();
    const video = body.resources.find((r: Row) => r.slug === "video-youtube");
    expect(video.tags).toEqual([{ id: "tag-1", name: "Fondamentaux", slug: "fondamentaux" }]);
    expect(video.category).toEqual({ id: CAT, name: "Préparation", slug: "preparation", icon: null, color: "#486B46" });
  });

  it("AUCUNE écriture : view_count inchangé après consultation de la liste", async () => {
    await listResources(listReq());
    expect(resourceRow("r-video").view_count).toBe(5);
    expect(world.log.some((q) => q.op !== "select")).toBe(false);
  });

  it("panne de lecture : 500 générique", async () => {
    world.failWhen = (q) => (q.table === "mediatheque_resources" && q.op === "select" ? { message: "secret" } : null);
    const res = await listResources(listReq());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });

  it("n'expose que GET (aucune écriture possible par cette route)", () => {
    expect(Object.keys(listModule).filter((k) => /^(GET|POST|PATCH|DELETE|PUT)$/.test(k))).toEqual(["GET"]);
  });
});

describe("GET /api/coach/mediatheque/[slug] — détail", () => {
  it("ressource publiée et consultable : 200, avec les ressources liées de la même catégorie", async () => {
    const res = await detailReq("guide-pdf");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body.resource.slug).toBe("guide-pdf");
    expect(body.resource.file_url).toBe(bucketUrl("guides/x.pdf"));
    expect(body.related.map((r: Row) => r.slug)).toEqual(expect.arrayContaining(["video-youtube", "article-texte"]));
    expect(body.related.map((r: Row) => r.slug)).not.toContain("brouillon");
  });

  it.each(["brouillon", "archive", "slug-inconnu"])("brouillon, archivé et slug inconnu : MÊME 404 (%s)", async (slug) => {
    const res = await detailReq(slug);
    expect(res.status).toBe(404);
  });

  it("ressource masquée (leçon de l'Académie, déjà publiée) : 404 — JAMAIS distingué d'un slug inconnu", async () => {
    const masked = await detailReq("batir-sur-le-roc-1-1-entre-eloge-et-realite");
    const unknown = await detailReq("ne-correspond-a-rien");
    expect(masked.status).toBe(404);
    expect(await masked.json()).toEqual(await unknown.json());
  });

  it.each(["coach_suspended", "member", "anonymous"] as const)("%s : 403", async (caller) => {
    seed(caller);
    expect((await detailReq("guide-pdf")).status).toBe(403);
  });

  it("AUCUNE écriture : view_count inchangé après consultation du détail (contrairement à l'API publique)", async () => {
    await detailReq("video-youtube");
    await detailReq("video-youtube");
    expect(resourceRow("r-video").view_count).toBe(5);
    expect(world.log.every((q) => q.op === "select")).toBe(true);
  });

  it("jamais de référence à formation-media dans la réponse (texte conservé, lien retiré)", async () => {
    const body = await (await detailReq("audio-transcrit")).json();
    expect(body.resource.file_url).toBeNull();
    expect(body.resource.content).toBe("Transcription complète.");
    expect(JSON.stringify(body)).not.toContain("formation-media");
  });

  it("n'expose que GET", () => {
    expect(Object.keys(detailModule).filter((k) => /^(GET|POST|PATCH|DELETE|PUT)$/.test(k))).toEqual(["GET"]);
  });
});
