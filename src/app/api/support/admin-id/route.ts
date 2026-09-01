/**
 * GET /api/support/admin-id
 *
 * Returns the shared "Admin" system account's user id, creating it on first
 * call if it doesn't exist yet. Used by regular users to start a conversation
 * with the admin team from their dashboard (see contactAdmin() in chat.ts).
 * No user-specific data is touched or returned here.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ensureAdminSystemUser, ensureAdminProfile, ADMIN_PROFILE_NAME } from "@/lib/admin-system-user";

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
