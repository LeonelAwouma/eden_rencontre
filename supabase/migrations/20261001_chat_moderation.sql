-- ============================================================
--  Surveillance des discussions : restreindre, bloquer, modérer
--  + normalisation du genre des profils
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--
--  Admin → Surveillance de la discussion :
--   • « Restreindre » : la conversation passe en lecture seule.
--   • « Bloquer »     : la conversation est fermée, plus aucun envoi.
--     (« Réactiver » la rouvre.) Appliqué par la RLS de messages.
--   • Signaler / supprimer un message (colonnes is_flagged, is_deleted).
--   • « Modérer » : journalisé dans moderation_actions, qui pointe
--     désormais vers les vraies conversations (public.conversations).
-- ============================================================

-- ── Statut de modération des conversations ──────────────────
alter table public.conversations
  add column if not exists status text not null default 'active',
  add column if not exists restricted_reason text,
  add column if not exists restricted_at timestamptz;

alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
  check (status in ('active', 'restricted', 'blocked', 'archived'));

-- ── Modération des messages ─────────────────────────────────
alter table public.messages
  add column if not exists is_flagged boolean not null default false,
  add column if not exists flag_reason text,
  add column if not exists is_deleted boolean not null default false;

-- ── Envoi interdit dans une conversation restreinte / bloquée ─
create or replace function public.conversation_is_open(conv uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select status = 'active' from public.conversations where id = conv), false);
$$;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_approved(auth.uid())
    and public.is_member(conversation_id)
    and public.conversation_is_open(conversation_id)
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id <> auth.uid()
        and public.are_friends(auth.uid(), cm.user_id)
    )
  );

-- ── Journal des actions de modération ───────────────────────
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid,
  action_type text not null,
  reason text not null,
  details jsonb,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table public.moderation_actions enable row level security;

-- L'admin « env » n'a pas d'UUID : admin_id doit pouvoir être nul.
alter table public.moderation_actions alter column admin_id drop not null;
alter table public.moderation_actions add column if not exists admin_email text;

-- L'ancienne clé étrangère visait chat_conversations, jamais alimentée.
alter table public.moderation_actions drop constraint if exists moderation_actions_conversation_id_fkey;
alter table public.moderation_actions add constraint moderation_actions_conversation_id_fkey
  foreign key (conversation_id) references public.conversations(id) on delete set null;

alter table public.moderation_actions drop constraint if exists moderation_actions_action_type_check;
alter table public.moderation_actions add constraint moderation_actions_action_type_check
  check (action_type in (
    'warning', 'restrict', 'block', 'reactivate', 'account_suspension', 'note',
    'message_flag', 'message_unflag', 'message_delete',
    -- valeurs historiques
    'mute', 'temporary_ban', 'permanent_ban', 'message_review'
  ));

create index if not exists mod_actions_user_idx on public.moderation_actions (target_user_id);
create index if not exists mod_actions_conv_idx on public.moderation_actions (conversation_id);
create index if not exists mod_actions_created_idx on public.moderation_actions (created_at desc);

drop policy if exists mod_actions_service_only on public.moderation_actions;
create policy mod_actions_service_only on public.moderation_actions
  for all using (false);

-- ── Genre des profils : une seule écriture « homme » / « femme » ─
-- L'ancien formulaire « Mon profil » enregistrait « Male » / « Female »,
-- invisibles pour le matching et comptés à part dans Analytics.
update public.profiles set gender = 'homme'
  where lower(trim(gender)) in ('male', 'm', 'homme') and gender <> 'homme';
update public.profiles set gender = 'femme'
  where lower(trim(gender)) in ('female', 'f', 'femme') and gender <> 'femme';

-- Profils sans genre alors qu'il a été saisi à l'inscription (métadonnées).
update public.profiles p
set gender = case lower(trim(u.raw_user_meta_data->>'gender'))
               when 'homme' then 'homme' when 'male' then 'homme'
               when 'femme' then 'femme' when 'female' then 'femme'
             end
from auth.users u
where u.id = p.id
  and (p.gender is null or trim(p.gender) = '')
  and lower(trim(u.raw_user_meta_data->>'gender')) in ('homme', 'male', 'femme', 'female');
