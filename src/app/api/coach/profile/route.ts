import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { coachJson, withActiveCoach } from "@/lib/coach/api";

/**
 * GET /api/coach/profile — informations du coach CONNECTÉ uniquement.
 * Nom et e-mail viennent de `coach_accounts` (déjà validés par `requireActiveCoach`) : aucun repli ne les
 * concerne. Seul `last_login_at` (colonne ajoutée par 20261107) est lu à part, avec repli 42703 → null
 * pour qu'un repli ne masque jamais une hypothèse fausse sur l'e-mail.
 */
export async function GET(req: NextRequest) {
  return withActiveCoach(req, async (coach) => {
    let lastLoginAt: string | null = null;
    const { data, error } = await getSupabaseAdmin()
      .from("coach_accounts")
      .select("last_login_at")
      .eq("user_id", coach.id)
      .maybeSingle();
    if (error) {
      if ((error as { code?: string }).code !== "42703") throw new Error("coach profile: last login query failed");
    } else if (typeof data?.last_login_at === "string") {
      lastLoginAt = data.last_login_at;
    }
    return coachJson({ name: coach.name, email: coach.email, lastLoginAt });
  });
}
