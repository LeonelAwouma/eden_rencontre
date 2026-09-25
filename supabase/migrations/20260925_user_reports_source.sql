-- ============================================================
--  Signalements depuis la messagerie
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--
--  Un membre peut signaler son interlocuteur depuis une conversation
--  (bouton « Signaler »). Le signalement arrive dans Admin → Signalements
--  (table user_reports, créée par supabase/admin-extensions.sql).
--  On mémorise d'où il vient et la conversation concernée, pour que
--  l'admin puisse ouvrir directement l'échange en question.
--  Le code fonctionne sans ces colonnes (il les omet alors à l'insertion).
-- ============================================================

do $$
begin
  if to_regclass('public.user_reports') is null then
    raise notice 'public.user_reports absente : exécutez d''abord supabase/admin-extensions.sql.';
    return;
  end if;

  alter table public.user_reports
    add column if not exists source text,            -- 'messages' | 'profile'
    add column if not exists conversation_id uuid;

  create index if not exists reports_reported_user_idx on public.user_reports (reported_user_id);
end $$;
