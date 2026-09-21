import type { SupabaseClient } from "@supabase/supabase-js";

/** Place d'une ressource dans un parcours, telle que l'édite le formulaire admin. */
export interface PathMembership {
  learning_path_id: string;
  /** Index (base 0) parmi les autres étapes du parcours, cette ressource exclue. */
  position: number;
  is_required: boolean;
}

const TABLE = "mediatheque_learning_path_resources";

/** Parcours d'une ressource, avec sa position calculée hors d'elle-même. */
export async function getResourceMemberships(db: SupabaseClient, resourceId: string): Promise<PathMembership[]> {
  const { data: own } = await db.from(TABLE).select("learning_path_id, is_required").eq("resource_id", resourceId);
  if (!own || own.length === 0) return [];

  const { data: all } = await db.from(TABLE).select("learning_path_id, resource_id, sort_order")
    .in("learning_path_id", own.map((l) => l.learning_path_id))
    .order("sort_order").order("created_at");

  return own.map((l) => {
    const steps = (all || []).filter((s) => s.learning_path_id === l.learning_path_id);
    return {
      learning_path_id: l.learning_path_id,
      position: Math.max(0, steps.findIndex((s) => s.resource_id === resourceId)),
      is_required: l.is_required ?? true,
    };
  });
}

/**
 * Aligne les parcours d'une ressource sur `memberships` : retire la ressource
 * des parcours absents, l'insère à la position demandée dans les autres, puis
 * renumérote chaque parcours touché (sort_order = 0, 1, 2…).
 */
export async function syncResourcePaths(db: SupabaseClient, resourceId: string, memberships: PathMembership[]) {
  const wanted = new Map<string, PathMembership>();
  for (const m of memberships) if (m?.learning_path_id) wanted.set(m.learning_path_id, m);

  const { data: current } = await db.from(TABLE).select("learning_path_id").eq("resource_id", resourceId);
  const removed = (current || []).map((l) => l.learning_path_id).filter((id) => !wanted.has(id));
  const touched = [...new Set([...removed, ...wanted.keys()])];
  if (touched.length === 0) return;

  if (removed.length > 0) {
    await db.from(TABLE).delete().eq("resource_id", resourceId).in("learning_path_id", removed);
  }

  const { data: links } = await db.from(TABLE).select("learning_path_id, resource_id, sort_order, is_required")
    .in("learning_path_id", touched).order("sort_order").order("created_at");

  const rows: { learning_path_id: string; resource_id: string; sort_order: number; is_required: boolean }[] = [];
  for (const pathId of touched) {
    const others = (links || []).filter((l) => l.learning_path_id === pathId && l.resource_id !== resourceId);
    const ordered = others.map((l) => ({ resource_id: l.resource_id as string, is_required: l.is_required ?? true }));
    const m = wanted.get(pathId);
    if (m) {
      const at = Math.min(Math.max(0, Math.floor(m.position) || 0), ordered.length);
      ordered.splice(at, 0, { resource_id: resourceId, is_required: m.is_required !== false });
    }
    ordered.forEach((o, i) => rows.push({ learning_path_id: pathId, resource_id: o.resource_id, sort_order: i, is_required: o.is_required }));
  }

  if (rows.length > 0) {
    const { error } = await db.from(TABLE).upsert(rows, { onConflict: "learning_path_id,resource_id" });
    if (error) throw new Error(error.message);
  }
}
