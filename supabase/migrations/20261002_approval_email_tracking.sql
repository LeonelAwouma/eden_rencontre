-- ============================================================
--  Suivi de l'e-mail de validation de compte
--  À exécuter dans : Supabase Dashboard → SQL Editor → New query
--  Idempotent.
--
--  Date d'envoi réussi de l'e-mail « Votre profil est maintenant actif ».
--  Remplie par /api/admin/users/[id]/approve ; vide = aucun envoi enregistré.
--  Admin → Paramètres → Notifications propose de l'envoyer aux membres
--  approuvés qui ne l'ont pas (approuvés avant ce suivi, ou envoi échoué).
-- ============================================================

alter table public.profiles add column if not exists approval_email_sent_at timestamptz;

notify pgrst, 'reload schema';
