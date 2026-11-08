/**
 * Lecture des notes PRIVÉES du coach (serveur). `loadCoachNotes` et `getCoachNote` sont les SEULES lectures de
 * `coach_notes` ; elles ne sont appelées que par des routes Coach. Aucun chargeur « membre » n'est dans ce module : ni
 * les routes membre ni les routes administrateur ne l'importent (test statique).
 */
import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NOTE_COLUMNS, type NoteRow } from "@/lib/coach/notes-dto";

type Db = ReturnType<typeof getSupabaseAdmin>;
export const NOTES_READ_CAP = 300;

export async function loadCoachNotes(db: Db, coachId: string, memberId: string): Promise<NoteRow[]> {
  const { data, error } = await db.from("coach_notes").select(NOTE_COLUMNS)
    .eq("coach_id", coachId).eq("member_id", memberId).is("deleted_at", null).order("created_at", { ascending: false }).limit(NOTES_READ_CAP);
  if (error) throw new Error("notes: query failed");
  return (data || []) as unknown as NoteRow[];
}

/** Une note de CE coach, non supprimée, ou null (inexistante, d'un autre coach, supprimée : même réponse). */
export async function getCoachNote(db: Db, coachId: string, id: string): Promise<NoteRow | null> {
  const { data, error } = await db.from("coach_notes").select(NOTE_COLUMNS).eq("id", id).eq("coach_id", coachId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error("notes: lookup failed");
  return (data as unknown as NoteRow | null) ?? null;
}
