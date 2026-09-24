-- ============================================================
--  Newsletter du blog
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque.
--
--  Audience d'un article publié :
--    • les membres approuvés (profiles.status = 'approved'), abonnés d'office ;
--    • les visiteurs inscrits depuis la page publique /blog (sans compte) ;
--    • moins toute adresse passée à status = 'unsubscribed' (lien de
--      désabonnement présent dans chaque e-mail, membres compris).
--
--  Les e-mails partent de contact@gardenofalliance.com (SMTP Hostinger).
--  Table accessible uniquement par le rôle service (routes /api).
-- ============================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  -- Toujours en minuscules (normalisé par l'API).
  email text not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  -- 'blog' : inscrit depuis la page publique ; 'member' : ligne créée pour
  -- enregistrer le désabonnement d'un membre.
  source text not null default 'blog' check (source in ('blog', 'member')),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status);

alter table public.newsletter_subscribers enable row level security;
drop policy if exists newsletter_subscribers_service_only on public.newsletter_subscribers;
create policy newsletter_subscribers_service_only on public.newsletter_subscribers
  for all using (false);

-- Évite d'envoyer deux fois le même article aux abonnés.
-- blog_posts est créée par supabase/blog-schema.sql (qui ajoute aussi ces
-- colonnes) : si ce script n'a pas encore été exécuté, on ne fait rien ici.
do $$
begin
  if to_regclass('public.blog_posts') is not null then
    alter table public.blog_posts
      add column if not exists newsletter_sent_at timestamptz,
      add column if not exists newsletter_recipients integer;
  else
    raise notice 'public.blog_posts absente : exécutez supabase/blog-schema.sql.';
  end if;
end $$;
