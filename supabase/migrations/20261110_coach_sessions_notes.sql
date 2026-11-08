-- Lot 3 de l'espace Coach : séances, notes PRIVÉES, comptes rendus PARTAGÉS, plan d'action.
-- Idempotent, non destructif. FICHIER NON EXÉCUTÉ PAR LE DÉPÔT : à appliquer à la main dans le SQL Editor de
-- Supabase, d'abord sur un projet de DÉVELOPPEMENT, APRÈS 20261108_coach_assignments.sql.
-- Aucune table existante n'est modifiée ; aucune donnée existante n'est touchée.
--
-- Principes :
--   * toutes les tables sont réservées au serveur (service_role) : RLS activée, aucun droit pour anon /
--     authenticated, politique « using (false) ». Les routes de l'application reproduisent les contrôles : la RLS
--     n'est PAS la protection (service_role la contourne) — les triggers et fonctions ci-dessous le sont ;
--   * tout changement d'horaire ou de statut d'une séance, et tout changement de statut d'une action, passe par une
--     fonction SECURITY DEFINER (service_role seul) qui pose un paramètre local de transaction ; un trigger refuse
--     toute modification directe, même sous service_role ;
--   * les notes privées (coach_notes) et les comptes rendus partagés (coach_shared_reports) sont deux tables
--     SÉPARÉES : une requête côté membre ne peut pas, par erreur, atteindre une note privée ;
--   * aucune séance de couple, aucun lien de visioconférence, aucune messagerie Coach-Membre dans ce lot.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Séances
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_sessions (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null references auth.users(id) on delete restrict,
  member_id        uuid not null references auth.users(id) on delete cascade,
  assignment_id    uuid not null references public.coach_member_assignments(id) on delete restrict,
  type             text not null,
  status           text not null default 'scheduled',
  scheduled_at     timestamptz not null,                 -- instant UTC
  duration_minutes integer not null,
  timezone         text not null,                        -- fuseau IANA de la séance (affichage)
  topic            text,
  rescheduled_to   uuid references public.coach_sessions(id),   -- NO ACTION : l'historique d'un report n'est jamais détaché
  completed_at     timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint coach_session_not_self check (coach_id <> member_id),
  constraint coach_session_type_chk check (type in ('individual','follow_up','review')),
  constraint coach_session_status_chk check (status in ('scheduled','completed','cancelled','postponed','no_show')),
  -- Durée : 15 à 240 minutes, par pas de 5 (règle imposée ICI, pas seulement par le validateur de l'application).
  constraint coach_session_duration_chk check (duration_minutes between 15 and 240 and duration_minutes % 5 = 0),
  constraint coach_session_topic_chk check (topic is null or char_length(topic) <= 200),
  constraint coach_session_tz_chk check (char_length(timezone) between 1 and 64),
  constraint coach_session_completed_chk check ((status = 'completed') = (completed_at is not null)),
  constraint coach_session_cancelled_chk check ((status = 'cancelled') = (cancelled_at is not null)),
  constraint coach_session_postponed_chk check (rescheduled_to is null or status = 'postponed')
);
create index if not exists coach_sessions_coach_time_idx  on public.coach_sessions (coach_id, scheduled_at);
create index if not exists coach_sessions_member_time_idx on public.coach_sessions (member_id, scheduled_at);
create index if not exists coach_sessions_scheduled_idx   on public.coach_sessions (scheduled_at) where status = 'scheduled';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Notes PRIVÉES du coach (jamais lues par le membre ni par l'administrateur)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_notes (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references auth.users(id) on delete restrict,
  member_id         uuid not null references auth.users(id) on delete cascade,
  session_id        uuid references public.coach_sessions(id) on delete cascade,
  objectives        text not null default '',
  topics            text not null default '',
  points_to_support text not null default '',
  observations      text not null default '',
  next_steps        text not null default '',
  deleted_at        timestamptz,                          -- suppression LOGIQUE
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint coach_note_len_chk check (
        char_length(objectives) <= 2000 and char_length(topics) <= 2000 and char_length(points_to_support) <= 2000
    and char_length(observations) <= 2000 and char_length(next_steps) <= 2000),
  constraint coach_note_not_empty_chk check (
        char_length(btrim(objectives || topics || points_to_support || observations || next_steps)) > 0)
);
create index if not exists coach_notes_coach_member_idx on public.coach_notes (coach_id, member_id, created_at desc);
create index if not exists coach_notes_session_idx      on public.coach_notes (session_id) where session_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Comptes rendus PARTAGÉS (le membre ne voit que ceux qui sont publiés)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_shared_reports (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete restrict,
  member_id    uuid not null references auth.users(id) on delete cascade,
  session_id   uuid references public.coach_sessions(id) on delete cascade,
  title        text not null default '',
  summary      text not null default '',
  published_at timestamptz,                               -- nul = brouillon
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint coach_report_len_chk check (char_length(title) <= 120 and char_length(summary) <= 5000),
  constraint coach_report_published_chk check (
        published_at is null or (char_length(btrim(title)) > 0 and char_length(btrim(summary)) > 0))
);
create index if not exists coach_reports_member_idx  on public.coach_shared_reports (member_id, published_at desc);
create index if not exists coach_reports_coach_idx   on public.coach_shared_reports (coach_id, created_at desc);
create index if not exists coach_reports_session_idx on public.coach_shared_reports (session_id) where session_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Plan d'action
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_action_items (
  id                uuid primary key default gen_random_uuid(),
  coach_id          uuid not null references auth.users(id) on delete restrict,
  member_id         uuid not null references auth.users(id) on delete cascade,
  session_id        uuid references public.coach_sessions(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  due_date          date,
  status            text not null default 'todo',
  owner             text not null default 'member',
  visible_to_member boolean not null default true,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint coach_action_title_chk check (char_length(btrim(title)) between 1 and 120),
  constraint coach_action_desc_chk check (char_length(description) <= 1000),
  constraint coach_action_status_chk check (status in ('todo','in_progress','done','cancelled')),
  constraint coach_action_owner_chk check (owner in ('coach','member')),
  constraint coach_action_member_visible_chk check (owner <> 'member' or visible_to_member),
  constraint coach_action_completed_chk check ((status = 'done') = (completed_at is not null))
);
create index if not exists coach_actions_member_idx on public.coach_action_items (member_id, status, due_date);
create index if not exists coach_actions_coach_idx  on public.coach_action_items (coach_id, status, due_date);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Accès : serveur seulement
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.coach_sessions        enable row level security;
alter table public.coach_notes           enable row level security;
alter table public.coach_shared_reports  enable row level security;
alter table public.coach_action_items    enable row level security;

drop policy if exists coach_sessions_service_only on public.coach_sessions;
create policy coach_sessions_service_only on public.coach_sessions for all to authenticated using (false) with check (false);
drop policy if exists coach_notes_service_only on public.coach_notes;
create policy coach_notes_service_only on public.coach_notes for all to authenticated using (false) with check (false);
drop policy if exists coach_shared_reports_service_only on public.coach_shared_reports;
create policy coach_shared_reports_service_only on public.coach_shared_reports for all to authenticated using (false) with check (false);
drop policy if exists coach_action_items_service_only on public.coach_action_items;
create policy coach_action_items_service_only on public.coach_action_items for all to authenticated using (false) with check (false);

revoke all on public.coach_sessions       from anon, authenticated;
revoke all on public.coach_notes          from anon, authenticated;
revoke all on public.coach_shared_reports from anon, authenticated;
revoke all on public.coach_action_items   from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Gardes (triggers) : valables même pour service_role
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6.1 Séances : insertion et changements d'horaire / de statut UNIQUEMENT par les fonctions du §7.
create or replace function public.coach_sessions_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  v_via_fn boolean := coalesce(current_setting('app.coach_session_change', true), '') = '1';
begin
  if tg_op = 'INSERT' then
    if not v_via_fn then raise exception 'coach_session_direct_write' using errcode = '42501'; end if;
    if new.status <> 'scheduled' then raise exception 'coach_session_must_start_scheduled' using errcode = '23514'; end if;
    perform 1 from public.coach_member_assignments a
      where a.id = new.assignment_id and a.coach_id = new.coach_id and a.member_id = new.member_id;
    if not found then raise exception 'coach_session_assignment_mismatch' using errcode = '23514'; end if;
    return new;
  end if;

  if new.coach_id is distinct from old.coach_id or new.member_id is distinct from old.member_id
     or new.assignment_id is distinct from old.assignment_id or new.created_at is distinct from old.created_at then
    raise exception 'coach_session_immutable_link' using errcode = '42501';
  end if;
  if new.scheduled_at is distinct from old.scheduled_at or new.duration_minutes is distinct from old.duration_minutes
     or new.status is distinct from old.status or new.timezone is distinct from old.timezone
     or new.rescheduled_to is distinct from old.rescheduled_to or new.completed_at is distinct from old.completed_at
     or new.cancelled_at is distinct from old.cancelled_at then
    if not v_via_fn then raise exception 'coach_session_direct_change' using errcode = '42501'; end if;
  end if;
  -- Une séance qui n'est plus « scheduled » est figée (historique) : ni sujet, ni type, ni statut ne changent.
  if old.status <> 'scheduled' then
    raise exception 'coach_session_not_editable' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists coach_sessions_guard_trg on public.coach_sessions;
create trigger coach_sessions_guard_trg before insert or update on public.coach_sessions
  for each row execute function public.coach_sessions_guard();

-- 6.2 Notes, comptes rendus, actions : couple coach/membre réel, séance cohérente, liens immuables.
create or replace function public.coach_content_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    -- Aucune paire fabriquée : une attribution (de n'importe quel statut) doit exister entre ce coach et ce membre.
    perform 1 from public.coach_member_assignments a where a.coach_id = new.coach_id and a.member_id = new.member_id;
    if not found then raise exception 'coach_content_no_assignment' using errcode = '23514'; end if;
    if new.session_id is not null then
      perform 1 from public.coach_sessions s
        where s.id = new.session_id and s.coach_id = new.coach_id and s.member_id = new.member_id;
      if not found then raise exception 'coach_content_session_mismatch' using errcode = '23514'; end if;
    end if;
    return new;
  end if;
  if new.coach_id is distinct from old.coach_id or new.member_id is distinct from old.member_id
     or new.session_id is distinct from old.session_id or new.created_at is distinct from old.created_at then
    raise exception 'coach_content_immutable_link' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists coach_notes_guard_trg on public.coach_notes;
create trigger coach_notes_guard_trg before insert or update on public.coach_notes
  for each row execute function public.coach_content_guard();
drop trigger if exists coach_reports_guard_trg on public.coach_shared_reports;
create trigger coach_reports_guard_trg before insert or update on public.coach_shared_reports
  for each row execute function public.coach_content_guard();
drop trigger if exists coach_actions_guard_trg on public.coach_action_items;
create trigger coach_actions_guard_trg before insert or update on public.coach_action_items
  for each row execute function public.coach_content_guard();

-- 6.3 Actions : une action naît « todo » ; le statut et completed_at ne changent que par coach_update_action_status.
create or replace function public.coach_action_status_guard()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'todo' or new.completed_at is not null then
      raise exception 'coach_action_must_start_todo' using errcode = '23514';
    end if;
    return new;
  end if;
  if (new.status is distinct from old.status or new.completed_at is distinct from old.completed_at)
     and coalesce(current_setting('app.coach_action_change', true), '') <> '1' then
    raise exception 'coach_action_direct_status_change' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists coach_actions_status_guard_trg on public.coach_action_items;
create trigger coach_actions_status_guard_trg before insert or update on public.coach_action_items
  for each row execute function public.coach_action_status_guard();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Fonctions transactionnelles (service_role seul)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verrous consultatifs sur le coach ET sur le membre, acquis dans l'ordre croissant de leur clé (aucun interblocage).
-- Ils couvrent aussi un membre qui aurait plusieurs attributions : deux coachs ne peuvent pas lui planifier deux
-- séances simultanées en parallèle.
create or replace function public.coach_lock_pair(p_coach uuid, p_member uuid)
returns void language plpgsql set search_path = public, pg_temp as $$
declare
  k1 bigint := hashtextextended('coach:' || p_coach::text, 0);
  k2 bigint := hashtextextended('member:' || p_member::text, 0);
begin
  if k1 <= k2 then
    perform pg_advisory_xact_lock(k1);
    perform pg_advisory_xact_lock(k2);
  else
    perform pg_advisory_xact_lock(k2);
    perform pg_advisory_xact_lock(k1);
  end if;
end $$;

-- Chevauchement : mêmes bornes pour le coach ET pour le membre (quel que soit le coach), séances « scheduled » seulement.
create or replace function public.coach_session_conflicts(p_coach uuid, p_member uuid, p_at timestamptz, p_duration integer, p_ignore uuid)
returns boolean language sql stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.coach_sessions s
     where s.status = 'scheduled'
       and (s.coach_id = p_coach or s.member_id = p_member)
       and (p_ignore is null or s.id <> p_ignore)
       and tstzrange(s.scheduled_at, s.scheduled_at + make_interval(mins => s.duration_minutes))
        && tstzrange(p_at, p_at + make_interval(mins => p_duration))
  );
$$;

create or replace function public.coach_schedule_session(
  p_coach uuid, p_member uuid, p_type text, p_at timestamptz, p_duration integer, p_tz text, p_topic text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_assignment uuid;
  v_id uuid;
begin
  if p_coach is null or p_member is null or p_at is null then raise exception 'bad_input'; end if;
  perform public.coach_lock_pair(p_coach, p_member);
  if p_type not in ('individual','follow_up','review') then raise exception 'bad_type'; end if;
  if p_duration is null or p_duration < 15 or p_duration > 240 or p_duration % 5 <> 0 then raise exception 'bad_duration'; end if;
  if p_topic is not null and char_length(p_topic) > 200 then raise exception 'bad_topic'; end if;
  perform 1 from pg_catalog.pg_timezone_names where name = p_tz;
  if not found then raise exception 'bad_timezone'; end if;
  if not public.coach_can_access_member(p_coach, p_member) then raise exception 'no_access'; end if;
  if p_at < now() - interval '5 minutes' then raise exception 'past'; end if;
  if public.coach_session_conflicts(p_coach, p_member, p_at, p_duration, null) then raise exception 'overlap'; end if;

  select id into v_assignment from public.coach_member_assignments
   where coach_id = p_coach and member_id = p_member and status = 'active' and consent_status = 'accepted';
  if v_assignment is null then raise exception 'no_access'; end if;

  perform set_config('app.coach_session_change', '1', true);
  insert into public.coach_sessions (coach_id, member_id, assignment_id, type, scheduled_at, duration_minutes, timezone, topic)
  values (p_coach, p_member, v_assignment, p_type, p_at, p_duration, p_tz, nullif(btrim(coalesce(p_topic, '')), ''))
  returning id into v_id;
  perform set_config('app.coach_session_change', '', true);
  return v_id;
end $$;

-- Reprogrammer = MÊME séance, nouvel horaire (statut « scheduled » uniquement).
create or replace function public.coach_reschedule_session(p_coach uuid, p_session uuid, p_new_at timestamptz, p_duration integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.coach_sessions;
begin
  select * into v from public.coach_sessions where id = p_session;
  if not found or v.coach_id <> p_coach then raise exception 'not_found'; end if;
  perform public.coach_lock_pair(v.coach_id, v.member_id);
  select * into v from public.coach_sessions where id = p_session for update;
  if v.status <> 'scheduled' then raise exception 'not_scheduled'; end if;
  if not public.coach_can_access_member(v.coach_id, v.member_id) then raise exception 'no_access'; end if;
  if p_new_at is null or p_new_at < now() - interval '5 minutes' then raise exception 'past'; end if;
  if p_duration is null or p_duration < 15 or p_duration > 240 or p_duration % 5 <> 0 then raise exception 'bad_duration'; end if;
  if public.coach_session_conflicts(v.coach_id, v.member_id, p_new_at, p_duration, v.id) then raise exception 'overlap'; end if;

  perform set_config('app.coach_session_change', '1', true);
  update public.coach_sessions set scheduled_at = p_new_at, duration_minutes = p_duration where id = v.id;
  perform set_config('app.coach_session_change', '', true);
  return v.id;
end $$;

-- Reporter = l'ancienne séance passe à « postponed » et pointe vers une NOUVELLE séance « scheduled ».
create or replace function public.coach_postpone_session(p_coach uuid, p_session uuid, p_new_at timestamptz, p_duration integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.coach_sessions;
  v_new uuid;
begin
  select * into v from public.coach_sessions where id = p_session;
  if not found or v.coach_id <> p_coach then raise exception 'not_found'; end if;
  perform public.coach_lock_pair(v.coach_id, v.member_id);
  select * into v from public.coach_sessions where id = p_session for update;
  if v.status <> 'scheduled' then raise exception 'not_scheduled'; end if;
  if not public.coach_can_access_member(v.coach_id, v.member_id) then raise exception 'no_access'; end if;
  if p_new_at is null or p_new_at < now() - interval '5 minutes' then raise exception 'past'; end if;
  if p_duration is null or p_duration < 15 or p_duration > 240 or p_duration % 5 <> 0 then raise exception 'bad_duration'; end if;
  -- L'ancienne séance est remplacée : elle ne compte pas dans le contrôle de chevauchement.
  if public.coach_session_conflicts(v.coach_id, v.member_id, p_new_at, p_duration, v.id) then raise exception 'overlap'; end if;

  perform set_config('app.coach_session_change', '1', true);
  insert into public.coach_sessions (coach_id, member_id, assignment_id, type, scheduled_at, duration_minutes, timezone, topic)
  values (v.coach_id, v.member_id, v.assignment_id, v.type, p_new_at, p_duration, v.timezone, v.topic)
  returning id into v_new;
  update public.coach_sessions set status = 'postponed', rescheduled_to = v_new where id = v.id;
  perform set_config('app.coach_session_change', '', true);
  return v_new;
end $$;

-- complete | cancel | no_show — « complete » et « no_show » seulement une fois la séance commencée.
create or replace function public.coach_transition_session(p_coach uuid, p_session uuid, p_action text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v public.coach_sessions;
begin
  if p_action not in ('complete','cancel','no_show') then raise exception 'bad_action'; end if;
  select * into v from public.coach_sessions where id = p_session;
  if not found or v.coach_id <> p_coach then raise exception 'not_found'; end if;
  perform public.coach_lock_pair(v.coach_id, v.member_id);
  select * into v from public.coach_sessions where id = p_session for update;
  if v.status <> 'scheduled' then raise exception 'not_scheduled'; end if;
  if not public.coach_can_access_member(v.coach_id, v.member_id) then raise exception 'no_access'; end if;
  if p_action in ('complete','no_show') and v.scheduled_at > now() then raise exception 'not_started'; end if;

  perform set_config('app.coach_session_change', '1', true);
  if p_action = 'complete' then
    update public.coach_sessions set status = 'completed', completed_at = now() where id = v.id;
  elsif p_action = 'cancel' then
    update public.coach_sessions set status = 'cancelled', cancelled_at = now() where id = v.id;
  else
    update public.coach_sessions set status = 'no_show' where id = v.id;
  end if;
  perform set_config('app.coach_session_change', '', true);
  return v.id;
end $$;

-- Statut d'une action : ligne verrouillée, matrice de transitions appliquée DANS la transaction, completed_at calculé
-- côté base. Retourne un code : ok | invalid_transition | not_owner | not_found | no_access.
create or replace function public.coach_update_action_status(p_actor_kind text, p_actor_id uuid, p_action uuid, p_new_status text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.coach_action_items;
  v_ok boolean;
begin
  if p_actor_kind not in ('coach','member') or p_actor_id is null or p_action is null then return 'not_found'; end if;
  if p_new_status not in ('todo','in_progress','done','cancelled') then return 'invalid_transition'; end if;
  select * into a from public.coach_action_items where id = p_action for update;
  if not found then return 'not_found'; end if;

  if p_actor_kind = 'member' then
    -- Le membre ne touche que ses propres actions, visibles, dont il est le responsable.
    if a.member_id <> p_actor_id or a.owner <> 'member' or not a.visible_to_member then return 'not_owner'; end if;
    v_ok := (a.status = 'todo' and p_new_status in ('in_progress','done')) or (a.status = 'in_progress' and p_new_status = 'done');
  else
    if a.coach_id <> p_actor_id then return 'not_owner'; end if;
    if not public.coach_can_access_member(a.coach_id, a.member_id) then return 'no_access'; end if;
    v_ok := a.status <> p_new_status;
  end if;
  if not v_ok then return 'invalid_transition'; end if;

  perform set_config('app.coach_action_change', '1', true);
  update public.coach_action_items
     set status = p_new_status, completed_at = case when p_new_status = 'done' then now() else null end
   where id = a.id;
  perform set_config('app.coach_action_change', '', true);
  return 'ok';
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. Droits d'exécution : service_role uniquement
-- ═══════════════════════════════════════════════════════════════════════════════
revoke all on function public.coach_sessions_guard()                                          from public, anon, authenticated;
revoke all on function public.coach_content_guard()                                           from public, anon, authenticated;
revoke all on function public.coach_action_status_guard()                                     from public, anon, authenticated;
revoke all on function public.coach_lock_pair(uuid, uuid)                                     from public, anon, authenticated;
revoke all on function public.coach_session_conflicts(uuid, uuid, timestamptz, integer, uuid) from public, anon, authenticated;
revoke all on function public.coach_schedule_session(uuid, uuid, text, timestamptz, integer, text, text) from public, anon, authenticated;
revoke all on function public.coach_reschedule_session(uuid, uuid, timestamptz, integer)      from public, anon, authenticated;
revoke all on function public.coach_postpone_session(uuid, uuid, timestamptz, integer)        from public, anon, authenticated;
revoke all on function public.coach_transition_session(uuid, uuid, text)                      from public, anon, authenticated;
revoke all on function public.coach_update_action_status(text, uuid, uuid, text)              from public, anon, authenticated;

grant execute on function public.coach_schedule_session(uuid, uuid, text, timestamptz, integer, text, text) to service_role;
grant execute on function public.coach_reschedule_session(uuid, uuid, timestamptz, integer)   to service_role;
grant execute on function public.coach_postpone_session(uuid, uuid, timestamptz, integer)     to service_role;
grant execute on function public.coach_transition_session(uuid, uuid, text)                   to service_role;
grant execute on function public.coach_update_action_status(text, uuid, uuid, text)           to service_role;

notify pgrst, 'reload schema';

-- ── Vérifications à lancer ensuite (lecture seule) ─────────────────────────────
-- a) RLS activée et aucune politique accessible aux utilisateurs connectés :
--    select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in
--      ('coach_sessions','coach_notes','coach_shared_reports','coach_action_items');
-- b) Droits d'exécution (attendu : service_role seulement pour les 5 fonctions publiques) :
--    select routine_name, grantee from information_schema.routine_privileges
--     where routine_schema = 'public' and routine_name like 'coach_%session%' or routine_name = 'coach_update_action_status' order by 1, 2;
-- c) Aucune séance « scheduled » qui se chevauche pour un même coach ou un même membre (attendu : 0 ligne).
