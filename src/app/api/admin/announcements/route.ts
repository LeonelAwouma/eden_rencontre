/**
 * GET /api/admin/announcements — registre des nouveautés avec statut calculé et compteurs.
 *
 * Lecture seule : le registre vit dans le code (src/lib/whats-new.ts), on ne l'édite pas ici.
 * Les compteurs sont des événements AGRÉGÉS, pas des utilisateurs uniques.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";
import { ANNOUNCEMENTS, effectiveExpiry } from "@/lib/whats-new";
import { describeStatus } from "@/lib/whats-new-server";
import { readTotals } from "@/lib/whats-new-store";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const totals = await readTotals(db);
  const now = Date.now();

  const announcements = await Promise.all(
    ANNOUNCEMENTS.map(async (a) => {
      const t = totals[a.id] ?? { views: 0, clicks: 0, dismissals: 0 };
      return {
        id: a.id,
        surface: a.surface,
        title: a.fr.title,
        active: a.active,
        availability: a.availability,
        href: a.href,
        navHref: a.navHref ?? null,
        activatesAt: a.activatesAt,
        expiresAt: new Date(effectiveExpiry(a)).toISOString(),
        // `userId: null` : on vérifie l'état de la fonctionnalité, pas l'accès d'un membre précis.
        status: await describeStatus(a, { db, userId: null }, now),
        views: t.views,
        clicks: t.clicks,
        dismissals: t.dismissals,
      };
    }),
  );

  return NextResponse.json({ announcements }, { headers: { "Cache-Control": "no-store" } });
}
