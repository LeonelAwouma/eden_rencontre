import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Coach actif, sinon null. Vérifie ENSEMBLE : session valide, ligne coach_accounts
 * active, profil existant avec account_type = 'coach' et status = 'approved'.
 * Toute incohérence entre les tables refuse l'accès (jamais d'accès « par défaut »).
 */
export type ActiveCoach = { id: string; email: string; name: string };

/** Garde des routes réservées aux coachs : même règle que getActiveCoach (une seule définition). */
export async function requireActiveCoach(req: NextRequest): Promise<ActiveCoach | null> {
  return getActiveCoach(req);
}

/**
 * Règle unique « coach actif » pour un identifiant d'utilisateur DÉJÀ authentifié : ligne coach_accounts active
 * ET profil account_type = 'coach' avec status = 'approved'. Partagée par les routes API (`getActiveCoach`),
 * la garde serveur des pages `/coach` (`resolveCoachPageAccess`) et la synchronisation du cookie de session :
 * aucune seconde logique d'autorisation. Toute erreur de lecture ou incohérence → null (refus).
 */
export async function getActiveCoachByUserId(userId: string): Promise<ActiveCoach | null> {
  const db = getSupabaseAdmin();
  const [account, profile] = await Promise.all([
    db.from("coach_accounts").select("user_id,email,display_name,active").eq("user_id", userId).maybeSingle(),
    db.from("profiles").select("status,account_type").eq("id", userId).maybeSingle(),
  ]);
  if (account.error || profile.error) return null;
  const coach = account.data;
  const p = profile.data;
  if (!coach || coach.active !== true) return null;
  if (!p || p.account_type !== "coach" || p.status !== "approved") return null;
  return { id: userId, email: coach.email as string, name: coach.display_name as string };
}

export async function getActiveCoach(req: NextRequest): Promise<ActiveCoach | null> {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;
  return getActiveCoachByUserId(user.id);
}
