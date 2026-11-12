import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { refuseCoachSession } from "@/lib/coach/guard";
import { parseAnswersBody, persistQuestionnaire, saveFailureMessage } from "@/lib/onboarding-save";

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST — Sauvegarde automatique du questionnaire.
 * Header : Authorization: Bearer <jeton Supabase du membre>
 * Body   : { answers }
 *
 * Le membre est identifié par son jeton, jamais par un identifiant envoyé par le navigateur.
 * Ne touche pas à `onboarding_completed` : une ancienne fenêtre restée ouverte ne « dé-termine » jamais un
 * questionnaire validé. Les réponses « vision du mariage » et « source de découverte » sont validées ici,
 * recopiées dans leurs colonnes historiques, et les anciennes valeurs archivées ne sont jamais perdues
 * (src/lib/onboarding-save.ts).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Session expirée. Veuillez vous reconnecter." }, 401);
    const { data: auth } = await supabase.auth.getUser(token);
    const userId = auth.user?.id;
    if (!userId) return json({ error: "Session expirée. Veuillez vous reconnecter." }, 401);

    const coachRefusal = await refuseCoachSession(supabase, userId);
    if (coachRefusal) return coachRefusal;

    const answers = parseAnswersBody(await req.json().catch(() => null));
    if (!answers) return json({ error: "Réponses invalides.", code: "bad_answers" }, 400);

    const saved = await persistQuestionnaire(supabase, userId, answers, { complete: false });
    if (!saved.ok) {
      if (saved.status === 500) console.error("[Onboarding Answers]", saved.code);
      return json({ error: saveFailureMessage(saved), code: saved.code, ...("field" in saved && saved.field ? { field: saved.field } : {}) }, saved.status);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[Onboarding Answers]", err instanceof Error ? err.message : "erreur inconnue");
    return json({ error: "Erreur serveur" }, 500);
  }
}
