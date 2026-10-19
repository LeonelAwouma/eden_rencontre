/**
 * GET /api/admin/incidents — pannes vécues par les membres, avec leur détail.
 *
 * Lit les notifications admin « système » (client-incident, échecs d'inscription,
 * contrôle des comptes), les classe, regroupe les répétitions et retrouve le
 * membre concerné. Aucune écriture.
 *
 * Paramètres : ?category=access|registration|health  ?kind=<type>  ?days=7|30|all  (défaut 30)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  classifyIncident, groupIncidents, summarizeIncidents,
  type Incident, type IncidentCategory,
} from "@/lib/incidents";

const CATEGORIES = new Set<IncidentCategory>(["access", "registration", "health"]);
const MAX_ROWS = 500;

interface Member { id: string; name: string | null; pseudo: string | null; email: string | null; status: string | null }

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const url = new URL(req.url);
  const category = url.searchParams.get("category") as IncidentCategory | null;
  const kind = url.searchParams.get("kind");
  const daysParam = url.searchParams.get("days") || "30";
  const days = daysParam === "all" ? null : Math.min(Math.max(parseInt(daysParam, 10) || 30, 1), 365);

  const db = getSupabaseAdmin();
  let query = db
    .from("admin_notifications")
    .select("id, title, message, link, metadata, created_at")
    .eq("type", "system")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (days) query = query.gte("created_at", new Date(Date.now() - days * 86400000).toISOString());

  const { data, error } = await query;
  if (error) {
    // Table absente (jamais créée) : rien à montrer, ce n'est pas une panne de la page.
    if (error.code === "PGRST205") return NextResponse.json({ incidents: [], summary: summarizeIncidents([]), truncated: false });
    console.error("[admin/incidents]", error.message);
    return NextResponse.json({ error: "Lecture des pannes impossible." }, { status: 500 });
  }

  const all: Incident[] = (data || [])
    .map((n) => classifyIncident(n as Parameters<typeof classifyIncident>[0]))
    .filter((i): i is Incident => i !== null);

  // La synthèse et les listes de filtres portent sur toute la période ; la liste, sur le filtre choisi.
  const summary = summarizeIncidents(all);
  const filtered = all.filter((i) => (!category || !CATEGORIES.has(category) || i.category === category) && (!kind || i.kind === kind));
  const groups = groupIncidents(filtered).slice(0, 150);

  // Membres concernés : par compte, à défaut par adresse e-mail.
  const ids = [...new Set(groups.map((g) => g.userId).filter((v): v is string => !!v))];
  const emails = [...new Set(groups.filter((g) => !g.userId && g.email).map((g) => g.email as string))];
  const byId = new Map<string, Member>();
  const byEmail = new Map<string, Member>();
  const cols = "id, name, pseudo, email, status";
  if (ids.length) {
    const { data: rows } = await db.from("profiles").select(cols).in("id", ids);
    (rows as Member[] | null)?.forEach((m) => byId.set(m.id, m));
  }
  if (emails.length) {
    const { data: rows } = await db.from("profiles").select(cols).in("email", emails);
    (rows as Member[] | null)?.forEach((m) => m.email && byEmail.set(m.email.toLowerCase(), m));
  }

  const incidents = groups.map((g) => ({
    ...g,
    member: (g.userId ? byId.get(g.userId) : g.email ? byEmail.get(g.email.toLowerCase()) : null) ?? null,
  }));

  return NextResponse.json({ incidents, summary, truncated: (data?.length ?? 0) >= MAX_ROWS });
}
