-- Notifications d'invitation à une visioconférence : rendre la notification
-- cliquable dans l'espace membre en stockant le lien de la salle.
--
-- Le code sait fonctionner sans cette colonne (il réinsère alors la
-- notification sans lien) ; après cette migration, la notification mène
-- directement à /reunion/<id>.
ALTER TABLE public.meeting_notifications
  ADD COLUMN IF NOT EXISTS link TEXT;
