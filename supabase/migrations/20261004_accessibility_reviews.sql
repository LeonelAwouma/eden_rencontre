-- ============================================================
--  Avis sur l'accessibilité de la plateforme
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent : peut être ré-exécuté sans risque (les avis sont conservés).
--
--  Chaque membre approuvé laisse UN avis (note 1-5 + commentaire) qu'il peut
--  modifier ou supprimer. Les écritures passent par /api/accessibility-reviews
--  (clé de service) ; les avis individuels ne sont lus que dans l'admin.
--  La moyenne et le nombre d'avis sont calculés à la lecture : ils sont donc
--  toujours à jour après chaque publication, modification ou suppression.
-- ============================================================

create table if not exists public.accessibility_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  flagged boolean not null default false,   -- commentaire signalé comme inapproprié par l'admin
  flagged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accessibility_reviews_created_idx on public.accessibility_reviews (created_at desc);
create index if not exists accessibility_reviews_rating_idx on public.accessibility_reviews (rating);

-- RLS activée sans aucune politique : seul le service role (routes API) y accède.
alter table public.accessibility_reviews enable row level security;
revoke all on public.accessibility_reviews from anon, authenticated;
