import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isUuid } from "@/lib/coach/assignment-errors";
import { writeCoachAudit } from "@/lib/coach/audit";
import { parseMemberActionPatch } from "@/lib/coach/notes-model";
import { ACTION_COLUMNS, toMemberActionDto, type ActionRow } from "@/lib/coach/content-dto";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

const NO_STORE = { "Cache-Control": "private, no-store" };
type Ctx = { params: Promise<{ id: string }> };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * PATCH /api/member/coach/actions/[id] — le membre fait avancer le STATUT de SES actions, et rien d'autre.
 * Corps : `{ "status": "in_progress" | "done" }` (aucun autre champ n'est accepté ; « cancelled » est refusé).
 * L'identité vient UNIQUEMENT de la session (un `member_id` dans le corps est refusé). La matrice de transitions est
 * appliquée dans la transaction SQL (ligne verrouillée) : deux requêtes concurrentes ne peuvent pas la contourner.
 * Chaque transition réellement appliquée est auditée avec l'acteur « member » (identité du jeton), sans aucun contenu.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await requireApprovedMember(req);
  if (!user) return json({ error: "Non autorisé" }, 401);
  const { id } = await params;
  if (!isUuid(id)) return json({ error: "Paramètres invalides" }, 400);

  let raw: unknown;
  try { raw = await req.json(); } catch { raw = undefined; }
  const v = parseMemberActionPatch(raw);
  if (!v.ok) return json({ error: "Requête refusée", code: v.code }, 400);

  const key = `member-action:${user.id}`;
  if (!(await checkRateLimit(key, "member_action", 60, 3600))) return json({ error: "Trop de modifications. Réessayez plus tard.", code: "rate_limited" }, 429);
  await recordRateLimit(key, "member_action");

  try {
    const db = getSupabaseAdmin();
    const { data: before, error: berr } = await db.from("coach_action_items").select(ACTION_COLUMNS).eq("id", id).eq("member_id", user.id).maybeSingle();
    if (berr) throw new Error("member action lookup failed");
    const row = before as unknown as ActionRow | null;
    // Action inexistante, d'un autre membre, invisible ou dont le coach est responsable : même 404.
    if (!row || !row.visible_to_member || row.owner !== "member") return json({ error: "Introuvable" }, 404);

    const { data: result, error } = await db.rpc("coach_update_action_status", { p_actor_kind: "member", p_actor_id: user.id, p_action: id, p_new_status: v.value });
    if (error) throw new Error("member action status failed");
    if (result === "invalid_transition") return json({ error: "Transition refusée", code: "invalid_transition" }, 409);
    if (result !== "ok") return json({ error: "Introuvable" }, 404);

    // Une entrée par transition APPLIQUÉE ; acteur = identité du jeton ; métadonnées sans titre ni description.
    await writeCoachAudit(db, {
      actorId: user.id, actorKind: "member", action: "action_status_changed_by_member", targetType: "action", targetId: id,
      metadata: { from: row.status, to: v.value, coach_id: row.coach_id },
    });
    const { data: after } = await db.from("coach_action_items").select(ACTION_COLUMNS).eq("id", id).eq("member_id", user.id).maybeSingle();
    const dto = after ? toMemberActionDto(after as unknown as ActionRow, null) : null;
    return json({ action: dto });
  } catch {
    return json({ error: "Impossible de modifier l'action." }, 500);
  }
}
