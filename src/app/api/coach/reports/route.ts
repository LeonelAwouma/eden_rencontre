import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { badParams, memberPseudos, queryUuid } from "@/lib/coach/lot3-api";
import { toCoachReportDto } from "@/lib/coach/content-dto";
import { loadCoachReports } from "@/lib/coach/content-data";
import { acceptedMemberIds } from "@/lib/coach/sessions-data";

/**
 * GET /api/coach/reports — comptes rendus partagés (brouillons et publiés) du coach, pour les membres qu'il accompagne
 * ENCORE. Filtres validés : member_id (UUID), state (all | draft | published).
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const url = new URL(req.url);
    const member = queryUuid(url, "member_id");
    if (!member.ok) return badParams();
    const state = url.searchParams.get("state") ?? "all";
    if (!["all", "draft", "published"].includes(state)) return badParams();
    const db = getSupabaseAdmin();
    const accepted = new Set(await acceptedMemberIds(db, coach.id));
    if (member.value && !accepted.has(member.value)) return coachJson({ reports: [] });
    let rows = (await loadCoachReports(db, coach.id, member.value ?? undefined)).filter((r) => accepted.has(r.member_id));
    if (state === "draft") rows = rows.filter((r) => !r.published_at);
    if (state === "published") rows = rows.filter((r) => r.published_at);
    const pseudos = await memberPseudos(db, rows.map((r) => r.member_id));
    return coachJson({ reports: rows.map((r) => ({ ...toCoachReportDto(r), member: { pseudo: pseudos.get(r.member_id) ?? null } })) });
  });
}
