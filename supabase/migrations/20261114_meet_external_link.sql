-- Visioconférences : choix entre salle Jitsi Eden et lien externe (Meet, Zoom, Teams…).
-- Additif : les réunions existantes deviennent 'jitsi'. Aucune colonne renommée ni supprimée.
alter table public.meets
  add column if not exists meet_type text not null default 'jitsi',
  add column if not exists external_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'meets_meet_type_check') then
    alter table public.meets
      add constraint meets_meet_type_check check (meet_type in ('jitsi','external'));
  end if;
end $$;
