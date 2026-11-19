-- ============================================================
--  Notifications push — sécurisation du dispatch et confidentialité
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Prérequis : 20261002_push_notifications.sql (et 20261112_coach_member_notifications.sql).
--  Idempotent : peut être ré-exécuté sans risque. Rien n'est supprimé.
--
--  1. push_settings.dispatch_secret : secret partagé, généré ICI par la base,
--     envoyé par les triggers dans l'en-tête « x-push-secret ». /api/push/dispatch
--     le compare à la variable Vercel PUSH_DISPATCH_SECRET et refuse tout appel
--     qui ne le porte pas.
--  2. push_subscriptions.show_preview : par appareil, le membre choisit si le nom
--     et le texte du message s'affichent sur l'écran verrouillé (true, défaut)
--     ou seulement « Vous avez reçu un nouveau message » (false).
--
--  ⚠️ APRÈS exécution, copiez le secret dans Vercel :
--       select dispatch_secret from public.push_settings where id = 1;
--     → Vercel → Settings → Environment Variables → PUSH_DISPATCH_SECRET
--     puis redéployez. Tant que la variable n'est pas définie, le site accepte
--     encore les appels sans secret (transition) et l'écrit dans ses journaux.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ── 1. Secret partagé base → site ───────────────────────────
alter table public.push_settings add column if not exists dispatch_secret text;

update public.push_settings
   set dispatch_secret = encode(extensions.gen_random_bytes(32), 'hex')
 where id = 1 and (dispatch_secret is null or dispatch_secret = '');

-- Même signature qu'en 20261002 : les triggers existants n'ont pas à changer.
create or replace function public.push_dispatch(p_source text, p_ref text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  hdrs jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  select dispatch_url, enabled, dispatch_secret into cfg from public.push_settings where id = 1;
  if cfg is null or not cfg.enabled then return; end if;
  if cfg.dispatch_secret is not null and cfg.dispatch_secret <> '' then
    hdrs := hdrs || jsonb_build_object('x-push-secret', cfg.dispatch_secret);
  end if;
  perform net.http_post(
    url := cfg.dispatch_url,
    body := jsonb_build_object('source', p_source, 'ref', p_ref),
    headers := hdrs,
    timeout_milliseconds := 5000
  );
exception when others then
  -- Une notification push manquée ne doit jamais faire échouer l'action du membre.
  raise warning 'push_dispatch: %', sqlerrm;
end;
$$;

-- La fonction ne doit pas être appelable par les clients (anon / authenticated) :
-- seuls les triggers (security definer) l'utilisent.
revoke all on function public.push_dispatch(text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.push_dispatch(text, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.push_dispatch(text, text) from authenticated;
  end if;
end $$;

-- ── 2. Aperçu du message sur l'écran verrouillé (par appareil) ──
alter table public.push_subscriptions add column if not exists show_preview boolean not null default true;
