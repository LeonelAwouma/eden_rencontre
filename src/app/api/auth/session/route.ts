import { NextRequest, NextResponse } from "next/server";
import { getActiveCoachByUserId } from "@/lib/coach-auth";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieMaxAgeFor } from "@/lib/coach/session-cookie";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/auth/session — ré-établit le cookie de session lu par la garde serveur de `/coach`.
 *
 * La session du navigateur (localStorage) n'accompagne pas une navigation de page ; le cookie posé à la connexion
 * expire avec le jeton. Cette route lit le jeton de l'en-tête `Authorization` UNIQUEMENT (jamais un cookie : une
 * requête inter-sites ne peut pas le fournir, d'où l'absence de risque CSRF), le fait vérifier par le service
 * d'authentification, puis n'écrit le cookie que si le compte est un COACH ACTIF (mêmes règles que les API Coach).
 * Le cookie contient exactement le jeton vérifié, avec une durée bornée à sa validité restante (≤ 1 h).
 */
export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return json({ ok: false }, 401);
  const token = header.slice(7).trim();
  if (!token) return json({ ok: false }, 401);

  let userId: string | null = null;
  try {
    const { data } = await getSupabaseAdmin().auth.getUser(token);
    userId = data?.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return json({ ok: false }, 401);

  const coach = await getActiveCoachByUserId(userId);
  if (!coach) return json({ ok: false }, 403); // aucun cookie pour un membre, un coach inactif ou une panne de lecture

  const maxAge = cookieMaxAgeFor(token);
  if (maxAge === null) return json({ ok: false }, 401);

  const res = json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}

/**
 * DELETE /api/auth/session — déconnexion côté serveur : efface les cookies de session `httpOnly`.
 * Sans cela, le cookie posé à la connexion resterait valide (≈ 1 h) après « Se déconnecter » : la garde serveur
 * de `/coach` et les API acceptant le cookie continueraient de reconnaître l'utilisateur. Idempotent ; la méthode
 * DELETE exige une pré-vérification CORS, donc une page tierce ne peut pas déclencher la déconnexion.
 */
export async function DELETE() {
  const res = json({ ok: true });
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE]) {
    res.cookies.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}
