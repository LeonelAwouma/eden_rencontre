/**
 * GET /api/admin/users/search
 *
 * Lightweight user search for participant selection.
 * Returns only id, name, email, avatar_url.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    // Les caractères , ( ) % * \ ont un sens dans le filtre PostgREST : on les retire.
    const q = (searchParams.get("q") || "").replace(/[,()%*\\]/g, " ").trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 50);

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Par défaut : membres approuvés (choix de participants). scope=all : tous les
    // comptes, quel que soit leur statut (messagerie admin).
    const allStatuses = searchParams.get("scope") === "all";
    let query = db
      .from("profiles")
      .select("id, name, pseudo, email, avatar_url, status")
      .or(`name.ilike.%${q}%,pseudo.ilike.%${q}%,email.ilike.%${q}%`)
      .neq("email", ADMIN_SYSTEM_EMAIL);
    if (!allStatuses) query = query.eq("status", "approved");
    const { data: users, error } = await query.order("name", { ascending: true }).limit(limit);

    if (error) {
      console.error("[Admin Users Search] Error:", error);
      return NextResponse.json({ users: [] });
    }

    return NextResponse.json({ users: users || [] });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("[Admin Users Search] Unexpected error:", err);
    return NextResponse.json({ users: [] });
  }
}