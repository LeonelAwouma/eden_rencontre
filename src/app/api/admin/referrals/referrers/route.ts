// GET /api/admin/referrals/referrers?search=&page=&limit= — table des
// parrains, paginée côté serveur (même convention que /api/admin/users).
// PII (nom, pseudo, avatar) visible : réservé à l'admin.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // Un parrain = un titulaire de referral_codes (code créé à la volée dès
    // son premier appel à /api/referrals/code), avec ou sans filleul encore.
    let codesQuery = db.from("referral_codes").select("user_id, code, created_at", { count: "exact" });
    if (search) codesQuery = codesQuery.ilike("code", `%${search}%`);
    const { data: codes, count } = await codesQuery.order("created_at", { ascending: true });

    let userIds = (codes || []).map((c) => c.user_id as string);
    let codeByUser = new Map((codes || []).map((c) => [c.user_id as string, c.code as string]));

    if (search && userIds.length === 0) {
      // Recherche aussi par nom/pseudo du parrain.
      const { data: profiles } = await db.from("profiles").select("id").or(`name.ilike.%${search}%,pseudo.ilike.%${search}%`);
      userIds = (profiles || []).map((p) => p.id as string);
      if (userIds.length) {
        const { data: theirCodes } = await db.from("referral_codes").select("user_id, code").in("user_id", userIds);
        codeByUser = new Map((theirCodes || []).map((c) => [c.user_id as string, c.code as string]));
      }
    }

    const total = search ? userIds.length : count || 0;
    const pageIds = userIds.slice((page - 1) * limit, page * limit);
    if (pageIds.length === 0) {
      return NextResponse.json({ referrers: [], total, page, limit, totalPages: Math.ceil(total / limit) });
    }

    const { data: profiles } = await db.from("profiles").select("id, name, pseudo, avatar_url, status").in("id", pageIds);
    const profileById = new Map((profiles || []).map((p) => [p.id as string, p]));

    const { data: referrals } = await db.from("referrals").select("referrer_id, status, created_at").in("referrer_id", pageIds);
    const { data: rewards } = await db.from("referral_rewards").select("user_id, status").in("user_id", pageIds);

    const referrers = pageIds.map((id) => {
      const profile = profileById.get(id);
      const theirReferrals = (referrals || []).filter((r) => r.referrer_id === id);
      const theirRewards = (rewards || []).filter((r) => r.user_id === id);
      const firstActivity = theirReferrals.reduce<string | null>((min, r) => (!min || r.created_at < min ? r.created_at : min), null);
      return {
        userId: id,
        name: profile?.name || null,
        pseudo: profile?.pseudo || null,
        avatarUrl: profile?.avatar_url || null,
        accountStatus: profile?.status || null,
        code: codeByUser.get(id) || null,
        totalReferred: theirReferrals.length,
        validatedCount: theirReferrals.filter((r) => r.status === "validated").length,
        pendingCount: theirReferrals.filter((r) => r.status === "pending" || r.status === "under_review").length,
        rewardsCount: theirRewards.length,
        firstActivityAt: firstActivity,
      };
    });

    return NextResponse.json({ referrers, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    console.error("Admin referrers list error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
