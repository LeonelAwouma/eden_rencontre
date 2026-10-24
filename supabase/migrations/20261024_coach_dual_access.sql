-- Accès double Coach + Membre : un seul compte Supabase Auth, sans questionnaire.
-- Exécuter APRÈS 20261024_coach_accounts.sql.
-- Le rôle professionnel n'autorise PAS à envoyer des demandes matrimoniales.

alter table public.profiles add column if not exists account_type text not null default 'member';
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check
  check (account_type in ('member', 'coach'));

-- L'attribution du rôle reste exclusivement administrable depuis le serveur.
create or replace function public.guard_profile_account_type()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then new.account_type := 'member';
    else new.account_type := old.account_type;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_profile_account_type on public.profiles;
create trigger guard_profile_account_type before insert or update
  on public.profiles for each row execute function public.guard_profile_account_type();

-- Reconcilier les coachs existants créés par la première PR.
update public.profiles p
  set account_type = 'coach',
      status = case when c.active then 'approved' else 'suspended' end
from public.coach_accounts c
where p.id = c.user_id;

-- L'accès standard est autorisé aux membres approuvés, mais les coachs
-- n'ont pas la qualité de candidats au matching et ne peuvent pas
-- devenir des interlocuteurs matrimoniaux via les RPC/RLS existantes.
create or replace function public.is_approved(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.status = 'approved' and p.account_type = 'member'
  );
$$;
revoke all on function public.is_approved(uuid) from public;
grant execute on function public.is_approved(uuid) to authenticated, service_role;

create or replace function public.is_active_coach(uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.coach_accounts c
    join public.profiles p on p.id = c.user_id
    where c.user_id = uid and c.active and p.status = 'approved' and p.account_type = 'coach'
  );
$$;
revoke all on function public.is_active_coach(uuid) from public;
grant execute on function public.is_active_coach(uuid) to authenticated, service_role;

-- Le coach a accès au catalogue des profils approuvés via le même espace
-- que les membres, sans devenir lui-même visible dans leur annuaire.
-- Les interactions de matching restent bloquées par is_approved.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  auth.uid() = id
  or (
    status = 'approved' and account_type = 'member'
    and (public.is_approved(auth.uid()) or public.is_active_coach(auth.uid()))
  )
);
notify pgrst, 'reload schema';
