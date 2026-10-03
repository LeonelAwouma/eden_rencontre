-- ============================================================
--  Garde-fous des comptes : jamais d'image encodée dans la session
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Incident du 2026-10-03 : la photo d'inscription d'un membre (image
--  encodée « data:image/jpeg;base64,… », 133 000 caractères) avait été
--  recopiée dans ses métadonnées de compte. Supabase met ces métadonnées
--  dans le jeton de session, joint à chaque requête : le jeton dépassait
--  la taille admise (« 400 Request Header Or Cookie Too Large ») et le
--  membre, pourtant approuvé, ne pouvait plus entrer.
--
--  1. Comptes (auth.users) : avant chaque création ou modification, toute
--     valeur de métadonnée encodée (data:…) ou de plus de 2 000 caractères
--     est retirée. Quel que soit le code qui écrit (site, admin, script),
--     le jeton reste léger. La donnée utile vit dans public.profiles.
--  2. Profils : avatar_url doit être une adresse courte, jamais une image
--     encodée (les photos vont dans le stockage).
-- ============================================================

-- ── 1. Métadonnées de compte toujours légères ───────────────
create or replace function public.sanitize_user_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data is not null and jsonb_typeof(new.raw_user_meta_data) = 'object' then
    new.raw_user_meta_data := coalesce((
      select jsonb_object_agg(key, value)
      from jsonb_each(new.raw_user_meta_data)
      where not (
        (jsonb_typeof(value) = 'string' and (value #>> '{}') like 'data:%')
        or length(value::text) > 2000
      )
    ), '{}'::jsonb);
  end if;
  return new;
end;
$$;

drop trigger if exists sanitize_user_metadata on auth.users;
create trigger sanitize_user_metadata
  before insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sanitize_user_metadata();

-- ── 2. Photo de profil : une adresse, jamais une image encodée ─
alter table public.profiles drop constraint if exists profiles_avatar_url_not_encoded;
alter table public.profiles add constraint profiles_avatar_url_not_encoded
  check (avatar_url is null or (avatar_url not like 'data:%' and length(avatar_url) <= 2000))
  not valid;

-- Contrôle des lignes existantes : si une ligne ancienne contient encore une
-- image encodée, la contrainte reste appliquée aux nouvelles écritures et un
-- avis s'affiche ; réparez-la depuis Admin → Utilisateurs → À traiter.
do $$
begin
  alter table public.profiles validate constraint profiles_avatar_url_not_encoded;
exception when check_violation then
  raise notice 'Des profils contiennent encore une photo encodée : utilisez « Réparer » dans Admin → Utilisateurs → À traiter.';
end;
$$;

notify pgrst, 'reload schema';
