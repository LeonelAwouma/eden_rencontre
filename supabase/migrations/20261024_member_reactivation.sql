-- Rappels de réactivation : consentement explicite et déduplication.
-- Exécuter dans Supabase SQL Editor avant d'activer le cron.
-- Le suivi ne remonte pas les pages visitées ni les réponses privées.
alter table public.profiles
  add column if not exists last_member_visit_at timestamptz;

-- Avant le déploiement, aucune donnée fiable n'existe sur les visites précédentes.
-- Réinitialiser au jour de migration évite d'envoyer un rappel aux membres actifs
-- dont seule la date d'inscription aurait été connue.
update public.profiles
   set last_member_visit_at = now()
 where last_member_visit_at is null
   and status = 'approved';

create index if not exists profiles_member_visit_idx
  on public.profiles (last_member_visit_at)
  where status = 'approved';

create table if not exists public.member_reactivation_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.member_reactivation_preferences enable row level security;
drop policy if exists member_reactivation_preferences_service_only on public.member_reactivation_preferences;
create policy member_reactivation_preferences_service_only on public.member_reactivation_preferences
  for all using (false) with check (false);

create table if not exists public.member_reactivation_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Clef du cycle : nouvelle connexion = nouveau cycle et nouveaux seuils.
  inactive_since timestamptz not null,
  step_days integer not null check (step_days in (7, 21, 45)),
  status text not null default 'claimed' check (status in ('claimed','sent','failed')),
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(user_id, inactive_since, step_days)
);
create index if not exists member_reactivation_sends_user_idx
  on public.member_reactivation_sends (user_id, sent_at desc);

alter table public.member_reactivation_sends enable row level security;
drop policy if exists member_reactivation_sends_service_only on public.member_reactivation_sends;
create policy member_reactivation_sends_service_only on public.member_reactivation_sends
  for all using (false) with check (false);

-- NOTE : pour cette fonctionnalité, seules les routes API serveur utilisant la
-- clé Supabase service_role doivent lire/modifier les préférences et envois.
