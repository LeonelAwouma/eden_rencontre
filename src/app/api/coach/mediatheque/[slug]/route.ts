import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { notFound } from "@/lib/coach/lot3-api";
import { RESOURCE_COLUMNS, loadCategoriesByIds, loadResourceTags, toCoachResource, type CoachMediathequeResource } from "@/lib/coach/mediatheque";

const RELATED_LIMIT = 8;

/**
 * GET /api/coach/mediatheque/[slug] — détail d'une ressource publiée, pour un coach ACTIF uniquement.
 * Une ressource dont le seul accès enregistré est une page membre (leçons et histoires de l'Académie) répond
 * 404 — EXACTEMENT comme un slug inconnu : on ne révèle jamais qu'une ressource protégée existe.
 * Lecture seule : aucun incrément de `view_count` (contrairement à l'API publique).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withActiveCoach(req, async () => {
    const { slug } = await params;
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("mediatheque_resources").select(RESOURCE_COLUMNS).eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw new Error("coach mediatheque: detail failed");
    if (!data) return notFound();

    const [tags, categoriesById] = await Promise.all([
      loadResourceTags(db, [data.id as string]),
      loadCategoriesByIds(db, [data.category_id as string | null]),
    ]);
    const category = data.category_id ? categoriesById.get(data.category_id as string) ?? null : null;
    const resource = toCoachResource({ ...data, tags: tags.get(data.id as string) ?? [], category });
    if (!resource) return notFound();

    let related: CoachMediathequeResource[] = [];
    if (data.category_id) {
      const { data: rel } = await db.from("mediatheque_resources").select(RESOURCE_COLUMNS)
        .eq("category_id", data.category_id as string).eq("status", "published").neq("id", data.id as string).limit(RELATED_LIMIT);
      const rows = rel ?? [];
      const relTags = await loadResourceTags(db, rows.map((r) => r.id as string));
      related = rows
        .map((r) => toCoachResource({ ...r, tags: relTags.get(r.id as string) ?? [], category }))
        .filter((r): r is CoachMediathequeResource => r !== null)
        .slice(0, 4);
    }
    return coachJson({ resource, related });
  });
}
