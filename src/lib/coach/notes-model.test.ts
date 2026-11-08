import { describe, expect, it } from "vitest";
import {
  ACTION_STATUSES, NOTE_FIELDS, canCoachTransition, canMemberTransition, canPublishReport, cleanText, parseActionPatch, parseDueDate,
  parseMemberActionPatch, parseReportPatch, todayIsoUtc, validateActionCreate, validateNoteCreate, validateNotePatch, validateReportCreate,
  type ActionStatus,
} from "./notes-model";
import { reportsToComplete } from "./content-data";
import { COACH_NOTE_KEYS, toCoachNoteDto, type NoteRow } from "./notes-dto";
import {
  COACH_ACTION_KEYS, COACH_REPORT_KEYS, MEMBER_ACTION_KEYS, MEMBER_REPORT_KEYS, toCoachActionDto,
  toCoachReportDto, toMemberActionDto, toMemberReportDto, type ActionRow, type ReportRow,
} from "./content-dto";
import { COACH_SESSION_KEYS, MEMBER_SESSION_KEYS, toCoachSessionDto, toMemberSessionDto, type SessionRow } from "./sessions-dto";

const M = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const TODAY = "2026-06-10";

describe("cleanText", () => {
  it("normalise les fins de ligne, retire les caractères de contrôle, supprime les espaces de bord", () => {
    expect(cleanText("  a\r\nb\rc\u0000\u0007d  ")).toBe("a\nb\ncd");
  });
  it("conserve le texte brut tel quel (aucune interprétation de HTML)", () => {
    expect(cleanText("<script>alert(1)</script>")).toBe("<script>alert(1)</script>");
  });
});

describe("notes privées", () => {
  it("création : au moins un champ non vide, session facultative", () => {
    const v = validateNoteCreate({ objectives: "  Clarifier  ", session_id: S });
    expect(v).toMatchObject({ ok: true, value: { sessionId: S, fields: { objectives: "Clarifier", topics: "", observations: "" } } });
    expect(validateNoteCreate({ objectives: "x" })).toMatchObject({ ok: true, value: { sessionId: null } });
    expect(validateNoteCreate({})).toEqual({ ok: false, code: "empty" });
    expect(validateNoteCreate({ objectives: "   " })).toEqual({ ok: false, code: "empty" });
  });
  it("plafond de 2000 caractères par champ (refus, jamais de troncature) ; 2000 exactement accepté", () => {
    for (const f of NOTE_FIELDS) {
      expect(validateNoteCreate({ [f]: "x".repeat(2001) })).toEqual({ ok: false, code: "too_long", field: f });
      expect(validateNoteCreate({ [f]: "x".repeat(2000) }).ok).toBe(true);
    }
  });
  it("champs inconnus, type incorrect, session invalide refusés", () => {
    expect(validateNoteCreate({ objectives: "x", coach_id: M })).toEqual({ ok: false, code: "forbidden_field", field: "coach_id" });
    expect(validateNoteCreate({ objectives: "x", member_id: M })).toMatchObject({ ok: false, code: "forbidden_field" });
    expect(validateNoteCreate({ objectives: 5 })).toEqual({ ok: false, code: "bad_field", field: "objectives" });
    expect(validateNoteCreate({ objectives: "x", session_id: "pas-uuid" })).toEqual({ ok: false, code: "bad_session", field: "session_id" });
    for (const b of [null, "x", []]) expect(validateNoteCreate(b)).toEqual({ ok: false, code: "bad_input" });
  });
  it("modification : texte seulement ; session_id / coach_id / member_id / deleted_at refusés (liens immuables)", () => {
    expect(validateNotePatch({ topics: " nouveau " })).toEqual({ ok: true, value: { topics: "nouveau" } });
    for (const k of ["session_id", "coach_id", "member_id", "deleted_at", "created_at"]) expect(validateNotePatch({ [k]: S }), k).toMatchObject({ ok: false, code: "forbidden_field" });
    expect(validateNotePatch({})).toEqual({ ok: false, code: "bad_input" });
  });
});

describe("comptes rendus partagés", () => {
  it("création : titre ≤ 120 et résumé ≤ 5000 ; brouillon possible vide ; session facultative", () => {
    expect(validateReportCreate({})).toEqual({ ok: true, value: { sessionId: null, title: "", summary: "" } });
    expect(validateReportCreate({ title: "x".repeat(121) })).toEqual({ ok: false, code: "too_long", field: "title" });
    expect(validateReportCreate({ title: "x".repeat(120) }).ok).toBe(true);
    expect(validateReportCreate({ summary: "x".repeat(5001) })).toEqual({ ok: false, code: "too_long", field: "summary" });
    expect(validateReportCreate({ summary: "x".repeat(5000) }).ok).toBe(true);
    expect(validateReportCreate({ session_id: S })).toMatchObject({ ok: true, value: { sessionId: S } });
  });
  it("création : published_at, coach_id, member_id refusés", () => {
    for (const k of ["published_at", "coach_id", "member_id", "status"]) expect(validateReportCreate({ [k]: "x" }), k).toMatchObject({ ok: false, code: "forbidden_field" });
  });
  it("modification : édition OU action publish/unpublish, jamais mélangées ; session_id et published_at refusés", () => {
    expect(parseReportPatch({ action: "publish" })).toEqual({ ok: true, value: { kind: "publish" } });
    expect(parseReportPatch({ action: "unpublish" })).toEqual({ ok: true, value: { kind: "unpublish" } });
    expect(parseReportPatch({ action: "delete" })).toMatchObject({ ok: false });
    expect(parseReportPatch({ action: "publish", title: "x" })).toEqual({ ok: false, code: "forbidden_field" });
    expect(parseReportPatch({ title: " T ", summary: "S" })).toEqual({ ok: true, value: { kind: "edit", title: "T", summary: "S" } });
    for (const k of ["session_id", "published_at", "coach_id", "member_id"]) expect(parseReportPatch({ [k]: S }), k).toMatchObject({ ok: false, code: "forbidden_field" });
    expect(parseReportPatch({})).toEqual({ ok: false, code: "bad_input" });
  });
  it("publication : titre ET résumé non vides", () => {
    expect(canPublishReport("T", "S")).toBe(true);
    expect(canPublishReport("", "S")).toBe(false);
    expect(canPublishReport("T", "  ")).toBe(false);
  });
});

describe("actions : création", () => {
  const base = { member_id: M, title: "Lire le chapitre 2" };
  it("valeurs par défaut : responsable = membre, visible, sans échéance, sans séance", () => {
    expect(validateActionCreate(base, TODAY)).toEqual({ ok: true, value: { memberId: M, sessionId: null, title: "Lire le chapitre 2", description: "", dueDate: null, owner: "member", visibleToMember: true } });
  });
  it("action dont le Coach est responsable : invisible par défaut, visibilité explicite possible", () => {
    expect(validateActionCreate({ ...base, owner: "coach" }, TODAY)).toMatchObject({ ok: true, value: { owner: "coach", visibleToMember: false } });
    expect(validateActionCreate({ ...base, owner: "coach", visible_to_member: true }, TODAY)).toMatchObject({ ok: true, value: { visibleToMember: true } });
  });
  it("action du membre : toujours visible, même si visible_to_member:false est envoyé", () => {
    expect(validateActionCreate({ ...base, owner: "member", visible_to_member: false }, TODAY)).toMatchObject({ ok: true, value: { visibleToMember: true } });
  });
  it("status et completed_at NE SONT JAMAIS acceptés à la création", () => {
    expect(validateActionCreate({ ...base, status: "done" }, TODAY)).toEqual({ ok: false, code: "forbidden_field", field: "status" });
    expect(validateActionCreate({ ...base, completed_at: "2026-06-10T10:00:00Z" }, TODAY)).toEqual({ ok: false, code: "forbidden_field", field: "completed_at" });
    expect(validateActionCreate({ ...base, coach_id: M }, TODAY)).toMatchObject({ ok: false, code: "forbidden_field" });
  });
  it("titre obligatoire ≤ 120, description ≤ 1000, membre = UUID", () => {
    expect(validateActionCreate({ member_id: M }, TODAY)).toMatchObject({ ok: false, code: "bad_title" });
    expect(validateActionCreate({ ...base, title: "  " }, TODAY)).toEqual({ ok: false, code: "bad_title", field: "title" });
    expect(validateActionCreate({ ...base, title: "x".repeat(121) }, TODAY)).toEqual({ ok: false, code: "too_long", field: "title" });
    expect(validateActionCreate({ ...base, title: "x".repeat(120) }, TODAY).ok).toBe(true);
    expect(validateActionCreate({ ...base, description: "x".repeat(1001) }, TODAY)).toEqual({ ok: false, code: "too_long", field: "description" });
    expect(validateActionCreate({ ...base, description: "x".repeat(1000) }, TODAY).ok).toBe(true);
    expect(validateActionCreate({ title: "x", member_id: "pas-uuid" }, TODAY)).toEqual({ ok: false, code: "bad_member", field: "member_id" });
    expect(validateActionCreate({ ...base, owner: "admin" }, TODAY)).toEqual({ ok: false, code: "bad_owner", field: "owner" });
  });
  it("échéance : aujourd'hui ou plus tard, date calendaire valide", () => {
    expect(parseDueDate(TODAY, TODAY)).toEqual({ ok: true, value: TODAY });
    expect(parseDueDate("2026-06-09", TODAY)).toMatchObject({ ok: false, code: "bad_due_date" });
    expect(parseDueDate("2026-02-30", "2026-01-01")).toMatchObject({ ok: false, code: "bad_due_date" });
    expect(parseDueDate("10/06/2026", TODAY)).toMatchObject({ ok: false, code: "bad_due_date" });
    expect(parseDueDate(null, TODAY)).toEqual({ ok: true, value: null });
    expect(parseDueDate("", TODAY)).toEqual({ ok: true, value: null });
    expect(todayIsoUtc(Date.UTC(2026, 5, 10, 23, 59))).toBe("2026-06-10");
  });
});

describe("actions : modification", () => {
  it("coach : statut seul (via la fonction SQL) OU édition ; jamais mélangés ; completed_at refusé", () => {
    expect(parseActionPatch({ status: "done" }, TODAY)).toEqual({ ok: true, value: { kind: "status", status: "done" } });
    expect(parseActionPatch({ status: "fini" }, TODAY)).toMatchObject({ ok: false, code: "bad_status" });
    expect(parseActionPatch({ status: "done", title: "x" }, TODAY)).toEqual({ ok: false, code: "forbidden_field" });
    expect(parseActionPatch({ completed_at: "2026-06-10T10:00:00Z" }, TODAY)).toMatchObject({ ok: false, code: "forbidden_field" });
    for (const k of ["session_id", "owner", "member_id", "coach_id"]) expect(parseActionPatch({ [k]: S }, TODAY), k).toMatchObject({ ok: false, code: "forbidden_field" });
    expect(parseActionPatch({ title: " Nouveau ", due_date: "2026-07-01" }, TODAY)).toEqual({ ok: true, value: { kind: "edit", title: "Nouveau", dueDate: "2026-07-01" } });
    expect(parseActionPatch({ title: "" }, TODAY)).toMatchObject({ ok: false, code: "bad_title" });
    expect(parseActionPatch({}, TODAY)).toEqual({ ok: false, code: "bad_input" });
  });
  it("membre : le champ `status` UNIQUEMENT", () => {
    expect(parseMemberActionPatch({ status: "done" })).toEqual({ ok: true, value: "done" });
    expect(parseMemberActionPatch({ status: "done", title: "x" })).toEqual({ ok: false, code: "forbidden_field" });
    expect(parseMemberActionPatch({ status: "done", completed_at: "2026-06-10T10:00:00Z" })).toEqual({ ok: false, code: "forbidden_field" });
    expect(parseMemberActionPatch({ status: "done", member_id: M })).toEqual({ ok: false, code: "forbidden_field" });
    expect(parseMemberActionPatch({})).toMatchObject({ ok: false, code: "bad_status" });
    expect(parseMemberActionPatch({ status: "nope" })).toMatchObject({ ok: false, code: "bad_status" });
  });
});

describe("transitions d'actions (miroir de la fonction SQL)", () => {
  it("membre : seulement todo→in_progress, todo→done, in_progress→done (matrice exhaustive)", () => {
    const allowed = new Set(["todo>in_progress", "todo>done", "in_progress>done"]);
    for (const from of ACTION_STATUSES) for (const to of ACTION_STATUSES) {
      expect(canMemberTransition(from, to), `${from}>${to}`).toBe(allowed.has(`${from}>${to}`));
    }
  });
  it("membre : jamais « cancelled », jamais de retour en arrière, jamais depuis un état terminal", () => {
    for (const from of ACTION_STATUSES) expect(canMemberTransition(from, "cancelled")).toBe(false);
    expect(canMemberTransition("done", "in_progress")).toBe(false);
    expect(canMemberTransition("cancelled", "todo")).toBe(false);
  });
  it("coach : tout statut différent (réouverture comprise) ; jamais le même statut", () => {
    for (const from of ACTION_STATUSES) for (const to of ACTION_STATUSES) expect(canCoachTransition(from as ActionStatus, to)).toBe(from !== to);
    expect(canCoachTransition("done", "in_progress")).toBe(true);
  });
});

describe("indicateur « comptes rendus à compléter »", () => {
  const sessions = [{ id: "s1", status: "completed" }, { id: "s2", status: "completed" }, { id: "s3", status: "scheduled" }, { id: "s4", status: "cancelled" }, { id: "s5", status: "completed" }];
  it("séance réalisée SANS compte rendu publié lié : à compléter", () => {
    expect(reportsToComplete(sessions, [])).toEqual(["s1", "s2", "s5"]);
  });
  it("un compte rendu PUBLIÉ lié satisfait la séance", () => {
    expect(reportsToComplete(sessions, [{ session_id: "s1", published_at: "2026-06-01T10:00:00Z" }])).toEqual(["s2", "s5"]);
  });
  it("un BROUILLON ne compte pas comme terminé", () => {
    expect(reportsToComplete(sessions, [{ session_id: "s1", published_at: null }])).toEqual(["s1", "s2", "s5"]);
  });
  it("un compte rendu SANS séance ne satisfait aucune séance ; une note privée ne change rien (elle n'est pas un argument)", () => {
    expect(reportsToComplete(sessions, [{ session_id: null, published_at: "2026-06-01T10:00:00Z" }])).toEqual(["s1", "s2", "s5"]);
  });
  it("seules les séances « completed » comptent (pas scheduled, cancelled, postponed, no_show)", () => {
    expect(reportsToComplete([{ id: "a", status: "scheduled" }, { id: "b", status: "postponed" }, { id: "c", status: "no_show" }], [])).toEqual([]);
  });
});

describe("DTO : listes blanches par rôle", () => {
  const note: NoteRow = { id: "n", coach_id: "c", member_id: M, session_id: null, objectives: "o", topics: "t", points_to_support: "p", observations: "obs", next_steps: "n", deleted_at: null, created_at: "x", updated_at: "y" };
  const report: ReportRow = { id: "r", coach_id: "c", member_id: M, session_id: S, title: "T", summary: "S", published_at: "2026-06-01T00:00:00Z", created_at: "x", updated_at: "y" };
  const action: ActionRow = { id: "a", coach_id: "c", member_id: M, session_id: null, title: "T", description: "D", due_date: null, status: "todo", owner: "member", visible_to_member: true, completed_at: null, created_at: "x", updated_at: "y" };
  const session: SessionRow = { id: "s", coach_id: "c", member_id: M, assignment_id: "as", type: "individual", status: "scheduled", scheduled_at: "2026-06-12T10:00:00Z", duration_minutes: 60, timezone: "UTC", topic: "t", rescheduled_to: null, completed_at: null, cancelled_at: null, created_at: "x" };

  it("clés exactes pour chaque DTO", () => {
    expect(Object.keys(toCoachNoteDto(note)).sort()).toEqual([...COACH_NOTE_KEYS].sort());
    expect(Object.keys(toCoachReportDto(report)).sort()).toEqual([...COACH_REPORT_KEYS].sort());
    expect(Object.keys(toCoachActionDto(action)).sort()).toEqual([...COACH_ACTION_KEYS].sort());
    expect(Object.keys(toMemberReportDto(report, "Awa")!).sort()).toEqual([...MEMBER_REPORT_KEYS].sort());
    expect(Object.keys(toMemberActionDto(action, "Awa")!).sort()).toEqual([...MEMBER_ACTION_KEYS].sort());
    expect(Object.keys(toCoachSessionDto(session)).sort()).toEqual([...COACH_SESSION_KEYS].sort());
    expect(Object.keys(toMemberSessionDto(session, "Awa")).sort()).toEqual([...MEMBER_SESSION_KEYS].sort());
  });
  it("AUCUN champ de note privée n'existe dans les DTO destinés au membre (par construction)", () => {
    const forbidden = ["objectives", "topics", "pointsToSupport", "points_to_support", "observations", "nextSteps", "next_steps", "coachId", "coach_id", "assignmentId", "memberId"];
    for (const keys of [MEMBER_REPORT_KEYS, MEMBER_ACTION_KEYS, MEMBER_SESSION_KEYS] as readonly (readonly string[])[]) {
      for (const k of keys) expect(forbidden, k).not.toContain(k);
    }
  });
  it("un brouillon n'a pas de DTO membre ; une action invisible non plus", () => {
    expect(toMemberReportDto({ ...report, published_at: null }, "Awa")).toBeNull();
    expect(toMemberActionDto({ ...action, visible_to_member: false }, "Awa")).toBeNull();
  });
  it("canUpdate : vrai seulement si le membre est responsable", () => {
    expect(toMemberActionDto({ ...action, owner: "member" }, null)!.canUpdate).toBe(true);
    expect(toMemberActionDto({ ...action, owner: "coach" }, null)!.canUpdate).toBe(false);
  });
  it("les DTO n'ajoutent jamais de champ supplémentaire même si la ligne en contient (liste blanche stricte)", () => {
    const polluted = { ...note, secret: "PRIVATE_MARKER", email: "x@y.fr" } as NoteRow;
    expect(JSON.stringify(toCoachNoteDto(polluted))).not.toContain("PRIVATE_MARKER");
    const rp = { ...report, hidden: "PRIVATE_MARKER" } as ReportRow;
    expect(JSON.stringify(toMemberReportDto(rp, null))).not.toContain("PRIVATE_MARKER");
  });
});
