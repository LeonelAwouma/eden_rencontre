-- ============================================================
--  Forum : modifier un message dans les 5 minutes qui suivent son envoi
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  (après 20261001_forum.sql). Idempotent.
--
--  • L'auteur peut corriger le texte de son message pendant 5 minutes
--    (comme sur WhatsApp) ; passé ce délai, la base refuse.
--  • Le message affiche alors « modifié » (colonne edited_at, posée par
--    un trigger : le membre ne peut pas la falsifier).
--  • La suppression de ses propres messages reste possible à tout moment
--    (politique forum_messages_delete, déjà en place).
-- ============================================================

alter table public.forum_messages add column if not exists edited_at timestamptz;

-- Le membre ne peut modifier que le texte.
grant update (body) on public.forum_messages to authenticated;

drop policy if exists forum_messages_update on public.forum_messages;
create policy forum_messages_update on public.forum_messages
  for update
  using (
    author_id = auth.uid()
    and public.is_approved(auth.uid())
    and public.forum_can_post(auth.uid())
    and created_at > now() - interval '5 minutes'
  )
  with check (author_id = auth.uid());

-- Date de modification posée par la base, uniquement si le texte change.
create or replace function public.forum_messages_mark_edited()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists forum_messages_mark_edited on public.forum_messages;
create trigger forum_messages_mark_edited
  before update on public.forum_messages
  for each row execute function public.forum_messages_mark_edited();
