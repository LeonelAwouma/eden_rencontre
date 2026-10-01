-- ============================================================
--  Forum de l'Académie du mariage — un groupe de discussion
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque (les messages sont conservés).
--  Prérequis : 20260924_member_approval_rls.sql (fonction is_approved).
--
--  Le forum fonctionne comme un groupe WhatsApp : un seul fil commun où
--  tous les membres approuvés échangent des messages et des stickers.
--  Les membres ne créent rien : ils participent. Tout se gère dans
--  Admin → Forum (service role) : nom et description du groupe, mode
--  « seuls les admins écrivent », message épinglé, suppression de
--  messages, mise en sourdine de membres, signalements, messages de l'équipe.
-- ============================================================

-- ── Ancienne version (sujets / réponses), remplacée par le groupe ──
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'forum_reports' and column_name = 'topic_id') then
    drop table public.forum_reports cascade;
  end if;
end $$;
drop table if exists public.forum_replies cascade;
drop table if exists public.forum_topics cascade;
drop function if exists public.forum_replies_changed() cascade;
drop function if exists public.forum_refresh_topic(uuid);
drop function if exists public.forum_topic_open(uuid);
drop function if exists public.forum_topic_visible(uuid);

-- ── Réglages du groupe (une seule ligne) ────────────────────
create table if not exists public.forum_settings (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Forum de l''Académie',
  description text not null default 'Le groupe d''échange de tous les membres autour des leçons de l''Académie du mariage.',
  admins_only boolean not null default false,
  pinned_message_id uuid,
  updated_at timestamptz not null default now()
);
insert into public.forum_settings (id) values (1) on conflict (id) do nothing;

-- ── Messages ────────────────────────────────────────────────
create table if not exists public.forum_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  sticker text check (sticker is null or sticker ~ '^[a-z0-9-]{1,40}$'),
  reply_to_id uuid references public.forum_messages(id) on delete set null,
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  constraint forum_messages_not_empty check (char_length(btrim(body)) > 0 or sticker is not null)
);
create index if not exists forum_messages_created_idx on public.forum_messages (created_at desc);
create index if not exists forum_messages_author_idx on public.forum_messages (author_id);

alter table public.forum_settings drop constraint if exists forum_settings_pinned_fkey;
alter table public.forum_settings add constraint forum_settings_pinned_fkey
  foreign key (pinned_message_id) references public.forum_messages(id) on delete set null;

-- ── Membres en sourdine (ne peuvent plus écrire) ────────────
create table if not exists public.forum_mutes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  until timestamptz,               -- null = jusqu'à nouvel ordre
  reason text,
  created_at timestamptz not null default now()
);

-- ── Signalements ────────────────────────────────────────────
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message_id uuid not null references public.forum_messages(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);
create index if not exists forum_reports_open_idx on public.forum_reports (resolved, message_id);

-- ── Peut-on écrire ? (groupe ouvert et membre pas en sourdine) ─
create or replace function public.forum_can_post(u uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not coalesce((select admins_only from public.forum_settings where id = 1), false)
     and not exists (select 1 from public.forum_mutes m where m.user_id = u and (m.until is null or m.until > now()));
$$;

-- ── Droits par colonne : un membre ne choisit ni l'auteur ni la mention « équipe » ──
revoke all on public.forum_settings from anon, authenticated;
grant select on public.forum_settings to authenticated;

revoke all on public.forum_messages from anon, authenticated;
grant select, delete on public.forum_messages to authenticated;
grant insert (body, sticker, reply_to_id) on public.forum_messages to authenticated;

revoke all on public.forum_mutes from anon, authenticated;
grant select on public.forum_mutes to authenticated;

revoke all on public.forum_reports from anon, authenticated;
grant insert (message_id, reason) on public.forum_reports to authenticated;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.forum_settings enable row level security;
alter table public.forum_messages enable row level security;
alter table public.forum_mutes enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists forum_settings_select on public.forum_settings;
create policy forum_settings_select on public.forum_settings
  for select using (public.is_approved(auth.uid()));

drop policy if exists forum_messages_select on public.forum_messages;
create policy forum_messages_select on public.forum_messages
  for select using (public.is_approved(auth.uid()));

drop policy if exists forum_messages_insert on public.forum_messages;
create policy forum_messages_insert on public.forum_messages
  for insert with check (
    author_id = auth.uid() and public.is_approved(auth.uid()) and public.forum_can_post(auth.uid())
  );

drop policy if exists forum_messages_delete on public.forum_messages;
create policy forum_messages_delete on public.forum_messages
  for delete using (author_id = auth.uid());

-- Chacun ne voit que sa propre mise en sourdine (pour l'afficher).
drop policy if exists forum_mutes_select on public.forum_mutes;
create policy forum_mutes_select on public.forum_mutes
  for select using (user_id = auth.uid());

drop policy if exists forum_reports_insert on public.forum_reports;
create policy forum_reports_insert on public.forum_reports
  for insert with check (reporter_id = auth.uid() and public.is_approved(auth.uid()));

-- ── Temps réel : nouveaux messages et suppressions en direct ─
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forum_messages') then
    alter publication supabase_realtime add table public.forum_messages;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'forum_settings') then
    alter publication supabase_realtime add table public.forum_settings;
  end if;
end $$;
