/**
 * GET /api/cron/account-health — contrôle quotidien des comptes (Vercel Cron,
 * planifié dans vercel.json).
 *
 * Répare d'office ce qui peut l'être sans risque (image encodée → fichier,
 * métadonnées de session allégées : voir src/lib/account-health.ts), puis
 * crée UNE notification admin récapitulative s'il y a quoi que ce soit à
 * signaler : réparations faites, e-mails en panne, comptes sans profil,
 * inscriptions en attente depuis plus d'une semaine.
 *
 * Protégée par CRON_SECRET (variable d'environnement Vercel) : Vercel envoie
 * « Authorization: Bearer <CRON_SECRET> ». Sans la variable, la route refuse tout.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { scanAccounts, repairAccount } from "@/lib/account-health";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const db = getSupabaseAdmin();
  const report = await scanAccounts(db);

  const repaired: string[] = [];
  const unrepaired: string[] = [];
  for (const a of report.anomalies) {
    if (!a.repairable) { unrepaired.push(`${a.email} : ${a.problems.join(" ; ")}`); continue; }
    const res = await repairAccount(db, a.id);
    if (res.ok) repaired.push(`${a.email} : ${res.actions.join(", ") || "rien à changer"}`);
    else unrepaired.push(`${a.email} : ${res.error}`);
  }

  const lines: string[] = [];
  if (!report.smtp.ok) lines.push(`⚠ E-mails en panne : ${report.smtp.error}`);
  if (repaired.length) lines.push(`Réparé automatiquement : ${repaired.join(" | ")}`);
  if (unrepaired.length) lines.push(`À traiter à la main : ${unrepaired.join(" | ")}`);
  if (report.orphans) lines.push(`${report.orphans} compte(s) de connexion sans profil.`);
  if (report.pendingOld) lines.push(`${report.pendingOld} inscription(s) en attente depuis plus de 7 jours.`);

  if (lines.length) {
    const urgent = !report.smtp.ok || unrepaired.length > 0;
    try {
      await db.from("admin_notifications").insert({
        type: "system",
        title: urgent ? "Contrôle des comptes : action requise" : "Contrôle des comptes du jour",
        message: lines.join("\n"),
        link: "/admin/users",
        metadata: { report: { ...report, anomalies: report.anomalies.map((a) => ({ id: a.id, email: a.email, problems: a.problems })) }, repaired, unrepaired },
      });
    } catch (err) {
      console.error("[cron/account-health] notification impossible:", err);
    }
  }
  console.log(`[cron/account-health] ${report.anomalies.length} anomalie(s), ${repaired.length} réparée(s), SMTP ${report.smtp.ok ? "ok" : "EN PANNE"}`);
  return NextResponse.json({ ok: true, repaired, unrepaired, smtp: report.smtp, orphans: report.orphans, pendingOld: report.pendingOld });
}
