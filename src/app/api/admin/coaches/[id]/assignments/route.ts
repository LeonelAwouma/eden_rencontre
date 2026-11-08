import { NextRequest, NextResponse } from "next/server";
import { logAdminAction, requireAdmin, type AdminSession } from "@/lib/admin-auth";
import { clientIp } from "@/lib/api-auth";
import { isUuid, mapAssignmentError } from "@/lib/coach/assignment-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Attributions d'un coach (administration). Toutes les écritures passent par les fonctions SQL
 * transactionnelles : une attribution naît « pending » et ne devient « active » qu'après
 * l'acceptation du membre. L'historique n'est jamais supprimé.
 */

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function adminSession(): Promise<AdminSession | null> {
  try { return await requireAdmin(); } catch { return null; }
}
const adminLabel = (a: AdminSession) => a.email || a.adminId || "admin";

async function audit(admin: AdminSession, req: NextRequest, action: string, targetId: string, details?: Record<string, unknown>) {
  try { await logAdminAction(admin.adminId, admin.email, action, "user", targetId, details, clientIp(req)); } catch { /* non bloquant */ }
}

type Ctx = { params: Promise<{ id: string }> };

/** Historique des attributions du coach (sans recopier les profils : identifiant + pseudo seulement). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await adminSession())) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Paramètres invalides" }, 400);

  const db = getSupabaseAdmin();
  const { data, error } = await db.from("coach_member_assignments")
    .select("id, member_id, status, consent_status, assigned_by, assigned_at, consent_at, ended_at, end_reason")
    .eq("coach_id", id).order("assigned_at", { ascending: false }).limit(200);
  if (error) return json({ error: "Impossible de consulter les attributions" }, 500);

  const rows = data || [];
  const memberIds = [...new Set(rows.map((r) => r.member_id as string))];
  const pseudos = new Map<string, string | null>();
  if (memberIds.length) {
    const { data: profiles } = await db.from("profiles").select("id, pseudo").in("id", memberIds);
    for (const p of profiles || []) pseudos.set(p.id as string, (p.pseudo as string | null) ?? null);
  }
  const assignments = rows.map((r) => ({ ...r, member_pseudo: pseudos.get(r.member_id as string) ?? null }));
  return json({
    assignments,
    active_count: rows.filter((r) => r.status === "active").length,
    pending_count: rows.filter((r) => r.status === "pending").length,
  });
}

/** Attribue (ou réaffecte) un membre à ce coach : crée un dossier « pending ». Corps : { member_id }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!isUuid(id) || !isUuid(body?.member_id)) return json({ error: "Paramètres invalides" }, 400);

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("coach_assign_member", {
    p_coach: id, p_member: body.member_id, p_admin: adminLabel(admin),
  });
  if (error) {
    const failure = mapAssignmentError(error);
    return json({ error: failure.message, code: failure.code }, failure.status);
  }
  await audit(admin, req, "coach_assignment_proposed", id, { member_id: body.member_id, assignment_id: data });
  return json({ id: data, status: "pending", consent_status: "pending" }, 201);
}

/** Met fin à une attribution de ce coach. Corps : { assignment_id, reason? }. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await adminSession();
  if (!admin) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!isUuid(id) || !isUuid(body?.assignment_id)) return json({ error: "Paramètres invalides" }, 400);
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 200) : "admin_terminated";

  const db = getSupabaseAdmin();
  // L'attribution doit appartenir à CE coach (pas d'IDOR via l'URL).
  const { data: own, error: ownError } = await db.from("coach_member_assignments")
    .select("id").eq("id", body.assignment_id).eq("coach_id", id).maybeSingle();
  if (ownError) return json({ error: "Opération impossible pour le moment." }, 500);
  if (!own) return json({ error: "Attribution introuvable.", code: "not_found" }, 404);

  const { data, error } = await db.rpc("coach_end_assignment", {
    p_actor_kind: "admin", p_actor_id: adminLabel(admin), p_assignment: body.assignment_id, p_reason: reason,
  });
  if (error) {
    const failure = mapAssignmentError(error);
    return json({ error: failure.message, code: failure.code }, failure.status);
  }
  await audit(admin, req, "coach_assignment_ended", id, { assignment_id: body.assignment_id, result: data });
  return json({ status: data });
}
