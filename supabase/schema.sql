-- ============================================================
--  Eden Connexion — Messagerie à 2 participants réels (Supabase)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  (Recrée la table messages — les anciens messages de démo seront supprimés.)
-- ============================================================

-- ── PROFILES (annuaire des utilisateurs réels) ──────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  city text,
  country text,
  avatar_url text,
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Champs enrichis (croyances & infos choisies à l'inscription) — sûr à ré-exécuter
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists civil_status text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists profession text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists marriage_vision text[];
alter table public.profiles add column if not exists birth_date date;
-- Onboarding : réponses aux 3 questionnaires (JSON) + état d'achèvement
alter table public.profiles add column if not exists questionnaire jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id);

-- Création AUTOMATIQUE du profil à chaque inscription (fiable, indépendant du front)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, gender, civil_status, region, country, city, profession, bio, marriage_vision, birth_date)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'gender',
    new.raw_user_meta_data->>'civilStatus',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'profession',
    new.raw_user_meta_data->>'bio',
    case when new.raw_user_meta_data ? 'marriageVision'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'marriageVision'))
      else null end,
    (new.raw_user_meta_data->>'birthDate')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill : crée les profils des utilisateurs DÉJÀ inscrits
insert into public.profiles (id, email, name)
select id, email,
  coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- Backfill des champs enrichis depuis les métadonnées (ne remplace pas une valeur déjà présente)
update public.profiles p
set gender          = coalesce(p.gender, u.raw_user_meta_data->>'gender'),
    civil_status    = coalesce(p.civil_status, u.raw_user_meta_data->>'civilStatus'),
    region          = coalesce(p.region, u.raw_user_meta_data->>'region'),
    country         = coalesce(p.country, u.raw_user_meta_data->>'country'),
    city            = coalesce(p.city, u.raw_user_meta_data->>'city'),
    profession      = coalesce(p.profession, u.raw_user_meta_data->>'profession'),
    bio             = coalesce(p.bio, u.raw_user_meta_data->>'bio'),
    marriage_vision = coalesce(p.marriage_vision,
      case when u.raw_user_meta_data ? 'marriageVision'
        then array(select jsonb_array_elements_text(u.raw_user_meta_data->'marriageVision'))
        else null end),
    birth_date      = coalesce(p.birth_date,
      case when (u.raw_user_meta_data->>'birthDate') ~ '^\d{4}-\d{2}-\d{2}$'
        then (u.raw_user_meta_data->>'birthDate')::date else null end)
from auth.users u
where u.id = p.id;

-- ── CONVERSATIONS ───────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_direct boolean not null default true,
  created_at timestamptz default now()
);
alter table public.conversations enable row level security;

-- ── MEMBRES ─────────────────────────────────────────────────
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;

-- ── MESSAGES (nouveau modèle, lié à conversation_id uuid) ────
drop table if exists public.messages cascade;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null default '',
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.messages add column if not exists image_url text;
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

-- ── Fonction d'appartenance (SECURITY DEFINER → évite la récursion RLS) ──
create or replace function public.is_member(conv uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- ── RLS : conversations ─────────────────────────────────────
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select using (public.is_member(id));

-- ── RLS : membres ───────────────────────────────────────────
drop policy if exists members_select on public.conversation_members;
create policy members_select on public.conversation_members
  for select using (public.is_member(conversation_id));

drop policy if exists members_update on public.conversation_members;
create policy members_update on public.conversation_members
  for update using (user_id = auth.uid());
-- (les insertions de membres se font via la RPC ci-dessous, en SECURITY DEFINER)

-- ── RLS : messages ──────────────────────────────────────────
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_member(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (sender_id = auth.uid() and public.is_member(conversation_id));

-- ── RPC : créer / récupérer une conversation directe ────────
create or replace function public.get_or_create_direct_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_id is null or other_id = me then raise exception 'invalid other_id'; end if;

  select c.id into conv
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = me
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = other_id
  where c.is_direct
  limit 1;

  if conv is not null then return conv; end if;

  insert into public.conversations(is_direct) values (true) returning id into conv;
  insert into public.conversation_members(conversation_id, user_id) values (conv, me), (conv, other_id);
  return conv;
end;
$$;

-- ── AMITIÉS / DEMANDES (liste & demandes d'amitié réelles) ──
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',  -- pending | accepted | declined
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
alter table public.friendships enable row level security;
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (auth.uid() = addressee_id or auth.uid() = requester_id);

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── FAVORIS (profils mis de côté) ───────────────────────────
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);
alter table public.favorites enable row level security;

drop policy if exists favorites_select on public.favorites;
create policy favorites_select on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists favorites_insert on public.favorites;
create policy favorites_insert on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists favorites_delete on public.favorites;
create policy favorites_delete on public.favorites
  for delete using (auth.uid() = user_id);

-- ── VISITES DE PROFIL (qui a consulté mon profil) ───────────
create table if not exists public.profile_views (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (viewer_id, profile_id),
  check (viewer_id <> profile_id)
);
alter table public.profile_views enable row level security;
create index if not exists profile_views_profile_idx on public.profile_views (profile_id, viewed_at desc);

-- Le propriétaire du profil voit ses visiteurs ; un visiteur enregistre / met à jour sa visite.
drop policy if exists profile_views_select on public.profile_views;
create policy profile_views_select on public.profile_views
  for select using (auth.uid() = profile_id);

drop policy if exists profile_views_insert on public.profile_views;
create policy profile_views_insert on public.profile_views
  for insert with check (auth.uid() = viewer_id);

drop policy if exists profile_views_update on public.profile_views;
create policy profile_views_update on public.profile_views
  for update using (auth.uid() = viewer_id);

-- ── RÈGLE : messagerie réservée aux membres amis ────────────
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- La création d'une conversation directe exige une amitié acceptée
create or replace function public.get_or_create_direct_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_id is null or other_id = me then raise exception 'invalid other_id'; end if;

  -- Conversation déjà existante ? (on la renvoie sans re-vérifier)
  select c.id into conv
  from public.conversations c
  join public.conversation_members m1 on m1.conversation_id = c.id and m1.user_id = me
  join public.conversation_members m2 on m2.conversation_id = c.id and m2.user_id = other_id
  where c.is_direct
  limit 1;

  if conv is not null then return conv; end if;

  -- Sinon, il faut être amis pour démarrer une conversation
  if not public.are_friends(me, other_id) then
    raise exception 'not_friends';
  end if;

  insert into public.conversations(is_direct) values (true) returning id into conv;
  insert into public.conversation_members(conversation_id, user_id) values (conv, me), (conv, other_id);
  return conv;
end;
$$;

-- L'envoi d'un message exige une amitié acceptée avec un autre membre de la conversation
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_member(conversation_id)
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id <> auth.uid()
        and public.are_friends(auth.uid(), cm.user_id)
    )
  );

-- ── Temps réel (idempotent) ─────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;

-- ── Stockage des photos de chat (bucket public) ─────────────
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

drop policy if exists "chat_images_read" on storage.objects;
create policy "chat_images_read" on storage.objects
  for select using (bucket_id = 'chat-images');

drop policy if exists "chat_images_insert" on storage.objects;
create policy "chat_images_insert" on storage.objects
  for insert with check (bucket_id = 'chat-images' and auth.uid() is not null);
