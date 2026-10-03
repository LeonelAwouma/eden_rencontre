/**
 * Échec d'inscription rendu visible : chaque échec côté serveur crée une
 * notification admin avec la cause réelle (message de la base, de Supabase
 * Auth…), au lieu de ne laisser au membre qu'un message générique et à
 * personne la vraie raison. Le membre, lui, ne voit jamais le détail technique.
 *
 * Une notification au plus par adresse e-mail et par étape toutes les heures
 * (un membre qui réessaie dix fois ne crée pas dix alertes).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

export type RegistrationStep =
  | "account_creation"   // création du compte Supabase Auth
  | "profile_save"       // écriture de la fiche profiles
  | "google_profile_save" // complément d'une inscription Google
  | "unexpected";        // exception non prévue

const STEP_LABELS: Record<RegistrationStep, string> = {
  account_creation: "création du compte",
  profile_save: "enregistrement du profil",
  google_profile_save: "complément du profil Google",
  unexpected: "erreur inattendue",
};

export async function reportRegistrationFailure(
  step: RegistrationStep,
  detail: string,
  who: { email?: string | null; userId?: string | null; flow: "classique" | "google" }
): Promise<void> {
  const cause = (detail || "inconnue").slice(0, 500);
  console.error(`[inscription] échec — ${STEP_LABELS[step]} — ${who.email || who.userId || "?"} — ${cause}`);
  try {
    const dedupeKey = `registration-failure:${step}:${who.email || who.userId || "?"}`;
    if (!(await checkRateLimit(dedupeKey, "registration_failure_notified", 1, 3600))) return;
    await recordRateLimit(dedupeKey, "registration_failure_notified");
    await getSupabaseAdmin().from("admin_notifications").insert({
      type: "system",
      title: `Inscription en échec : ${STEP_LABELS[step]}`,
      message: `${who.email || "Adresse inconnue"} (inscription ${who.flow}) n'a pas pu s'inscrire. Cause : ${cause}`,
      link: who.userId ? `/admin/users/${who.userId}` : "/admin/users",
      metadata: { step, flow: who.flow, email: who.email ?? null, user_id: who.userId ?? null, cause },
    });
  } catch (err) {
    console.error("[inscription] notification admin impossible:", err);
  }
}
