import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";
import { assertCoachMemberAccess } from "@/lib/coach/access";
import { isUuid } from "@/lib/coach/assignment-errors";
import { allowCoachWrite, auditCoach, badParams, contentFailure, notFound, rateLimited, readJson } from "@/lib/coach/lot3-api";
import { NOTE_FIELDS, validateNotePatch } from "@/lib/coach/notes-model";
import { NOTE_COLUMNS, toCoachNoteDto, type NoteRow } from "@/lib/coach/notes-dto";
import { getCoachNote } from "@/lib/coach/notes-data";

type Ctx = { params: Promise<{ id: string }> };

/** Note de CE coach, non supprimée, pour un membre encore accompagné ; sinon null (même 404 pour tout refus). */
async function loadOwned(coachId: string, id: string) {
  const db = getSupabaseAdmin();
  const note = await getCoachNote(db, coachId, id);
  if (!note) return { db, note: null };
  if (!(await assertCoachMemberAccess(db, coachId, note.member_id, { audit: false }))) return { db, note: null };
  return { db, note };
}

/** PATCH — texte seulement ; `session_id`, `coach_id` et `member_id` sont immuables (refus + trigger SQL). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const v = validateNotePatch(await readJson(req));
    if (!v.ok) return contentFailure(v.code, v.field);
    const { db, note } = await loadOwned(coach.id, id);
    if (!note) return notFound();
    // Une note ne peut pas devenir entièrement vide (même règle que le CHECK SQL).
    const merged = { ...note, ...Object.fromEntries(Object.entries(v.value).map(([k, val]) => [k, val])) } as Record<string, string>;
    if (NOTE_FIELDS.every((f) => (merged[f] ?? "").trim() === "")) return contentFailure("empty");
    const { data, error } = await db.from("coach_notes").update(v.value).eq("id", note.id).eq("coach_id", coach.id).select(NOTE_COLUMNS).single();
    if (error || !data) throw new Error("coach note update failed");
    await auditCoach(db, coach.id, "note_updated", "note", note.id, { member_id: note.member_id });
    return coachJson({ note: toCoachNoteDto(data as unknown as NoteRow) });
  });
}

/** DELETE — suppression LOGIQUE (`deleted_at`) : l'historique est conservé en base, la note disparaît de l'interface. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return withActiveCoach(req, async (coach) => {
    const { id } = await params;
    if (!isUuid(id)) return badParams();
    if (!(await allowCoachWrite(coach.id))) return rateLimited();
    const { db, note } = await loadOwned(coach.id, id);
    if (!note) return notFound();
    const { error } = await db.from("coach_notes").update({ deleted_at: new Date().toISOString() }).eq("id", note.id).eq("coach_id", coach.id);
    if (error) throw new Error("coach note delete failed");
    await auditCoach(db, coach.id, "note_deleted", "note", note.id, { member_id: note.member_id });
    return coachJson({ ok: true });
  });
}
