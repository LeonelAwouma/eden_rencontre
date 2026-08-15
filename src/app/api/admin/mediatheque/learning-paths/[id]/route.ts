import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();
    const body = await request.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of ["title", "slug", "description", "objective", "cover_url", "level", "estimated_duration", "sort_order", "status"]) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }
    if (body.status === "published") updateData.published_at = new Date().toISOString();

    const { data, error } = await db.from("mediatheque_learning_paths").update(updateData).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update resources if provided
    if (Array.isArray(body.resources)) {
      await db.from("mediatheque_learning_path_resources").delete().eq("learning_path_id", id);
      const rows = body.resources.map((r: { resource_id: string; sort_order?: number; is_required?: boolean }, i: number) => ({
        learning_path_id: id, resource_id: r.resource_id,
        sort_order: r.sort_order ?? i, is_required: r.is_required ?? true,
      }));
      if (rows.length > 0) await db.from("mediatheque_learning_path_resources").insert(rows);
    }

    return NextResponse.json({ ok: true, learning_path: data });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = getSupabaseAdmin();
    const { error } = await db.from("mediatheque_learning_paths").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}