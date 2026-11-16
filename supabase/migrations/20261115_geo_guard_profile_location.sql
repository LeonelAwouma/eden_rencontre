-- Géolocalisation — Lot 1 (3/3) : VERROU sur profiles.city / country / region.
-- ⚠ À exécuter SEULEMENT APRÈS le déploiement de l'application qui fait passer toute modification de
--   localisation par /api/member/location (sinon la ville modifiée par l'ancien formulaire de profil serait silencieusement ignorée).
-- Idempotent. Rollback : drop trigger guard_profile_location_columns on public.profiles;
--
-- Pourquoi : « profiles » est modifiable par son propriétaire (policy update : auth.uid() = id). Sans ce
-- verrou, un membre pourrait contourner la règle « ville publiée selon consentement » par un update
-- direct. Le service_role (routes API), le trigger d'inscription et le SQL Editor restent exemptés.

create or replace function public.guard_profile_location_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new; -- service role, trigger d'inscription, SQL Editor
  end if;

  if tg_op = 'INSERT' then
    -- Création de sa propre fiche par un client : aucune localisation fournie directement.
    new.city := null;
    new.country := null;
    new.region := null;
    return new;
  end if;

  new.city    := old.city;
  new.country := old.country;
  new.region  := old.region;
  return new;
end;
$$;

revoke all on function public.guard_profile_location_columns() from public, anon, authenticated;

drop trigger if exists guard_profile_location_columns on public.profiles;
create trigger guard_profile_location_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_location_columns();

notify pgrst, 'reload schema';
