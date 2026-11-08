import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, memberPseudos, notFound, rateLimited, readJson, sessionFailure } from "@/lib/coach/lot3-api";
import { callSessionRpc, getCoachSessionRow } from "@/lib/coach/sessions-data";
import { toCoachSessionDto } from "@/lib/coach/sessions-dto";
import { canTransition, parsePatchSession, validateNewSchedule, type SessionStatus } from "@/lib/coach/sessions-model";

type Ctx = { params: Promise<{ id: string }> };

/** Séance de CE coach pour un membre encore accompagné ; sinon null (le même 404 : aucune fuite d'existence). */
async function loadOwned(coachId: string, id: string) {
  const db = getSupabaseAdmin();
  const row = await getCoachSessionRow(db, coachId, id);
  if (!row) return { db, row: null };
  if (!(await assertCoachMemberAccess(db, coachId, row.member_id, { audit: false }))) return { db, row: null };
  return { db, row };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    const { db, row } = await loadOwned(coach.id, id);
    if (!row) return notFound();
    const pseudos = await memberPseudos(db, [row.member_id]);
    return coachJson({ session: { ...toCoachSessionDto(row), member: { pseudo: pseudos.get(row.member_id) ?? null } } });
  });
}

/**
 * PATCH — soit une ACTION (complete, cancel, no_show, reschedule, postpone), soit la modification de `topic` / `type`.
 * `scheduled_at`, `duration_minutes` et `status` ne sont JAMAIS écrits directement : tout passe par les fonctions SQL
 * transactionnelles, qui revérifient accès, statut et conflits.
 *   reschedule = même séance, nouvel horaire ;  postpone = ancienne séance « postponed » + NOUVELLE séance « scheduled ».
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const parsed = parsePatchSession(await readJson(req));
    if (!parsed.ok) return sessionFailure(parsed.code);
    const { db, row } = await loadOwned(coach.id, id);
    if (!row) return notFound();
    const status = row.status as SessionStatus;

    if (parsed.value.kind === "edit") {
      if (status !== "scheduled") return sessionFailure("not_scheduled");
      const patch: Record<string, unknown> = {};
      if (parsed.value.topic !== undefined) patch.topic = parsed.value.topic;
      if (parsed.value.type !== undefined) patch.type = parsed.value.type;
      const { error } = await db.from("coach_sessions").update(patch).eq("id", row.id).eq("coach_id", coach.id);
      if (error) throw new Error("coach session edit failed");
      await auditCoach(db, coach.id, "session_updated", "session", row.id, { member_id: row.member_id, status });
      const fresh = await getCoachSessionRow(db, coach.id, row.id);
      return coachJson({ session: fresh ? toCoachSessionDto(fresh) : toCoachSessionDto({ ...row, ...patch } as typeof row) });
    }

    const { action, body } = parsed.value;
    const gate = canTransition(status, action, new Date(row.scheduled_at).getTime(), Date.now());
    if (!gate.ok) return sessionFailure(gate.code);

    if (action === "reschedule" || action === "postpone") {
      const v = validateNewSchedule(body, Date.now());
      if (!v.ok) return sessionFailure(v.code, v.candidates);
      const fn = action === "reschedule" ? "coach_reschedule_session" : "coach_postpone_session";
      const r = await callSessionRpc(db, fn, { p_coach: coach.id, p_session: row.id, p_new_at: v.value.scheduledAtIso, p_duration: v.value.durationMinutes });
      if (!r.ok) {
        if (r.code) return sessionFailure(r.code);
        throw new Error(`coach session ${action}: unexpected database error`);
      }
      const fresh = await getCoachSessionRow(db, coach.id, r.id);
      if (!fresh) throw new Error(`coach session ${action}: row not found`);
      if (action === "reschedule") {
        await auditCoach(db, coach.id, "session_rescheduled", "session", row.id, { member_id: row.member_id, from_at: row.scheduled_at, to_at: fresh.scheduled_at });
        return coachJson({ session: toCoachSessionDto(fresh) });
      }
      await auditCoach(db, coach.id, "session_postponed", "session", row.id, { member_id: row.member_id, from_at: row.scheduled_at, to_at: fresh.scheduled_at, new_session_id: fresh.id });
      const old = await getCoachSessionRow(db, coach.id, row.id);
      return coachJson({ session: toCoachSessionDto(fresh), previous: old ? toCoachSessionDto(old) : null });
    }

    const r = await callSessionRpc(db, "coach_transition_session", { p_coach: coach.id, p_session: row.id, p_action: action });
    if (!r.ok) {
      if (r.code) return sessionFailure(r.code);
      throw new Error("coach session transition: unexpected database error");
    }
    const audit = { complete: "session_completed", cancel: "session_cancelled", no_show: "session_no_show" } as const;
    await auditCoach(db, coach.id, audit[action], "session", row.id, { member_id: row.member_id, from: status });
    const fresh = await getCoachSessionRow(db, coach.id, row.id);
    return coachJson({ session: fresh ? toCoachSessionDto(fresh) : null });
  });
}
