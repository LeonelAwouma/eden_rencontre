import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { loadCoachMembers } from "@/lib/coach/members-data";
import { filterMembers, paginate, parseMembersQuery, sortMembers, toMemberListItem } from "@/lib/coach/members-view";

/**
 * GET /api/coach/members?q=&state=&page= — membres du coach (consentement accepté), 12 par page.
 * Recherche et filtre portent sur les membres CHARGÉS (≤ 500) : `truncated` le dit explicitement.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const query = parseMembersQuery(new URL(req.url).searchParams);
    if (!query.ok) return coachJson({ error: "Paramètres invalides" }, 400);

    const { members, coverage } = await loadCoachMembers(getSupabaseAdmin(), coach.id);
    const matching = filterMembers(sortMembers(members), { q: query.q, state: query.state });
    const page = paginate(matching, query.page);

    return coachJson({
      members: page.items.map(toMemberListItem),
      page: page.page,
      totalPages: page.totalPages,
      /** Résultats parmi les membres chargés — jamais un total global quand `truncated` est vrai. */
      totalMatching: page.total,
      ...coverage,
    });
  });
}
