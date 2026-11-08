import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, contentFailure, notFound, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { parseActionPatch, todayIsoUtc } from "@/lib/coach/notes-model";
import { toCoachActionDto, type ActionRow } from "@/lib/coach/content-dto";
import { getCoachAction } from "@/lib/coach/content-data";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH — soit `{ status }` (par la fonction SQL `coach_update_action_status` : ligne verrouillée, transition vérifiée
 * dans la transaction, `completed_at` calculé par la base), soit une édition de titre / description / échéance /
 * visibilité. `completed_at`, `session_id`, `owner`, `member_id` ne sont jamais acceptés.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = parseActionPatch(await readJson(req), todayIsoUtc(Date.now()));
    if (!v.ok) return contentFailure(v.code, v.field);

    const db = getSupabaseAdmin();
    const row = await getCoachAction(db, coach.id, id);
    if (!row || !(await assertCoachMemberAccess(db, coach.id, row.member_id, { audit: false }))) return notFound();

    if (v.value.kind === "status") {
      const { data, error } = await db.rpc("coach_update_action_status", { p_actor_kind: "coach", p_actor_id: coach.id, p_action: id, p_new_status: v.value.status });
      if (error) throw new Error("coach action status failed");
      if (data === "invalid_transition") return coachJson({ error: "Transition refusée", code: "invalid_transition" }, 409);
      if (data !== "ok") return notFound(); // not_owner, not_found, no_access : même réponse
      await auditCoach(db, coach.id, "action_updated", "action", id, { member_id: row.member_id, from: row.status, to: v.value.status });
    } else {
      const patch: Record<string, unknown> = {};
      if (v.value.title !== undefined) patch.title = v.value.title;
      if (v.value.description !== undefined) patch.description = v.value.description;
      if (v.value.dueDate !== undefined) patch.due_date = v.value.dueDate;
      if (v.value.visibleToMember !== undefined) {
        // Une action dont le membre est responsable lui reste visible (règle reprise par un CHECK SQL).
        if (row.owner === "member" && v.value.visibleToMember === false) return contentFailure("bad_visibility", "visible_to_member");
        patch.visible_to_member = v.value.visibleToMember;
      }
      const { error } = await db.from("coach_action_items").update(patch).eq("id", id).eq("coach_id", coach.id);
      if (error) throw new Error("coach action update failed");
      await auditCoach(db, coach.id, "action_updated", "action", id, { member_id: row.member_id });
    }
    const fresh = await getCoachAction(db, coach.id, id);
    return coachJson({ action: fresh ? toCoachActionDto(fresh as ActionRow) : null });
  });
}

