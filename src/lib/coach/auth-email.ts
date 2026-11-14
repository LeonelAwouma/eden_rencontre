import { phoneToSyntheticEmail } from "@/lib/phone-identity";

/**
 * Résolution SERVEUR d'un numéro de téléphone vers l'adresse Supabase Auth du compte.
 *
 * Pourquoi : les comptes Coach créés avant la connexion par téléphone ont une adresse Auth RÉELLE ; les nouveaux
 * ont une adresse technique dérivée du numéro. On ne peut donc pas appliquer aveuglément phoneToSyntheticEmail().
 * Le numéro est résolu en base AVANT toute tentative d'authentification (Supabase ne distingue pas un compte
 * inexistant d'un mauvais mot de passe : cet échec ne doit jamais servir à détecter un ancien compte).
 *
 * - profil Coach trouvé par profiles.phone  → adresse Auth lue via auth.admin.getUserById(user_id) ;
 * - sinon (membre, numéro inconnu)          → mécanisme téléphonique actuel (adresse technique), inchangé ;
 * - toute erreur de lecture                 → { ok:false } : refus temporaire, JAMAIS de connexion de repli.
 *
 * À n'appeler que côté serveur (client service_role).
 */

interface AdminLike {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
  auth: {
    admin: {
      getUserById: (id: string) => PromiseLike<{ data: { user?: { email?: string | null } | null } | null; error: unknown }>;
    };
  };
}

export type PhoneAuthResolution =
  | { ok: true; authEmail: string; coachUserId: string | null }
  | { ok: false };

export async function resolveAuthEmailForPhone(db: unknown, e164Phone: string): Promise<PhoneAuthResolution> {
  const synthetic = phoneToSyntheticEmail(e164Phone);
  if (!synthetic) return { ok: false };
  const client = db as AdminLike;
  try {
    const { data, error } = await client.from("profiles").select("id, account_type").eq("phone", e164Phone).maybeSingle();
    if (error) return { ok: false };
    const profile = data as { id?: string; account_type?: string | null } | null;
    // Aucun coach pour ce numéro : parcours « téléphone seul » des membres, inchangé.
    if (!profile || profile.account_type !== "coach" || !profile.id) return { ok: true, authEmail: synthetic, coachUserId: null };

    const { data: authUser, error: authError } = await client.auth.admin.getUserById(profile.id);
    const email = authUser?.user?.email;
    if (authError || typeof email !== "string" || !email) return { ok: false };
    return { ok: true, authEmail: email.trim().toLowerCase(), coachUserId: profile.id };
  } catch {
    return { ok: false };
  }
}
