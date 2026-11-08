import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadMemberSessions } from "@/lib/coach/sessions-data";
import { toMemberSessionDto } from "@/lib/coach/sessions-dto";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/member/coach/sessions — les séances du membre connecté, en LECTURE SEULE.
 * L'identité vient UNIQUEMENT de la session (aucun paramètre ne désigne un autre membre). Le membre garde tout son
 * historique ; les séances « scheduled » d'une attribution qui n'est plus active sont masquées.
 */
export async function GET(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  try {
    const { rows, coachNames } = await loadMemberSessions(getSupabaseAdmin(), user.id);
    return NextResponse.json({ sessions: rows.map((r) => toMemberSessionDto(r, coachNames.get(r.coach_id) ?? null)) }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Impossible de consulter les séances." }, { status: 500, headers: NO_STORE });
  }
}
