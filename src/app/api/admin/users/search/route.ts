/**
 * GET /api/admin/users/search
 *
 * Lightweight user search for participant selection.
 * Returns only id, name, email, avatar_url.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const { data: users, error } = await db
      .from("profiles")
      .select("id, name, email, avatar_url")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .eq("status", "approved")
      .order("name", { ascending: true })
      .limit(limit);

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