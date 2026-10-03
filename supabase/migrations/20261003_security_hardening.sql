-- ============================================================
--  Durcissement de sécurité (revue du 2026-10-03, dépôt rendu public)
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  1. Compte « Admin » de la messagerie (admin-system@eden.local) : son mot de
--     passe était écrit en dur dans le dépôt. Il est remplacé par une valeur
--     aléatoire que personne ne connaît, et ses sessions ouvertes sont fermées.
--     Le site n'en a pas besoin : il agit pour ce compte avec la clé de service.
--  2. Alliances (friendships) : un membre pouvait créer une alliance déjà
--     « accepted », ou accepter lui-même sa propre demande (voire changer le
--     destinataire), puis écrire à n'importe qui. Désormais : une demande naît
--     « pending », seul le destinataire l'accepte ou la refuse, et les deux
--     membres d'une ligne ne changent plus. Le contact avec l'Admin passe par
--     le serveur (POST /api/support/admin-id).
--  3. Rendez-vous : get_user_meetings(p_user_id) était appelable par n'importe
--     qui, sans connexion, avec l'id d'un autre membre (liens Meet compris).
--     Réservée au serveur (la route /api/meetings utilise la clé de service).
--     Idem pour admin_exists(email), qui révélait si une adresse est admin.
--  4. Stockage : les buckets publics « chat-images » et « testimonials » ne sont
--     plus listables (les adresses des fichiers, aléatoires, restent valides),
--     les dépôts sont limités aux images de 15 Mo, et seul le serveur dépose
--     dans « testimonials ».
-- ============================================================

-- ── 1. Compte « Admin » : nouveau mot de passe aléatoire ────
do $$
declare
  admin_uid uuid;
begin
  select id into admin_uid from auth.users where email = 'admin-system@eden.local';
  if admin_uid is null then
    return;
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(
           encode(extensions.gen_random_bytes(48), 'base64'),
           extensions.gen_salt('bf')
         ),
         updated_at = now()
   where id = admin_uid;

  -- Ferme toute session déjà ouverte avec l'ancien mot de passe (les jetons
  -- d'accès déjà émis expirent d'eux-mêmes, au plus tard une heure après).
  delete from auth.refresh_tokens where user_id = admin_uid::text;
  delete from auth.sessions where user_id = admin_uid;
end;
$$;

-- ── 2. Alliances : seul le destinataire répond ──────────────
create or replace function public.guard_friendship_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  -- Clé de service (routes API, compte Admin) ou SQL Editor : pas de restriction.
  if me is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Une demande naît toujours en attente, quoi qu'envoie le navigateur.
    new.status := 'pending';
    return new;
  end if;

  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'friendship_members_immutable';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      if me <> old.addressee_id then
        raise exception 'only_addressee_can_respond';
      end if;
    elsif new.status = 'pending' then
      -- Nouvelle demande après un refus : seul le demandeur la relance.
      if me <> old.requester_id then
        raise exception 'only_requester_can_resend';
      end if;
    else
      raise exception 'invalid_friendship_status';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_friendship_changes on public.friendships;
create trigger guard_friendship_changes
  before insert or update on public.friendships
  for each row execute function public.guard_friendship_changes();

-- Alliances déjà « acceptées » sans réponse du destinataire : impossible à
-- distinguer après coup d'une vraie acceptation (le statut ne garde pas qui l'a
-- posé). À vérifier à la main si besoin : lignes créées et acceptées au même
-- instant, hors compte Admin.
--   select f.* from public.friendships f
--   join public.profiles p on p.id = f.addressee_id
--   where f.status = 'accepted' and f.updated_at - f.created_at < interval '2 seconds'
--     and p.email <> 'admin-system@eden.local';

-- ── 3. Fonctions réservées au serveur ───────────────────────
do $$
begin
  if to_regprocedure('public.get_user_meetings(uuid)') is not null then
    revoke execute on function public.get_user_meetings(uuid) from public, anon, authenticated;
    grant execute on function public.get_user_meetings(uuid) to service_role;
  end if;
  if to_regprocedure('public.admin_exists(text)') is not null then
    revoke execute on function public.admin_exists(text) from public, anon, authenticated;
    grant execute on function public.admin_exists(text) to service_role;
  end if;
end;
$$;

-- ── 4. Stockage : plus de listing, images seulement ─────────
-- Un bucket public sert ses fichiers par leur adresse sans passer par ces
-- règles : la lecture « select » ne servait qu'à lister tout le bucket.
drop policy if exists "chat_images_read" on storage.objects;
drop policy if exists "Public read access to testimonials images" on storage.objects;
-- Les témoignages sont déposés par le serveur (clé de service) uniquement.
drop policy if exists "Allow authenticated uploads to testimonials" on storage.objects;

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif']
 where id in ('chat-images', 'testimonials');

notify pgrst, 'reload schema';
