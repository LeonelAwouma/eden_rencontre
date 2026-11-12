import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseCategoryFilter, parseLevelFilter, parseLimit, parsePage, parseResourceSearch, parseSort, parseTypeFilter,
  safeExternalUrl, safeMediaFileUrl, searchOrFilter, toCoachResource,
} from "./mediatheque";
import { extractEmbedUrl } from "@/lib/mediatheque/embed";

// Valeurs fixées explicitement (jamais celles, potentiellement absentes, de .env.local en CI).
const SUPABASE = "https://gteilnwnkeebgdgwrgvb.supabase.co";
const SITE = "https://www.gardenofalliance.com";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
});
const bucketUrl = (path: string) => `${SUPABASE}/storage/v1/object/public/mediatheque/${path}`;

describe("parseResourceSearch : jamais injectée telle quelle dans .or()", () => {
  it("vide ou absente : pas de filtre", () => {
    expect(parseResourceSearch(null)).toEqual({ kind: "none" });
    expect(parseResourceSearch("   ")).toEqual({ kind: "none" });
    expect(parseResourceSearch(undefined)).toEqual({ kind: "none" });
  });

  it("garde lettres accentuées, chiffres, espace, apostrophe, trait d'union ; normalise les espaces et la longueur", () => {
    expect(parseResourceSearch("l'Évangile de Jean 3-16")).toEqual({ kind: "term", value: "l'Évangile de Jean 3-16" });
    expect(parseResourceSearch("  trop   d'espaces  ")).toEqual({ kind: "term", value: "trop d'espaces" });
    expect(parseResourceSearch("a".repeat(200))).toEqual({ kind: "term", value: "a".repeat(80) });
  });

  it.each([
    "','.eq.x", "a,b", "a)b", "a(b", "a.b", "a:b", 'a"b', "a\\b", "a%b", "a_b", "a*b", ",status.eq.draft",
  ])("neutralise chaque caractère réservé PostgREST ou joker : %s", (raw) => {
    const r = parseResourceSearch(raw);
    expect(r.kind).not.toBe("none");
    if (r.kind === "term") expect(r.value).not.toMatch(/[,()."\\:%_*]/);
  });

  it("recherche entièrement composée de caractères réservés : BLOQUÉE (liste vide), jamais « tout »", () => {
    expect(parseResourceSearch(",.()\"\\%_*")).toEqual({ kind: "blocked" });
    expect(parseResourceSearch("*")).toEqual({ kind: "blocked" });
    expect(parseResourceSearch(",status.eq.draft).or(id.neq.0")).not.toEqual({ kind: "none" });
  });

  it("searchOrFilter : jamais de virgule, de parenthèse ni de point dans le terme produit", () => {
    const term = "jean 3 seize";
    const expr = searchOrFilter(term);
    expect(expr).toBe(`title.ilike.*${term}*,description.ilike.*${term}*,author.ilike.*${term}*`);
    expect(term).not.toMatch(/[,()."\\:%_*]/);
  });
});

describe("filtres bornés par liste blanche", () => {
  it("type, niveau, catégorie : seules les valeurs connues passent, 'all' et inconnu → null", () => {
    expect(parseTypeFilter("video")).toBe("video");
    expect(parseTypeFilter("all")).toBeNull();
    expect(parseTypeFilter("<script>")).toBeNull();
    expect(parseLevelFilter("advanced")).toBe("advanced");
    expect(parseLevelFilter("expert")).toBeNull();
    expect(parseCategoryFilter("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111");
    expect(parseCategoryFilter("'; drop table")).toBeNull();
  });

  it("sort : liste fermée, repli sur 'newest'", () => {
    expect(parseSort("popular")).toBe("popular");
    expect(parseSort("n'importe quoi")).toBe("newest");
    expect(parseSort(null)).toBe("newest");
  });

  it("page et limite : entiers bornés", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("99999")).toBe(1);
    expect(parseLimit("24")).toBe(24);
    expect(parseLimit("25")).toBe(12);
    expect(parseLimit("0")).toBe(12);
  });
});

describe("safeExternalUrl", () => {
  it("accepte une adresse externe HTTPS sans identifiants", () => {
    expect(safeExternalUrl("https://www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("refuse http, javascript:, données inline, identifiants dans l'URL", () => {
    expect(safeExternalUrl("http://example.com/x")).toBeNull();
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("https://user:pass@evil.com/x")).toBeNull();
  });

  it("refuse tout chemin interne : relatif, protocole-relatif, ou domaine du site lui-même", () => {
    expect(safeExternalUrl("/dashboard/academie/batir-sur-le-roc/1-1")).toBeNull();
    expect(safeExternalUrl("//evil.com/x")).toBeNull();
    expect(safeExternalUrl("https://www.gardenofalliance.com/dashboard/x")).toBeNull();
  });

  it("refuse un lien interne encodé, même sans barre oblique en tête", () => {
    expect(safeExternalUrl("%2Fdashboard%2Facademie%2Fbatir-sur-le-roc%2F1-1")).toBeNull();
    expect(safeExternalUrl("%2Fformation%2Fsecret.pdf")).toBeNull();
  });

  it("types invalides et chaînes vides", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
    expect(safeExternalUrl(42)).toBeNull();
    expect(safeExternalUrl(["https://x.com"])).toBeNull();
  });
});

describe("safeMediaFileUrl : UNIQUEMENT le bucket public mediatheque", () => {
  it("accepte une URL publique du bucket mediatheque", () => {
    expect(safeMediaFileUrl(bucketUrl("guides/lecon.pdf"))).toBe(bucketUrl("guides/lecon.pdf"));
  });

  it("refuse le bucket privé formation-media, même signé", () => {
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/public/formation-media/x.pdf`)).toBeNull();
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/sign/formation-media/x.pdf?token=abc`)).toBeNull();
  });

  it("refuse tout autre bucket (chat-images, registration-media, un bucket nommé 'mediatheque-privee')", () => {
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/public/chat-images/avatars/x.png`)).toBeNull();
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/public/registration-media/x.jpg`)).toBeNull();
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/public/mediatheque-privee/x.pdf`)).toBeNull();
  });

  it("refuse un chemin statique /formation/... (jamais garanti public, hors de ce bucket)", () => {
    expect(safeMediaFileUrl("/formation/batir-sur-le-roc/pdf/lecon-2-1.pdf")).toBeNull();
    expect(safeMediaFileUrl("/formation/histoires/x.webp")).toBeNull();
  });

  it("refuse un autre hôte (même avec le bon chemin), une traversée '..' et une URL sans protocole https", () => {
    expect(safeMediaFileUrl("https://evil.com/storage/v1/object/public/mediatheque/x.pdf")).toBeNull();
    expect(safeMediaFileUrl(`${SUPABASE}/storage/v1/object/public/mediatheque/..%2Fformation-media/x.pdf`)).toBeNull();
    expect(safeMediaFileUrl(`http://${SUPABASE.replace("https://", "")}/storage/v1/object/public/mediatheque/x.pdf`)).toBeNull();
  });

  it("refuse les identifiants dans l'URL et les types invalides", () => {
    expect(safeMediaFileUrl(`https://user:pass@gteilnwnkeebgdgwrgvb.supabase.co/storage/v1/object/public/mediatheque/x.pdf`)).toBeNull();
    expect(safeMediaFileUrl(null)).toBeNull();
    expect(safeMediaFileUrl(123)).toBeNull();
  });
});

describe("toCoachResource : masquage des ressources sans contenu consultable", () => {
  const base = {
    id: "r1", title: "Titre", slug: "titre", description: "Desc", content: null, type: "guide", category_id: null,
    author: null, duration: null, page_count: null, language: "fr", level: "beginner", featured: false, view_count: 0,
    external_url: null, file_url: null, thumbnail_url: null, cover_url: null, category: null, tags: [],
  };

  it("masque une leçon « Bâtir sur le roc » : lien interne + fichier statique /formation/..., aucun texte", () => {
    const row = { ...base, external_url: "/dashboard/academie/batir-sur-le-roc/1-1", file_url: "/formation/batir-sur-le-roc/pdf/lecon-1-1.pdf", thumbnail_url: "/formation/batir-sur-le-roc/images/lecon-1-1-carte.webp" };
    expect(toCoachResource(row)).toBeNull();
  });

  it("masque une histoire de l'Académie : même schéma (external_url interne, cover statique, pas de contenu)", () => {
    const row = { ...base, type: "book", external_url: "/dashboard/academie/histoires/x", cover_url: "/formation/histoires/x.webp" };
    expect(toCoachResource(row)).toBeNull();
  });

  it("expose une ressource avec un lien externe sûr (vidéo YouTube)", () => {
    const row = { ...base, type: "video", external_url: "https://www.youtube.com/watch?v=abc123" };
    expect(toCoachResource(row)?.external_url).toBe("https://www.youtube.com/watch?v=abc123");
  });

  it("expose une ressource avec un fichier du bucket public mediatheque", () => {
    const row = { ...base, type: "pdf", file_url: bucketUrl("guides/x.pdf") };
    expect(toCoachResource(row)?.file_url).toBe(bucketUrl("guides/x.pdf"));
  });

  it("expose un article avec seulement du texte (ni lien, ni fichier)", () => {
    const row = { ...base, type: "article", content: "Un texte substantiel." };
    expect(toCoachResource(row)?.content).toBe("Un texte substantiel.");
  });

  it("une ressource externe (type 'external') suit la même règle : lien externe requis", () => {
    expect(toCoachResource({ ...base, type: "external", external_url: "/dashboard/x" })).toBeNull();
    expect(toCoachResource({ ...base, type: "external", external_url: "https://example.org/article" })?.external_url).toBe("https://example.org/article");
  });

  it("jamais de formation-media dans la réponse, même si file_url le pointe directement", () => {
    const row = { ...base, type: "audio", file_url: `${SUPABASE}/storage/v1/object/public/formation-media/audio/x.mp3`, content: "transcription" };
    const out = toCoachResource(row);
    expect(out).not.toBeNull();
    expect(out!.file_url).toBeNull();
    expect(JSON.stringify(out)).not.toContain("formation-media");
  });
});

describe("extractEmbedUrl : lecteur intégré, domaines autorisés uniquement", () => {
  it("YouTube et Vimeo reconnus", () => {
    expect(extractEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ type: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    expect(extractEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toEqual({ type: "youtube", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
    expect(extractEmbedUrl("https://vimeo.com/123456789")).toEqual({ type: "vimeo", embedUrl: "https://player.vimeo.com/video/123456789" });
  });

  it("refuse tout autre domaine, même si l'URL contient « youtube.com » ailleurs que dans l'hôte", () => {
    expect(extractEmbedUrl("https://evil.com/?u=youtube.com/watch?v=x")).toBeNull();
    expect(extractEmbedUrl("https://youtube.com.evil.com/watch?v=x")).toBeNull();
    expect(extractEmbedUrl("https://dailymotion.com/video/x")).toBeNull();
    expect(extractEmbedUrl(null)).toBeNull();
  });
});
