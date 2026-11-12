import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import {
  MEDIATHEQUE_READ_CAP, RESOURCE_COLUMNS, loadActiveCategories, loadCategoriesByIds, loadResourceTags, parseCategoryFilter,
  parseLevelFilter, parseLimit, parsePage, parseResourceSearch, parseSort, parseTypeFilter, searchOrFilter, toCoachResource,
  type CoachMediathequeResource,
} from "@/lib/coach/mediatheque";

/**
 * GET /api/coach/mediatheque — ressources PUBLIÉES de la médiathèque générale, pour un coach ACTIF uniquement
 * (`withActiveCoach`). Lecture seule stricte : aucune écriture, et surtout AUCUN incrément de `view_count`
 * (contrairement à l'API publique /api/mediatheque, dont les statistiques ne doivent refléter que les membres).
 *
 * Les ressources sont lues puis filtrées en mémoire (`toCoachResource`, masque les ressources sans contenu
 * consultable hors de l'espace membre) AVANT la pagination : le total annoncé ne compte jamais une ressource
 * masquée.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async () => {
    const db = getSupabaseAdmin();
    const url = new URL(req.url);
    const page = parsePage(url.searchParams.get("page"));
    const limit = parseLimit(url.searchParams.get("limit"));
    const type = parseTypeFilter(url.searchParams.get("type"));
    const level = parseLevelFilter(url.searchParams.get("level"));
    const category = parseCategoryFilter(url.searchParams.get("category"));
    const sort = parseSort(url.searchParams.get("sort"));
    const search = parseResourceSearch(url.searchParams.get("search"));
    const categories = await loadActiveCategories(db);

    if (search.kind === "blocked") {
      return coachJson({ resources: [], total: 0, page: 1, limit, totalPages: 0, categories });
    }

    let query = db.from("mediatheque_resources").select(RESOURCE_COLUMNS).eq("status", "published");
    if (type) query = query.eq("type", type);
    if (category) query = query.eq("category_id", category);
    if (level) query = query.eq("level", level);
    if (search.kind === "term") query = query.or(searchOrFilter(search.value));
    switch (sort) {
      case "popular": query = query.order("view_count", { ascending: false }); break;
      case "recommended": query = query.order("recommended", { ascending: false }).order("created_at", { ascending: false }); break;
      default: query = query.order("created_at", { ascending: false });
    }
    const { data, error } = await query.limit(MEDIATHEQUE_READ_CAP);
    if (error) throw new Error("coach mediatheque: list failed");

    const rows = data ?? [];
    const [tagsByResource, categoriesById] = await Promise.all([
      loadResourceTags(db, rows.map((r) => r.id as string)),
      loadCategoriesByIds(db, rows.map((r) => r.category_id as string | null)),
    ]);
    const visible = rows
      .map((r) => toCoachResource({
        ...r,
        tags: tagsByResource.get(r.id as string) ?? [],
        category: r.category_id ? categoriesById.get(r.category_id as string) ?? null : null,
      }))
      .filter((r): r is CoachMediathequeResource => r !== null);

    const total = visible.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    return coachJson({ resources: visible.slice(offset, offset + limit), total, page: safePage, limit, totalPages, categories });
  });
}
