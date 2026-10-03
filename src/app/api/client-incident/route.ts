/**
 * POST /api/client-incident — un membre a rencontré une panne que le site sait
 * reconnaître (statut du compte illisible, vérification de session en échec…).
 *
 * But : qu'une panne vécue par un membre ne reste plus jamais invisible. Avant,
 * un compte approuvé dont la lecture échouait était renvoyé vers la page
 * d'attente sans que personne le sache (incident du 2026-10-03).
 *
 * Ouverte sans authentification, à dessein : le jeton peut être la cause de la
 * panne. Garde-fous : types d'incident en liste fermée, limite par IP, et une
 * seule notification admin par membre et par type toutes les 6 heures.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

const KINDS: Record<string, string> = {
  account_status_unreadable: "Statut du compte illisible",
  session_check_failed: "Vérification de session en échec",
  pending_status_unreadable: "Page d'attente : statut illisible",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PER_IP_PER_HOUR = 20;
const DEDUPE_SECONDS = 6 * 3600;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!KINDS[kind]) return NextResponse.json({ error: "Incident inconnu." }, { status: 400 });

  const ip = clientIp(req);
  const ipKey = `incident-ip:${ip}`;
  if (!(await checkRateLimit(ipKey, "client_incident", MAX_PER_IP_PER_HOUR, 3600))) {
    return NextResponse.json({ ok: true, throttled: true });
  }
  await recordRateLimit(ipKey, "client_incident");

  // Identité indicative (non vérifiée) : sert à retrouver le compte, jamais à agir dessus.
  const userId = typeof body.userId === "string" && UUID.test(body.userId) ? body.userId : null;
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : null;
  const detail = typeof body.detail === "string" ? body.detail.slice(0, 500) : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "";

  console.error(`[incident] ${kind} — ${email || userId || "anonyme"} — ${path} — ${detail}`);

  const dedupeKey = `incident:${kind}:${userId || email || ip}`;
  if (!(await checkRateLimit(dedupeKey, "client_incident_notified", 1, DEDUPE_SECONDS))) {
    return NextResponse.json({ ok: true });
  }
  await recordRateLimit(dedupeKey, "client_incident_notified");

  const db = getSupabaseAdmin();
  // Le compte existe-t-il vraiment ? (évite qu'un tiers fasse apparaître n'importe quel nom)
  let known: { email: string | null; status: string | null } | null = null;
  if (userId) {
    const { data } = await db.from("profiles").select("email, status").eq("id", userId).maybeSingle();
    known = data ? { email: data.email, status: data.status } : null;
  }
  try {
    await db.from("admin_notifications").insert({
      type: "system",
      title: `Panne vécue par un membre : ${KINDS[kind]}`,
      message: `${known?.email || email || "Membre non identifié"}${known?.status ? ` (compte ${known.status})` : ""} n'a pas pu accéder à son espace (${path || "page inconnue"}). Détail : ${detail || "—"}. Lancez le contrôle des comptes dans Admin → Utilisateurs → À traiter.`,
      link: known && userId ? `/admin/users/${userId}` : "/admin/users",
      metadata: { kind, user_id: userId, email, path, detail, ip },
    });
  } catch (err) {
    console.error("[incident] notification admin impossible:", err);
  }
  return NextResponse.json({ ok: true });
}
