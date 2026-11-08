import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { loadCoachNotifications } from "@/lib/coach/notifications-data";

const LIMIT = 30;

/**
 * GET /api/coach/notifications — notifications du coach connecté, DTO sûr `{ id, kind, createdAt, read }`.
 * (La route du lot 1 `/api/coach-notifications` renvoie des textes bruts ; l'interface Coach ne l'utilise
 * que pour marquer « lu ».)
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const { items, unread } = await loadCoachNotifications(getSupabaseAdmin(), coach.id, LIMIT);
    return coachJson({ notifications: items, unread });
  });
}
