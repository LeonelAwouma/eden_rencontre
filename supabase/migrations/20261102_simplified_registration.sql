-- ============================================================
--  Garden of Alliance — Refonte de l'inscription en 3 étapes
--  1) Unicité du pseudonyme (insensible à la casse)
--  2) Fonction atomique d'ajout d'une photo de profil supplémentaire
-- ============================================================

-- 1. Unicité du pseudonyme --------------------------------------------------
-- Aucune contrainte n'existait jusqu'ici. Avant de créer l'index, on vérifie
-- qu'aucun doublon n'existe déjà parmi les comptes existants : sans ce garde-fou,
-- la création de l'index échouerait avec une erreur Postgres générique et peu
-- actionnable. On préfère échouer tôt avec un message clair, pour que les
-- doublons éventuels soient résolus manuellement (renommage) avant de relancer
-- cette migration — aucune perte de donnée, aucune suppression automatique.
do $$
declare
  dup_count int;
begin
  select count(*) into dup_count from (
    select lower(pseudo) as p
    from public.profiles
    where pseudo is not null and pseudo <> ''
    group by lower(pseudo)
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    raise exception
      'Impossible de créer l''index unique sur profiles.pseudo : % pseudonyme(s) en doublon (insensible à la casse). Renommez-les manuellement puis relancez cette migration.',
      dup_count;
  end if;
end $$;

create unique index if not exists profiles_pseudo_unique_idx
  on public.profiles (lower(pseudo))
  where pseudo is not null and pseudo <> '';

-- 2. Ajout atomique d'une photo de profil supplémentaire -------------------
-- Les routes d'inscription écrivent déjà profile_photos sans contrôle de
-- concurrence (acceptable : un seul upsert à l'inscription). Pour l'ajout
-- ultérieur de photos par un membre déjà inscrit, deux requêtes séparées
-- (lire le compte actuel, puis écrire) seraient vulnérables à une course entre
-- deux requêtes simultanées dépassant la limite de 3. Cette fonction effectue
-- la vérification et l'ajout dans une seule transaction Postgres.
create or replace function public.add_profile_photo(p_user_id uuid, p_path text)
returns text[]
language plpgsql
security definer
as $$
declare
  result text[];
begin
  update public.profiles
    set profile_photos = array_append(coalesce(profile_photos, '{}'::text[]), p_path)
    where id = p_user_id
      and coalesce(array_length(profile_photos, 1), 0) < 3
      and not (p_path = any(coalesce(profile_photos, '{}'::text[])))
    returning profile_photos into result;

  -- null si le plafond de 3 était déjà atteint, si le chemin était déjà présent,
  -- ou si l'identifiant ne correspond à aucun profil : l'appelant doit traiter
  -- ces trois cas comme un échec (409), jamais comme un succès silencieux.
  return result;
end;
$$;

-- Durcissement : seul le rôle serveur (service_role, celui de getSupabaseAdmin())
-- peut exécuter cette fonction. Ni anon ni authenticated ne doivent pouvoir
-- l'appeler directement depuis le client Supabase public — l'identité de
-- l'appelant (p_user_id) est déterminée par la route API à partir de sa propre
-- session authentifiée, jamais fournie telle quelle par le navigateur, donc rien
-- n'empêcherait un appel direct malveillant de cibler le compte d'un autre membre
-- si l'exécution n'était pas restreinte au rôle serveur.
revoke execute on function public.add_profile_photo(uuid, text) from public, anon, authenticated;
grant execute on function public.add_profile_photo(uuid, text) to service_role;

-- search_path explicite : la fonction est security definer (s'exécute avec les
-- privilèges de son propriétaire), donc un search_path manipulable pourrait
-- rediriger profiles/array_append vers un objet malveillant placé plus tôt dans
-- le chemin de résolution.
alter function public.add_profile_photo(uuid, text) set search_path = public, pg_temp;
