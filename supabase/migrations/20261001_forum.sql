-- ============================================================
--  Forum de l'Académie du mariage
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--  Prérequis : 20260924_member_approval_rls.sql (fonction is_approved).
--
--  Espace d'échange ouvert à tous les membres approuvés : des sujets
--  rangés par thématique de l'Académie (et, au besoin, rattachés à une
--  leçon précise), et leurs réponses.
--   • Membres : lire, publier, répondre, supprimer ce qu'ils ont écrit,
--     signaler un message (RLS + droits par colonne ci-dessous).
--   • Admin (service role, /admin/forum) : épingler, verrouiller,
--     masquer, supprimer, et écrire au nom de l'équipe (is_staff).
-- ============================================================

-- ── Sujets ──────────────────────────────────────────────────
create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category text not null default 'general',
  lesson_slug text,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 8000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_staff boolean not null default false,
  reply_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists forum_topics_list_idx on public.forum_topics (status, is_pinned desc, last_activity_at desc);
create index if not exists forum_topics_category_idx on public.forum_topics (category);
create index if not exists forum_topics_lesson_idx on public.forum_topics (lesson_slug);
create index if not exists forum_topics_author_idx on public.forum_topics (author_id);

-- ── Réponses ────────────────────────────────────────────────
create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  is_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists forum_replies_topic_idx on public.forum_replies (topic_id, created_at);
create index if not exists forum_replies_author_idx on public.forum_replies (author_id);

-- ── Signalements ────────────────────────────────────────────
create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists forum_reports_open_idx on public.forum_reports (resolved, topic_id);
-- Un membre ne signale qu'une fois le même message.
create unique index if not exists forum_reports_once_idx
  on public.forum_reports (reporter_id, topic_id, coalesce(reply_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ── Compteur de réponses et dernière activité ───────────────
create or replace function public.forum_refresh_topic(t uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.forum_topics ft
  set reply_count = (select count(*) from public.forum_replies r where r.topic_id = t and r.status = 'visible'),
      last_activity_at = greatest(
        ft.created_at,
        coalesce((select max(r.created_at) from public.forum_replies r where r.topic_id = t and r.status = 'visible'), ft.created_at)
      )
  where ft.id = t;
$$;

create or replace function public.forum_replies_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.forum_refresh_topic(coalesce(new.topic_id, old.topic_id));
  return null;
end;
$$;

drop trigger if exists forum_replies_changed on public.forum_replies;
create trigger forum_replies_changed
  after insert or update of status or delete on public.forum_replies
  for each row execute function public.forum_replies_changed();

-- ── Droits par colonne : un membre ne choisit ni l'auteur, ni le statut,
--    ni l'épinglage / verrouillage, ni la mention « équipe ». ──
revoke insert, update on public.forum_topics from anon, authenticated;
grant select, delete on public.forum_topics to authenticated;
grant insert (category, lesson_slug, title, body) on public.forum_topics to authenticated;
grant update (category, lesson_slug, title, body, updated_at) on public.forum_topics to authenticated;

revoke insert, update on public.forum_replies from anon, authenticated;
grant select, delete on public.forum_replies to authenticated;
grant insert (topic_id, body) on public.forum_replies to authenticated;
grant update (body, updated_at) on public.forum_replies to authenticated;

revoke insert, update, delete on public.forum_reports from anon, authenticated;
grant insert (topic_id, reply_id, reason) on public.forum_reports to authenticated;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists forum_topics_select on public.forum_topics;
create policy forum_topics_select on public.forum_topics
  for select using (
    public.is_approved(auth.uid()) and (status = 'visible' or author_id = auth.uid())
  );

drop policy if exists forum_topics_insert on public.forum_topics;
create policy forum_topics_insert on public.forum_topics
  for insert with check (author_id = auth.uid() and public.is_approved(auth.uid()));

drop policy if exists forum_topics_update on public.forum_topics;
create policy forum_topics_update on public.forum_topics
  for update using (author_id = auth.uid() and public.is_approved(auth.uid()))
  with check (author_id = auth.uid());

drop policy if exists forum_topics_delete on public.forum_topics;
create policy forum_topics_delete on public.forum_topics
  for delete using (author_id = auth.uid());

-- Un sujet visible et non verrouillé accepte des réponses.
create or replace function public.forum_topic_open(t uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.forum_topics where id = t and status = 'visible' and not is_locked);
$$;

create or replace function public.forum_topic_visible(t uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.forum_topics where id = t and status = 'visible');
$$;

drop policy if exists forum_replies_select on public.forum_replies;
create policy forum_replies_select on public.forum_replies
  for select using (
    public.is_approved(auth.uid())
    and public.forum_topic_visible(topic_id)
    and (status = 'visible' or author_id = auth.uid())
  );

drop policy if exists forum_replies_insert on public.forum_replies;
create policy forum_replies_insert on public.forum_replies
  for insert with check (
    author_id = auth.uid() and public.is_approved(auth.uid()) and public.forum_topic_open(topic_id)
  );

drop policy if exists forum_replies_update on public.forum_replies;
create policy forum_replies_update on public.forum_replies
  for update using (author_id = auth.uid() and public.is_approved(auth.uid()))
  with check (author_id = auth.uid());

drop policy if exists forum_replies_delete on public.forum_replies;
create policy forum_replies_delete on public.forum_replies
  for delete using (author_id = auth.uid());

-- Signalements : le membre crée, seul l'admin (service role) les lit.
drop policy if exists forum_reports_insert on public.forum_reports;
create policy forum_reports_insert on public.forum_reports
  for insert with check (
    reporter_id = auth.uid() and public.is_approved(auth.uid()) and public.forum_topic_visible(topic_id)
  );
