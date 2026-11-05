import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Coach actif, sinon null. Vérifie ENSEMBLE : session valide, ligne coach_accounts
 * active, profil existant avec account_type = 'coach' et status = 'approved'.
 * Toute incohérence entre les tables refuse l'accès (jamais d'accès « par défaut »).
 */
export async function getActiveCoach(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return null;
  const db = getSupabaseAdmin();
  const [account, profile] = await Promise.all([
    db.from("coach_accounts").select("user_id,email,display_name,active").eq("user_id", user.id).maybeSingle(),
    db.from("profiles").select("status,account_type").eq("id", user.id).maybeSingle(),
  ]);
  if (account.error || profile.error) return null;
  const coach = account.data;
  const p = profile.data;
  if (!coach || coach.active !== true) return null;
  if (!p || p.account_type !== "coach" || p.status !== "approved") return null;
  return { id: user.id, email: coach.email as string, name: coach.display_name as string };
}
