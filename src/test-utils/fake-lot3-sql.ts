/**
 * Simulation EN MÉMOIRE des fonctions SQL du lot 3 (séances, actions) et de `coach_can_access_member`, pour tester la
 * logique des ROUTES (accès, correspondance des erreurs, audit, DTO).
 *
 * ATTENTION : ceci modélise l'INTENTION du SQL de `20261110_coach_sessions_notes.sql` ; ce n'est PAS le SQL. Les
 * triggers, verrous consultatifs et contraintes réels ne sont ni exécutés ni prouvés par ces tests : ils sont vérifiés
 * seulement statiquement (voir `lot3-migration-sql.test.ts`) et restent à valider sur un Supabase de développement.
 */
import { isValidTimeZone } from "@/lib/coach/time-zone";
import type { FakeWorld } from "@/test-utils/fake-db";

type Row = Record<string, unknown>;
type RpcResult = { data: unknown; error: { message: string } | null };

const ok = (data: unknown): RpcResult => ({ data, error: null });
const fail = (code: string): RpcResult => ({ data: null, error: { message: code } });

export function createLot3Rpc(world: FakeWorld, nowMs: () => number = Date.now) {
  let seq = 0;
  const table = (name: string): Row[] => world.tables[name] ?? (world.tables[name] = []);
  const newId = () => `00000000-0000-4000-8000-${String(900000 + ++seq).padStart(12, "0")}`;

  const canAccess = (coach: unknown, member: unknown): boolean => {
    const a = table("coach_member_assignments").find((r) => r.coach_id === coach && r.member_id === member && r.status === "active" && r.consent_status === "accepted");
    const c = table("coach_accounts").find((r) => r.user_id === coach);
    return Boolean(a && c && c.active === true);
  };

  const overlaps = (coach: unknown, member: unknown, atMs: number, minutes: number, ignore: unknown): boolean =>
    table("coach_sessions").some((s) => {
      if (s.status !== "scheduled" || (ignore && s.id === ignore)) return false;
      if (s.coach_id !== coach && s.member_id !== member) return false;
      const start = new Date(s.scheduled_at as string).getTime();
      const end = start + (s.duration_minutes as number) * 60_000;
      return start < atMs + minutes * 60_000 && atMs < end;
    });

  const validDuration = (d: unknown) => typeof d === "number" && d >= 15 && d <= 240 && d % 5 === 0;
  const GRACE = 5 * 60_000;

  return (fn: string, a: Record<string, unknown>): RpcResult => {
    if (fn === "coach_can_access_member") return ok(canAccess(a.p_coach, a.p_member));

    if (fn === "coach_schedule_session") {
      if (!["individual", "follow_up", "review"].includes(a.p_type as string)) return fail("bad_type");
      if (!validDuration(a.p_duration)) return fail("bad_duration");
      if (typeof a.p_topic === "string" && a.p_topic.length > 200) return fail("bad_topic");
      if (!isValidTimeZone(a.p_tz)) return fail("bad_timezone");
      if (!canAccess(a.p_coach, a.p_member)) return fail("no_access");
      const at = new Date(a.p_at as string).getTime();
      if (at < nowMs() - GRACE) return fail("past");
      if (overlaps(a.p_coach, a.p_member, at, a.p_duration as number, null)) return fail("overlap");
      const assignment = table("coach_member_assignments").find((r) => r.coach_id === a.p_coach && r.member_id === a.p_member && r.status === "active");
      const id = newId();
      table("coach_sessions").push({
        id, coach_id: a.p_coach, member_id: a.p_member, assignment_id: assignment?.id ?? null, type: a.p_type, status: "scheduled",
        scheduled_at: new Date(at).toISOString(), duration_minutes: a.p_duration, timezone: a.p_tz, topic: a.p_topic ?? null,
        rescheduled_to: null, completed_at: null, cancelled_at: null, created_at: new Date(nowMs()).toISOString(),
      });
      return ok(id);
    }

    if (fn === "coach_reschedule_session" || fn === "coach_postpone_session") {
      const s = table("coach_sessions").find((r) => r.id === a.p_session);
      if (!s || s.coach_id !== a.p_coach) return fail("not_found");
      if (s.status !== "scheduled") return fail("not_scheduled");
      if (!canAccess(s.coach_id, s.member_id)) return fail("no_access");
      const at = new Date(a.p_new_at as string).getTime();
      if (!Number.isFinite(at) || at < nowMs() - GRACE) return fail("past");
      if (!validDuration(a.p_duration)) return fail("bad_duration");
      if (overlaps(s.coach_id, s.member_id, at, a.p_duration as number, s.id)) return fail("overlap");
      if (fn === "coach_reschedule_session") {
        s.scheduled_at = new Date(at).toISOString();
        s.duration_minutes = a.p_duration;
        return ok(s.id);
      }
      const id = newId();
      table("coach_sessions").push({ ...s, id, scheduled_at: new Date(at).toISOString(), duration_minutes: a.p_duration, status: "scheduled", rescheduled_to: null });
      s.status = "postponed";
      s.rescheduled_to = id;
      return ok(id);
    }

    if (fn === "coach_transition_session") {
      const s = table("coach_sessions").find((r) => r.id === a.p_session);
      if (!["complete", "cancel", "no_show"].includes(a.p_action as string)) return fail("bad_action");
      if (!s || s.coach_id !== a.p_coach) return fail("not_found");
      if (s.status !== "scheduled") return fail("not_scheduled");
      if (!canAccess(s.coach_id, s.member_id)) return fail("no_access");
      if ((a.p_action === "complete" || a.p_action === "no_show") && new Date(s.scheduled_at as string).getTime() > nowMs()) return fail("not_started");
      if (a.p_action === "complete") { s.status = "completed"; s.completed_at = new Date(nowMs()).toISOString(); }
      else if (a.p_action === "cancel") { s.status = "cancelled"; s.cancelled_at = new Date(nowMs()).toISOString(); }
      else s.status = "no_show";
      return ok(s.id);
    }

    if (fn === "coach_update_action_status") {
      const row = table("coach_action_items").find((r) => r.id === a.p_action);
      if (!row) return ok("not_found");
      const to = a.p_new_status as string;
      const from = row.status as string;
      let allowed: boolean;
      if (a.p_actor_kind === "member") {
        if (row.member_id !== a.p_actor_id || row.owner !== "member" || !row.visible_to_member) return ok("not_owner");
        allowed = (from === "todo" && (to === "in_progress" || to === "done")) || (from === "in_progress" && to === "done");
      } else {
        if (row.coach_id !== a.p_actor_id) return ok("not_owner");
        if (!canAccess(row.coach_id, row.member_id)) return ok("no_access");
        allowed = from !== to;
      }
      if (!allowed) return ok("invalid_transition");
      row.status = to;
      row.completed_at = to === "done" ? new Date(nowMs()).toISOString() : null;
      return ok("ok");
    }

    return fail(`rpc non simulée : ${fn}`);
  };
}
