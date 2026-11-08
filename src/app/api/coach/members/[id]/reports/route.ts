import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, contentFailure, notFound, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { validateReportCreate } from "@/lib/coach/notes-model";
import { REPORT_COLUMNS, toCoachReportDto, type ReportRow } from "@/lib/coach/content-dto";
import { loadCoachReports, sessionBelongsTo } from "@/lib/coach/content-data";

type Ctx = { params: Promise<{ id: string }> };

/** Comptes rendus PARTAGÉS (brouillons et publiés) rédigés par ce coach pour un membre qu'il accompagne. */
export async function GET(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    const db = getSupabaseAdmin();
    if (!(await assertCoachMemberAccess(db, coach.id, id, { audit: false }))) return notFound();
    const rows = await loadCoachReports(db, coach.id, id);
    return coachJson({ reports: rows.map(toCoachReportDto) });
  });
}

/** Création d'un BROUILLON (jamais publié à la création). `session_id` est fixé ici et immuable ensuite. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = validateReportCreate(await readJson(req));
    if (!v.ok) return contentFailure(v.code, v.field);
    const db = getSupabaseAdmin();
    if (!(await assertCoachMemberAccess(db, coach.id, id, { audit: false }))) return notFound();
    if (v.value.sessionId && !(await sessionBelongsTo(db, coach.id, id, v.value.sessionId))) return notFound();

    const { data, error } = await db.from("coach_shared_reports")
      .insert({ coach_id: coach.id, member_id: id, session_id: v.value.sessionId, title: v.value.title, summary: v.value.summary })
      .select(REPORT_COLUMNS).single();
    if (error || !data) throw new Error("coach report create failed");
    const row = data as unknown as ReportRow;
    await auditCoach(db, coach.id, "report_created", "report", row.id, { member_id: id, has_session: Boolean(row.session_id) });
    return coachJson({ report: toCoachReportDto(row) }, 201);
  });
}
