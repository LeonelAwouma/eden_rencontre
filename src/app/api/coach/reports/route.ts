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
 *
 * `members` : la liste des membres ayant accepté le suivi (indépendante de `state`/`member_id`) — utilisée par
 * l'interface pour proposer la création d'un compte rendu directement depuis cette page, et pour afficher une
 * explication quand aucun membre n'a encore accepté.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const url = new URL(req.url);
    const member = queryUuid(url, "member_id");
    if (!member.ok) return badParams();
    const state = url.searchParams.get("state") ?? "all";
    if (!["all", "draft", "published"].includes(state)) return badParams();
    const db = getSupabaseAdmin();
    const acceptedIds = await acceptedMemberIds(db, coach.id);
    const accepted = new Set(acceptedIds);
    const acceptedPseudos = await memberPseudos(db, acceptedIds);
    const members = acceptedIds.map((id) => ({ id, pseudo: acceptedPseudos.get(id) ?? null }));

    if (member.value && !accepted.has(member.value)) return coachJson({ reports: [], members });
    let rows = (await loadCoachReports(db, coach.id, member.value ?? undefined)).filter((r) => accepted.has(r.member_id));
    if (state === "draft") rows = rows.filter((r) => !r.published_at);
    if (state === "published") rows = rows.filter((r) => r.published_at);
    return coachJson({ reports: rows.map((r) => ({ ...toCoachReportDto(r), member: { pseudo: acceptedPseudos.get(r.member_id) ?? null } })), members });
  });
}
