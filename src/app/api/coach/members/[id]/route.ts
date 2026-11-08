import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { writeCoachAudit } from "@/lib/coach/audit";
import { isUuid } from "@/lib/coach/assignment-errors";
import { COACH_MEMBER_SELECT, toCoachMemberView } from "@/lib/coach/members-data";
import { MEMBER_DETAIL_UNAVAILABLE, toCoachFormationSummary } from "@/lib/coach/members-view";
import { localizeCoachFormation, parseCoachLang } from "@/lib/coach/formation-i18n";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/members/[id] — fiche d'un membre ACCOMPAGNÉ (consentement accepté).
 * Tout refus → 404 identique (jamais 403) : on ne révèle pas l'existence d'un membre non attribué.
 * La consultation n'est journalisée qu'APRÈS une lecture réussie, sans aucun contenu personnel.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return coachJson({ error: "Paramètres invalides" }, 400);
    const lang = parseCoachLang(new URL(req.url).searchParams.get("lang"));
    if (!lang.ok) return coachJson({ error: "Paramètres invalides" }, 400);

    const db = getSupabaseAdmin();
    const notFound = () => coachJson({ error: "Introuvable" }, 404);

    // Contrôle d'accès SQL (affectation active + consentement accepté + coach actif). Audit repoussé à plus tard.
    if (!(await assertCoachMemberAccess(db, coach.id, id, { audit: false }))) return notFound();

    const { data: assignment, error: assignmentError } = await db
      .from("coach_member_assignments")
      .select("id, assigned_at, consent_at")
      .eq("coach_id", coach.id)
      .eq("member_id", id)
      .eq("status", "active")
      .eq("consent_status", "accepted")
      .maybeSingle();
    if (assignmentError) throw new Error("coach member detail: assignment query failed");
    if (!assignment) return notFound();

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select(COACH_MEMBER_SELECT)
      .eq("id", id)
      .eq("status", "approved")
      .eq("account_type", "member")
      .maybeSingle();
    if (profileError) throw new Error("coach member detail: profile query failed");
    const view = toCoachMemberView(profile as unknown as Record<string, unknown> | null, assignment as Record<string, unknown>);
    if (!view) return notFound();

    await writeCoachAudit(db, {
      actorId: coach.id, actorKind: "coach", action: "member_file_viewed", targetType: "member", targetId: id,
    });

    return coachJson({
      member: { id: view.id, pseudo: view.pseudo, avatarUrl: view.avatarUrl, country: view.country, city: view.city },
      assignment: { status: "active", consentStatus: "accepted", assignedAt: view.assignedAt, consentAt: view.consentAt },
      // DTO explicite reconstruit ICI, avant la sérialisation : « orphans » (texte libre du membre) n'en fait jamais partie.
      formation: {
        state: view.formationState,
        summary: view.formationState === "unavailable" || !view.formation
          ? null
          : localizeCoachFormation(toCoachFormationSummary(view.formation), lang.lang),
      },
      unavailable: MEMBER_DETAIL_UNAVAILABLE,
    });
  });
}
