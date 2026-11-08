import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, contentFailure, notFound, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { canPublishReport, parseReportPatch } from "@/lib/coach/notes-model";
import { REPORT_COLUMNS, toCoachReportDto, type ReportRow } from "@/lib/coach/content-dto";
import { getCoachReport } from "@/lib/coach/content-data";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH — édition (titre / résumé) OU `{ action: "publish" | "unpublish" }`.
 * Publier exige un titre et un résumé non vides ; dépublier retire immédiatement l'accès du membre.
 * `session_id`, `published_at`, `coach_id` et `member_id` ne sont jamais acceptés dans le corps.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = parseReportPatch(await readJson(req));
    if (!v.ok) return contentFailure(v.code, v.field);

    const db = getSupabaseAdmin();
    const report = await getCoachReport(db, coach.id, id);
    if (!report || !(await assertCoachMemberAccess(db, coach.id, report.member_id, { audit: false }))) return notFound();

    let patch: Record<string, unknown>;
    let action: string;
    if (v.value.kind === "publish") {
      if (!canPublishReport(report.title, report.summary)) return contentFailure("empty");
      patch = { published_at: report.published_at ?? new Date().toISOString() };
      action = "report_published";
    } else if (v.value.kind === "unpublish") {
      patch = { published_at: null };
      action = "report_unpublished";
    } else {
      patch = {};
      if (v.value.title !== undefined) patch.title = v.value.title;
      if (v.value.summary !== undefined) patch.summary = v.value.summary;
      // Un compte rendu publié ne peut pas devenir vide (le membre le voit) : il faut d'abord le dépublier.
      const title = (patch.title as string | undefined) ?? report.title;
      const summary = (patch.summary as string | undefined) ?? report.summary;
      if (report.published_at && !canPublishReport(title, summary)) return contentFailure("empty");
      action = "report_updated";
    }
    const { data, error } = await db.from("coach_shared_reports").update(patch).eq("id", report.id).eq("coach_id", coach.id).select(REPORT_COLUMNS).single();
    if (error || !data) throw new Error("coach report update failed");
    await auditCoach(db, coach.id, action, "report", report.id, { member_id: report.member_id });
    return coachJson({ report: toCoachReportDto(data as unknown as ReportRow) });
  });
}
