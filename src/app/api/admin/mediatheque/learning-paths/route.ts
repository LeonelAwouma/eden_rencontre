import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FORMATION_COVER_SRC } from "@/lib/formation/paths";

/**
 * Couverture de la formation « Bâtir sur le roc » : FORMATION_COVER_SRC.
 * Tant que 20261006_batir_sur_le_roc_cover_webp.sql n'a pas été exécutée, la
 * base peut encore pointer vers /batir_roc.png ou /batir_roc.webp (fichiers
 * supprimés), ou n'avoir aucune image.
 */
const LEGACY_FORMATION_COVERS = ["/batir_roc.png", "/batir_roc.webp"];
function formationCover(slug: string | null, cover: string | null): string | null {
  if (slug?.startsWith("batir-sur-le-roc") && (!cover || LEGACY_FORMATION_COVERS.includes(cover))) return FORMATION_COVER_SRC;
  return cover;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const withSteps = new URL(request.url).searchParams.get("steps") === "1";
    const { data, error } = await db.from("mediatheque_learning_paths").select("*").order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Étapes de tous les parcours en une requête (au lieu d'un comptage par parcours).
    const paths = data || [];
    const { data: links } = await db.from("mediatheque_learning_path_resources")
      .select("learning_path_id, resource_id, sort_order, is_required")
      .order("sort_order").order("created_at");

    // Avec ?steps=1 : chaque parcours porte ses leçons, dans l'ordre.
    let resourcesById = new Map<string, Record<string, unknown>>();
    if (withSteps && links && links.length > 0) {
      const { data: resources } = await db.from("mediatheque_resources")
        .select("id, title, slug, type, status, author, thumbnail_url, featured, view_count, duration, created_at, published_at, updated_at, category:mediatheque_categories(id,name,slug,icon,color)")
        .in("id", [...new Set(links.map((l) => l.resource_id))]);
      resourcesById = new Map((resources || []).map((r) => [r.id as string, r as Record<string, unknown>]));
    }

    const result = paths.map((path) => {
      const own = (links || []).filter((l) => l.learning_path_id === path.id);
      return {
        ...path,
        cover_url: formationCover(path.slug, path.cover_url),
        resource_count: own.length,
        ...(withSteps ? {
          steps: own.flatMap((l, i) => {
            const r = resourcesById.get(l.resource_id);
            return r ? [{ ...r, step: i + 1, is_required: l.is_required ?? true }] : [];
          }),
        } : {}),
      };
    });

    return NextResponse.json({ learning_paths: result });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const body = await request.json();
    const { title, slug, description, objective, cover_url, level, estimated_duration, sort_order, status } = body;
    if (!title || !slug) return NextResponse.json({ error: "Titre et slug requis." }, { status: 400 });

    const { data, error } = await db.from("mediatheque_learning_paths").insert({
      title, slug, description: description || "", objective: objective || null,
      cover_url: cover_url || null, level: level || "beginner",
      estimated_duration: estimated_duration || null, sort_order: sort_order || 0,
      status: status || "draft",
      published_at: status === "published" ? new Date().toISOString() : null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, learning_path: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}