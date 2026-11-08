import { NextResponse } from "next/server";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export type TargetKind = "coach" | "other" | "error";

/**
 * Le compte ciblé est-il un coach ? (profiles.account_type = 'coach' OU ligne coach_accounts)
 * Fail-closed : toute erreur de lecture renvoie « error » — l'appelant doit alors refuser.
 */
export async function classifyTarget(db: Db, id: string): Promise<TargetKind> {
  const [profile, account] = await Promise.all([
    db.from("profiles").select("account_type").eq("id", id).maybeSingle(),
    db.from("coach_accounts").select("user_id").eq("user_id", id).maybeSingle(),
  ]);
  if (account.error) return "error";
  const missingColumn = (profile.error as { code?: string } | null)?.code === "42703";
  if (profile.error && !missingColumn) return "error";
  if (account.data) return "coach";
  if (!missingColumn && profile.data?.account_type === "coach") return "coach";
  return "other";
}

/**
 * Garde des routes « pré-approbation » (inscription, questionnaire, parrainage), ouvertes à tout jeton
 * valide parce qu'un candidat n'est pas encore approuvé. Un coach n'a rien à y faire : il ne remplit ni
 * profil matrimonial ni questionnaire (le badge « Profil vérifié » et le parrainage ne le concernent pas).
 * Erreur de lecture : refus (fail-closed).
 */
export async function refuseCoachSession(db: Db, userId: string): Promise<NextResponse | null> {
  const kind = await classifyTarget(db, userId);
  if (kind === "coach") {
    return NextResponse.json({ error: "Cette action est réservée aux membres.", code: "coach_account" }, { status: 403 });
  }
  if (kind === "error") {
    return NextResponse.json({ error: "Vérification du compte impossible. Réessayez dans un instant." }, { status: 503 });
  }
  return null;
}

/**
 * Garde des routes génériques de gestion des membres (suspend / approve / reject / DELETE).
 * Le cycle de vie d'un coach passe exclusivement par /api/admin/coaches, qui garde
 * coach_accounts, profiles et les attributions cohérents (fonction SQL transactionnelle).
 * Renvoie la réponse à retourner, ou null si la cible n'est pas un coach.
 */
export async function refuseIfCoach(db: Db, id: string): Promise<NextResponse | null> {
  const kind = await classifyTarget(db, id);
  if (kind === "coach") {
    return NextResponse.json(
      { error: "Ce compte est un coach : utilisez la gestion des coachs (Utilisateurs → Coachs).", code: "coach_account" },
      { status: 409 }
    );
  }
  if (kind === "error") {
    return NextResponse.json({ error: "Vérification du type de compte impossible, opération refusée." }, { status: 500 });
  }
  return null;
}
