// POST /api/referrals/activate — activation VOLONTAIRE d'un crédit GOLD en
// réserve, à la demande explicite du membre (bouton « Activer mes jours GOLD
// maintenant »). Refusé si aucun crédit n'est en réserve, ou si une période
// gratuite est déjà en cours (rien à activer : l'accès est déjà gratuit).

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { reconcileAndGetEffectiveSubscription, getEffectiveSubscription } from "@/lib/subscription/effective";

export async function POST(request: NextRequest) {
  const user = await getApprovedUser(request);
  if (!user) return NextResponse.json({ error: "Session expirée ou compte non approuvé." }, { status: 401 });

  const db = getSupabaseAdmin();
  const before = await getEffectiveSubscription(db, user.id);
  if (before.queuedCreditsDays <= 0) {
    return NextResponse.json({ error: "Aucun crédit GOLD en réserve." }, { status: 409 });
  }
  if (before.source === "launch_promo" || before.source === "discovery") {
    return NextResponse.json({ error: "Vous bénéficiez déjà d'un accès gratuit — votre crédit reste en réserve pour plus tard." }, { status: 409 });
  }

  const after = await reconcileAndGetEffectiveSubscription(db, user.id);
  return NextResponse.json({ tier: after.tier, source: after.source, goldUntil: after.goldUntil });
}
