import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { isUuid, mapAssignmentError } from "@/lib/coach/assignment-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * POST /api/member/coach/stop — { assignment_id, reason? } : le membre retire son consentement.
 * Le dossier devient « revoked » : le coach perd immédiatement l'accès (coach_can_access_member).
 * Identité = session uniquement ; propriété vérifiée dans la fonction SQL (sinon 404).
 */
export async function POST(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });

  const body = await req.json().catch(() => null);
  if (!isUuid(body?.assignment_id)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: NO_STORE });
  }
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 200) : "member_request";

  const { data, error } = await getSupabaseAdmin().rpc("coach_end_assignment", {
    p_actor_kind: "member", p_actor_id: user.id, p_assignment: body.assignment_id, p_reason: reason,
  });
  if (error) {
    const failure = mapAssignmentError(error);
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status, headers: NO_STORE });
  }
  return NextResponse.json({ status: data }, { headers: NO_STORE });
}
