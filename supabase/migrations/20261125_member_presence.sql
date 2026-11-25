-- Messagerie — « Vu il y a… » : dernière présence de chaque membre dans l'espace membre.
-- Le statut « En ligne » lui-même passe par Realtime Presence (canal members-online), sans base.
-- Table dédiée plutôt qu'une colonne de profiles : les triggers de profiles (colonnes admin, géo)
-- se déclencheraient à chaque battement de présence.
-- Idempotent. À exécuter dans le SQL Editor de Supabase, par un humain.
-- Rollback : drop function if exists public.touch_presence(); drop table if exists public.member_presence;

begin;

create table if not exists public.member_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.member_presence enable row level security;

-- Lecture : membres approuvés uniquement. Aucune écriture directe : seulement via touch_presence().
drop policy if exists member_presence_select on public.member_presence;
create policy member_presence_select on public.member_presence
  for select using (public.is_approved(auth.uid()));

revoke insert, update, delete on public.member_presence from anon, authenticated;
grant select on public.member_presence to authenticated;

-- Battement de présence du membre connecté (appelé ~1 fois par minute tant que la page est visible).
create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_approved(auth.uid()) then
    return;
  end if;
  insert into public.member_presence (user_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;

revoke all on function public.touch_presence() from public;
grant execute on function public.touch_presence() to authenticated;

commit;

-- Contrôle : se connecter à l'espace membre puis
-- select * from public.member_presence order by last_seen_at desc limit 5;
