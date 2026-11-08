import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Row } from "@/test-utils/fake-db";
import { deepKeys } from "@/test-utils/fake-db";
import { createLot3Rpc } from "@/test-utils/fake-lot3-sql";
import { COACH_NOTE_KEYS } from "@/lib/coach/notes-dto";
import { COACH_ACTION_KEYS, COACH_REPORT_KEYS, MEMBER_ACTION_KEYS, MEMBER_REPORT_KEYS } from "@/lib/coach/content-dto";
import { COACH_SESSION_KEYS, MEMBER_SESSION_KEYS } from "@/lib/coach/sessions-dto";

/**
 * Routes du lot 3 — vraie pile d'authentification et de contrôle d'accès contre un faux client. Les FONCTIONS SQL sont
 * simulées en mémoire (`fake-lot3-sql.ts`) : ces tests prouvent la logique des routes (accès, 404, erreurs, audit, DTO,
 * confidentialité), PAS le comportement réel de Postgres (triggers, verrous), qui reste à valider sur Supabase de dev.
 */
const world = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  user: null as null | { id: string; email: string },
  rpc: undefined as undefined | ((fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null }),
  failWhen: undefined as undefined | ((q: { table: string; op: string; columns: string; filters: [string, string, unknown][] }) => { code?: string; message: string } | null),
  log: [] as { table: string; op: string; columns: string; filters: [string, string, unknown][] }[],
  rpcCalls: [] as { fn: string; args: Record<string, unknown> }[],
  insertDefaults: undefined as undefined | Record<string, Record<string, unknown>>,
}));
const limiter = vi.hoisted(() => ({ allow: true }));

vi.mock("@/lib/supabase-admin", async () => {
  const { createFakeDb } = await import("@/test-utils/fake-db");
  return { getSupabaseAdmin: () => createFakeDb(world as never) };
});
vi.mock("@/lib/otp", () => ({ checkRateLimit: async () => limiter.allow, recordRateLimit: async () => {} }));

const COACH = "c0000000-0000-4000-8000-000000000001";
const OTHER_COACH = "c0000000-0000-4000-8000-000000000002";
const M1 = "a0000001-0000-4000-8000-000000000000"; // accompagné par COACH
const M2 = "a0000002-0000-4000-8000-000000000000"; // proposition en attente
const M6 = "a0000006-0000-4000-8000-000000000000"; // accompagné par un AUTRE coach
const M7 = "a0000007-0000-4000-8000-000000000000"; // accompagné par COACH (second membre)
const UNKNOWN = "b0000000-0000-4000-8000-0000000000ff";
const PRIVATE_NOTE = "CONTENU-PRIVE-DE-NOTE-XYZ";

const profile = (id: string, pseudo: string, over: Row = {}): Row => ({ id, pseudo, avatar_url: null, country: "CM", city: "Douala", status: "approved", account_type: "member", email: `${pseudo}@x.fr`, ...over });
const assignment = (id: string, coach: string, member: string, over: Row = {}): Row => ({
  id, coach_id: coach, member_id: member, status: "active", consent_status: "accepted", assigned_at: "2026-01-01T00:00:00Z", consent_at: "2026-02-01T00:00:00Z", ...over,
});

type Caller = "coach" | "coach_suspended" | "member" | "anonymous";
function seed(caller: Caller = "coach") {
  world.log.length = 0; world.rpcCalls.length = 0; world.failWhen = undefined; limiter.allow = true;
  world.insertDefaults = {
    coach_notes: { deleted_at: null, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
    coach_shared_reports: { published_at: null, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
    coach_action_items: { status: "todo", completed_at: null, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
  };
  world.tables = {
    coach_accounts: [
      { user_id: COACH, email: "coach@x.fr", display_name: "Coach Awa", active: caller !== "coach_suspended" },
      { user_id: OTHER_COACH, email: "autre@x.fr", display_name: "Autre Coach", active: true },
    ],
    profiles: [
      profile(M1, "Awa"), profile(M2, "Pending"), profile(M6, "AutreCoachMember"), profile(M7, "Binta"),
      { id: COACH, status: caller === "coach_suspended" ? "suspended" : "approved", account_type: caller === "member" ? "member" : "coach", email: "coach@x.fr" },
      { id: OTHER_COACH, status: "approved", account_type: "coach", email: "autre@x.fr" },
    ],
    coach_member_assignments: [
      assignment("as1", COACH, M1), assignment("as7", COACH, M7),
      assignment("as2", COACH, M2, { status: "pending", consent_status: "pending", consent_at: null }),
      assignment("as6", OTHER_COACH, M6),
    ],
    coach_sessions: [], coach_notes: [], coach_shared_reports: [], coach_action_items: [], coach_audit_logs: [], coach_notifications: [],
  };
  world.user = caller === "anonymous" ? null : { id: COACH, email: "coach@x.fr" };
  world.rpc = createLot3Rpc(world as never);
}
const asMember = (id: string) => { world.user = { id, email: `${id}@x.fr` }; };
const asCoach = (id: string) => { world.user = { id, email: `${id}@x.fr` }; };

const req = (url: string, method = "GET", body?: unknown) =>
  new NextRequest(`http://localhost${url}`, { method, headers: { authorization: "Bearer t", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
const rows = (name: string) => world.tables[name];
const addSession = (over: Row = {}): Row => {
  const row: Row = {
    id: `5e000000-0000-4000-8000-${String(rows("coach_sessions").length + 1).padStart(12, "0")}`, coach_id: COACH, member_id: M1, assignment_id: "as1", type: "individual",
    status: "scheduled", scheduled_at: inHours(48), duration_minutes: 60, timezone: "UTC", topic: null, rescheduled_to: null, completed_at: null, cancelled_at: null, created_at: "2026-06-01T00:00:00Z", ...over,
  };
  rows("coach_sessions").push(row);
  return row;
};
const sessionBody = (over: Record<string, unknown> = {}) => ({ member_id: M1, type: "individual", duration_minutes: 60, timezone: "UTC", scheduled_at: inHours(72), ...over });
const auditActions = () => rows("coach_audit_logs").map((r) => r.action);

beforeEach(() => seed());

// ── Accès ───────────────────────────────────────────────────────────────────────────────────────
describe("accès : seul un coach actif atteint les routes du lot 3", () => {
  const calls: [string, () => Promise<Response>][] = [
    ["GET /sessions", async () => (await import("./sessions/route")).GET(req("/api/coach/sessions"))],
    ["POST /sessions", async () => (await import("./sessions/route")).POST(req("/api/coach/sessions", "POST", sessionBody()))],
    ["GET /sessions/[id]", async () => (await import("./sessions/[id]/route")).GET(req("/x"), ctx(M1))],
    ["PATCH /sessions/[id]", async () => (await import("./sessions/[id]/route")).PATCH(req("/x", "PATCH", { action: "cancel" }), ctx(M1))],
    ["GET /members/[id]/notes", async () => (await import("./members/[id]/notes/route")).GET(req("/x"), ctx(M1))],
    ["POST /members/[id]/notes", async () => (await import("./members/[id]/notes/route")).POST(req("/x", "POST", { objectives: "x" }), ctx(M1))],
    ["PATCH /notes/[id]", async () => (await import("./notes/[id]/route")).PATCH(req("/x", "PATCH", { topics: "x" }), ctx(M1))],
    ["DELETE /notes/[id]", async () => (await import("./notes/[id]/route")).DELETE(req("/x", "DELETE"), ctx(M1))],
    ["GET /members/[id]/reports", async () => (await import("./members/[id]/reports/route")).GET(req("/x"), ctx(M1))],
    ["POST /members/[id]/reports", async () => (await import("./members/[id]/reports/route")).POST(req("/x", "POST", {}), ctx(M1))],
    ["GET /reports", async () => (await import("./reports/route")).GET(req("/api/coach/reports"))],
    ["PATCH /reports/[id]", async () => (await import("./reports/[id]/route")).PATCH(req("/x", "PATCH", { action: "publish" }), ctx(M1))],
    ["GET /actions", async () => (await import("./actions/route")).GET(req("/api/coach/actions"))],
    ["POST /actions", async () => (await import("./actions/route")).POST(req("/api/coach/actions", "POST", { member_id: M1, title: "x" }))],
    ["PATCH /actions/[id]", async () => (await import("./actions/[id]/route")).PATCH(req("/x", "PATCH", { status: "done" }), ctx(M1))],
  ];
  it.each(["coach_suspended", "member", "anonymous"] as const)("%s → 403 partout, aucune écriture", async (caller) => {
    seed(caller);
    for (const [name, run] of calls) {
      const res = await run();
      expect(res.status, name).toBe(403);
      expect(res.headers.get("cache-control"), name).toBe("private, no-store");
    }
    expect(world.rpcCalls.filter((c) => c.fn !== "coach_can_access_member")).toHaveLength(0);
    for (const t of ["coach_sessions", "coach_notes", "coach_shared_reports", "coach_action_items", "coach_audit_logs"]) expect(rows(t), t).toHaveLength(0);
  });
});

// ── Séances ─────────────────────────────────────────────────────────────────────────────────────
describe("POST /api/coach/sessions", () => {
  it("création : 201, DTO exact, audit sans contenu, séance rattachée à l'attribution", async () => {
    const { POST } = await import("./sessions/route");
    const res = await POST(req("/api/coach/sessions", "POST", sessionBody({ topic: "Premier échange" })));
    expect(res.status).toBe(201);
    const { session } = await res.json();
    expect(Object.keys(session).sort()).toEqual([...COACH_SESSION_KEYS].sort());
    expect(session).toMatchObject({ memberId: M1, type: "individual", status: "scheduled", durationMinutes: 60, topic: "Premier échange" });
    expect(auditActions()).toEqual(["session_created"]);
    expect(rows("coach_sessions")[0].assignment_id).toBe("as1");
  });
  it("heure locale d'un fuseau : convertie en UTC côté serveur", async () => {
    const { POST } = await import("./sessions/route");
    const day = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
    const res = await POST(req("/x", "POST", { member_id: M1, type: "review", duration_minutes: 45, timezone: "Africa/Douala", local: `${day}T10:00` }));
    expect(res.status).toBe(201);
    expect((await res.json()).session.scheduledAt).toBe(`${day}T09:00:00.000Z`);
  });
  it.each([
    ["membre dont la proposition est en attente", M2], ["membre d'un AUTRE coach", M6], ["membre inconnu", UNKNOWN],
  ])("%s → 404 identique, aucune séance, aucun appel de création", async (_n, member) => {
    const { POST } = await import("./sessions/route");
    const res = await POST(req("/x", "POST", sessionBody({ member_id: member })));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "not_found" });
    expect(rows("coach_sessions")).toHaveLength(0);
    expect(world.rpcCalls.some((c) => c.fn === "coach_schedule_session")).toBe(false);
    expect(auditActions()).toHaveLength(0);
  });
  it("accès perdu entre-temps (consentement retiré) : refus immédiat, 404", async () => {
    rows("coach_member_assignments").find((r) => r.id === "as1")!.status = "revoked";
    rows("coach_member_assignments").find((r) => r.id === "as1")!.consent_status = "withdrawn";
    const { POST } = await import("./sessions/route");
    expect((await POST(req("/x", "POST", sessionBody()))).status).toBe(404);
  });
  it.each([
    [{ member_id: "pas-uuid" }, 400, "bad_member"], [{ type: "couple" }, 400, "bad_type"], [{ duration_minutes: 17 }, 400, "bad_duration"],
    [{ duration_minutes: 15 }, 201, undefined], [{ timezone: "Mars/Olympus" }, 400, "bad_timezone"], [{ topic: "x".repeat(201) }, 400, "bad_topic"],
    [{ scheduled_at: "2026-06-02T10:00" }, 400, "naive_datetime"], [{ scheduled_at: new Date(Date.now() - 86400_000).toISOString() }, 400, "past"],
  ] as const)("corps %j → %i %s", async (over, status, code) => {
    const { POST } = await import("./sessions/route");
    const res = await POST(req("/x", "POST", sessionBody(over as Record<string, unknown>)));
    expect(res.status).toBe(status);
    if (code) expect((await res.json()).code).toBe(code);
  });
  it("heure locale AMBIGUË (changement d'heure) : 400 avec les deux instants proposés ; avec `disambiguation` : acceptée", async () => {
    const { POST } = await import("./sessions/route");
    const target = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 9, 25)); // dernier dimanche d'octobre approx. : on vise le retour d'automne
    const year = target.getUTCFullYear();
    // dernier dimanche d'octobre de l'année suivante
    const d = new Date(Date.UTC(year, 9, 31)); d.setUTCDate(31 - d.getUTCDay());
    const day = d.toISOString().slice(0, 10);
    const body = { member_id: M1, type: "individual", duration_minutes: 60, timezone: "Europe/Paris", local: `${day}T02:30` };
    const first = await POST(req("/x", "POST", body));
    expect(first.status).toBe(400);
    const j = await first.json();
    expect(j.code).toBe("ambiguous_local_time");
    expect(j.candidates).toHaveLength(2);
    const retry = await POST(req("/x", "POST", { ...body, disambiguation: "later" }));
    expect(retry.status).toBe(201);
    expect((await retry.json()).session.scheduledAt).toBe(j.candidates[1]);
  });
  it("chevauchement : même coach → 409 ; MÊME MEMBRE avec un autre coach → 409 ; créneau voisin accepté", async () => {
    const { POST } = await import("./sessions/route");
    const at = inHours(100);
    expect((await POST(req("/x", "POST", sessionBody({ scheduled_at: at })))).status).toBe(201);
    const same = await POST(req("/x", "POST", sessionBody({ scheduled_at: at, member_id: M7 })));
    expect(same.status).toBe(409); // même coach, autre membre
    expect((await same.json()).code).toBe("overlap");
    // Un autre coach, même membre : on simule l'attribution active d'un second coach pour ce membre.
    rows("coach_member_assignments").push(assignment("as9", OTHER_COACH, M1));
    asCoach(OTHER_COACH);
    const other = await POST(req("/x", "POST", sessionBody({ scheduled_at: at, member_id: M1 })));
    expect(other.status).toBe(409);
    asCoach(COACH);
    const after = new Date(new Date(at).getTime() + 60 * 60_000).toISOString();
    expect((await POST(req("/x", "POST", sessionBody({ scheduled_at: after })))).status).toBe(201);
  });
  it("limiteur d'écriture dépassé : 429 rate_limited, aucune séance", async () => {
    limiter.allow = false;
    const { POST } = await import("./sessions/route");
    const res = await POST(req("/x", "POST", sessionBody()));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("rate_limited");
    expect(rows("coach_sessions")).toHaveLength(0);
  });
  it("erreur SQL inattendue : 500 générique, aucun détail interne", async () => {
    const sim = world.rpc!;
    world.rpc = (fn, args) => (fn === "coach_schedule_session" ? { data: null, error: { message: "connection reset by peer 10.0.0.5" } } : sim(fn, args));
    const { POST } = await import("./sessions/route");
    const res = await POST(req("/x", "POST", sessionBody()));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.5");
  });
});

describe("GET /api/coach/sessions", () => {
  it("liste uniquement MES séances pour les membres que j'accompagne encore ; DTO exact + pseudo seul", async () => {
    addSession({ member_id: M1 });
    addSession({ member_id: M6, coach_id: OTHER_COACH, assignment_id: "as6" });
    addSession({ member_id: M2, assignment_id: "as2" }); // proposition en attente : invisible
    const { GET } = await import("./sessions/route");
    const body = await (await GET(req("/api/coach/sessions"))).json();
    expect(body.sessions).toHaveLength(1);
    expect(Object.keys(body.sessions[0]).sort()).toEqual([...COACH_SESSION_KEYS, "member"].sort());
    expect(body.sessions[0].member).toEqual({ pseudo: "Awa" });
    expect(JSON.stringify(body)).not.toContain("@x.fr");
  });
  it("consentement retiré : les séances du membre disparaissent immédiatement de la liste", async () => {
    addSession({ member_id: M1 });
    const a = rows("coach_member_assignments").find((r) => r.id === "as1")!;
    a.status = "revoked"; a.consent_status = "withdrawn";
    const { GET } = await import("./sessions/route");
    expect((await (await GET(req("/api/coach/sessions"))).json()).sessions).toHaveLength(0);
  });
  it("filtres validés : statut inconnu, UUID invalide, période sans décalage → 400 ; statut valide filtre", async () => {
    addSession({ status: "completed", completed_at: "2026-06-01T10:00:00Z", scheduled_at: inHours(-48) });
    addSession();
    const { GET } = await import("./sessions/route");
    for (const q of ["status=bogus", "member_id=zzz", "from=2026-01-01", "to=pas-une-date"]) expect((await GET(req(`/api/coach/sessions?${q}`))).status, q).toBe(400);
    expect((await (await GET(req("/api/coach/sessions?status=completed"))).json()).sessions).toHaveLength(1);
    expect((await (await GET(req("/api/coach/sessions?status=all"))).json()).sessions).toHaveLength(2);
  });
});

describe("GET /api/coach/sessions/[id]", () => {
  it("ma séance : détail ; séance d'un autre coach, d'un membre non accompagné ou inconnue : même 404", async () => {
    const mine = addSession();
    const theirs = addSession({ coach_id: OTHER_COACH, member_id: M6, assignment_id: "as6" });
    const pending = addSession({ member_id: M2, assignment_id: "as2" });
    const { GET } = await import("./sessions/[id]/route");
    expect((await GET(req("/x"), ctx(mine.id as string))).status).toBe(200);
    for (const id of [theirs.id as string, pending.id as string, UNKNOWN]) {
      const res = await GET(req("/x"), ctx(id));
      expect(res.status, id).toBe(404);
      expect(await res.json()).toEqual({ error: "Introuvable", code: "not_found" });
    }
    expect((await GET(req("/x"), ctx("pas-uuid"))).status).toBe(400);
  });
});

describe("PATCH /api/coach/sessions/[id] : actions", () => {
  const patch = async (id: string, body: unknown) => (await import("./sessions/[id]/route")).PATCH(req("/x", "PATCH", body), ctx(id));

  it("complete : refusée avant le début (409 not_started), acceptée après ; audit sans contenu", async () => {
    const future = addSession();
    const r1 = await patch(future.id as string, { action: "complete" });
    expect(r1.status).toBe(409);
    expect((await r1.json()).code).toBe("not_started");
    const past = addSession({ scheduled_at: inHours(-3), member_id: M7, assignment_id: "as7" });
    const r2 = await patch(past.id as string, { action: "complete" });
    expect(r2.status).toBe(200);
    expect((await r2.json()).session.status).toBe("completed");
    expect(auditActions()).toEqual(["session_completed"]);
  });
  it("une séance terminée/annulée est FIGÉE : toute nouvelle action → 409 not_scheduled, édition aussi", async () => {
    const s = addSession();
    expect((await patch(s.id as string, { action: "cancel" })).status).toBe(200);
    for (const body of [{ action: "cancel" }, { action: "complete" }, { action: "reschedule", scheduled_at: inHours(90), timezone: "UTC", duration_minutes: 60 }, { topic: "x" }]) {
      const res = await patch(s.id as string, body);
      expect(res.status, JSON.stringify(body)).toBe(409);
      expect((await res.json()).code).toBe("not_scheduled");
    }
  });
  it("REPROGRAMMER : même séance (même id), nouvel horaire, statut inchangé, audit avec anciens/nouveaux horaires", async () => {
    const s = addSession({ scheduled_at: inHours(50) });
    const newAt = inHours(120);
    const res = await patch(s.id as string, { action: "reschedule", scheduled_at: newAt, timezone: "UTC", duration_minutes: 90 });
    expect(res.status).toBe(200);
    const { session } = await res.json();
    expect(session).toMatchObject({ id: s.id, status: "scheduled", durationMinutes: 90, rescheduledTo: null });
    expect(new Date(session.scheduledAt).toISOString()).toBe(new Date(newAt).toISOString());
    expect(rows("coach_sessions")).toHaveLength(1);
    expect(auditActions()).toEqual(["session_rescheduled"]);
    const meta = rows("coach_audit_logs")[0].metadata as Record<string, unknown>;
    expect(Object.keys(meta).sort()).toEqual(["from_at", "member_id", "to_at"]);
  });
  it("REPORTER : l'ancienne séance passe à « postponed » et pointe vers une NOUVELLE séance « scheduled » (deux lignes)", async () => {
    const s = addSession({ scheduled_at: inHours(50) });
    const res = await patch(s.id as string, { action: "postpone", scheduled_at: inHours(200), timezone: "UTC", duration_minutes: 60 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.id).not.toBe(s.id);
    expect(body.session.status).toBe("scheduled");
    expect(body.previous).toMatchObject({ id: s.id, status: "postponed", rescheduledTo: body.session.id });
    expect(rows("coach_sessions")).toHaveLength(2);
    expect(auditActions()).toEqual(["session_postponed"]);
  });
  it("reprogrammer ET reporter refusent un conflit (409 overlap) et ne changent rien", async () => {
    const a = addSession({ scheduled_at: inHours(50) });
    addSession({ scheduled_at: inHours(120), member_id: M7, assignment_id: "as7" });
    for (const action of ["reschedule", "postpone"]) {
      const res = await patch(a.id as string, { action, scheduled_at: inHours(120), timezone: "UTC", duration_minutes: 60 });
      expect(res.status, action).toBe(409);
      expect((await res.json()).code).toBe("overlap");
    }
    expect(rows("coach_sessions")).toHaveLength(2);
    expect(a.status).toBe("scheduled");
  });
  it("reprogrammer vers le passé → 400 ; durée invalide → 400 ; instant naïf → 400", async () => {
    const s = addSession();
    for (const [body, code] of [
      [{ action: "reschedule", scheduled_at: inHours(-5), timezone: "UTC", duration_minutes: 60 }, "past"],
      [{ action: "postpone", scheduled_at: inHours(90), timezone: "UTC", duration_minutes: 44 }, "bad_duration"],
      [{ action: "reschedule", scheduled_at: "2030-01-01T10:00", timezone: "UTC", duration_minutes: 60 }, "naive_datetime"],
    ] as const) {
      const res = await patch(s.id as string, body);
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe(code);
    }
  });
  it("ressource d'un AUTRE coach ou d'un membre non accompagné : 404, aucune opération SQL de modification", async () => {
    const theirs = addSession({ coach_id: OTHER_COACH, member_id: M6, assignment_id: "as6" });
    const pending = addSession({ member_id: M2, assignment_id: "as2" });
    for (const id of [theirs.id as string, pending.id as string]) {
      expect((await patch(id, { action: "cancel" })).status).toBe(404);
    }
    expect(world.rpcCalls.filter((c) => c.fn !== "coach_can_access_member")).toHaveLength(0);
    expect(theirs.status).toBe("scheduled");
  });
  it("champs interdits (horaire, durée, statut, coach_id, member_id…) : 400 forbidden_field, AUCUNE écriture ni appel SQL", async () => {
    const s = addSession();
    const writesBefore = world.log.filter((q) => q.op !== "select").length;
    for (const body of [{ scheduled_at: inHours(9) }, { duration_minutes: 30 }, { status: "completed" }, { coach_id: OTHER_COACH }, { member_id: M7 }, { topic: "x", status: "cancelled" }, { action: "cancel", topic: "x" }]) {
      const res = await patch(s.id as string, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect((await res.json()).code).toBe("forbidden_field");
    }
    expect(world.log.filter((q) => q.op !== "select").length).toBe(writesBefore);
    expect(world.rpcCalls.filter((c) => c.fn !== "coach_can_access_member")).toHaveLength(0);
  });
  it("édition du sujet et du type : autorisée tant que « scheduled », type « couple » refusé", async () => {
    const s = addSession();
    const ok = await patch(s.id as string, { topic: " Nouveau sujet ", type: "review" });
    expect(ok.status).toBe(200);
    expect(rows("coach_sessions")[0]).toMatchObject({ topic: "Nouveau sujet", type: "review" });
    expect((await patch(s.id as string, { type: "couple" })).status).toBe(400);
    expect(auditActions()).toEqual(["session_updated"]);
  });
  it("action inconnue → 400 ; identifiant invalide → 400", async () => {
    const s = addSession();
    expect((await patch(s.id as string, { action: "delete" })).status).toBe(400);
    expect((await patch("pas-uuid", { action: "cancel" })).status).toBe(400);
  });
});

// ── Notes privées ───────────────────────────────────────────────────────────────────────────────
describe("notes privées", () => {
  const post = async (member: string, body: unknown) => (await import("./members/[id]/notes/route")).POST(req("/x", "POST", body), ctx(member));
  const list = async (member: string) => (await import("./members/[id]/notes/route")).GET(req("/x"), ctx(member));

  it("création : 201, DTO exact, audit SANS contenu", async () => {
    const res = await post(M1, { objectives: PRIVATE_NOTE, observations: "obs" });
    expect(res.status).toBe(201);
    const { note } = await res.json();
    expect(Object.keys(note).sort()).toEqual([...COACH_NOTE_KEYS].sort());
    expect(note).toMatchObject({ memberId: M1, sessionId: null, objectives: PRIVATE_NOTE });
    expect(auditActions()).toEqual(["note_created"]);
    expect(JSON.stringify(rows("coach_audit_logs"))).not.toContain(PRIVATE_NOTE);
    expect(JSON.stringify(rows("coach_audit_logs"))).not.toContain("obs");
  });
  it.each([["membre en attente", M2], ["membre d'un autre coach", M6], ["inconnu", UNKNOWN]])("%s → 404, rien n'est créé", async (_n, member) => {
    expect((await post(member, { objectives: "x" })).status).toBe(404);
    expect((await list(member)).status).toBe(404);
    expect(rows("coach_notes")).toHaveLength(0);
  });
  it("rattachement à une séance : la séance doit appartenir à CE coach ET à CE membre (sinon 404)", async () => {
    const own = addSession({ member_id: M1 });
    const ofOtherMember = addSession({ member_id: M7, assignment_id: "as7" });
    const ofOtherCoach = addSession({ coach_id: OTHER_COACH, member_id: M6, assignment_id: "as6" });
    expect((await post(M1, { objectives: "x", session_id: own.id })).status).toBe(201);
    expect((await post(M1, { objectives: "x", session_id: ofOtherMember.id })).status).toBe(404);
    expect((await post(M1, { objectives: "x", session_id: ofOtherCoach.id })).status).toBe(404);
    expect((await post(M1, { objectives: "x", session_id: UNKNOWN })).status).toBe(404);
    expect(rows("coach_notes")).toHaveLength(1);
  });
  it("liste : uniquement mes notes non supprimées pour CE membre", async () => {
    await post(M1, { objectives: "a" });
    await post(M7, { objectives: "b" });
    rows("coach_notes").push({ id: "n-other", coach_id: OTHER_COACH, member_id: M1, session_id: null, objectives: "autre coach", topics: "", points_to_support: "", observations: "", next_steps: "", deleted_at: null, created_at: "x", updated_at: "x" });
    const body = await (await list(M1)).json();
    expect(body.notes.map((n: { objectives: string }) => n.objectives)).toEqual(["a"]);
  });
  it("PATCH : texte seulement ; session_id / coach_id / member_id refusés ; note d'un autre coach → 404 ; ne peut pas devenir vide", async () => {
    const { note } = await (await post(M1, { objectives: "initial" })).json();
    const { PATCH } = await import("./notes/[id]/route");
    const ok = await PATCH(req("/x", "PATCH", { topics: "ajout" }), ctx(note.id));
    expect(ok.status).toBe(200);
    expect((await ok.json()).note.topics).toBe("ajout");
    for (const k of ["session_id", "coach_id", "member_id"]) expect((await PATCH(req("/x", "PATCH", { [k]: UNKNOWN }), ctx(note.id))).status, k).toBe(400);
    expect((await PATCH(req("/x", "PATCH", { objectives: "", topics: "" }), ctx(note.id))).status).toBe(400);
    asCoach(OTHER_COACH);
    expect((await PATCH(req("/x", "PATCH", { topics: "intrusion" }), ctx(note.id))).status).toBe(404);
    expect(rows("coach_notes")[0].topics).toBe("ajout");
  });
  it("DELETE : suppression LOGIQUE (deleted_at), la note disparaît de la liste ; autre coach → 404", async () => {
    const { note } = await (await post(M1, { objectives: "à supprimer" })).json();
    const { DELETE } = await import("./notes/[id]/route");
    asCoach(OTHER_COACH);
    expect((await DELETE(req("/x", "DELETE"), ctx(note.id))).status).toBe(404);
    asCoach(COACH);
    expect((await DELETE(req("/x", "DELETE"), ctx(note.id))).status).toBe(200);
    expect(rows("coach_notes")).toHaveLength(1);
    expect(rows("coach_notes")[0].deleted_at).toEqual(expect.any(String));
    expect((await (await list(M1)).json()).notes).toHaveLength(0);
    expect((await DELETE(req("/x", "DELETE"), ctx(note.id))).status).toBe(404); // déjà supprimée
    expect(auditActions()).toEqual(["note_created", "note_deleted"]);
  });
  it("consentement retiré : la note n'est plus lisible NI modifiable par le coach (404), mais reste en base", async () => {
    const { note } = await (await post(M1, { objectives: PRIVATE_NOTE })).json();
    const a = rows("coach_member_assignments").find((r) => r.id === "as1")!;
    a.status = "revoked"; a.consent_status = "withdrawn";
    const { PATCH, DELETE } = await import("./notes/[id]/route");
    expect((await list(M1)).status).toBe(404);
    expect((await PATCH(req("/x", "PATCH", { topics: "x" }), ctx(note.id))).status).toBe(404);
    expect((await DELETE(req("/x", "DELETE"), ctx(note.id))).status).toBe(404);
    expect(rows("coach_notes")).toHaveLength(1);
  });
  it("contenu trop long (2001) → 400 ; aucun champ → 400", async () => {
    expect((await post(M1, { objectives: "x".repeat(2001) })).status).toBe(400);
    expect((await post(M1, {})).status).toBe(400);
  });
});

// ── Comptes rendus partagés et confidentialité côté membre ─────────────────────────────────────
describe("comptes rendus partagés", () => {
  const create = async (member: string, body: unknown = {}) => (await import("./members/[id]/reports/route")).POST(req("/x", "POST", body), ctx(member));
  const patch = async (id: string, body: unknown) => (await import("./reports/[id]/route")).PATCH(req("/x", "PATCH", body), ctx(id));

  it("création : BROUILLON (jamais publié), DTO exact ; membre non accompagné → 404", async () => {
    const res = await create(M1, { title: "T", summary: "S" });
    expect(res.status).toBe(201);
    const { report } = await res.json();
    expect(Object.keys(report).sort()).toEqual([...COACH_REPORT_KEYS].sort());
    expect(report.publishedAt).toBeNull();
    expect((await create(M2)).status).toBe(404);
    expect((await create(M6)).status).toBe(404);
  });
  it("publier exige titre ET résumé non vides (400 empty) ; puis publication, dépublication, audit", async () => {
    const { report } = await (await create(M1)).json();
    expect((await patch(report.id, { action: "publish" })).status).toBe(400);
    expect((await patch(report.id, { title: "Bilan", summary: "Résumé" })).status).toBe(200);
    const pub = await patch(report.id, { action: "publish" });
    expect(pub.status).toBe(200);
    expect((await pub.json()).report.publishedAt).toEqual(expect.any(String));
    const un = await patch(report.id, { action: "unpublish" });
    expect((await un.json()).report.publishedAt).toBeNull();
    expect(auditActions()).toEqual(["report_created", "report_updated", "report_published", "report_unpublished"]);
  });
  it("un compte rendu publié ne peut pas devenir vide (le membre le voit) : 400 tant qu'il n'est pas dépublié", async () => {
    const { report } = await (await create(M1, { title: "T", summary: "S" })).json();
    await patch(report.id, { action: "publish" });
    expect((await patch(report.id, { summary: "" })).status).toBe(400);
  });
  it("session_id et published_at ne s'écrivent pas par PATCH ; rapport d'un autre coach → 404", async () => {
    const { report } = await (await create(M1, { title: "T", summary: "S" })).json();
    expect((await patch(report.id, { session_id: UNKNOWN })).status).toBe(400);
    expect((await patch(report.id, { published_at: "2026-01-01T00:00:00Z" })).status).toBe(400);
    asCoach(OTHER_COACH);
    expect((await patch(report.id, { action: "publish" })).status).toBe(404);
  });
  it("rattachement à une séance d'un autre membre → 404 ; à la sienne → 201", async () => {
    const own = addSession({ member_id: M1 });
    const other = addSession({ member_id: M7, assignment_id: "as7" });
    expect((await create(M1, { session_id: other.id })).status).toBe(404);
    expect((await create(M1, { session_id: own.id })).status).toBe(201);
  });
  it("liste globale : brouillons/publiés filtrés, membres encore accompagnés seulement", async () => {
    const a = (await (await create(M1, { title: "A", summary: "a" })).json()).report;
    await create(M7, {});
    await patch(a.id, { action: "publish" });
    rows("coach_shared_reports").push({ id: "r-other", coach_id: OTHER_COACH, member_id: M6, session_id: null, title: "x", summary: "x", published_at: null, created_at: "x", updated_at: "x" });
    const { GET } = await import("./reports/route");
    expect((await (await GET(req("/api/coach/reports"))).json()).reports).toHaveLength(2);
    expect((await (await GET(req("/api/coach/reports?state=published"))).json()).reports).toHaveLength(1);
    expect((await (await GET(req("/api/coach/reports?state=draft"))).json()).reports).toHaveLength(1);
    expect((await GET(req("/api/coach/reports?state=bogus"))).status).toBe(400);
  });
});

describe("CONFIDENTIALITÉ côté membre : jamais de note privée, jamais de brouillon", () => {
  async function setup() {
    const notes = await import("./members/[id]/notes/route");
    const reports = await import("./members/[id]/reports/route");
    const rpatch = await import("./reports/[id]/route");
    await notes.POST(req("/x", "POST", { objectives: PRIVATE_NOTE, observations: PRIVATE_NOTE, next_steps: PRIVATE_NOTE }), ctx(M1));
    const draft = (await (await reports.POST(req("/x", "POST", { title: "BROUILLON-SECRET", summary: "brouillon" }), ctx(M1))).json()).report;
    const pub = (await (await reports.POST(req("/x", "POST", { title: "Publié", summary: "Résumé partagé" }), ctx(M1))).json()).report;
    await rpatch.PATCH(req("/x", "PATCH", { action: "publish" }), ctx(pub.id));
    return { draft, pub, rpatch };
  }
  const memberReports = async () => (await import("@/app/api/member/coach/reports/route")).GET(req("/api/member/coach/reports"));

  it("le membre ne reçoit QUE le compte rendu publié, avec les clés exactes, sans aucune note privée", async () => {
    await setup();
    asMember(M1);
    world.log.length = 0;
    const res = await memberReports();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toHaveLength(1);
    expect(Object.keys(body.reports[0]).sort()).toEqual([...MEMBER_REPORT_KEYS].sort());
    const text = JSON.stringify(body);
    for (const secret of [PRIVATE_NOTE, "BROUILLON-SECRET", "brouillon", "objectives", "observations", "next_steps", "points_to_support"]) expect(text, secret).not.toContain(secret);
    expect(body.reports[0].coachName).toBe("Coach Awa");
  });
  it("AUCUNE lecture de la table coach_notes par les routes membre", async () => {
    await setup();
    asMember(M1);
    world.log.length = 0;
    await memberReports();
    await (await import("@/app/api/member/coach/sessions/route")).GET(req("/api/member/coach/sessions"));
    await (await import("@/app/api/member/coach/actions/route")).GET(req("/api/member/coach/actions"));
    expect(world.log.some((q) => q.table === "coach_notes")).toBe(false);
  });
  it("dépublier retire IMMÉDIATEMENT l'accès du membre", async () => {
    const { pub, rpatch } = await setup();
    await rpatch.PATCH(req("/x", "PATCH", { action: "unpublish" }), ctx(pub.id));
    asMember(M1);
    expect((await (await memberReports()).json()).reports).toHaveLength(0);
  });
  it("le membre garde ses comptes rendus publiés APRÈS la fin du suivi ; le coach, lui, perd l'accès", async () => {
    const { pub, rpatch } = await setup();
    const a = rows("coach_member_assignments").find((r) => r.id === "as1")!;
    a.status = "revoked"; a.consent_status = "withdrawn";
    expect((await rpatch.PATCH(req("/x", "PATCH", { action: "unpublish" }), ctx(pub.id))).status).toBe(404); // le coach ne peut plus agir
    asMember(M1);
    expect((await (await memberReports()).json()).reports).toHaveLength(1);
  });
  it("un autre membre ne voit jamais les comptes rendus de M1 ; un coach appelant une route membre est refusé", async () => {
    await setup();
    asMember(M7);
    expect((await (await memberReports()).json()).reports).toHaveLength(0);
    asCoach(COACH);
    expect((await memberReports()).status).toBe(401);
  });
  it("test statique : aucune route membre ni administrateur ne référence la table des notes privées", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const n of readdirSync(dir)) { const f = join(dir, n); if (statSync(f).isDirectory()) walk(f, out); else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) out.push(f); }
      return out;
    };
    const root = process.cwd();
    for (const f of [...walk(join(root, "src/app/api/member")), ...walk(join(root, "src/app/api/admin")), ...walk(join(root, "src/components/dashboard")), ...walk(join(root, "src/components/admin"))]) {
      // Les commentaires qui NOMMENT la table pour expliquer la règle ne sont pas des références : seul le code compte.
      const code = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      expect(code, f).not.toMatch(/coach_notes|loadCoachNotes|NOTE_COLUMNS|notes-dto|notes-data|NoteRow|CoachNoteDto/);
    }
  });
});

// ── Actions ─────────────────────────────────────────────────────────────────────────────────────
describe("plan d'action", () => {
  const create = async (body: unknown) => (await import("./actions/route")).POST(req("/x", "POST", body));
  const patch = async (id: string, body: unknown) => (await import("./actions/[id]/route")).PATCH(req("/x", "PATCH", body), ctx(id));
  const today = () => new Date().toISOString().slice(0, 10);
  const memberPatch = async (id: string, body: unknown) => (await import("@/app/api/member/coach/actions/[id]/route")).PATCH(req("/x", "PATCH", body), ctx(id));

  it("création : statut TOUJOURS « todo » ; status, completed_at, coach_id refusés ; DTO exact ; audit", async () => {
    const res = await create({ member_id: M1, title: "Lire", due_date: today() });
    expect(res.status).toBe(201);
    const { action } = await res.json();
    expect(Object.keys(action).sort()).toEqual([...COACH_ACTION_KEYS].sort());
    expect(action).toMatchObject({ status: "todo", completedAt: null, owner: "member", visibleToMember: true });
    for (const extra of [{ status: "done" }, { completed_at: "2026-06-10T10:00:00Z" }, { coach_id: OTHER_COACH }]) {
      expect((await create({ member_id: M1, title: "x", ...extra })).status).toBe(400);
    }
    expect(auditActions()).toEqual(["action_created"]);
  });
  it.each([["membre en attente", M2], ["membre d'un autre coach", M6], ["inconnu", UNKNOWN]])("%s → 404", async (_n, member) => {
    expect((await create({ member_id: member, title: "x" })).status).toBe(404);
    expect(rows("coach_action_items")).toHaveLength(0);
  });
  it("échéance passée → 400 ; session d'un autre membre → 404", async () => {
    expect((await create({ member_id: M1, title: "x", due_date: "2020-01-01" })).status).toBe(400);
    const other = addSession({ member_id: M7, assignment_id: "as7" });
    expect((await create({ member_id: M1, title: "x", session_id: other.id })).status).toBe(404);
  });
  it("coach : statut via la fonction SQL — completed_at posé à « done », retiré à la réouverture ; transition identique refusée (409)", async () => {
    const { action } = await (await create({ member_id: M1, title: "x" })).json();
    const done = await patch(action.id, { status: "done" });
    expect((await done.json()).action).toMatchObject({ status: "done", completedAt: expect.any(String) });
    const again = await patch(action.id, { status: "done" });
    expect(again.status).toBe(409);
    expect((await again.json()).code).toBe("invalid_transition");
    const reopened = await patch(action.id, { status: "in_progress" });
    expect((await reopened.json()).action).toMatchObject({ status: "in_progress", completedAt: null });
  });
  it("coach : completed_at, session_id, owner, member_id dans le corps → 400 ; action d'un autre coach → 404", async () => {
    const { action } = await (await create({ member_id: M1, title: "x" })).json();
    for (const k of ["completed_at", "session_id", "owner", "member_id", "coach_id"]) expect((await patch(action.id, { [k]: UNKNOWN })).status, k).toBe(400);
    asCoach(OTHER_COACH);
    expect((await patch(action.id, { status: "done" })).status).toBe(404);
  });
  it("coach : une action dont le MEMBRE est responsable ne peut pas être rendue invisible", async () => {
    const { action } = await (await create({ member_id: M1, title: "x", owner: "member" })).json();
    expect((await patch(action.id, { visible_to_member: false })).status).toBe(400);
    const own = await (await create({ member_id: M1, title: "y", owner: "coach", visible_to_member: true })).json();
    expect((await patch(own.action.id, { visible_to_member: false })).status).toBe(200);
  });
  it("liste : seulement mes actions pour les membres encore accompagnés, filtre de statut validé", async () => {
    await create({ member_id: M1, title: "a" });
    rows("coach_action_items").push({ id: "x-other", coach_id: OTHER_COACH, member_id: M6, session_id: null, title: "z", description: "", due_date: null, status: "todo", owner: "member", visible_to_member: true, completed_at: null, created_at: "x", updated_at: "x" });
    const { GET } = await import("./actions/route");
    expect((await (await GET(req("/api/coach/actions"))).json()).actions).toHaveLength(1);
    expect((await GET(req("/api/coach/actions?status=bogus"))).status).toBe(400);
    expect((await (await GET(req(`/api/coach/actions?member_id=${M6}`))).json()).actions).toHaveLength(0);
  });

  describe("côté membre : seulement SES actions, seulement le statut", () => {
    async function memberAction(over: Record<string, unknown> = {}) {
      const { action } = await (await create({ member_id: M1, title: "Mon action", ...over })).json();
      asMember(M1);
      return action as { id: string };
    }
    it("todo → in_progress → done ; completed_at calculé par le serveur ; DTO membre exact", async () => {
      const a = await memberAction();
      const r1 = await memberPatch(a.id, { status: "in_progress" });
      expect(r1.status).toBe(200);
      const r2 = await memberPatch(a.id, { status: "done" });
      const body = await r2.json();
      expect(body.action).toMatchObject({ status: "done", completedAt: expect.any(String) });
      expect(Object.keys(body.action).sort()).toEqual([...MEMBER_ACTION_KEYS].sort());
    });
    it("transitions refusées : done→todo, cancelled, retour en arrière → 409 ou 400 selon le cas", async () => {
      const a = await memberAction();
      expect((await memberPatch(a.id, { status: "cancelled" })).status).toBe(409);
      await memberPatch(a.id, { status: "done" });
      expect((await memberPatch(a.id, { status: "todo" })).status).toBe(409);
      expect((await memberPatch(a.id, { status: "in_progress" })).status).toBe(409);
      expect((await memberPatch(a.id, { status: "done" })).status).toBe(409);
    });
    it("DOUBLE SOUMISSION concurrente : la seconde est jugée sur l'état déjà modifié (409) — une seule transition appliquée et auditée", async () => {
      const a = await memberAction();
      const [r1, r2] = await Promise.all([memberPatch(a.id, { status: "done" }), memberPatch(a.id, { status: "done" })]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      expect(rows("coach_audit_logs").filter((r) => r.action === "action_status_changed_by_member")).toHaveLength(1);
    });
    it("corps : seul `status` accepté — member_id, completed_at, title, coach_id refusés (400)", async () => {
      const a = await memberAction();
      for (const body of [{ status: "done", member_id: M7 }, { status: "done", completed_at: "2026-06-10T10:00:00Z" }, { status: "done", title: "x" }, { title: "x" }, {}]) {
        expect((await memberPatch(a.id, body)).status, JSON.stringify(body)).toBe(400);
      }
      expect(rows("coach_action_items")[0].status).toBe("todo");
    });
    it("action d'un AUTRE membre, action dont le COACH est responsable, action invisible, inconnue : même 404", async () => {
      const other = (await (await create({ member_id: M7, title: "autre" })).json()).action;
      const coachOwned = (await (await create({ member_id: M1, title: "coach", owner: "coach", visible_to_member: true })).json()).action;
      const hidden = (await (await create({ member_id: M1, title: "caché", owner: "coach", visible_to_member: false })).json()).action;
      asMember(M1);
      for (const id of [other.id, coachOwned.id, hidden.id, UNKNOWN]) {
        const res = await memberPatch(id, { status: "done" });
        expect(res.status, id).toBe(404);
      }
      expect(rows("coach_action_items").every((r) => r.status === "todo")).toBe(true);
    });
    it("audit : acteur « member » = identité du JETON (jamais le corps), une entrée par transition appliquée, aucun contenu ; rien sur un refus", async () => {
      const a = await memberAction({ title: "TITRE-A-NE-PAS-JOURNALISER", description: "DESCRIPTION-SECRETE" });
      await memberPatch(a.id, { status: "cancelled" }); // refusé : aucune entrée
      await memberPatch(a.id, { status: "in_progress" });
      const entries = rows("coach_audit_logs").filter((r) => r.action === "action_status_changed_by_member");
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ actor_id: M1, actor_kind: "member", target_type: "action", target_id: a.id });
      expect(entries[0].metadata).toEqual({ from: "todo", to: "in_progress", coach_id: COACH });
      expect(JSON.stringify(rows("coach_audit_logs"))).not.toMatch(/TITRE-A-NE-PAS|DESCRIPTION-SECRETE/);
    });
    it("liste membre : seulement ses actions VISIBLES ; canUpdate selon le responsable ; un coach appelant est refusé", async () => {
      await create({ member_id: M1, title: "à moi", owner: "member" });
      await create({ member_id: M1, title: "suivie par le coach", owner: "coach", visible_to_member: true });
      await create({ member_id: M1, title: "cachée", owner: "coach", visible_to_member: false });
      await create({ member_id: M7, title: "autre membre" });
      asMember(M1);
      const { GET } = await import("@/app/api/member/coach/actions/route");
      const body = await (await GET(req("/api/member/coach/actions"))).json();
      expect(body.actions.map((x: { title: string }) => x.title).sort()).toEqual(["suivie par le coach", "à moi"]);
      expect(body.actions.find((x: { title: string }) => x.title === "à moi").canUpdate).toBe(true);
      expect(body.actions.find((x: { title: string }) => x.title === "suivie par le coach").canUpdate).toBe(false);
      asCoach(COACH);
      expect((await GET(req("/api/member/coach/actions"))).status).toBe(401);
    });
  });
});

// ── Séances côté membre et règle de visibilité ─────────────────────────────────────────────────
describe("séances côté membre (lecture seule)", () => {
  const memberSessions = async () => (await import("@/app/api/member/coach/sessions/route")).GET(req("/api/member/coach/sessions"));

  it("DTO exact, nom d'affichage du coach, jamais d'identifiant de coach ni d'attribution", async () => {
    addSession();
    asMember(M1);
    const body = await (await memberSessions()).json();
    expect(Object.keys(body.sessions[0]).sort()).toEqual([...MEMBER_SESSION_KEYS].sort());
    expect(body.sessions[0].coachName).toBe("Coach Awa");
    expect(JSON.stringify(body)).not.toContain(COACH);
    expect(JSON.stringify(body)).not.toContain("as1");
  });
  it("après retrait du consentement : l'HISTORIQUE reste visible, les séances « scheduled » sont masquées", async () => {
    addSession({ status: "completed", completed_at: inHours(-47), scheduled_at: inHours(-48) });
    addSession({ status: "cancelled", cancelled_at: inHours(-10), scheduled_at: inHours(30) });
    addSession({ status: "postponed", scheduled_at: inHours(40) });
    addSession({ status: "no_show", scheduled_at: inHours(-100) });
    addSession({ status: "scheduled", scheduled_at: inHours(60) }); // future : masquée
    addSession({ status: "scheduled", scheduled_at: inHours(-60) }); // passée non conclue : masquée aussi
    const a = rows("coach_member_assignments").find((r) => r.id === "as1")!;
    a.status = "revoked"; a.consent_status = "withdrawn";
    asMember(M1);
    const body = await (await memberSessions()).json();
    expect(body.sessions.map((s: { status: string }) => s.status).sort()).toEqual(["cancelled", "completed", "no_show", "postponed"]);
  });
  it("avec le suivi actif, les séances programmées sont visibles ; un autre membre ne voit rien ; un coach est refusé", async () => {
    addSession();
    asMember(M1);
    expect((await (await memberSessions()).json()).sessions).toHaveLength(1);
    asMember(M7);
    expect((await (await memberSessions()).json()).sessions).toHaveLength(0);
    asCoach(COACH);
    expect((await memberSessions()).status).toBe(401);
  });
});

// ── Tableau de bord ─────────────────────────────────────────────────────────────────────────────
describe("tableau de bord : indicateurs réels du lot 3", () => {
  it("séances à venir, actions en attente, comptes rendus à compléter (définition précise)", async () => {
    const done1 = addSession({ status: "completed", completed_at: inHours(-47), scheduled_at: inHours(-48) });
    const done2 = addSession({ status: "completed", completed_at: inHours(-95), scheduled_at: inHours(-96), member_id: M7, assignment_id: "as7" });
    addSession({ scheduled_at: inHours(24) });
    addSession({ scheduled_at: inHours(26), status: "cancelled", cancelled_at: inHours(-1) });
    addSession({ coach_id: OTHER_COACH, member_id: M6, assignment_id: "as6" });
    const reports = await import("./members/[id]/reports/route");
    const rpatch = await import("./reports/[id]/route");
    const notes = await import("./members/[id]/notes/route");
    // done1 : brouillon lié + note privée liée → toujours « à compléter » ; done2 : publié → complété.
    await reports.POST(req("/x", "POST", { title: "T", summary: "S", session_id: done1.id }), ctx(M1));
    await notes.POST(req("/x", "POST", { objectives: "x", session_id: done1.id }), ctx(M1));
    const r2 = (await (await reports.POST(req("/x", "POST", { title: "T2", summary: "S2", session_id: done2.id }), ctx(M7))).json()).report;
    await rpatch.PATCH(req("/x", "PATCH", { action: "publish" }), ctx(r2.id));
    const actions = await import("./actions/route");
    await actions.POST(req("/x", "POST", { member_id: M1, title: "a" }));
    const a2 = (await (await actions.POST(req("/x", "POST", { member_id: M1, title: "b" }))).json()).action;
    await (await import("./actions/[id]/route")).PATCH(req("/x", "PATCH", { status: "done" }), ctx(a2.id));

    const { GET } = await import("./dashboard/route");
    const body = await (await GET(req("/api/coach/dashboard"))).json();
    expect(body.followUp).toMatchObject({ upcomingSessions: 1, pendingActions: 1, reportsToComplete: 1 });
    expect(body.followUp.nextSessions).toHaveLength(1);
    expect(deepKeys(body.followUp).has("objectives")).toBe(false);
  });
  it("sans membre accompagné : tout à zéro ; aucune séance d'un membre dont le consentement est retiré", async () => {
    addSession({ scheduled_at: inHours(24) });
    const a = rows("coach_member_assignments").find((r) => r.id === "as1")!;
    a.status = "revoked"; a.consent_status = "withdrawn";
    const { GET } = await import("./dashboard/route");
    expect((await (await GET(req("/api/coach/dashboard"))).json()).followUp.upcomingSessions).toBe(0);
  });
});
