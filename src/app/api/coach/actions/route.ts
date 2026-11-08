import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { allowCoachWrite, auditCoach, badParams, contentFailure, memberPseudos, notFound, queryUuid, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { ACTION_STATUSES, todayIsoUtc, validateActionCreate } from "@/lib/coach/notes-model";
import { ACTION_COLUMNS, toCoachActionDto, type ActionRow } from "@/lib/coach/content-dto";
import { loadCoachActions, sessionBelongsTo } from "@/lib/coach/content-data";
import { acceptedMemberIds } from "@/lib/coach/sessions-data";

/** GET — actions du coach, pour les membres qu'il accompagne ENCORE. Filtres validés : member_id (UUID), status. */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const url = new URL(req.url);
    const member = queryUuid(url, "member_id");
    if (!member.ok) return badParams();
    const status = url.searchParams.get("status") ?? "all";
    if (status !== "all" && !(ACTION_STATUSES as readonly string[]).includes(status)) return badParams();
    const db = getSupabaseAdmin();
    const accepted = new Set(await acceptedMemberIds(db, coach.id));
    if (member.value && !accepted.has(member.value)) return coachJson({ actions: [] });
    let rows = (await loadCoachActions(db, coach.id, member.value ?? undefined)).filter((r) => accepted.has(r.member_id));
    if (status !== "all") rows = rows.filter((r) => r.status === status);
    const pseudos = await memberPseudos(db, rows.map((r) => r.member_id));
    return coachJson({ actions: rows.map((r) => ({ ...toCoachActionDto(r), member: { pseudo: pseudos.get(r.member_id) ?? null } })) });
  });
}

/** POST — création. Le statut initial est TOUJOURS « todo » ; `status` et `completed_at` ne sont jamais acceptés. */
export async function POST(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = validateActionCreate(await readJson(req), todayIsoUtc(Date.now()));
    if (!v.ok) return contentFailure(v.code, v.field);
    const db = getSupabaseAdmin();
    if (!(await assertCoachMemberAccess(db, coach.id, v.value.memberId, { audit: false }))) return notFound();
    if (v.value.sessionId && !(await sessionBelongsTo(db, coach.id, v.value.memberId, v.value.sessionId))) return notFound();

    const { data, error } = await db.from("coach_action_items").insert({
      coach_id: coach.id, member_id: v.value.memberId, session_id: v.value.sessionId, title: v.value.title, description: v.value.description,
      due_date: v.value.dueDate, owner: v.value.owner, visible_to_member: v.value.visibleToMember,
    }).select(ACTION_COLUMNS).single();
    if (error || !data) throw new Error("coach action create failed");
    const row = data as unknown as ActionRow;
    await auditCoach(db, coach.id, "action_created", "action", row.id, { member_id: row.member_id, owner: row.owner, has_session: Boolean(row.session_id) });
    return coachJson({ action: toCoachActionDto(row) }, 201);
  });
}
