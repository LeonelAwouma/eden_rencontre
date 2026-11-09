-- ============================================================
--  Inscription par numéro de téléphone seul (sans e-mail, sans OTP)
--  + demandes de réinitialisation de mot de passe assistées par l'admin
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Rollback (manuel) :
--    drop table if exists public.password_reset_requests;
--    drop index if exists public.profiles_phone_unique_idx;
--    (puis ré-exécuter 20261003_registration_hardening.sql pour l'ancien déclencheur)
--
--  1. Un compte « téléphone seul » est créé avec une adresse technique
--     <chiffres>@phone.eden.invalid (jamais affichée, jamais écrite). Son
--     profiles.email reste NULL : le déclencheur handle_new_user ne copie plus
--     cette adresse technique.
--  2. Un numéro ne peut servir qu'à un seul profil (index unique partiel).
--  3. password_reset_requests : demandes de réinitialisation (jeton haché,
--     usage unique, durée limitée). Table serveur : RLS activée, aucune policy.
-- ============================================================

-- ── 1. Déclencheur : pas d'e-mail technique dans profiles.email ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := case when jsonb_typeof(new.raw_user_meta_data) = 'object' then new.raw_user_meta_data else '{}'::jsonb end;
  real_email text := case when new.email like '%@phone.eden.invalid' then null else new.email end;
  display_name text := coalesce(nullif(trim(m->>'name'), ''), nullif(trim(m->>'full_name'), ''), split_part(coalesce(real_email, ''), '@', 1));
  birth date;
  vision text[];
begin
  begin
    if (m->>'birthDate') ~ '^\d{4}-\d{2}-\d{2}$' then
      birth := (m->>'birthDate')::date;
    end if;
  exception when others then
    birth := null;
  end;

  if jsonb_typeof(m->'marriageVision') = 'array' then
    vision := array(select jsonb_array_elements_text(m->'marriageVision'));
  end if;

  begin
    insert into public.profiles (
      id, email, name, pseudo, first_name, last_name, gender, civil_status,
      region, country, city, profession, bio, marriage_vision, birth_date,
      created_at, updated_at
    )
    values (
      new.id,
      real_email,
      display_name,
      nullif(trim(m->>'pseudo'), ''),
      nullif(trim(m->>'firstName'), ''),
      nullif(trim(m->>'lastName'), ''),
      nullif(m->>'gender', ''),
      nullif(m->>'civilStatus', ''),
      nullif(m->>'region', ''),
      nullif(m->>'country', ''),
      nullif(m->>'city', ''),
      nullif(m->>'profession', ''),
      nullif(m->>'bio', ''),
      vision,
      birth,
      now(),
      now()
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user (%): %', new.id, sqlerrm;
    begin
      insert into public.profiles (id, email, name)
      values (new.id, real_email, display_name)
      on conflict (id) do nothing;
    exception when others then
      raise warning 'handle_new_user, profil minimal (%): %', new.id, sqlerrm;
    end;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2. Un numéro = un profil ────────────────────────────────
do $$
begin
  if exists (
    select 1 from public.profiles where phone is not null group by phone having count(*) > 1
  ) then
    raise exception 'Des numéros de téléphone existent en double dans profiles.phone : corrigez-les avant de créer l''index unique (select phone, count(*) from public.profiles where phone is not null group by phone having count(*) > 1;).';
  end if;
end $$;

create unique index if not exists profiles_phone_unique_idx
  on public.profiles (phone)
  where phone is not null;

-- ── 3. Demandes de réinitialisation assistées par l'admin ───
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'used', 'expired')),
  note text,
  decided_by text,
  decided_at timestamptz,
  token_hash text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_status_idx
  on public.password_reset_requests (status, created_at desc);
create index if not exists password_reset_requests_user_idx
  on public.password_reset_requests (user_id);
create unique index if not exists password_reset_requests_token_hash_idx
  on public.password_reset_requests (token_hash)
  where token_hash is not null;
-- Une seule demande en attente par compte.
create unique index if not exists password_reset_requests_one_pending_idx
  on public.password_reset_requests (user_id)
  where status = 'pending';

alter table public.password_reset_requests enable row level security;
revoke all on public.password_reset_requests from anon, authenticated;

notify pgrst, 'reload schema';
