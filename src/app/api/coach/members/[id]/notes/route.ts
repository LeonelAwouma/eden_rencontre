import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, contentFailure, notFound, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { validateNoteCreate } from "@/lib/coach/notes-model";
import { NOTE_COLUMNS, toCoachNoteDto, type NoteRow } from "@/lib/coach/notes-dto";
import { loadCoachNotes } from "@/lib/coach/notes-data";
import { sessionBelongsTo } from "@/lib/coach/content-data";

type Ctx = { params: Promise<{ id: string }> };

/**
 * NOTES PRIVÉES du coach pour un membre qu'il accompagne. Strictement privées : aucune route membre ni administrateur
 * ne lit `coach_notes`. Accès (attribution + consentement) réévalué à chaque appel ; refus → 404.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    const db = getSupabaseAdmin();
    if (!(await assertCoachMemberAccess(db, coach.id, id, { audit: false }))) return notFound();
    const rows = await loadCoachNotes(db, coach.id, id);
    return coachJson({ notes: rows.map(toCoachNoteDto) });
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = validateNoteCreate(await readJson(req));
    if (!v.ok) return contentFailure(v.code, v.field);
    const db = getSupabaseAdmin();
    if (!(await assertCoachMemberAccess(db, coach.id, id, { audit: false }))) return notFound();
    // Rattachement facultatif à une séance : elle doit appartenir à CE coach et à CE membre (fixé à la création, immuable ensuite).
    if (v.value.sessionId && !(await sessionBelongsTo(db, coach.id, id, v.value.sessionId))) return notFound();

    const { data, error } = await db.from("coach_notes")
      .insert({ coach_id: coach.id, member_id: id, session_id: v.value.sessionId, ...v.value.fields })
      .select(NOTE_COLUMNS).single();
    if (error || !data) throw new Error("coach note create failed");
    const row = data as unknown as NoteRow;
    await auditCoach(db, coach.id, "note_created", "note", row.id, { member_id: id, has_session: Boolean(row.session_id) });
    return coachJson({ note: toCoachNoteDto(row) }, 201);
  });
}
