-- ============================================================
--  Notifications push sur le téléphone
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--
--  Fonctionnement :
--   1. Le membre active les notifications sur son téléphone : son abonnement
--      push est enregistré dans push_subscriptions (via /api/push/subscribe).
--   2. Quand la plateforme crée une notification (cloche), qu'un message privé
--      arrive ou qu'une demande d'alliance est envoyée / acceptée, un trigger
--      prévient le site (extension pg_net, appel HTTP asynchrone).
--   3. /api/push/dispatch relit l'événement en base et envoie la notification
--      push aux téléphones du ou des destinataires.
--  Le trigger n'envoie qu'un type + un identifiant : le site relit tout en base
--  et n'envoie chaque événement qu'une fois (push_log), donc rien à falsifier.
--
--  ⚠️ Si votre domaine change, mettez à jour push_settings.dispatch_url.
-- ============================================================

create extension if not exists pg_net with schema extensions;

-- ── Abonnements push (un par navigateur / téléphone) ────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  locale text not null default 'fr',
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- Aucune politique : accès uniquement par le serveur (service role).

-- ── Événements déjà envoyés (chaque événement n'est poussé qu'une fois) ──
create table if not exists public.push_log (
  source text not null,
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (source, ref)
);
alter table public.push_log enable row level security;

-- ── Adresse du site appelée par les triggers ────────────────
create table if not exists public.push_settings (
  id integer primary key default 1 check (id = 1),
  dispatch_url text not null,
  enabled boolean not null default true
);
insert into public.push_settings (id, dispatch_url)
values (1, 'https://www.gardenofalliance.com/api/push/dispatch')
on conflict (id) do nothing;
alter table public.push_settings enable row level security;

-- ── Appel du site (asynchrone : n'allonge ni ne bloque jamais l'écriture) ──
create or replace function public.push_dispatch(p_source text, p_ref text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
begin
  select dispatch_url, enabled into cfg from public.push_settings where id = 1;
  if cfg is null or not cfg.enabled then return; end if;
  perform net.http_post(
    url := cfg.dispatch_url,
    body := jsonb_build_object('source', p_source, 'ref', p_ref),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
exception when others then
  -- Une notification push manquée ne doit jamais faire échouer l'action du membre.
  raise warning 'push_dispatch: %', sqlerrm;
end;
$$;

-- Notifications de la cloche (événements, visioconférences, blog, engagement, vérification…)
create or replace function public.push_on_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_dispatch('notification', new.id::text);
  return null;
end;
$$;

do $$
begin
  if to_regclass('public.meeting_notifications') is not null then
    drop trigger if exists push_on_notification on public.meeting_notifications;
    create trigger push_on_notification after insert on public.meeting_notifications
      for each row execute function public.push_on_notification();
  end if;
end $$;

-- Messages privés
create or replace function public.push_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_dispatch('message', new.id::text);
  return null;
end;
$$;

drop trigger if exists push_on_message on public.messages;
create trigger push_on_message after insert on public.messages
  for each row execute function public.push_on_message();

-- Demandes d'alliance (reçue, acceptée)
create or replace function public.push_on_friendship()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('pending', 'accepted') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    -- La date fait partie de la clé : une demande renvoyée après un refus notifie à nouveau.
    perform public.push_dispatch('friendship',
      new.id::text || ':' || new.status || ':' || floor(extract(epoch from new.updated_at))::bigint::text);
  end if;
  return null;
end;
$$;

drop trigger if exists push_on_friendship on public.friendships;
create trigger push_on_friendship after insert or update of status on public.friendships
  for each row execute function public.push_on_friendship();
