/**
 * Données à traiter (Admin → Utilisateurs → À traiter).
 *
 * GET  → { orphans, incomplete, pending }
 *   - orphans    : comptes de connexion sans profil (inscription Google
 *                  interrompue, profil supprimé dans l'éditeur Supabase…) :
 *                  invisibles dans la liste des membres ;
 *   - incomplete : membres approuvés à qui il manque des informations ;
 *   - pending    : inscriptions en attente de décision, les plus anciennes d'abord.
 * POST { action: "remind" } → e-mail « Complétez votre profil » aux membres
 *   incomplets non relancés depuis 7 jours, par lots (l'interface rappelle
 *   la route tant qu'il en reste).
 * POST { action: "scan" }   → contrôle complet des comptes, e-mails compris
 *   (même contrôle que la tâche quotidienne, src/lib/account-health.ts).
 * POST { action: "repair", id } → répare un compte signalé par le contrôle.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendProfileReminderEmail, getLastEmailError } from "@/lib/email";
import { scanAccounts, repairAccount } from "@/lib/account-health";

export const maxDuration = 60;

const REMIND_COOLDOWN_DAYS = 7;
const BATCH_SIZE = 8;
const MIGRATION_HINT = "Exécutez d'abord la migration supabase/migrations/20261002_profile_reminder.sql dans Supabase (SQL Editor).";

type Db = ReturnType<typeof getSupabaseAdmin>;
type Row = Record<string, any>;

const isTechnical = (email: unknown) => typeof email !== "string" || !email || /\.local$/i.test(email);

/** Lecture tolérante : une colonne absente (migration non exécutée) ne bloque pas le reste. */
async function optionalColumn(db: Db, column: string): Promise<Map<string, unknown> | null> {
  const { data, error } = await db.from("profiles").select(`id, ${column}`);
  if (error) return null;
  return new Map((data as unknown as Row[]).map((r) => [r.id as string, r[column]]));
}

/** Ce qui manque à un membre, en clair (repris tel quel dans l'e-mail de relance). */
function missingItems(p: Row, phone: Map<string, unknown> | null): string[] {
  const out: string[] = [];
  if (!p.gender || !p.country || !p.city || !p.birth_date) out.push("vos informations de base (genre, pays, ville, date de naissance)");
  if (!p.pseudo) out.push("votre pseudonyme");
  if (!p.avatar_url) out.push("votre photo publique ou un avatar");
  if (phone && !phone.get(p.id)) out.push("votre numéro de téléphone");
  if (!p.onboarding_completed) out.push("votre questionnaire de compatibilité");
  return out;
}

async function collect(db: Db) {
  const [{ data: profiles, error }, authRes, phone, reminded] = await Promise.all([
    db.from("profiles").select("id, email, name, pseudo, status, gender, country, city, birth_date, avatar_url, onboarding_completed, created_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    optionalColumn(db, "phone"),
    optionalColumn(db, "profile_reminder_sent_at"),
  ]);
  if (error) throw new Error(error.message);
  const rows = (profiles || []) as Row[];
  const ids = new Set(rows.map((r) => r.id));

  const orphans = (authRes.data?.users || [])
    .filter((u) => !ids.has(u.id) && !isTechnical(u.email))
    .map((u) => ({ id: u.id, email: u.email, provider: u.app_metadata?.provider || "email", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const incomplete = rows
    .filter((p) => p.status === "approved" && !isTechnical(p.email))
    .map((p) => ({
      id: p.id, email: p.email, name: p.name, pseudo: p.pseudo,
      missing: missingItems(p, phone),
      reminded_at: (reminded?.get(p.id) as string | null | undefined) ?? null,
    }))
    .filter((p) => p.missing.length > 0);

  const pending = rows
    .filter((p) => p.status === "pending" && !isTechnical(p.email))
    .map((p) => ({ id: p.id, email: p.email, name: p.name, created_at: p.created_at, profileComplete: !!(p.gender && p.country && p.city) }))
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

  return { orphans, incomplete, pending, reminderTracking: reminded !== null };
}

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  try {
    const db = getSupabaseAdmin();
    // Anomalies techniques (sans le test e-mail, plus lent : action « scan »).
    const [base, health] = await Promise.all([collect(db), scanAccounts(db, { checkEmail: false })]);
    return NextResponse.json({ ...base, anomalies: health.anomalies });
  } catch (err) {
    console.error("[admin/data-health]", err);
    return NextResponse.json({ error: "Données indisponibles." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const body = await req.json().catch(() => ({}));
  const db = getSupabaseAdmin();

  if (body.action === "scan") {
    return NextResponse.json(await scanAccounts(db));
  }
  if (body.action === "repair") {
    if (typeof body.id !== "string") return NextResponse.json({ error: "Compte manquant." }, { status: 400 });
    const res = await repairAccount(db, body.id);
    if (res.ok && res.actions.length) {
      try { await logAdminAction(admin.adminId, admin.email, "account_repaired", "user", body.id, { actions: res.actions }); } catch { /* non bloquant */ }
    }
    return NextResponse.json(res, { status: res.ok ? 200 : 500 });
  }
  if (body.action !== "remind") return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

  const { incomplete, reminderTracking } = await collect(db);
  // Sans la colonne de suivi, impossible de garantir « une relance par semaine » : on refuse.
  if (!reminderTracking) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });

  const cutoff = Date.now() - REMIND_COOLDOWN_DAYS * 24 * 3600 * 1000;
  const skip = new Set<string>(Array.isArray(body.skip) ? body.skip.filter((s: unknown) => typeof s === "string") : []);
  const due = incomplete.filter((m) => !skip.has(m.id) && (!m.reminded_at || new Date(m.reminded_at).getTime() < cutoff));
  const batch = due.slice(0, BATCH_SIZE);

  const sent: string[] = [];
  const failed: { id: string; email: string; error: string }[] = [];
  for (const m of batch) {
    const ok = await sendProfileReminderEmail(m.email, m.pseudo || m.name || "Membre", m.missing);
    if (ok) {
      await db.from("profiles").update({ profile_reminder_sent_at: new Date().toISOString() }).eq("id", m.id);
      sent.push(m.email);
    } else {
      failed.push({ id: m.id, email: m.email, error: getLastEmailError() || "Échec de l'envoi." });
    }
  }

  if (sent.length) {
    try {
      await logAdminAction(admin.adminId, admin.email, "profile_reminders_sent", "system", undefined, { sent });
    } catch { /* non bloquant */ }
  }
  return NextResponse.json({ sent, failed, remaining: due.length - batch.length });
}
