-- ============================================================
--  Inscription : la création du compte ne doit plus jamais échouer
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  1. Colonnes du profil lues par l'inscription : ajoutées si une ancienne
--     migration n'a pas été exécutée (sinon l'enregistrement du profil échoue
--     pour une colonne manquante, ex. discovery_source).
--  2. handle_new_user (déclencheur qui crée le profil à l'inscription) :
--     - il plantait sur une date de naissance vide ou mal formée (« ''::date »)
--       et sur un marriageVision à null ou non-tableau, ce qui faisait échouer
--       la création du compte entière (« Erreur lors de la création du compte ») ;
--     - il était défini dans deux fichiers (schema.sql, add-created-at-to-profiles.sql)
--       avec des colonnes différentes : la version exécutée en dernier gagnait.
--     Cette version, unique, lit chaque champ prudemment et, si l'écriture
--     complète échoue malgré tout, crée un profil minimal au lieu de bloquer
--     le compte : la route d'inscription le complète ensuite, et signale à
--     l'admin toute erreur restante.
-- ============================================================

-- ── 1. Colonnes attendues par l'inscription ─────────────────
alter table public.profiles add column if not exists pseudo text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists discovery_source text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists selfie_url text;
alter table public.profiles add column if not exists profile_photos text[];
alter table public.profiles add column if not exists created_at timestamptz default now();

-- ── 2. Déclencheur d'inscription tolérant ───────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := case when jsonb_typeof(new.raw_user_meta_data) = 'object' then new.raw_user_meta_data else '{}'::jsonb end;
  display_name text := coalesce(nullif(trim(m->>'name'), ''), nullif(trim(m->>'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  birth date;
  vision text[];
begin
  -- Date de naissance : seulement une vraie date AAAA-MM-JJ, sinon vide.
  begin
    if (m->>'birthDate') ~ '^\d{4}-\d{2}-\d{2}$' then
      birth := (m->>'birthDate')::date;
    end if;
  exception when others then
    birth := null;
  end;

  -- Vision du mariage : seulement un tableau JSON, sinon vide.
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
      new.email,
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
    -- Ne jamais bloquer la création du compte pour le profil : profil minimal.
    raise warning 'handle_new_user (%): %', new.id, sqlerrm;
    begin
      insert into public.profiles (id, email, name)
      values (new.id, new.email, display_name)
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

notify pgrst, 'reload schema';
