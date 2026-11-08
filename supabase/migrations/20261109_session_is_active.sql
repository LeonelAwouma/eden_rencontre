-- ─────────────────────────────────────────────────────────────────────────────
-- session_is_active(p_session_id) — la session Auth existe-t-elle encore ?
--
-- FICHIER NON EXÉCUTÉ PAR LE DÉPÔT : à appliquer à la main, d'abord sur un projet Supabase de DÉVELOPPEMENT.
--
-- Pourquoi : après `auth.admin.signOut(jwt, 'local')`, l'access token déjà émis reste valide jusqu'à son expiration
-- pour `auth.getUser()`. Les routes Coach (si COACH_REQUIRE_ACTIVE_SESSION=true) vérifient en plus, côté serveur,
-- que le `session_id` du jeton — jeton déjà authentifié par le service Auth — correspond à une session existante.
--
-- NON VALIDÉ EN CONDITIONS RÉELLES : ni la structure exacte de `auth.sessions` sur le projet hébergé, ni la
-- disparition de la ligne après `admin.signOut`, ni le comportement de cette fonction après révocation n'ont été
-- vérifiés. À contrôler sur un projet de développement avant d'activer le drapeau.
--
-- Sécurité :
--   * SECURITY DEFINER, propriétaire = le rôle qui exécute la migration (normalement `postgres`, qui doit pouvoir
--     lire auth.sessions : à vérifier) ;
--   * search_path vide, TOUS les objets qualifiés (auth.sessions, pg_catalog.*) ;
--   * retourne UNIQUEMENT un booléen : aucune colonne de session, aucune autre session lisible ;
--   * `not_after` lu via to_jsonb(s) : aucune dépendance dure à la colonne (absente de certaines versions de GoTrue) ;
--   * EXECUTE réservé à service_role : ni PUBLIC, ni anon, ni authenticated.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.session_is_active(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = p_session_id
      and coalesce((pg_catalog.to_jsonb(s) ->> 'not_after')::pg_catalog.timestamptz, 'infinity'::pg_catalog.timestamptz)
          > pg_catalog.now()
  );
$$;

revoke all on function public.session_is_active(uuid) from public;
revoke all on function public.session_is_active(uuid) from anon;
revoke all on function public.session_is_active(uuid) from authenticated;
grant execute on function public.session_is_active(uuid) to service_role;
