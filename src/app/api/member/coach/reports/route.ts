import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadMemberReports } from "@/lib/coach/content-data";
import { toMemberReportDto, type MemberReportDto } from "@/lib/coach/content-dto";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/member/coach/reports — comptes rendus PUBLIÉS adressés au membre connecté.
 * Seule table lue : `coach_shared_reports` (jamais `coach_notes`). Les brouillons sont exclus. Le membre garde l'accès
 * à ses propres comptes rendus même après la fin du suivi.
 */
export async function GET(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });
  try {
    const { rows, coachNames } = await loadMemberReports(getSupabaseAdmin(), user.id);
    const reports = rows.map((r) => toMemberReportDto(r, coachNames.get(r.coach_id) ?? null)).filter((r): r is MemberReportDto => r !== null);
    return NextResponse.json({ reports }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Impossible de consulter les comptes rendus." }, { status: 500, headers: NO_STORE });
  }
}
