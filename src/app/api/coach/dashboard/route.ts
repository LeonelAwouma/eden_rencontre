import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { countPendingProposals, loadCoachMembers } from "@/lib/coach/members-data";
import { loadCoachNotifications } from "@/lib/coach/notifications-data";
import { RECENT_ACTIVITY_LIMIT, computeDashboardStats } from "@/lib/coach/members-view";
import { computeCoachLot3Stats } from "@/lib/coach/content-data";

/**
 * GET /api/coach/dashboard — indicateurs réels du coach connecté.
 * Lot 3 : séances à venir, actions en attente et comptes rendus à compléter — de VRAIS comptes (aucune estimation).
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const db = getSupabaseAdmin();
    const [loaded, pendingProposals, activity, followUp] = await Promise.all([
      loadCoachMembers(db, coach.id),
      countPendingProposals(db, coach.id),
      loadCoachNotifications(db, coach.id, RECENT_ACTIVITY_LIMIT),
      computeCoachLot3Stats(db, coach.id, Date.now()),
    ]);
    return coachJson({
      ...computeDashboardStats({
        coverage: loaded.coverage,
        pendingProposals,
        members: loaded.members,
        activity: activity.items,
      }),
      followUp,
    });
  });
}
