/**
 * GET /api/announcements?surface=public|member|admin
 *
 * Renvoie les annonces « Nouveautés » à présenter à l'appelant : actives, dans leur
 * fenêtre de dates ET réellement disponibles pour lui (résolveurs serveur). Pour un
 * membre, chaque annonce porte son état (`dismissed` / `discovered`) lu en base.
 *
 * L'audience n'est jamais crue sur parole : `member` exige un compte approuvé
 * (jeton Bearer), `admin` exige la session administrateur. `public` est ouvert et ne
 * renvoie que des annonces destinées aux visiteurs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getApprovedUser } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { listLive, toView } from "@/lib/whats-new-server";
import { readStates } from "@/lib/whats-new-store";
import type { Surface } from "@/lib/whats-new";

const SURFACES: readonly Surface[] = ["public", "member", "admin"];
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const surface = request.nextUrl.searchParams.get("surface") as Surface | null;
  if (!surface || !SURFACES.includes(surface)) {
    return NextResponse.json({ error: "Surface invalide." }, { status: 400, headers: NO_STORE });
  }

  let userId: string | null = null;
  if (surface === "member") {
    const user = await getApprovedUser(request);
    if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401, headers: NO_STORE });
    userId = user.id;
  } else if (surface === "admin") {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401, headers: NO_STORE });
  }

  try {
    const db = getSupabaseAdmin();
    const live = await listLive(surface, { db, userId });
    const states = userId ? await readStates(db, userId) : {};
    return NextResponse.json(
      { announcements: live.map((a) => toView(a, states[a.id])) },
      { headers: NO_STORE },
    );
  } catch (err) {
    // Une panne ne doit jamais casser la page : aucune annonce vaut mieux qu'une erreur.
    console.error("[announcements]", err instanceof Error ? err.message : err);
    return NextResponse.json({ announcements: [] }, { headers: NO_STORE });
  }
}
