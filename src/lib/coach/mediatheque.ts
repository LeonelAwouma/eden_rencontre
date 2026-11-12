// Médiathèque générale consultée en LECTURE SEULE par un coach actif — jamais d'écriture (ni favori, ni
// progression, ni incrément de vue), jamais de brouillon, jamais de lien vers un contenu réservé aux membres.
//
// Les ressources « Bâtir sur le roc » et les histoires de l'Académie sont déjà des entrées de cette table
// (voir supabase/migrations/20260922_*, 20261006_*, 20261018_*) : leur seul point d'accès enregistré est une
// page membre (`external_url` commençant par `/dashboard/...`). Elles sont déjà consultables par le coach via
// /coach/academie ; ici elles sont simplement MASQUÉES (jamais de lien cassé ni d'indice de leur existence).

import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { LEVEL_CONFIG, RESOURCE_TYPE_CONFIG, type ResourceLevel, type ResourceType } from "@/lib/mediatheque";
import { isUuid } from "@/lib/coach/assignment-errors";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const MEDIATHEQUE_READ_CAP = 500;
export const MEDIATHEQUE_DEFAULT_LIMIT = 12;
export const MEDIATHEQUE_MAX_LIMIT = 24;

/**
 * Colonnes explicites — jamais `select("*")` (src/lib/coach/no-select-star.test.ts). Pas d'embed relationnel
 * (`category:mediatheque_categories(...)`) : la catégorie est chargée à part (`loadCategoriesByIds`), comme le
 * reste du code Coach joint ses données (listes blanches, jamais de jointure implicite).
 * Un littéral UNIQUE (jamais une concaténation) : `+` élargirait le type en `string` et casserait l'inférence
 * de la méthode `select` côté client Supabase (comme REPORT_COLUMNS / ACTION_COLUMNS dans content-dto.ts).
 */
export const RESOURCE_COLUMNS = "id, title, slug, description, content, type, category_id, author, external_url, file_url, thumbnail_url, cover_url, duration, page_count, language, level, featured, view_count, created_at";

export interface CoachMediathequeResource {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** Texte de la ressource (type « article », « guide »…) ; distinct d'un lien externe ou d'un fichier. */
  content: string | null;
  type: ResourceType;
  author: string | null;
  duration: string | null;
  page_count: number | null;
  level: ResourceLevel;
  language: string;
  category: CategoryDto | null;
  tags: { id: string; name: string; slug: string }[];
  /** Déjà validées (safeMediaFileUrl) : jamais une URL du bucket privé `formation-media` ni d'un autre bucket. */
  thumbnail_url: string | null;
  cover_url: string | null;
  file_url: string | null;
  /** Déjà validé (safeExternalUrl) : jamais un chemin interne (`/dashboard/...`, `/formation/...`). */
  external_url: string | null;
  featured: boolean;
  view_count: number;
}

type CategoryDto = { id: string; name: string; slug: string; icon: string | null; color: string };
type RawResourceRow = Record<string, unknown> & {
  tags?: { id: string; name: string; slug: string }[];
  category?: CategoryDto | null;
};

// ── Recherche : jamais injectée telle quelle dans .or() ──────────────────────

export type SearchFilter = { kind: "none" } | { kind: "blocked" } | { kind: "term"; value: string };
const SEARCH_MAX_LEN = 80;
/** Lettres (y compris accentuées), chiffres, espace, apostrophe, trait d'union : rien d'autre ne passe. Exclut
 * donc toujours les caractères réservés PostgREST (`, ( ) . : "` \`) et les jokers (`% _ *`). */
const SEARCH_DISALLOWED = /[^\p{L}\p{N} '-]/gu;

export function parseResourceSearch(raw: string | null | undefined): SearchFilter {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { kind: "none" };
  const cleaned = trimmed.replace(SEARCH_DISALLOWED, "").replace(/\s+/g, " ").trim().slice(0, SEARCH_MAX_LEN);
  // Une recherche non vide entièrement neutralisée (ex. uniquement des caractères de syntaxe) renvoie une
  // liste VIDE — jamais « tout » : l'appelant ne doit pas interroger la base dans ce cas.
  return cleaned ? { kind: "term", value: cleaned } : { kind: "blocked" };
}

/** Filtre `.or()` : le terme ne contient, par construction, aucune virgule ni parenthèse ni point. */
export function searchOrFilter(term: string): string {
  return `title.ilike.*${term}*,description.ilike.*${term}*,author.ilike.*${term}*`;
}

// ── Filtres bornés par liste blanche ──────────────────────────────────────────

const TYPE_VALUES = new Set(Object.keys(RESOURCE_TYPE_CONFIG));
const LEVEL_VALUES = new Set(Object.keys(LEVEL_CONFIG));
const SORT_VALUES = new Set(["newest", "popular", "recommended"]);
export type ResourceSort = "newest" | "popular" | "recommended";

export const parsePage = (raw: string | null): number => {
  const n = Number(raw ?? "1");
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
};
export const parseLimit = (raw: string | null): number => {
  const n = Number(raw ?? String(MEDIATHEQUE_DEFAULT_LIMIT));
  return Number.isInteger(n) && n >= 1 && n <= MEDIATHEQUE_MAX_LIMIT ? n : MEDIATHEQUE_DEFAULT_LIMIT;
};
export const parseTypeFilter = (raw: string | null): ResourceType | null =>
  raw && raw !== "all" && TYPE_VALUES.has(raw) ? (raw as ResourceType) : null;
export const parseLevelFilter = (raw: string | null): ResourceLevel | null =>
  raw && raw !== "all" && LEVEL_VALUES.has(raw) ? (raw as ResourceLevel) : null;
export const parseCategoryFilter = (raw: string | null): string | null => (raw && isUuid(raw) ? raw : null);
export const parseSort = (raw: string | null): ResourceSort => (raw && SORT_VALUES.has(raw) ? (raw as ResourceSort) : "newest");

// ── Sécurité des liens et fichiers ────────────────────────────────────────────

const decodeMaybe = (s: string): string => { try { return decodeURIComponent(s); } catch { return s; } };
/** Un chemin relatif — même encodé (`%2Fdashboard…`) — appartient TOUJOURS à l'application, jamais à l'extérieur. */
const isRelativePath = (raw: string): boolean => [raw, decodeMaybe(raw)].some((s) => s.trim().startsWith("/"));

function siteHostname(): string | null {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.gardenofalliance.com").hostname; } catch { return null; }
}

/**
 * URL externe sûre (lien « ouvrir », lecteur intégré) : HTTPS obligatoire, sans identifiants dans l'URL, et qui
 * ne pointe pas vers le site lui-même (un chemin interne n'est jamais une ressource « externe »).
 */
export function safeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || isRelativePath(trimmed)) return null;
  let u: URL;
  try { u = new URL(trimmed); } catch { return null; }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  const site = siteHostname();
  if (site && u.hostname === site) return null;
  return u.toString();
}

/**
 * Fichier sûr (image, PDF, audio…) : UNIQUEMENT une URL du bucket PUBLIC `mediatheque` du projet Supabase
 * (`/storage/v1/object/public/mediatheque/…`). Toute autre provenance — bucket privé `formation-media`, un
 * autre bucket, un chemin statique `/formation/...`, une URL signée — est refusée.
 */
export function safeMediaFileUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try { u = new URL(trimmed); } catch { return null; } // chemin relatif (/formation/...) : jamais un fichier du bucket
  if (u.protocol !== "https:" || u.username || u.password) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseHost: string | null = null;
  try { supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null; } catch { supabaseHost = null; }
  if (!supabaseHost || u.hostname !== supabaseHost) return null;

  const path = decodeMaybe(u.pathname);
  if (path.includes("..")) return null;
  const marker = "/storage/v1/object/public/mediatheque/";
  if (!path.startsWith(marker) || path.length <= marker.length) return null;
  return u.toString();
}

/**
 * DTO final : liens et fichiers validés, et la ressource est entièrement MASQUÉE (retourne `null`) si elle n'a
 * plus aucun moyen de consultation hors de l'espace membre (ni lien externe valide, ni fichier du bucket
 * public, ni texte) — jamais une fiche vide qui révélerait l'existence d'un contenu protégé.
 */
export function toCoachResource(row: RawResourceRow): CoachMediathequeResource | null {
  const externalUrl = safeExternalUrl(row.external_url);
  const fileUrl = safeMediaFileUrl(row.file_url);
  const thumbnailUrl = safeMediaFileUrl(row.thumbnail_url);
  const coverUrl = safeMediaFileUrl(row.cover_url);
  const content = typeof row.content === "string" && row.content.trim() !== "" ? row.content : null;
  if (!externalUrl && !fileUrl && !content) return null;

  const category = row.category ?? null;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    description: String(row.description ?? ""),
    content,
    type: row.type as ResourceType,
    author: typeof row.author === "string" ? row.author : null,
    duration: typeof row.duration === "string" ? row.duration : null,
    page_count: typeof row.page_count === "number" ? row.page_count : null,
    level: row.level as ResourceLevel,
    language: typeof row.language === "string" ? row.language : "fr",
    category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    thumbnail_url: thumbnailUrl,
    cover_url: coverUrl,
    file_url: fileUrl,
    external_url: externalUrl,
    featured: row.featured === true,
    view_count: typeof row.view_count === "number" ? row.view_count : 0,
  };
}

/**
 * Étiquettes de plusieurs ressources, en DEUX lectures à colonnes explicites — jamais d'embed relationnel ni
 * `select("*")` — puis jointes en mémoire (même méthode que `loadCategoriesByIds`).
 */
export async function loadResourceTags(db: Db, resourceIds: string[]): Promise<Map<string, { id: string; name: string; slug: string }[]>> {
  const out = new Map<string, { id: string; name: string; slug: string }[]>();
  const ids = [...new Set(resourceIds)];
  if (ids.length === 0) return out;

  const { data: links } = await db.from("mediatheque_resource_tags").select("resource_id, tag_id").in("resource_id", ids);
  const rows = (links ?? []) as { resource_id: string; tag_id: string }[];
  if (rows.length === 0) return out;

  const tagIds = [...new Set(rows.map((l) => l.tag_id))];
  const { data: tags } = await db.from("mediatheque_tags").select("id,name,slug").in("id", tagIds);
  const tagById = new Map(((tags ?? []) as { id: string; name: string; slug: string }[]).map((t) => [t.id, t]));

  for (const link of rows) {
    const tag = tagById.get(link.tag_id);
    if (!tag) continue;
    const list = out.get(link.resource_id) ?? [];
    list.push(tag);
    out.set(link.resource_id, list);
  }
  return out;
}

export async function loadActiveCategories(db: Db): Promise<{ id: string; name: string; slug: string; icon: string | null }[]> {
  const { data } = await db.from("mediatheque_categories").select("id,name,slug,icon").eq("is_active", true).order("sort_order");
  return (data ?? []) as { id: string; name: string; slug: string; icon: string | null }[];
}

/** Catégories d'une liste de ressources, chargées à part (pas d'embed relationnel). */
export async function loadCategoriesByIds(db: Db, categoryIds: (string | null)[]): Promise<Map<string, CategoryDto>> {
  const out = new Map<string, CategoryDto>();
  const ids = [...new Set(categoryIds.filter((id): id is string => !!id))];
  if (ids.length === 0) return out;
  const { data } = await db.from("mediatheque_categories").select("id,name,slug,icon,color").in("id", ids);
  for (const c of (data ?? []) as CategoryDto[]) out.set(c.id, c);
  return out;
}
