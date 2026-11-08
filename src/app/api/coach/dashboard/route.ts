import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { countPendingProposals, loadCoachMembers } from "@/lib/coach/members-data";
import { loadCoachNotifications } from "@/lib/coach/notifications-data";
import { RECENT_ACTIVITY_LIMIT, computeDashboardStats } from "@/lib/coach/members-view";

/**
 * GET /api/coach/dashboard — indicateurs réels du coach connecté.
 * Aucun indicateur de séances, comptes rendus ou objectifs (lots suivants), aucune estimation.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const db = getSupabaseAdmin();
    const [loaded, pendingProposals, activity] = await Promise.all([
      loadCoachMembers(db, coach.id),
      countPendingProposals(db, coach.id),
      loadCoachNotifications(db, coach.id, RECENT_ACTIVITY_LIMIT),
    ]);
    return coachJson(
      computeDashboardStats({
        coverage: loaded.coverage,
        pendingProposals,
        members: loaded.members,
        activity: activity.items,
      })
    );
  });
}
