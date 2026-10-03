/**
 * GET /api/support/admin-id
 *
 * Returns the shared "Admin" system account's user id, creating it on first
 * call if it doesn't exist yet. Used by regular users to start a conversation
 * with the admin team from their dashboard (see contactAdmin() in chat.ts).
 * No user-specific data is touched or returned here.
 *
 * POST /api/support/admin-id — membre approuvé (jeton Bearer)
 *
 * Ouvre (ou retrouve) la conversation du membre avec l'Admin et renvoie son id.
 * L'alliance acceptée membre ↔ Admin, nécessaire pour écrire, est créée ici avec
 * la clé de service : la RLS interdit désormais à un membre de créer lui-même
 * une alliance déjà acceptée (supabase/migrations/20261003_security_hardening.sql).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { ensureAdminSystemUser, ensureAdminProfile, getAdminAccountId, getOrCreateAdminConversation, ADMIN_PROFILE_NAME } from "@/lib/admin-system-user";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const adminId = await ensureAdminSystemUser(supabase);
    await ensureAdminProfile(supabase, adminId);
    return NextResponse.json({ id: adminId, name: ADMIN_PROFILE_NAME });
  } catch (err) {
    console.error("[Support Admin ID] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getApprovedUser(req);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const adminId = await getAdminAccountId(supabase);
    if (adminId === user.id) return NextResponse.json({ error: "Action impossible." }, { status: 400 });
    const conversationId = await getOrCreateAdminConversation(supabase, adminId, user.id);
    return NextResponse.json({ id: adminId, conversationId });
  } catch (err) {
    console.error("[Support Admin ID] Error:", err);
    return NextResponse.json({ error: "Une erreur inattendue est survenue" }, { status: 500 });
  }
}
