import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { sendInactivityReminderEmail } from "@/lib/email";
import { reactivationUnsubscribeUrl } from "@/lib/member-reactivation";
import { runReactivation } from "@/lib/member-reactivation-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rappels d'inactivité (7, 21 et 45 jours après la dernière VISITE réelle).
 *
 * Inscription automatique : tous les membres approuvés et éligibles sont concernés ; il n'y a plus d'opt-in individuel.
 * Seule une opposition enregistrée (lien de désinscription des e-mails) exclut un membre.
 * L'interrupteur global est la configuration de la plateforme : REACTIVATION_EMAILS_ENABLED=true (sinon rien n'est envoyé).
 * Protégé par CRON_SECRET. Règles et prises en charge atomiques : src/lib/member-reactivation-policy.ts et -run.ts.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (process.env.REACTIVATION_EMAILS_ENABLED !== "true") {
    return NextResponse.json({ enabled: false, sent: 0, message: "Relances désactivées" });
  }
  try {
    const result = await runReactivation({
      db: getSupabaseAdmin(),
      send: sendInactivityReminderEmail,
      unsubscribeUrl: reactivationUnsubscribeUrl,
      systemEmail: ADMIN_SYSTEM_EMAIL,
    });
    return NextResponse.json({ enabled: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[reactivation] cron failed", err);
    return NextResponse.json({ error: "Contrôle des relances impossible." }, { status: 500 });
  }
}
