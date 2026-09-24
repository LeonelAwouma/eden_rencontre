-- ============================================================
--  Espace membre réservé aux comptes approuvés par l'admin (RLS)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--
--  L'interface bloque déjà les comptes non approuvés (MemberGate), mais une
--  session Supabase peut exister avant l'approbation (connexion Google) et le
--  jeton permet d'interroger la base directement. Cette migration applique la
--  même règle côté base :
--    1. un utilisateur ne peut plus modifier lui-même les colonnes réservées à
--       l'admin (status, vérification, abonnement…) — auparavant, un compte en
--       attente pouvait s'auto-approuver en mettant status = 'approved' ;
--    2. seuls les comptes approuvés voient les autres profils, et ne voient
--       que des profils approuvés (chacun voit toujours sa propre fiche) ;
--    3. alliances, favoris, visites, conversations, messages et envoi de
--       photos de chat exigent un compte approuvé.
--
--  Le rôle service (routes /api, interface admin) n'est pas concerné : il
--  contourne la RLS et les garde-fous ci-dessous ne s'appliquent qu'au rôle
--  « authenticated ».
-- ============================================================

begin;

-- ── Fonction : le compte est-il approuvé ? ──────────────────
-- SECURITY DEFINER pour lire profiles sans repasser par sa propre RLS.
create or replace function public.is_approved(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and status = 'approved'
  );
$$;

revoke all on function public.is_approved(uuid) from public;
grant execute on function public.is_approved(uuid) to authenticated, service_role;

-- ── 1. Colonnes réservées à l'admin ─────────────────────────
-- Un utilisateur connecté ne peut ni s'approuver, ni se déclarer vérifié, ni
-- changer l'email de sa fiche (utilisé par l'admin pour le contacter).
create or replace function public.protect_profile_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new; -- service role, trigger d'inscription, SQL Editor
  end if;

  new.email := coalesce((select u.email from auth.users u where u.id = new.id), new.email);

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.rejection_reason := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    -- Valeurs par défaut des colonnes (cf. admin-schema.sql, verification-status-migration.sql…)
    new.subscription_plan := 'free';
    new.mentor_assigned := null;
    new.mentor_contacted := false;
    new.selfie_verified := false;
    new.selfie_verification_score := 0;
    new.verification_status := 'none';
    new.verification_rejection_reason := null;
    new.charter_accepted := false;
    new.charter_accepted_at := null;
    return new;
  end if;

  new.status := old.status;
  new.rejection_reason := old.rejection_reason;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.subscription_plan := old.subscription_plan;
  new.mentor_assigned := old.mentor_assigned;
  new.mentor_contacted := old.mentor_contacted;
  new.selfie_verified := old.selfie_verified;
  new.selfie_verification_score := old.selfie_verification_score;
  new.selfie_url := old.selfie_url;
  new.verification_status := old.verification_status;
  new.verification_rejection_reason := old.verification_rejection_reason;
  new.charter_accepted := old.charter_accepted;
  new.charter_accepted_at := old.charter_accepted_at;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_columns on public.profiles;
create trigger protect_profile_admin_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_columns();

-- ── 2. Visibilité des profils ───────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    auth.uid() = id
    or (status = 'approved' and public.is_approved(auth.uid()))
  );

-- ── 3. Interactions entre membres ───────────────────────────
-- Alliances (demandes d'amitié)
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select using (
    public.is_approved(auth.uid())
    and (auth.uid() = requester_id or auth.uid() = addressee_id)
  );

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert with check (
    auth.uid() = requester_id
    and public.is_approved(auth.uid())
    and public.is_approved(addressee_id)
  );

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update using (
    public.is_approved(auth.uid())
    and (auth.uid() = addressee_id or auth.uid() = requester_id)
  );

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete using (
    public.is_approved(auth.uid())
    and (auth.uid() = requester_id or auth.uid() = addressee_id)
  );

-- Favoris
drop policy if exists favorites_select on public.favorites;
create policy favorites_select on public.favorites
  for select using (auth.uid() = user_id and public.is_approved(auth.uid()));

drop policy if exists favorites_insert on public.favorites;
create policy favorites_insert on public.favorites
  for insert with check (
    auth.uid() = user_id
    and public.is_approved(auth.uid())
    and public.is_approved(target_id)
  );

drop policy if exists favorites_delete on public.favorites;
create policy favorites_delete on public.favorites
  for delete using (auth.uid() = user_id and public.is_approved(auth.uid()));

-- Visites de profil (un compte non approuvé n'apparaît pas comme visiteur)
drop policy if exists profile_views_select on public.profile_views;
create policy profile_views_select on public.profile_views
  for select using (auth.uid() = profile_id and public.is_approved(auth.uid()));

drop policy if exists profile_views_insert on public.profile_views;
create policy profile_views_insert on public.profile_views
  for insert with check (
    auth.uid() = viewer_id
    and public.is_approved(auth.uid())
    and public.is_approved(profile_id)
  );

drop policy if exists profile_views_update on public.profile_views;
create policy profile_views_update on public.profile_views
  for update using (auth.uid() = viewer_id and public.is_approved(auth.uid()));

-- Conversations et messages
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select using (public.is_approved(auth.uid()) and public.is_member(id));

drop policy if exists members_select on public.conversation_members;
create policy members_select on public.conversation_members
  for select using (public.is_approved(auth.uid()) and public.is_member(conversation_id));

drop policy if exists members_update on public.conversation_members;
create policy members_update on public.conversation_members
  for update using (user_id = auth.uid() and public.is_approved(auth.uid()));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select using (public.is_approved(auth.uid()) and public.is_member(conversation_id));

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_approved(auth.uid())
    and public.is_member(conversation_id)
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id <> auth.uid()
        and public.are_friends(auth.uid(), cm.user_id)
    )
  );

-- Création d'une conversation directe : les deux comptes doivent être approuvés
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
  if not public.is_approved(me) or not public.is_approved(other_id) then
    raise exception 'not_approved';
  end if;

  -- Conversation déjà existante ? (on la renvoie sans re-vérifier l'amitié)
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

-- Photos : envoi réservé aux comptes approuvés (l'inscription passe par le serveur)
drop policy if exists "chat_images_insert" on storage.objects;
create policy "chat_images_insert" on storage.objects
  for insert with check (bucket_id = 'chat-images' and public.is_approved(auth.uid()));

drop policy if exists "profile_photos_insert" on storage.objects;
create policy "profile_photos_insert" on storage.objects
  for insert with check (bucket_id = 'profile-photos' and public.is_approved(auth.uid()));

commit;
