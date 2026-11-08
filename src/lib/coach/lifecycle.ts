import type { getSupabaseAdmin } from "@/lib/supabase-admin";
import { writeCoachAudit } from "@/lib/coach/audit";

type Db = ReturnType<typeof getSupabaseAdmin>;

const MAX_ATTEMPTS = 3;
// ~100 ans : un compte « banni » ne peut plus ouvrir ni renouveler de session Supabase.
const BAN = "876000h";

/**
 * Révoque les sessions d'un coach désactivé. S'exécute APRÈS la transaction SQL coach_set_active :
 * à ce stade l'accès est déjà refusé partout (getActiveCoach / classifyAccount lisent la base).
 * Un échec ici n'annule donc JAMAIS la désactivation et ne rétablit aucun droit : il est journalisé
 * (coach_audit_logs) et rendu visible dans Admin → Paramètres → Pannes, et l'administrateur peut
 * relancer la désactivation pour retenter. (admin.signOut exige le jeton de la personne, que
 * l'administration n'a pas : on bloque le compte, ce qui coupe le renouvellement des sessions.)
 */
export async function revokeCoachSessions(db: Db, coachId: string, adminLabel: string): Promise<boolean> {
  let lastError = "inconnue";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await db.auth.admin.updateUserById(coachId, { ban_duration: BAN });
      if (!error) return true;
      lastError = error.message?.slice(0, 200) || "inconnue";
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 200) : "exception";
    }
  }
  await writeCoachAudit(db, {
    actorId: adminLabel, actorKind: "admin", action: "signout_failed", targetType: "coach", targetId: coachId,
    metadata: { attempts: MAX_ATTEMPTS },
  });
  try {
    await db.from("admin_notifications").insert({
      type: "system",
      title: "Coach : sessions non révoquées",
      message: "La désactivation d'un coach est effective, mais la révocation de ses sessions a échoué.",
      link: "/admin/users/coaches",
      metadata: { kind: "coach_session_revocation_failed", user_id: coachId, detail: lastError },
    });
  } catch { /* non bloquant */ }
  return false;
}

/** Réactivation : lève le blocage de session posé à la désactivation. */
export async function restoreCoachSessions(db: Db, coachId: string): Promise<boolean> {
  try {
    const { error } = await db.auth.admin.updateUserById(coachId, { ban_duration: "none" });
    return !error;
  } catch {
    return false;
  }
}
