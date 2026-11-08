import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Validation STATIQUE de `20261110_coach_sessions_notes.sql` : on lit le texte, on ne l'exécute JAMAIS.
 * Ces tests prouvent la présence des garde-fous, pas leur comportement réel sur Postgres (verrous, triggers, contraintes) :
 * celui-ci reste à valider sur un projet Supabase de développement.
 */
const path = "supabase/migrations/20261110_coach_sessions_notes.sql";
const raw = readFileSync(join(process.cwd(), path), "utf8");
const sql = raw.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").toLowerCase();
/** Même texte, espaces d'alignement réduits (le SQL aligne ses colonnes). */
const squeezed = sql.replace(/[ 	]+/g, " ");
const TABLES = ["coach_sessions", "coach_notes", "coach_shared_reports", "coach_action_items"];
const FUNCTIONS = [
  ["coach_schedule_session", "uuid, uuid, text, timestamptz, integer, text, text"],
  ["coach_reschedule_session", "uuid, uuid, timestamptz, integer"],
  ["coach_postpone_session", "uuid, uuid, timestamptz, integer"],
  ["coach_transition_session", "uuid, uuid, text"],
  ["coach_update_action_status", "text, uuid, uuid, text"],
] as const;

const fnBody = (name: string) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  expect(start, name).toBeGreaterThan(-1);
  const end = sql.indexOf("end $$;", start);
  return sql.slice(start, end);
};

describe("migration lot 3 : structure et confidentialité", () => {
  it("quatre tables, idempotentes (if not exists), RLS activée, politique « service seul », aucun droit anon/authenticated", () => {
    for (const t of TABLES) {
      expect(sql, t).toContain(`create table if not exists public.${t} (`);
      expect(sql, `rls ${t}`).toContain(`alter table public.${t}`);
      expect(sql, `rls enable ${t}`).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
      expect(sql, `policy ${t}`).toMatch(new RegExp(`create policy ${t}_service_only on public\\.${t}\\s+for all to authenticated using \\(false\\) with check \\(false\\)`));
      expect(sql, `revoke ${t}`).toMatch(new RegExp(`revoke all on public\\.${t}\\s+from anon, authenticated`));
    }
    expect(sql).not.toMatch(/grant (select|insert|update|delete|all)[^;]* to (anon|authenticated|public)/);
  });
  it("notes privées et comptes rendus partagés sont deux tables SÉPARÉES (aucune colonne de note dans le compte rendu)", () => {
    const reports = sql.slice(sql.indexOf("create table if not exists public.coach_shared_reports"), sql.indexOf("create table if not exists public.coach_action_items"));
    for (const col of ["objectives", "observations", "points_to_support", "next_steps", "topics"]) expect(reports, col).not.toContain(col);
    const notes = sql.slice(sql.indexOf("create table if not exists public.coach_notes"), sql.indexOf("create table if not exists public.coach_shared_reports"));
    expect(notes).not.toContain("published_at");
    expect(notes).toContain("deleted_at"); // suppression logique
  });
  it("aucune opération destructive ni aucune modification de table existante", () => {
    expect(sql).not.toMatch(/\bdrop\s+(table|column|schema|function)\b/);
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toMatch(/alter table public\.(profiles|coach_accounts|coach_member_assignments|coach_audit_logs|coach_notifications)/);
    expect(sql).not.toMatch(/\bdelete\s+from\b/);
  });
  it("périmètre : aucun type « couple », aucun lien de visioconférence, aucune table de messagerie", () => {
    expect(sql).not.toContain("couple");
    expect(sql).not.toMatch(/meeting_url|meet_url|visio|join_url/);
    expect(sql).not.toMatch(/create table[^;]*(message|chat|conversation)/);
  });
});

describe("migration lot 3 : contraintes de données", () => {
  it("type de séance : exactement individual / follow_up / review", () => {
    expect(sql).toMatch(/type in \('individual','follow_up','review'\)/);
  });
  it("statuts de séance et d'action", () => {
    expect(sql).toMatch(/status in \('scheduled','completed','cancelled','postponed','no_show'\)/);
    expect(sql).toMatch(/status in \('todo','in_progress','done','cancelled'\)/);
    expect(sql).toMatch(/owner in \('coach','member'\)/);
  });
  it("durée : 15 à 240 minutes PAR PAS DE 5, imposé par un CHECK SQL", () => {
    expect(sql).toMatch(/check \(duration_minutes between 15 and 240 and duration_minutes % 5 = 0\)/);
  });
  it("plafonds de longueur alignés sur les validateurs (topic 200, titre 120, résumé 5000, notes 2000, action 120/1000)", () => {
    expect(sql).toContain("char_length(topic) <= 200");
    expect(sql).toContain("char_length(title) <= 120 and char_length(summary) <= 5000");
    expect(sql).toMatch(/char_length\(objectives\) <= 2000 and char_length\(topics\) <= 2000 and char_length\(points_to_support\) <= 2000/);
    expect(sql).toContain("char_length(observations) <= 2000 and char_length(next_steps) <= 2000");
    expect(sql).toContain("char_length(btrim(title)) between 1 and 120");
    expect(sql).toContain("char_length(description) <= 1000");
  });
  it("un compte rendu publié exige titre ET résumé non vides ; une note n'est jamais entièrement vide", () => {
    expect(sql).toMatch(/published_at is null or \(char_length\(btrim\(title\)\) > 0 and char_length\(btrim\(summary\)\) > 0\)/);
    expect(sql).toContain("coach_note_not_empty_chk");
  });
  it("cohérence statut/horodatage : completed_at ⇔ done, completed_at ⇔ séance completed, cancelled_at ⇔ cancelled", () => {
    expect(sql).toContain("(status = 'done') = (completed_at is not null)");
    expect(sql).toContain("(status = 'completed') = (completed_at is not null)");
    expect(sql).toContain("(status = 'cancelled') = (cancelled_at is not null)");
  });
  it("une action dont le membre est responsable lui est forcément visible", () => {
    expect(sql).toContain("owner <> 'member' or visible_to_member");
  });
  it("le lien d'un report n'est jamais détaché (NO ACTION) ; un coach avec historique ne peut pas être supprimé (RESTRICT)", () => {
    expect(sql).toMatch(/rescheduled_to\s+uuid references public\.coach_sessions\(id\),/);
    expect(sql).toContain("coach_id         uuid not null references auth.users(id) on delete restrict");
  });
});

describe("migration lot 3 : triggers valables même sous service_role", () => {
  it("séances : insertion et changement d'horaire/statut refusés hors fonction (paramètre local de transaction)", () => {
    const g = fnBody("coach_sessions_guard");
    expect(g).toContain("current_setting('app.coach_session_change', true)");
    expect(g).toContain("coach_session_direct_write");
    expect(g).toContain("coach_session_direct_change");
    expect(g).toContain("new.scheduled_at is distinct from old.scheduled_at");
    expect(g).toContain("new.duration_minutes is distinct from old.duration_minutes");
    expect(g).toContain("new.status is distinct from old.status");
  });
  it("séances : liens immuables, état figé hors « scheduled », attribution cohérente avec le couple coach/membre", () => {
    const g = fnBody("coach_sessions_guard");
    expect(g).toContain("coach_session_immutable_link");
    expect(g).toContain("coach_session_not_editable");
    expect(g).toContain("coach_session_assignment_mismatch");
    expect(g).toMatch(/a\.id = new\.assignment_id and a\.coach_id = new\.coach_id and a\.member_id = new\.member_id/);
  });
  it("notes, comptes rendus, actions : couple coach/membre réel, séance du MÊME coach et du MÊME membre, liens immuables", () => {
    const g = fnBody("coach_content_guard");
    expect(g).toContain("coach_content_no_assignment");
    expect(g).toContain("coach_content_session_mismatch");
    expect(g).toMatch(/s\.id = new\.session_id and s\.coach_id = new\.coach_id and s\.member_id = new\.member_id/);
    expect(g).toContain("coach_content_immutable_link");
    expect(g).toContain("new.session_id is distinct from old.session_id");
    for (const t of ["coach_notes", "coach_shared_reports", "coach_action_items"]) {
      expect(sql, t).toMatch(new RegExp(`create trigger \\w+ before insert or update on public\\.${t}\\s+for each row execute function public\\.coach_content_guard\\(\\)`));
    }
    expect(sql).toMatch(/create trigger coach_sessions_guard_trg before insert or update on public\.coach_sessions/);
  });
  it("actions : naissance « todo » et changement de statut / completed_at refusé hors fonction", () => {
    const g = fnBody("coach_action_status_guard");
    expect(g).toContain("coach_action_must_start_todo");
    expect(g).toContain("coach_action_direct_status_change");
    expect(g).toContain("current_setting('app.coach_action_change', true)");
    expect(sql).toMatch(/create trigger coach_actions_status_guard_trg before insert or update on public\.coach_action_items/);
  });
});

describe("migration lot 3 : fonctions transactionnelles", () => {
  it("chaque fonction : SECURITY DEFINER, search_path verrouillé, EXECUTE retiré de public/anon/authenticated et accordé à service_role seul", () => {
    for (const [name, sig] of FUNCTIONS) {
      const body = fnBody(name);
      expect(body, name).toContain("security definer");
      expect(body, name).toContain("set search_path = public, pg_temp");
      expect(squeezed, `revoke ${name}`).toContain(`revoke all on function public.${name}(${sig}) from public, anon, authenticated;`);
      expect(squeezed, `grant ${name}`).toContain(`grant execute on function public.${name}(${sig}) to service_role;`);
    }
    const grants = [...sql.matchAll(/grant execute on function [^;]+;/g)].map((m) => m[0]);
    expect(grants).toHaveLength(FUNCTIONS.length);
    for (const g of grants) expect(g).toMatch(/to service_role;$/);
  });
  it("verrous : Coach ET membre, dans l'ordre croissant de leur clé (aucun interblocage)", () => {
    const lock = fnBody("coach_lock_pair");
    expect(lock).toContain("hashtextextended('coach:' || p_coach::text, 0)");
    expect(lock).toContain("hashtextextended('member:' || p_member::text, 0)");
    expect(lock).toMatch(/if k1 <= k2 then\s+perform pg_advisory_xact_lock\(k1\);\s+perform pg_advisory_xact_lock\(k2\);\s+else\s+perform pg_advisory_xact_lock\(k2\);\s+perform pg_advisory_xact_lock\(k1\);/);
    for (const name of ["coach_schedule_session", "coach_reschedule_session", "coach_postpone_session", "coach_transition_session"]) {
      expect(fnBody(name), name).toContain("coach_lock_pair(");
    }
  });
  it("chevauchement : mêmes bornes pour le coach OU le membre (quel que soit le coach), séances « scheduled » seulement ; aucune extension requise", () => {
    const start = sql.indexOf("create or replace function public.coach_session_conflicts(");
    const body = sql.slice(start, sql.indexOf("$$;", start + 200));
    expect(body).toContain("s.status = 'scheduled'");
    expect(body).toContain("(s.coach_id = p_coach or s.member_id = p_member)");
    expect(body).toContain("&&");
    expect(sql).not.toContain("btree_gist");
    expect(sql).not.toMatch(/create extension/);
  });
  it("création, reprogrammation et report : accès réévalué, passé refusé (tolérance 5 min), durée par pas de 5, conflit refusé", () => {
    for (const name of ["coach_schedule_session", "coach_reschedule_session", "coach_postpone_session"]) {
      const b = fnBody(name);
      expect(b, name).toContain("coach_can_access_member(");
      expect(b, name).toContain("coach_session_conflicts(");
      expect(b, name).toContain("raise exception 'overlap'");
      expect(b, name).toContain("raise exception 'past'");
      expect(b, name).toContain("raise exception 'bad_duration'");
      expect(b, name).toContain("p_duration % 5 <> 0");
      expect(b, name).toContain("interval '5 minutes'");
    }
  });
  it("reprogrammer ≠ reporter : reprogrammation = UPDATE de la même séance ; report = INSERT d'une nouvelle séance + ancienne « postponed » liée", () => {
    const re = fnBody("coach_reschedule_session");
    expect(re).toContain("update public.coach_sessions set scheduled_at = p_new_at, duration_minutes = p_duration where id = v.id");
    expect(re).not.toContain("insert into");
    expect(re).toContain("v.status <> 'scheduled'");
    const po = fnBody("coach_postpone_session");
    expect(po).toContain("insert into public.coach_sessions");
    expect(po).toContain("update public.coach_sessions set status = 'postponed', rescheduled_to = v_new where id = v.id");
    expect(po).toContain("coach_session_conflicts(v.coach_id, v.member_id, p_new_at, p_duration, v.id)"); // l'ancienne séance est exclue
  });
  it("transition : complete / no_show seulement une fois la séance commencée ; cancel toujours possible tant que « scheduled »", () => {
    const b = fnBody("coach_transition_session");
    expect(b).toContain("p_action not in ('complete','cancel','no_show')");
    expect(b).toContain("v.status <> 'scheduled'");
    expect(b).toContain("p_action in ('complete','no_show') and v.scheduled_at > now()");
    expect(b).toContain("raise exception 'not_started'");
  });
  it("action : ligne verrouillée, matrice de transitions dans la transaction, completed_at calculé par la base", () => {
    const b = fnBody("coach_update_action_status");
    expect(b).toContain("for update");
    expect(b).toContain("a.status = 'todo' and p_new_status in ('in_progress','done')");
    expect(b).toContain("a.status = 'in_progress' and p_new_status = 'done'");
    expect(b).toContain("a.owner <> 'member' or not a.visible_to_member");
    expect(b).toContain("case when p_new_status = 'done' then now() else null end");
    for (const code of ["not_found", "not_owner", "invalid_transition", "no_access"]) expect(b, code).toContain(`'${code}'`);
    // Le membre ne peut jamais viser « cancelled » : la seule branche membre n'autorise que in_progress / done.
    expect(b.slice(b.indexOf("p_actor_kind = 'member'"), b.indexOf("else"))).not.toContain("'cancelled'");
  });
});
