-- Lot 1 de l'espace Coach : attributions coach ↔ membre, consentement du membre, journal d'audit
-- et notifications Coach. Idempotent, non destructif.
-- À exécuter APRÈS 20261107_coach_hardening.sql, dans le SQL Editor de Supabase, par un humain.
-- Aucune donnée existante n'est modifiée ni supprimée.
--
-- Principes :
--   * toutes les tables sont réservées au serveur (service_role) : RLS activée, aucun droit pour
--     anon / authenticated, politique « using (false) » ;
--   * toute mutation passe par une fonction SECURITY DEFINER exécutable par service_role SEULEMENT ;
--   * une attribution n'est « active » qu'après acceptation explicite du membre ;
--   * un membre n'a jamais plus d'un dossier « pending » ou « active » (index unique partiel).

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Attributions
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_member_assignments (
  id              uuid primary key default gen_random_uuid(),
  -- RESTRICT : supprimer un coach qui a un historique est refusé (on le suspend à la place) afin que les
  -- dossiers conservent leur historique. La suppression d'un MEMBRE efface en revanche ses propres dossiers.
  coach_id        uuid not null references auth.users(id) on delete restrict,
  member_id       uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'pending',
  consent_status  text not null default 'pending',
  assigned_by     text not null,                       -- identité de l'administrateur (e-mail ou « env-admin »)
  assigned_at     timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  consent_at      timestamptz,
  ended_at        timestamptz,
  end_reason      text,
  constraint coach_assignment_not_self check (coach_id <> member_id),
  constraint coach_assignment_status_chk check (status in ('pending','active','declined','ended','revoked')),
  constraint coach_assignment_consent_chk check (consent_status in ('pending','accepted','declined','withdrawn')),
  -- Machine à états : seules ces combinaisons existent.
  constraint coach_assignment_state_chk check (
       (status = 'pending'  and consent_status = 'pending'   and consent_at is null     and ended_at is null)
    or (status = 'active'   and consent_status = 'accepted'  and consent_at is not null and ended_at is null)
    or (status = 'declined' and consent_status = 'declined'  and consent_at is not null and ended_at is not null)
    or (status = 'revoked'  and consent_status = 'withdrawn' and consent_at is not null and ended_at is not null)
    or (status = 'ended'    and ended_at is not null and (
            (consent_status = 'pending'  and consent_at is null)
         or (consent_status = 'accepted' and consent_at is not null)))
  )
);

-- Garantie finale : au plus un dossier en attente ou actif par membre.
create unique index if not exists coach_assignment_one_open_per_member
  on public.coach_member_assignments (member_id) where status in ('pending','active');
create index if not exists coach_assignment_coach_status_idx
  on public.coach_member_assignments (coach_id, status);
create index if not exists coach_assignment_member_idx
  on public.coach_member_assignments (member_id, assigned_at desc);

-- Transitions autorisées : pending → active | declined | ended ; active → revoked | ended.
-- Les états terminaux (declined, ended, revoked) ne sont jamais rouverts ni modifiés.
create or replace function public.coach_assignment_guard()
returns trigger language plpgsql as $$
begin
  -- Un dossier naît TOUJOURS « pending » : aucune insertion directe ne peut contourner le consentement.
  if tg_op = 'INSERT' and (new.status <> 'pending' or new.consent_status <> 'pending') then
    raise exception 'coach_assignment_must_start_pending' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.coach_id is distinct from old.coach_id
       or new.member_id is distinct from old.member_id
       or new.assigned_at is distinct from old.assigned_at then
      raise exception 'coach_assignment_immutable' using errcode = '23514';
    end if;
    if old.status in ('declined','ended','revoked') then
      raise exception 'coach_assignment_terminal' using errcode = '23514';
    end if;
    if new.status <> old.status and not (
         (old.status = 'pending' and new.status in ('active','declined','ended'))
      or (old.status = 'active'  and new.status in ('revoked','ended'))) then
      raise exception 'coach_assignment_invalid_transition: % -> %', old.status, new.status using errcode = '23514';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists coach_assignment_guard on public.coach_member_assignments;
create trigger coach_assignment_guard before insert or update on public.coach_member_assignments
  for each row execute function public.coach_assignment_guard();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Journal d'audit Coach (jamais de contenu de notes, de mot de passe ni de jeton)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    text,
  actor_kind  text not null check (actor_kind in ('admin','coach','member','system')),
  action      text not null,
  target_type text not null,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists coach_audit_logs_created_idx on public.coach_audit_logs (created_at desc);
create index if not exists coach_audit_logs_target_idx on public.coach_audit_logs (target_type, target_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Notifications Coach (distinctes de meeting_notifications, qui déclenche des notifications push)
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.coach_notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  kind          text not null,
  title         text not null,
  body          text,
  link          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists coach_notifications_recipient_idx
  on public.coach_notifications (recipient_id, read_at, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Accès : serveur seulement
-- ═══════════════════════════════════════════════════════════════════════════════
alter table public.coach_member_assignments enable row level security;
alter table public.coach_audit_logs         enable row level security;
alter table public.coach_notifications      enable row level security;

drop policy if exists coach_member_assignments_service_only on public.coach_member_assignments;
create policy coach_member_assignments_service_only on public.coach_member_assignments
  for all to authenticated using (false) with check (false);
drop policy if exists coach_audit_logs_service_only on public.coach_audit_logs;
create policy coach_audit_logs_service_only on public.coach_audit_logs
  for all to authenticated using (false) with check (false);
drop policy if exists coach_notifications_service_only on public.coach_notifications;
create policy coach_notifications_service_only on public.coach_notifications
  for all to authenticated using (false) with check (false);

revoke all on public.coach_member_assignments from anon, authenticated;
revoke all on public.coach_audit_logs         from anon, authenticated;
revoke all on public.coach_notifications      from anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Fonctions transactionnelles (SECURITY DEFINER, service_role uniquement)
--    Erreurs métier : messages courts que l'API traduit en codes HTTP
--    (coach_not_active, member_not_eligible, self_assignment, assignment_not_found,
--     invalid_state, coach_not_found, not_a_coach, invalid_actor).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Coach utilisable : ligne coach_accounts active + profil coach approuvé.
create or replace function public.coach_is_usable(p_coach uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.coach_accounts c
    join public.profiles p on p.id = c.user_id
    where c.user_id = p_coach and c.active = true
      and p.account_type = 'coach' and p.status = 'approved'
  );
$$;

-- Proposer (ou réaffecter) un membre à un coach. Le dossier naît « pending » : jamais actif sans consentement.
create or replace function public.coach_assign_member(p_coach uuid, p_member uuid, p_admin text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
begin
  if p_coach is null or p_member is null then raise exception 'assignment_not_found'; end if;
  if p_coach = p_member then raise exception 'self_assignment'; end if;

  perform pg_advisory_xact_lock(hashtext(p_member::text));
  -- Verrou partagé : un coach ne peut pas être désactivé pendant l'attribution (coach_set_active prend FOR UPDATE).
  perform 1 from public.coach_accounts where user_id = p_coach for share;
  if not found or not public.coach_is_usable(p_coach) then raise exception 'coach_not_active'; end if;

  perform 1 from public.profiles where id = p_member and status = 'approved' and account_type = 'member';
  if not found then raise exception 'member_not_eligible'; end if;

  -- Réaffectation : l'ancien dossier ouvert est clos, son historique est conservé.
  update public.coach_member_assignments
     set status = 'ended', ended_at = now(), end_reason = 'reassigned'
   where member_id = p_member and status in ('pending','active');

  insert into public.coach_member_assignments (coach_id, member_id, status, consent_status, assigned_by)
  values (p_coach, p_member, 'pending', 'pending', coalesce(nullif(p_admin, ''), 'admin'))
  returning id into v_id;

  insert into public.coach_audit_logs (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (p_admin, 'admin', 'assignment_proposed', 'assignment', v_id::text,
          jsonb_build_object('coach_id', p_coach, 'member_id', p_member));

  insert into public.coach_notifications (recipient_id, kind, title, body, link)
  values (p_member, 'coach_assignment_proposed', 'Un accompagnement vous est proposé',
          'Un coach souhaite vous accompagner. Vous pouvez accepter ou refuser ce suivi.', '/dashboard');
  return v_id;
end $$;

-- Réponse du membre : l'identité vient de la session serveur ; l'attribution doit lui appartenir.
create or replace function public.coach_respond_assignment(p_member uuid, p_assignment uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.coach_member_assignments%rowtype;
begin
  if p_member is null or p_assignment is null then raise exception 'assignment_not_found'; end if;
  perform pg_advisory_xact_lock(hashtext(p_member::text));
  select * into a from public.coach_member_assignments
   where id = p_assignment and member_id = p_member for update;
  if not found then raise exception 'assignment_not_found'; end if;
  if a.status <> 'pending' then raise exception 'invalid_state'; end if;

  if p_accept then
    if not public.coach_is_usable(a.coach_id) then raise exception 'coach_not_active'; end if;
    update public.coach_member_assignments
       set status = 'active', consent_status = 'accepted', consent_at = now()
     where id = a.id;
  else
    update public.coach_member_assignments
       set status = 'declined', consent_status = 'declined', consent_at = now(),
           ended_at = now(), end_reason = 'declined_by_member'
     where id = a.id;
  end if;

  insert into public.coach_audit_logs (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (p_member::text, 'member', case when p_accept then 'consent_accepted' else 'consent_declined' end,
          'assignment', a.id::text, jsonb_build_object('coach_id', a.coach_id));

  insert into public.coach_notifications (recipient_id, kind, title, body, link)
  values (a.coach_id,
          case when p_accept then 'assignment_accepted' else 'assignment_declined' end,
          case when p_accept then 'Un membre a accepté votre accompagnement' else 'Un membre a refusé l''accompagnement' end,
          null, '/coach');
  return case when p_accept then 'active' else 'declined' end;
end $$;

-- Fin d'une attribution : « member » = retrait du consentement (revoked) ; « admin » / « coach » = fin ordinaire (ended).
create or replace function public.coach_end_assignment(p_actor_kind text, p_actor_id text, p_assignment uuid, p_reason text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.coach_member_assignments%rowtype;
  v_reason text := left(coalesce(nullif(trim(p_reason), ''), 'unspecified'), 200);
  v_result text;
begin
  if p_actor_kind not in ('member','admin','coach') then raise exception 'invalid_actor'; end if;
  if p_assignment is null then raise exception 'assignment_not_found'; end if;

  select * into a from public.coach_member_assignments where id = p_assignment;
  if not found then raise exception 'assignment_not_found'; end if;
  perform pg_advisory_xact_lock(hashtext(a.member_id::text));
  select * into a from public.coach_member_assignments where id = p_assignment for update;

  -- Anti-IDOR : un membre ne ferme que son dossier, un coach que les siens.
  if p_actor_kind = 'member' and a.member_id::text is distinct from p_actor_id then raise exception 'assignment_not_found'; end if;
  if p_actor_kind = 'coach'  and a.coach_id::text  is distinct from p_actor_id then raise exception 'assignment_not_found'; end if;
  if a.status not in ('pending','active') then raise exception 'invalid_state'; end if;

  if p_actor_kind = 'member' and a.status = 'active' then
    update public.coach_member_assignments
       set status = 'revoked', consent_status = 'withdrawn', ended_at = now(), end_reason = v_reason where id = a.id;
    v_result := 'revoked';
  elsif p_actor_kind = 'member' then              -- proposition encore en attente : refus
    update public.coach_member_assignments
       set status = 'declined', consent_status = 'declined', consent_at = now(), ended_at = now(), end_reason = v_reason where id = a.id;
    v_result := 'declined';
  else
    update public.coach_member_assignments
       set status = 'ended', ended_at = now(), end_reason = v_reason where id = a.id;
    v_result := 'ended';
  end if;

  insert into public.coach_audit_logs (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (p_actor_id, p_actor_kind, 'assignment_' || v_result, 'assignment', a.id::text,
          jsonb_build_object('coach_id', a.coach_id, 'member_id', a.member_id));

  if p_actor_kind = 'member' then
    insert into public.coach_notifications (recipient_id, kind, title, body, link)
    values (a.coach_id, 'assignment_' || v_result, 'Un membre a mis fin à l''accompagnement', null, '/coach');
  else
    insert into public.coach_notifications (recipient_id, kind, title, body, link)
    values (a.member_id, 'assignment_ended', 'Votre accompagnement a pris fin', null, '/dashboard');
  end if;
  return v_result;
end $$;

-- Activation / désactivation d'un coach : coach_accounts, profiles, attributions et audit dans UNE transaction.
-- La révocation des sessions Supabase Auth se fait ensuite côté API : son échec ne rétablit jamais les droits,
-- car l'accès est refusé dès que cette transaction est validée.
create or replace function public.coach_set_active(p_coach uuid, p_active boolean, p_admin text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_type text;
  v_ended int := 0;
begin
  if p_coach is null then raise exception 'coach_not_found'; end if;
  perform 1 from public.coach_accounts where user_id = p_coach for update;
  if not found then raise exception 'coach_not_found'; end if;
  select account_type into v_type from public.profiles where id = p_coach for update;
  if not found or v_type is distinct from 'coach' then raise exception 'not_a_coach'; end if;

  if p_active then
    update public.coach_accounts set active = true, updated_at = now() where user_id = p_coach;
    update public.profiles set status = 'approved' where id = p_coach;
  else
    update public.coach_accounts set active = false, updated_at = now() where user_id = p_coach;
    update public.profiles set status = 'suspended' where id = p_coach;
    with ended as (
      update public.coach_member_assignments
         set status = 'ended', ended_at = now(), end_reason = 'coach_deactivated'
       where coach_id = p_coach and status in ('pending','active')
      returning member_id
    ), notified as (
      insert into public.coach_notifications (recipient_id, kind, title, body, link)
      select member_id, 'assignment_ended', 'Votre accompagnement a pris fin', null, '/dashboard' from ended
      returning 1
    )
    select count(*) into v_ended from ended;
  end if;

  insert into public.coach_audit_logs (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (p_admin, 'admin', case when p_active then 'coach_reactivated' else 'coach_deactivated' end,
          'coach', p_coach::text, jsonb_build_object('assignments_ended', v_ended));
  return jsonb_build_object('active', p_active, 'assignments_ended', v_ended);
end $$;

-- Lecture seule : le coach peut-il consulter le dossier de ce membre ? Retourne uniquement un booléen.
create or replace function public.coach_can_access_member(p_coach uuid, p_member uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
      from public.coach_member_assignments a
      join public.coach_accounts c on c.user_id = a.coach_id
      join public.profiles pc on pc.id = a.coach_id
      join public.profiles pm on pm.id = a.member_id
     where a.coach_id = p_coach and a.member_id = p_member
       and a.status = 'active' and a.consent_status = 'accepted'
       and c.active = true and pc.account_type = 'coach' and pc.status = 'approved'
       and pm.account_type = 'member' and pm.status = 'approved'
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Droits d'exécution : service_role uniquement
-- ═══════════════════════════════════════════════════════════════════════════════
revoke all on function public.coach_assignment_guard()                              from public, anon, authenticated;
revoke all on function public.coach_is_usable(uuid)                                 from public, anon, authenticated;
revoke all on function public.coach_assign_member(uuid, uuid, text)                 from public, anon, authenticated;
revoke all on function public.coach_respond_assignment(uuid, uuid, boolean)         from public, anon, authenticated;
revoke all on function public.coach_end_assignment(text, text, uuid, text)          from public, anon, authenticated;
revoke all on function public.coach_set_active(uuid, boolean, text)                 from public, anon, authenticated;
revoke all on function public.coach_can_access_member(uuid, uuid)                   from public, anon, authenticated;

grant execute on function public.coach_is_usable(uuid)                              to service_role;
grant execute on function public.coach_assign_member(uuid, uuid, text)              to service_role;
grant execute on function public.coach_respond_assignment(uuid, uuid, boolean)      to service_role;
grant execute on function public.coach_end_assignment(text, text, uuid, text)       to service_role;
grant execute on function public.coach_set_active(uuid, boolean, text)              to service_role;
grant execute on function public.coach_can_access_member(uuid, uuid)                to service_role;

-- is_active_coach() n'est plus utilisée par aucune politique depuis 20261107 : on retire son droit d'exécution
-- aux utilisateurs connectés (elle permettrait de sonder si un identifiant est un coach actif). service_role
-- la garde. Bloc conditionnel : sans effet si 20261024_coach_dual_access.sql n'a jamais été exécutée.
do $$
begin
  if to_regprocedure('public.is_active_coach(uuid)') is not null then
    revoke execute on function public.is_active_coach(uuid) from anon, authenticated;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ── Vérifications à lancer ensuite (lecture seule) ─────────────────────────────
-- a) RLS : une seule politique SELECT sur profiles, sans accès coach (attendu : profiles_select) :
--    select policyname, cmd, qual from pg_policies
--     where schemaname = 'public' and tablename = 'profiles' and cmd in ('SELECT','ALL');
-- b) Aucune politique ne mentionne is_active_coach ni les nouvelles tables côté authenticated :
--    select tablename, policyname, qual from pg_policies
--     where schemaname = 'public' and (qual ilike '%is_active_coach%' or tablename like 'coach_%');
-- c) Droits d'exécution (attendu : service_role seulement, aucune ligne anon/authenticated/PUBLIC) :
--    select routine_name, grantee from information_schema.routine_privileges
--     where routine_schema = 'public' and routine_name like 'coach_%' order by 1, 2;
-- d) Aucun membre avec plus d'un dossier ouvert (attendu : 0 ligne) :
--    select member_id, count(*) from public.coach_member_assignments
--     where status in ('pending','active') group by 1 having count(*) > 1;
