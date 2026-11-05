-- ============================================================
--  Annonces « Nouveautés » : état par membre + compteurs agrégés
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent. Le code est tolérant à l'absence de ces tables : il peut être
--  déployé avant cette migration, les annonces s'affichent alors sans mémoire
--  de fermeture ni statistiques.
--
--  1) announcement_states : quelle annonce un membre a fermée / découverte.
--     Donnée de compte, supprimée avec lui (on delete cascade). Réservée au
--     serveur (clé de service) : aucune policy, accès retiré à anon/authenticated.
--     Une table dédiée plutôt qu'une colonne de `profiles`, que le membre peut
--     modifier lui-même.
--  2) announcement_stats : compteurs AGRÉGÉS par annonce et par jour. Aucun
--     identifiant de personne n'y figure : ce sont des événements, pas des
--     utilisateurs uniques.
--
--  Retour arrière : drop table public.announcement_states, public.announcement_stats
--  cascade; drop function public.bump_announcement_stat(text, text);
-- ============================================================

create table if not exists public.announcement_states (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  announcement_id text not null check (char_length(announcement_id) between 1 and 80),
  dismissed_at    timestamptz,
  discovered_at   timestamptz,
  primary key (user_id, announcement_id)
);

alter table public.announcement_states enable row level security;
revoke all on public.announcement_states from anon, authenticated;

create table if not exists public.announcement_stats (
  announcement_id text not null check (char_length(announcement_id) between 1 and 80),
  day             date not null,
  views           integer not null default 0,
  clicks          integer not null default 0,
  dismissals      integer not null default 0,
  primary key (announcement_id, day)
);

alter table public.announcement_stats enable row level security;
revoke all on public.announcement_stats from anon, authenticated;

-- Incrément atomique (un seul UPSERT) : pas de lecture puis écriture, donc pas de
-- perte de comptage en cas de requêtes simultanées. Événements autorisés : view,
-- click, dismiss — tout autre est ignoré.
create or replace function public.bump_announcement_stat(p_id text, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event not in ('view', 'click', 'dismiss') then
    return;
  end if;

  insert into public.announcement_stats as s (announcement_id, day, views, clicks, dismissals)
  values (
    p_id,
    (now() at time zone 'utc')::date,
    case when p_event = 'view'    then 1 else 0 end,
    case when p_event = 'click'   then 1 else 0 end,
    case when p_event = 'dismiss' then 1 else 0 end
  )
  on conflict (announcement_id, day) do update set
    views      = s.views      + excluded.views,
    clicks     = s.clicks     + excluded.clicks,
    dismissals = s.dismissals + excluded.dismissals;
end;
$$;

revoke execute on function public.bump_announcement_stat(text, text) from public, anon, authenticated;
grant execute on function public.bump_announcement_stat(text, text) to service_role;

notify pgrst, 'reload schema';
