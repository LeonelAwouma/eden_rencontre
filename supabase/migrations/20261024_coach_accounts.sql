-- Comptes professionnels (coachs) distincts des profils de matchmaking.
-- À appliquer avant le déploiement de l'espace Coach.
-- Aucun coach n'est autorisé à lire les profils privés par cette migration.
create table if not exists public.coach_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Coach',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_accounts_active_idx on public.coach_accounts(active);

alter table public.coach_accounts enable row level security;
drop policy if exists coach_accounts_service_only on public.coach_accounts;
create policy coach_accounts_service_only on public.coach_accounts
  for all to authenticated using (false) with check (false);

-- La clé service_role utilisée exclusivement depuis les API sécurisées
-- reste la seule autorisée à gérer les comptes Coach.
revoke all on public.coach_accounts from anon, authenticated;
notify pgrst, 'reload schema';
