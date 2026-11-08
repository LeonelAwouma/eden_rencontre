import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadMemberActions } from "@/lib/coach/content-data";
import { toMemberActionDto, type MemberActionDto } from "@/lib/coach/content-dto";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** GET /api/member/coach/actions — actions VISIBLES du membre connecté (identité = session ; jamais d'ID envoyé). */
export async function GET(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  try {
    const { rows, coachNames } = await loadMemberActions(getSupabaseAdmin(), user.id);
    const actions = rows.map((r) => toMemberActionDto(r, coachNames.get(r.coach_id) ?? null)).filter((a): a is MemberActionDto => a !== null);
    return NextResponse.json({ actions }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Impossible de consulter les actions." }, { status: 500, headers: NO_STORE });
  }
}
