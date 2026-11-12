-- ============================================================
--  Notifications d'accompagnement côté MEMBRE + push complémentaire
--  À exécuter MANUELLEMENT : Supabase Dashboard → SQL Editor → New query
--  Additif et idempotent : peut être ré-exécuté sans risque. Aucune donnée supprimée.
--
--  Prérequis : 20261002_push_notifications.sql et 20261108_coach_assignments.sql.
--
--  1. coach_assign_member : même comportement + lors d'une réaffectation, UNE seule transaction
--       - ferme l'ancien dossier (historique conservé, end_reason = 'reassigned') ;
--       - marque comme lues les anciennes propositions non lues du membre (pas de doublon) ;
--       - prévient l'ancien coach uniquement si l'ancien dossier était ACTIF ;
--       - crée la nouvelle proposition ET sa notification pour le membre.
--     Toute erreur annule l'ensemble. Le lien de la notification mène à la carte de validation.
--  2. push_log : colonnes status / claimed_at (les événements existants restent « sent »),
--     pour qu'un échec d'envoi puisse être repris sans jamais doubler un envoi réussi.
--  3. Trigger push sur coach_notifications, réservé aux destinataires MEMBRES approuvés.
--     La notification enregistrée en base reste la référence : le push est complémentaire.
-- ============================================================

-- ═══ 1. Attribution / réaffectation atomique ═══
create or replace function public.coach_assign_member(p_coach uuid, p_member uuid, p_admin text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id uuid;
  v_old public.coach_member_assignments%rowtype;
begin
  if p_coach is null or p_member is null then raise exception 'assignment_not_found'; end if;
  if p_coach = p_member then raise exception 'self_assignment'; end if;

  perform pg_advisory_xact_lock(hashtext(p_member::text));
  -- Verrou partagé : un coach ne peut pas être désactivé pendant l'attribution (coach_set_active prend FOR UPDATE).
  perform 1 from public.coach_accounts where user_id = p_coach for share;
  if not found or not public.coach_is_usable(p_coach) then raise exception 'coach_not_active'; end if;

  perform 1 from public.profiles where id = p_member and status = 'approved' and account_type = 'member';
  if not found then raise exception 'member_not_eligible'; end if;

  -- Réaffectation : l'ancien dossier ouvert (au plus un, index unique partiel) est clos, historique conservé.
  select * into v_old from public.coach_member_assignments
   where member_id = p_member and status in ('pending','active') for update;
  if found then
    update public.coach_member_assignments
       set status = 'ended', ended_at = now(), end_reason = 'reassigned'
     where id = v_old.id;

    -- Anciennes propositions non lues : devenues obsolètes, marquées lues (jamais supprimées).
    update public.coach_notifications set read_at = now()
     where recipient_id = p_member and kind = 'coach_assignment_proposed' and read_at is null;

    -- L'ancien coach n'est prévenu que s'il accompagnait réellement le membre (dossier actif).
    if v_old.status = 'active' then
      insert into public.coach_notifications (recipient_id, kind, title, body, link)
      values (v_old.coach_id, 'assignment_ended', 'Un accompagnement a pris fin', null, '/coach');
    end if;
  end if;

  insert into public.coach_member_assignments (coach_id, member_id, status, consent_status, assigned_by)
  values (p_coach, p_member, 'pending', 'pending', coalesce(nullif(p_admin, ''), 'admin'))
  returning id into v_id;

  insert into public.coach_audit_logs (actor_id, actor_kind, action, target_type, target_id, metadata)
  values (p_admin, 'admin', 'assignment_proposed', 'assignment', v_id::text,
          jsonb_build_object('coach_id', p_coach, 'member_id', p_member));

  insert into public.coach_notifications (recipient_id, kind, title, body, link)
  values (p_member, 'coach_assignment_proposed', 'Un accompagnement vous est proposé',
          'Un coach souhaite vous accompagner. Vous pouvez accepter ou refuser ce suivi.',
          '/dashboard?tab=Home#coach-proposal');
  return v_id;
end $$;

-- ═══ 2. push_log : reprise possible après un échec ═══
-- Les lignes existantes prennent « sent » (déjà envoyées : jamais renvoyées) ; les nouvelles sont écrites
-- explicitement par /api/push/dispatch (« claimed » puis « sent » ou « failed »).
alter table public.push_log add column if not exists status text not null default 'sent';
alter table public.push_log add column if not exists claimed_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_log_status_chk') then
    alter table public.push_log
      add constraint push_log_status_chk check (status in ('claimed','sent','failed'));
  end if;
end $$;

-- ═══ 3. Push complémentaire pour les notifications d'accompagnement du MEMBRE ═══
-- Le rôle du destinataire est vérifié dans profiles (jamais déduit du « kind » : « assignment_ended »
-- est aussi envoyé à des coachs). /api/push/dispatch revérifie à son tour.
create or replace function public.push_on_coach_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.kind in ('coach_assignment_proposed', 'assignment_ended')
     and exists (select 1 from public.profiles p
                  where p.id = new.recipient_id and p.account_type = 'member' and p.status = 'approved') then
    perform public.push_dispatch('coach_notification', new.id::text);
  end if;
  return null;
end;
$$;

drop trigger if exists push_on_coach_notification on public.coach_notifications;
create trigger push_on_coach_notification after insert on public.coach_notifications
  for each row execute function public.push_on_coach_notification();
