/**
 * GET /api/admin/users/export — fichier Excel (.xlsx) des membres.
 *
 * Mêmes filtres que la liste des utilisateurs (?status=&plan=&search=) : le fichier contient tous
 * les membres correspondants, pas seulement la page affichée. Réservé à l'admin ; chaque export
 * est inscrit au journal d'audit (il contient des données personnelles).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clientIp } from "@/lib/api-auth";
import { applyUserFilters, readUserFilters } from "@/lib/admin-users-filter";
import { buildMembersWorkbook, type ProfileRow } from "@/lib/admin-users-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE = 1000;
const MAX_MEMBERS = 20000;
const STATUS_LABELS: Record<string, string> = {
  pending: "En attente", approved: "Approuvés", rejected: "Rejetés", suspended: "Suspendus", verification_pending: "Vérification en attente",
};
const PLAN_LABELS: Record<string, string> = { free: "Gratuit", essentiel: "Essentiel", premium: "Premium", elite: "Élite" };

export async function GET(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const db = getSupabaseAdmin();
  const filters = readUserFilters(new URL(request.url).searchParams);

  const rows: ProfileRow[] = [];
  for (let from = 0; from < MAX_MEMBERS; from += PAGE) {
    const { data, error } = await applyUserFilters(
      db.from("profiles").select("*").order("created_at", { ascending: false, nullsFirst: false }).range(from, from + PAGE - 1),
      filters
    );
    if (error) {
      console.error("[admin/users/export]", error.message);
      return NextResponse.json({ error: "Lecture des membres impossible." }, { status: 500 });
    }
    rows.push(...(data as ProfileRow[]));
    if (!data || data.length < PAGE) break;
  }

  const applied: string[] = [];
  if (filters.status && filters.status !== "all") applied.push(`Statut : ${STATUS_LABELS[filters.status] ?? filters.status}`);
  if (filters.plan && filters.plan !== "all") applied.push(`Offre : ${PLAN_LABELS[filters.plan] ?? filters.plan}`);
  if (filters.search?.trim()) applied.push(`Recherche : « ${filters.search.trim()} »`);

  const generatedAt = new Date();
  const file = await buildMembersWorkbook(rows, { generatedAt, filters: applied });

  try {
    await logAdminAction(admin.adminId, admin.email, "users_exported", "system", undefined,
      { count: rows.length, filters: applied }, clientIp(request));
  } catch { /* non bloquant */ }

  const day = generatedAt.toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="membres-garden-of-alliance-${day}.xlsx"`,
      "Cache-Control": "no-store",
      "X-Export-Count": String(rows.length),
    },
  });
}
