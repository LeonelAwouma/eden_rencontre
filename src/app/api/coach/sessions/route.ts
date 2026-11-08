import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { allowCoachWrite, auditCoach, badParams, memberPseudos, notFound, queryPage, queryUuid, rateLimited, readJson, sessionFailure } from "@/lib/coach/lot3-api";
import { callSessionRpc, getCoachSessionRow, loadCoachSessions, paginateRows } from "@/lib/coach/sessions-data";
import { toCoachSessionDto } from "@/lib/coach/sessions-dto";
import { isSessionStatus, validateCreateSession } from "@/lib/coach/sessions-model";

/**
 * GET /api/coach/sessions — séances du coach connecté, pour les membres qu'il accompagne ENCORE.
 * Paramètres (validation stricte, sinon 400) : status (all | scheduled | completed | cancelled | postponed | no_show),
 * member_id (UUID), from / to (instants ISO avec décalage), page.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "all";
    if (status !== "all" && !isSessionStatus(status)) return badParams();
    const member = queryUuid(url, "member_id");
    if (!member.ok) return badParams();
    const range: Record<"from" | "to", string | undefined> = { from: undefined, to: undefined };
    for (const k of ["from", "to"] as const) {
      const v = url.searchParams.get(k);
      if (!v) continue;
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(v) || Number.isNaN(new Date(v).getTime())) return badParams();
      range[k] = new Date(v).toISOString();
    }
    const db = getSupabaseAdmin();
    const rows = await loadCoachSessions(db, coach.id, {
      status: status === "all" ? undefined : status, memberId: member.value ?? undefined, from: range.from, to: range.to,
    });
    const page = paginateRows(rows, queryPage(url));
    const pseudos = await memberPseudos(db, page.items.map((r) => r.member_id));
    return coachJson({
      sessions: page.items.map((r) => ({ ...toCoachSessionDto(r), member: { pseudo: pseudos.get(r.member_id) ?? null } })),
      page: page.page, totalPages: page.totalPages, total: page.total,
    });
  });
}

/** POST /api/coach/sessions — création par la fonction transactionnelle `coach_schedule_session` (accès, conflits, passé). */
export async function POST(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = validateCreateSession(await readJson(req), Date.now());
    if (!v.ok) return sessionFailure(v.code, v.candidates);
    const db = getSupabaseAdmin();
    // Accès réévalué À CHAQUE opération : attribution active + consentement accepté. Refus → 404 (aucune fuite).
    if (!(await assertCoachMemberAccess(db, coach.id, v.value.memberId, { audit: false }))) return notFound();

    const r = await callSessionRpc(db, "coach_schedule_session", {
      p_coach: coach.id, p_member: v.value.memberId, p_type: v.value.type, p_at: v.value.scheduledAtIso,
      p_duration: v.value.durationMinutes, p_tz: v.value.timezone, p_topic: v.value.topic,
    });
    if (!r.ok) {
      if (r.code) return sessionFailure(r.code);
      throw new Error("coach session create: unexpected database error");
    }
    const row = await getCoachSessionRow(db, coach.id, r.id);
    if (!row) throw new Error("coach session create: row not found after creation");
    await auditCoach(db, coach.id, "session_created", "session", row.id, { member_id: row.member_id, type: row.type, status: row.status, to_at: row.scheduled_at });
    return coachJson({ session: toCoachSessionDto(row) }, 201);
  });
}
