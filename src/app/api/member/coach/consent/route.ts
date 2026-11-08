import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { isUuid, mapAssignmentError } from "@/lib/coach/assignment-errors";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * POST /api/member/coach/consent — { assignment_id, accept }.
 * Le membre vient de la session ; le corps ne peut PAS désigner un autre membre (aucun member_id lu).
 * La fonction SQL vérifie que l'attribution appartient à ce membre (sinon 404).
 */
export async function POST(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });

  const body = await req.json().catch(() => null);
  if (!isUuid(body?.assignment_id) || typeof body?.accept !== "boolean") {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400, headers: NO_STORE });
  }

  const { data, error } = await getSupabaseAdmin().rpc("coach_respond_assignment", {
    p_member: user.id, p_assignment: body.assignment_id, p_accept: body.accept,
  });
  if (error) {
    const failure = mapAssignmentError(error);
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status, headers: NO_STORE });
  }
  return NextResponse.json({ status: data }, { headers: NO_STORE });
}
