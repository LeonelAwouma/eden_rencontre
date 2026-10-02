/**
 * Rattrapage de l'e-mail de validation de compte.
 *
 * GET  → membres approuvés sans envoi enregistré (profiles.approval_email_sent_at vide).
 * POST → leur envoie l'e-mail, par lots (chaque envoi dépose aussi une copie
 *        dans « Envoyée » : un lot tient largement dans la durée de la fonction).
 *        L'interface rappelle la route tant qu'il en reste.
 *
 * Colonne ajoutée par supabase/migrations/20261002_approval_email_tracking.sql.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendAccountApprovedEmail, getLastEmailError } from "@/lib/email";

export const maxDuration = 60;

const BATCH_SIZE = 8;
const MIGRATION_HINT = "Exécutez d'abord la migration supabase/migrations/20261002_approval_email_tracking.sql dans Supabase (SQL Editor).";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Membres approuvés sans e-mail de validation enregistré (hors comptes techniques en .local). */
async function missing(db: Db) {
  const { data, error } = await db
    .from("profiles")
    .select("id, email, name")
    .eq("status", "approved")
    .is("approval_email_sent_at", null)
    .order("reviewed_at", { ascending: true });
  if (error) return { error: /approval_email_sent_at/.test(error.message) ? MIGRATION_HINT : error.message, members: [] };
  const members = (data || []).filter((m) => typeof m.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email) && !/\.local$/i.test(m.email));
  return { error: null, members };
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { error, members } = await missing(getSupabaseAdmin());
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ count: members.length, members: members.map((m) => ({ email: m.email, name: m.name })) });
}

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const db = getSupabaseAdmin();
  const { error, members } = await missing(db);
  if (error) return NextResponse.json({ error }, { status: 500 });

  // Les échecs de ce passage ne sont pas retentés dans la même série (sinon boucle sans fin).
  const body = await req.json().catch(() => ({}));
  const skip = new Set<string>(Array.isArray(body.skip) ? body.skip.filter((s: unknown) => typeof s === "string") : []);
  const batch = members.filter((m) => !skip.has(m.id)).slice(0, BATCH_SIZE);

  const sent: string[] = [];
  const failed: { id: string; email: string; error: string }[] = [];
  for (const m of batch) {
    const ok = await sendAccountApprovedEmail(m.email, m.name || "Membre");
    if (ok) {
      await db.from("profiles").update({ approval_email_sent_at: new Date().toISOString() }).eq("id", m.id);
      sent.push(m.email);
    } else {
      failed.push({ id: m.id, email: m.email, error: getLastEmailError() || "Échec de l'envoi." });
    }
  }

  if (sent.length) {
    try {
      await logAdminAction(admin.adminId, admin.email, "approval_emails_resent", "system", undefined,
        { sent }, req.headers.get("x-forwarded-for") || undefined);
    } catch { /* non bloquant */ }
  }

  const remaining = members.filter((m) => !skip.has(m.id) && !batch.includes(m)).length;
  return NextResponse.json({ sent, failed, remaining });
}
