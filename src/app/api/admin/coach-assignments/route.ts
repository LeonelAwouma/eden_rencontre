import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  SITUATIONS, buildOverview, filterOverview, sanitizeSearch,
  type AssignmentRow, type CoachRow, type MemberRow, type Situation,
} from "@/lib/coach/assignments-overview";

/**
 * GET /api/admin/coach-assignments — tableau « Affectation aux coachs » (administration uniquement).
 * Lecture seule : les écritures passent par /api/admin/coaches/[id]/assignments (fonctions SQL transactionnelles).
 * Paramètres : q (nom, prénom, pseudo, e-mail), member_status, situation, coach, page.
 */
const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const MEMBER_STATUSES = ["approved", "pending", "suspended", "rejected"] as const;
const MAX_MEMBERS = 2000;
const PAGE_SIZE = 25;
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return json({ error: "Non autorisé" }, 401); }

  const sp = req.nextUrl.searchParams;
  const q = sanitizeSearch(sp.get("q"));
  const memberStatusParam = sp.get("member_status") || "approved";
  const memberStatus = (MEMBER_STATUSES as readonly string[]).includes(memberStatusParam) ? memberStatusParam : memberStatusParam === "all" ? null : "approved";
  const situationParam = sp.get("situation");
  const situation = (SITUATIONS as readonly string[]).includes(situationParam || "") ? (situationParam as Situation) : null;
  const coachId = isUuid(sp.get("coach")) ? sp.get("coach") : null;
  const page = Math.max(1, Math.floor(Number(sp.get("page"))) || 1);

  const db = getSupabaseAdmin();

  // Coachs (peu nombreux) : liste complète pour le sélecteur et l'affichage.
  const { data: coachData, error: coachError } = await db.from("coach_accounts")
    .select("user_id,display_name,email,active").order("display_name", { ascending: true });
  if (coachError) return json({ error: "Impossible de consulter les coachs" }, 500);
  const coachIds = (coachData || []).map((c) => c.user_id as string);
  const avatars = new Map<string, string | null>();
  if (coachIds.length) {
    const { data: profs } = await db.from("profiles").select("id,avatar_url").in("id", coachIds);
    for (const p of (profs || []) as Array<{ id: string; avatar_url: string | null }>) avatars.set(p.id, p.avatar_url);
  }
  const coaches: CoachRow[] = (coachData || []).map((c) => ({
    user_id: c.user_id as string, display_name: c.display_name as string, email: c.email as string,
    active: c.active === true, avatar_url: avatars.get(c.user_id as string) ?? null,
  }));

  // Membres : jamais de comptes Coach ; recherche et statut appliqués côté base.
  let mq = db.from("profiles")
    .select("id,name,pseudo,first_name,last_name,email,status,avatar_url")
    .neq("account_type", "coach").order("created_at", { ascending: false }).limit(MAX_MEMBERS);
  if (memberStatus) mq = mq.eq("status", memberStatus);
  if (q) {
    const like = `%${q}%`;
    mq = mq.or(["name", "pseudo", "first_name", "last_name", "email"].map((c) => `${c}.ilike.${like}`).join(","));
  }
  const [members, open, closed] = await Promise.all([
    mq,
    db.from("coach_member_assignments").select("id,coach_id,member_id,status,assigned_at,end_reason").in("status", ["pending", "active"]),
    db.from("coach_member_assignments").select("id,coach_id,member_id,status,assigned_at,end_reason")
      .not("status", "in", "(pending,active)").order("assigned_at", { ascending: false }).limit(5000),
  ]);
  if (members.error || open.error || closed.error) return json({ error: "Impossible de consulter les affectations" }, 500);

  const all = buildOverview(
    (members.data || []) as MemberRow[], (open.data || []) as AssignmentRow[], (closed.data || []) as AssignmentRow[], coaches,
  );
  const filtered = filterOverview(all, { situation, coachId });
  const start = (page - 1) * PAGE_SIZE;

  // Compteurs par coach (membres suivis) : sur l'ensemble des membres retenus, avant filtre d'affectation.
  const counts: Record<string, { active_count: number; pending_count: number }> = {};
  for (const i of all) {
    if (!i.coach || (i.situation !== "active" && i.situation !== "pending")) continue;
    const c = (counts[i.coach.id] ||= { active_count: 0, pending_count: 0 });
    if (i.situation === "active") c.active_count += 1; else c.pending_count += 1;
  }

  return json({
    items: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
    page, page_size: PAGE_SIZE,
    truncated: (members.data || []).length >= MAX_MEMBERS,
    to_reassign_count: all.filter((i) => i.situation === "to_reassign").length,
    coaches: coaches.map((c) => ({ ...c, ...(counts[c.user_id] || { active_count: 0, pending_count: 0 }) })),
  });
}
