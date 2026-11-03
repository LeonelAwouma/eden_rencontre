-- ============================================================
--  Programme de parrainage + récompenses GOLD (30 jours)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent (if not exists / drop policy if exists puis create).
--
--  Principe : chaque membre approuvé a un lien de parrainage stable
--  (referral_codes). Un filleul validé (profil approuvé + questionnaire
--  terminé + délai de vérification écoulé + pas de fraude) alimente un
--  compteur ; au seuil configuré, un crédit GOLD de 30 jours (configurable)
--  est créé en réserve (referral_rewards, status='pending_activation') et
--  n'est activé que lorsqu'il devient réellement utile (voir
--  src/lib/subscription/effective.ts) — jamais pendant une période déjà
--  gratuite au niveau GOLD (promo de lancement) ou déjà couverte par un
--  abonnement payant GOLD, et jamais consommé pendant la découverte même
--  si celle-ci ne procure que le niveau « essentiel ».
--
--  Toutes les opérations sensibles (octroi, activation, suspension,
--  consommation du nonce de parrainage) passent par des fonctions
--  Postgres `security definer`, verrouillées à `service_role` uniquement
--  — aucune de ces tables n'est jamais modifiable depuis le navigateur.
-- ============================================================

-- ── 1. referral_codes — lien personnel stable par membre ──────────────
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists referral_codes_user_unique_idx on public.referral_codes(user_id);
create unique index if not exists referral_codes_code_unique_idx on public.referral_codes(lower(code));

-- ── 2. referrals — relation parrain ↔ filleul ──────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  referral_code_id uuid references public.referral_codes(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'validated', 'rejected')),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  -- Garde anti double-comptage : ce filleul a déjà financé une récompense (voir
  -- referral_reward_sources, qui trace PRÉCISÉMENT laquelle).
  rewarded boolean not null default false,
  -- Signal de risque réservé à l'admin (jamais déduit automatiquement d'une IP partagée).
  flagged_fraud boolean not null default false,
  flagged_reason text
);
-- Un filleul ne peut être attribué qu'à un seul parrain — garanti en base, pas
-- seulement côté application (anti réattribution, anti double capture).
create unique index if not exists referrals_referred_user_unique_idx on public.referrals(referred_user_id);
create index if not exists referrals_referrer_status_idx on public.referrals(referrer_id, status);

-- ── 3. referral_status_history — audit des transitions automatiques ───
-- Distinct de admin_audit_log (src/lib/admin-auth.ts), réservé aux actions
-- décidées par un admin : une transition déclenchée par le système (cron,
-- approbation, questionnaire) n'a pas d'acteur admin à y inscrire.
create table if not exists public.referral_status_history (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  changed_at timestamptz not null default now()
);
create index if not exists referral_status_history_referral_idx on public.referral_status_history(referral_id);

-- ── 4. referral_rewards — file de crédits GOLD (pas un simple drapeau) ─
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_type text not null default 'gold_30d',
  duration_days int not null,
  status text not null default 'pending_activation'
    check (status in ('pending_activation', 'active', 'expired', 'revoked')),
  granted_at timestamptz not null default now(),
  activated_at timestamptz,
  expires_at timestamptz,
  -- Durée restante EXACTE (précision de l'intervalle, jamais arrondie en jours),
  -- posée uniquement par suspend_referral_credit quand un crédit déjà `active`
  -- est interrompu par une période gratuite/payante GOLD survenant entre-temps.
  -- Plusieurs cycles de suspension/réactivation ne peuvent donc jamais, même
  -- cumulés, accorder plus que la durée réellement restante à chaque suspension.
  remaining_duration interval,
  source_batch_id uuid,
  revoked_reason text,
  revoked_by text
);
create index if not exists referral_rewards_user_status_idx on public.referral_rewards(user_id, status);

-- ── 5. referral_reward_sources — traçabilité filleul → récompense ─────
create table if not exists public.referral_reward_sources (
  reward_id uuid not null references public.referral_rewards(id) on delete cascade,
  referral_id uuid not null references public.referrals(id) on delete cascade,
  primary key (reward_id, referral_id)
);
-- Un filleul validé ne finance jamais deux récompenses.
create unique index if not exists referral_reward_sources_referral_unique_idx on public.referral_reward_sources(referral_id);

-- ── 6. referral_capture_intents — jeton d'intention à usage unique ─────
-- Posé quand un visiteur ouvre /r/[code] (avant toute inscription). Le cookie
-- `eden_ref` porte ce nonce, jamais le code brut : un cookie recopié/rejoué ne
-- peut servir qu'une fois (voir claim_referral_intent_and_record ci-dessous).
create table if not exists public.referral_capture_intents (
  nonce uuid primary key default gen_random_uuid(),
  code text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_user_id uuid references public.profiles(id) on delete set null
);
create index if not exists referral_capture_intents_created_idx on public.referral_capture_intents(created_at);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_status_history enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.referral_reward_sources enable row level security;
alter table public.referral_capture_intents enable row level security;

-- Motif A (réutilise is_approved(), 20260924_member_approval_rls.sql) : un
-- parrain approuvé peut voir son propre code et ses propres relations de
-- parrainage — jamais celles d'un autre, jamais d'écriture directe.
drop policy if exists referral_codes_select on public.referral_codes;
create policy referral_codes_select on public.referral_codes
  for select using (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select using (auth.uid() = referrer_id and public.is_approved(auth.uid()));

-- Motif B (service-role uniquement) : personne ne peut modifier soi-même son
-- statut GOLD, ses récompenses, l'historique ou les jetons d'intention —
-- aucune policy pour authenticated/anon, RLS activée sans aucune exception.
-- (referral_status_history, referral_rewards, referral_reward_sources,
--  referral_capture_intents n'ont ainsi aucune policy du tout : RLS activée
--  seule équivaut à USING (false) pour authenticated/anon.)

-- ── Fonctions atomiques (patron add_profile_photo : UNE transaction,
--    garde sur l'état actuel, jamais de lecture-puis-écriture séparées) ──

-- recompute_referral_rewards : idempotente, sérialisée PAR PARRAIN via un
-- verrou consultatif (jamais `for update skip locked`, qui laisserait deux
-- appels concurrents voir chacun un sous-ensemble différent des lignes
-- "validées non récompensées" et fausserait le comptage par seuil).
create or replace function public.recompute_referral_rewards(p_referrer_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_reward_id uuid;
  v_count int;
  v_required int;
  v_cumulative boolean;
  v_cap int;
  v_duration int;
  v_existing int;
  v_batch_ids uuid[]; -- lot exact et figé, réutilisé IDENTIQUE pour les deux écritures ci-dessous
begin
  -- Bloque (n'ignore jamais) tout autre appel concurrent visant CE parrain :
  -- il attend son tour plutôt que de voir un sous-ensemble partiel des lignes.
  -- Les appels visant d'autres parrains ne sont jamais bloqués (clé différente).
  perform pg_advisory_xact_lock(hashtext('referral_reward:' || p_referrer_id::text));

  select coalesce((value::text)::int, 3) into v_required
    from public.platform_settings where category = 'referral' and key = 'required_referrals';
  select coalesce((value::text)::boolean, true) into v_cumulative
    from public.platform_settings where category = 'referral' and key = 'cumulative_allowed';
  select coalesce((value::text)::int, 0) into v_cap
    from public.platform_settings where category = 'referral' and key = 'reward_cap';
  select coalesce((value::text)::int, 30) into v_duration
    from public.platform_settings where category = 'referral' and key = 'reward_duration_days';
  v_required := coalesce(v_required, 3);
  v_cumulative := coalesce(v_cumulative, true);
  v_cap := coalesce(v_cap, 0);
  v_duration := coalesce(v_duration, 30);

  select count(*) into v_count
    from public.referrals
    where referrer_id = p_referrer_id and status = 'validated' and rewarded = false;
  if v_count < v_required then
    return null;
  end if;

  if not v_cumulative then
    select count(*) into v_existing from public.referral_rewards
      where user_id = p_referrer_id and status in ('pending_activation', 'active');
    if v_existing > 0 then return null; end if;
  end if;

  if v_cap > 0 then
    select count(*) into v_existing from public.referral_rewards where user_id = p_referrer_id;
    if v_existing >= v_cap then return null; end if;
  end if;

  -- Le lot est calculé UNE SEULE FOIS, ici, et réutilisé à l'identique pour les
  -- deux écritures qui suivent — jamais recalculé séparément pour chacune, ce
  -- qui éliminerait tout risque de divergence entre les lignes marquées
  -- « récompensées » et les lignes effectivement tracées comme sources.
  select array_agg(id) into v_batch_ids from (
    select id from public.referrals
      where referrer_id = p_referrer_id and status = 'validated' and rewarded = false
      order by created_at
      limit v_required
  ) s;

  insert into public.referral_rewards (user_id, duration_days, status, source_batch_id)
    values (p_referrer_id, v_duration, 'pending_activation', gen_random_uuid())
    returning id into v_reward_id;

  update public.referrals set rewarded = true where id = any(v_batch_ids);
  insert into public.referral_reward_sources (reward_id, referral_id)
    select v_reward_id, x from unnest(v_batch_ids) as x;

  return v_reward_id;
end;
$$;

-- validate_referral_and_maybe_grant : transition d'état ET recalcul de
-- l'octroi dans LA MÊME transaction — élimine toute fenêtre de race entre
-- "marquer validé" et "octroyer la récompense", même si plusieurs filleuls
-- du même parrain sont validés au même instant (ex. traitement par lot).
create or replace function public.validate_referral_and_maybe_grant(p_referral_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_referrer_id uuid;
begin
  update public.referrals
    set status = 'validated', validated_at = now()
    where id = p_referral_id and status in ('pending', 'under_review')
    returning referrer_id into v_referrer_id;

  if v_referrer_id is null then
    return null; -- déjà validé, rejeté, ou id invalide : rien à faire
  end if;

  insert into public.referral_status_history (referral_id, from_status, to_status, reason)
    values (p_referral_id, null, 'validated', 'conditions réunies');

  return public.recompute_referral_rewards(v_referrer_id);
end;
$$;

-- activate_referral_credit : active le crédit `pending_activation` le plus
-- ancien (FIFO) — garde atomique sur "aucun crédit déjà actif pour ce membre"
-- (une seule ligne active à la fois). Réutilise `remaining_duration` si le
-- crédit avait déjà été partiellement consommé puis suspendu (précision
-- exacte, jamais `duration_days` plein après une suspension partielle).
create or replace function public.activate_referral_credit(p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_reward_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('referral_reward:' || p_user_id::text));

  if exists (select 1 from public.referral_rewards where user_id = p_user_id and status = 'active') then
    return null; -- déjà un crédit actif : rien à faire (une seule ligne active à la fois)
  end if;

  update public.referral_rewards
    set status = 'active',
        activated_at = now(),
        expires_at = now() + coalesce(remaining_duration, duration_days * interval '1 day'),
        remaining_duration = null
    where id = (
      select id from public.referral_rewards
        where user_id = p_user_id and status = 'pending_activation'
        order by granted_at
        limit 1
    )
    returning id into v_reward_id;

  return v_reward_id;
end;
$$;

-- suspend_referral_credit : convertit un crédit `active` en `pending_activation`
-- en conservant SA DURÉE RESTANTE EXACTE (interval, sans arrondi) — jamais
-- consommé "pour rien" en plus d'une promo/d'un abonnement payant GOLD déjà
-- suffisant. Plusieurs cycles suspension/réactivation ne gonflent jamais le
-- total de jours accordés au-delà de la durée d'origine.
create or replace function public.suspend_referral_credit(p_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_reward_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('referral_reward:' || p_user_id::text));

  update public.referral_rewards
    set status = 'pending_activation',
        remaining_duration = expires_at - now(),
        activated_at = null,
        expires_at = null
    where user_id = p_user_id and status = 'active'
    returning id into v_reward_id;

  return v_reward_id;
end;
$$;

-- claim_referral_intent_and_record : consomme le nonce ET crée la relation
-- parrain-filleul dans UNE SEULE transaction. Correction critique de
-- sémantique PL/pgSQL : un simple `return null;` après une écriture NE
-- DÉFAIT PAS cette écriture — seule une exception capturée par le bloc
-- `exception when others` ci-dessous annule réellement tout ce qui a été
-- écrit depuis le début du sous-bloc (y compris la consommation du nonce).
-- Le seul cas où le nonce reste consommé SANS nouvelle ligne `referrals` est
-- le conflit légitime `on conflict do nothing` (filleul déjà attribué par
-- ailleurs) : ce cas ne lève PAS d'exception, c'est une sortie normale.
create or replace function public.claim_referral_intent_and_record(p_nonce uuid, p_referred_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_code text;
  v_referrer_id uuid;
  v_created_at timestamptz;
  v_referral_id uuid;
begin
  begin -- sous-bloc : toute exception ici annule tout ce qui a été écrit depuis son début
    update public.referral_capture_intents
      set used_at = now(), used_by_user_id = p_referred_user_id
      where nonce = p_nonce and used_at is null and created_at > now() - interval '7 days'
      returning code into v_code;
    if v_code is null then
      raise exception 'invalid_or_expired_nonce'; -- rien n'a été écrit : rollback trivial
    end if;

    select created_at into v_created_at from public.profiles where id = p_referred_user_id;
    if v_created_at is null or now() - v_created_at > interval '15 minutes' then
      -- Compte pas assez récent : garde secondaire de fraîcheur, en complément
      -- du nonce à usage unique. Annule la consommation du nonce ci-dessus —
      -- un compte trop ancien ne doit jamais brûler un nonce par ailleurs valide.
      raise exception 'account_not_fresh';
    end if;

    select user_id into v_referrer_id from public.referral_codes
      where lower(code) = lower(v_code) and is_active;
    if v_referrer_id is null or v_referrer_id = p_referred_user_id then
      raise exception 'invalid_referrer_or_self_referral'; -- idem : annule la consommation
    end if;

    -- Cas explicitement prévu où le nonce RESTE consommé même sans nouvelle
    -- ligne : ce filleul a déjà une relation `referrals` par ailleurs (index
    -- unique sur referred_user_id). `on conflict do nothing` est un résultat
    -- final normal, pas une erreur : pas de `raise exception` ici.
    insert into public.referrals (referrer_id, referred_user_id, referral_code_id, status)
      select v_referrer_id, p_referred_user_id, rc.id, 'pending'
        from public.referral_codes rc where lower(rc.code) = lower(v_code) and rc.is_active
      on conflict (referred_user_id) do nothing
      returning id into v_referral_id;

    if v_referral_id is not null then
      insert into public.referral_status_history (referral_id, from_status, to_status, reason)
        values (v_referral_id, null, 'pending', 'inscription via lien de parrainage');
    end if;

    return v_referral_id; -- peut être null (conflit) : sortie normale, tout est conservé
  exception when others then
    return null; -- retour arrière réel du sous-bloc : le nonce redevient disponible
  end;
end;
$$;

-- ── Durcissement : seul service_role peut exécuter ces fonctions ──────
-- L'identité (p_referrer_id / p_user_id / p_referred_user_id) est TOUJOURS
-- déterminée par la route API appelante à partir de la session authentifiée
-- vérifiée côté serveur — jamais fournie telle quelle par le navigateur.
revoke execute on function public.recompute_referral_rewards(uuid) from public, anon, authenticated;
revoke execute on function public.validate_referral_and_maybe_grant(uuid) from public, anon, authenticated;
revoke execute on function public.activate_referral_credit(uuid) from public, anon, authenticated;
revoke execute on function public.suspend_referral_credit(uuid) from public, anon, authenticated;
revoke execute on function public.claim_referral_intent_and_record(uuid, uuid) from public, anon, authenticated;

grant execute on function public.recompute_referral_rewards(uuid) to service_role;
grant execute on function public.validate_referral_and_maybe_grant(uuid) to service_role;
grant execute on function public.activate_referral_credit(uuid) to service_role;
grant execute on function public.suspend_referral_credit(uuid) to service_role;
grant execute on function public.claim_referral_intent_and_record(uuid, uuid) to service_role;

-- search_path explicite : ces fonctions sont security definer (s'exécutent avec
-- les privilèges de leur propriétaire) — sans cela, un search_path manipulable
-- pourrait rediriger les tables/fonctions qu'elles appellent vers un objet malveillant.
alter function public.recompute_referral_rewards(uuid) set search_path = public, pg_temp;
alter function public.validate_referral_and_maybe_grant(uuid) set search_path = public, pg_temp;
alter function public.activate_referral_credit(uuid) set search_path = public, pg_temp;
alter function public.suspend_referral_credit(uuid) set search_path = public, pg_temp;
alter function public.claim_referral_intent_and_record(uuid, uuid) set search_path = public, pg_temp;

-- ── Configuration : élargissement de platform_settings.category ───────
-- La contrainte CHECK existante (supabase/admin-extensions.sql) n'autorise
-- pas encore 'referral'/'subscription' : sans cet élargissement, toute
-- écriture de réglage échouerait avec une violation de contrainte.
alter table public.platform_settings drop constraint if exists platform_settings_category_check;
alter table public.platform_settings add constraint platform_settings_category_check
  check (category in ('general', 'moderation', 'meets', 'notifications', 'security', 'appearance', 'referral', 'subscription'));

-- Valeurs par défaut : programme désactivé, aucune restriction commerciale
-- active — le déploiement de cette migration ne change rien au comportement
-- actuel tant qu'un admin ne les modifie pas explicitement.
insert into public.platform_settings (category, key, value) values
  ('referral', 'enabled', 'false'),
  ('referral', 'required_referrals', '3'),
  ('referral', 'reward_duration_days', '30'),
  ('referral', 'review_delay_days', '7'),
  ('referral', 'cumulative_allowed', 'true'),
  ('referral', 'reward_cap', '0'),
  ('referral', 'campaign_start_at', 'null'),
  ('referral', 'campaign_end_at', 'null'),
  ('subscription', 'launch_promo_end_at', 'null'),
  ('subscription', 'discovery_period_days', '30'),
  ('subscription', 'commercial_restrictions_enabled', 'false')
on conflict (category, key) do nothing;

-- ── Notifications membre : 6 nouveaux types pour meeting_notifications ─
-- Même patron que les précédents élargissements (drop puis re-add du CHECK).
-- La liste reprend l'union la plus complète déjà observée dans le dépôt
-- (supabase/blog-schema.sql et supabase/engagement-schema.sql, strictement
-- identiques entre elles) plutôt qu'une liste partielle reconstituée de
-- mémoire — plusieurs fichiers hors supabase/migrations/ élargissent cette
-- même contrainte avec des listes différentes (dérive déjà signalée dans le
-- plan) ; reprendre la plus complète évite de rétrécir accidentellement la
-- contrainte réellement appliquée en base par rapport à ce qu'elle autorise
-- aujourd'hui, pour les deux seuls types réellement ajoutés : les 6 nouveaux.
alter table public.meeting_notifications drop constraint if exists meeting_notifications_notification_type_check;
alter table public.meeting_notifications add constraint meeting_notifications_notification_type_check
  check (notification_type in (
    'created', 'updated', 'rescheduled', 'cancelled', 'reminder',
    'meet_invitation', 'event_notification', 'blog_post',
    'verification_pending', 'verification_approved', 'verification_rejected',
    'engagement_request', 'engagement_accepted', 'engagement_declined',
    'referral_signup', 'referral_validated', 'referral_reward_granted',
    'referral_reward_activated', 'referral_reward_expiring_soon', 'referral_reward_ended'
  ));

notify pgrst, 'reload schema';
