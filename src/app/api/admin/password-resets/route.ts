import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { effectiveStatus, type ResetRequestRow } from "@/lib/password-reset-requests";

/**
 * GET /api/admin/password-resets — demandes de réinitialisation (récentes d'abord),
 * avec le nom, le pseudo et le numéro du membre. Le hachage du jeton n'est jamais renvoyé.
 */
export async function GET() {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from("password_reset_requests")
      .select("id, user_id, phone, status, note, decided_by, decided_at, expires_at, used_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      // Migration 20261111 non exécutée : liste vide plutôt qu'une erreur.
      if (error.code === "42P01") return NextResponse.json({ requests: [], migrationMissing: true });
      throw error;
    }

    const rows = (data ?? []) as ResetRequestRow[];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("id, name, pseudo, status").in("id", ids)
      : { data: [] as { id: string; name: string | null; pseudo: string | null; status: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    return NextResponse.json({
      requests: rows.map((r) => ({
        ...r,
        status: effectiveStatus(r),
        name: byId.get(r.user_id)?.name ?? null,
        pseudo: byId.get(r.user_id)?.pseudo ?? null,
        accountStatus: byId.get(r.user_id)?.status ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin password-resets list error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
