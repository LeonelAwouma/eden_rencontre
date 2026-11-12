import { NextRequest, NextResponse } from "next/server";
import { requireApprovedMember } from "@/lib/api-auth";
import { toMemberAssignmentDto } from "@/lib/coach/dto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/member/coach — l'accompagnement du membre connecté.
 * L'identité vient UNIQUEMENT de la session : aucun paramètre ne désigne un autre membre.
 * Renvoie le dossier en attente ou actif (s'il existe) et les derniers dossiers clos.
 */
export async function GET(req: NextRequest) {
  const user = await requireApprovedMember(req);
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: NO_STORE });

  const db = getSupabaseAdmin();
  const { data, error } = await db.from("coach_member_assignments")
    .select("id, coach_id, status, consent_status, assigned_at, consent_at, ended_at")
    .eq("member_id", user.id).order("assigned_at", { ascending: false }).limit(10);
  if (error) return NextResponse.json({ error: "Impossible de consulter l'accompagnement." }, { status: 500, headers: NO_STORE });

  const rows = data || [];
  const coachIds = [...new Set(rows.map((r) => r.coach_id as string))];
  const names = new Map<string, string | null>();
  const avatars = new Map<string, string | null>();
  if (coachIds.length) {
    const { data: coaches } = await db.from("coach_accounts").select("user_id, display_name").in("user_id", coachIds);
    for (const c of coaches || []) names.set(c.user_id as string, (c.display_name as string | null) ?? null);
    // Photo du coach : colonne explicite, uniquement pour les coachs de CE membre (jamais de select("*")).
    const { data: photos } = await db.from("profiles").select("id, avatar_url").in("id", coachIds);
    for (const p of photos || []) avatars.set(p.id as string, (p.avatar_url as string | null) ?? null);
  }
  const dtos = rows.map((r) => toMemberAssignmentDto(r, names.get(r.coach_id as string) ?? null, avatars.get(r.coach_id as string) ?? null));
  const current = dtos.find((d) => d.status === "pending" || d.status === "active") ?? null;
  return NextResponse.json({ current, history: dtos.filter((d) => d !== current) }, { headers: NO_STORE });
}
