import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { localizeFormationOverview, parseCoachLang } from "@/lib/coach/formation-i18n";
import { loadCoachMembers } from "@/lib/coach/members-data";
import { computeFormationOverview } from "@/lib/coach/members-view";

/**
 * GET /api/coach/formation?lang=fr|en — progression « Bâtir sur le roc » des membres du coach (consentement accepté).
 * Seule donnée persistée côté serveur : `profiles.formation_completed`, DÉCLARÉE par le membre (non vérifiée par un
 * formateur). Quiz, réflexions et positions de lecture restent sur l'appareil du membre et ne sont jamais présentés.
 * `lang` ne change que les titres ; identifiants, ordre et progression sont identiques dans les deux langues.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const lang = parseCoachLang(new URL(req.url).searchParams.get("lang"));
    if (!lang.ok) return coachJson({ error: "Paramètres invalides" }, 400);

    const { members, coverage } = await loadCoachMembers(getSupabaseAdmin(), coach.id);
    return coachJson({ ...localizeFormationOverview(computeFormationOverview(members), lang.lang), ...coverage });
  });
}
