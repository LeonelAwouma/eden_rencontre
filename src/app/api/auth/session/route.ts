import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/api-auth";
import { getActiveCoachByUserId } from "@/lib/coach-auth";
import { checkLogoutOrigin } from "@/lib/coach/origin-guard";
import {
  REVOKE_PENDING_A, REVOKE_PENDING_A_REFRESH, REVOKE_PENDING_B, REVOKE_PENDING_MAX_SECONDS, REVOKE_PENDING_PATH,
  isLogoutConfirmed, type LogoutResponse, type Outcome,
} from "@/lib/coach/logout-outcome";
import { verifyAccessToken } from "@/lib/coach/auth-ops";
import { reconcileOldSession, revokeCredentials, type Credentials } from "@/lib/coach/revoke-session";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieMaxAgeFor } from "@/lib/coach/session-cookie";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

const isProd = () => process.env.NODE_ENV === "production";
const baseCookie = (path: string) => ({ httpOnly: true, secure: isProd(), sameSite: "lax" as const, path });
/** Cookies de nouvelle tentative : SameSite=Strict, aucun attribut Domain, chemin dédié (invisibles ailleurs). */
const pendingCookie = () => ({ httpOnly: true, secure: isProd(), sameSite: "strict" as const, path: REVOKE_PENDING_PATH });

const bearerOf = (req: NextRequest): string | null => {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
};

/**
 * POST /api/auth/session — ré-établit le cookie de session lu par la garde serveur de `/coach`.
 *
 * La session du navigateur (localStorage, « B ») n'accompagne pas une navigation de page ; le cookie posé à la
 * connexion (session serveur « A ») expire avec le jeton. Cette route lit le jeton de l'en-tête `Authorization`
 * UNIQUEMENT (jamais un cookie : une requête inter-sites ne peut pas le fournir, d'où l'absence de risque CSRF), le
 * fait vérifier par le service d'authentification, puis n'écrit le cookie que si le compte est un COACH ACTIF.
 *
 * Réconciliation A/B : remplacer le cookie de A par le jeton de B laisserait A active sans suivi. Avant de remplacer
 * le cookie, l'ancienne session est donc traitée EXPLICITEMENT : révoquée (scope local) si elle diffère de B ; non
 * touchée si c'est la même session (synchronisations suivantes). Identité de session incertaine ⇒ jamais « identique ».
 * Si la révocation de l'ancienne session est impossible pour cause temporaire, le cookie ancien est CONSERVÉ tel quel
 * et la réponse (503) permet une nouvelle tentative ; le nouveau cookie n'est pas posé.
 */
export async function POST(req: NextRequest) {
  const token = bearerOf(req);
  if (!token) return json({ ok: false }, 401);

  const verified = await verifyAccessToken(token);
  if (verified.state !== "valid") return json({ ok: false }, 401);
  const userId = verified.userId;

  const coach = await getActiveCoachByUserId(userId);
  if (!coach) return json({ ok: false }, 403); // aucun cookie pour un membre, un coach inactif ou une panne de lecture

  const maxAge = cookieMaxAgeFor(token);
  if (maxAge === null) return json({ ok: false }, 401);

  const oldAccess = req.cookies.get(ACCESS_COOKIE)?.value ?? "";
  const oldRefresh = req.cookies.get(REFRESH_COOKIE)?.value ?? "";
  let oldSession: Outcome | "none" | "same_session" = "none";
  let clearRefresh = false;

  if (oldAccess || oldRefresh) {
    const r = await reconcileOldSession({ oldAccess, oldRefresh, bearer: { token, userId, sessionId: verified.sessionId } });
    if (r.outcome === "identity_mismatch") return json({ ok: false, error: "identity_mismatch" }, 409); // aucune révocation croisée
    oldSession = r.outcome;
    if (r.outcome === "temporary" || r.outcome === "refresh_rotation_unconfirmed" || r.outcome === "failed") {
      // Ancienne session non traitée : cookie ancien conservé, nouveau cookie non posé, nouvelle tentative possible.
      return json({ ok: false, oldSession: r.outcome }, r.outcome === "failed" ? 502 : 503);
    }
    clearRefresh = true; // révoquée, déjà révoquée, même session, ou credential déclaré inutilisable par le service Auth
  }

  const res = json({ ok: true, oldSession });
  res.cookies.set(ACCESS_COOKIE, token, { ...baseCookie("/"), maxAge });
  if (clearRefresh) res.cookies.set(REFRESH_COOKIE, "", { ...baseCookie("/"), maxAge: 0 });
  return res;
}

/** Durée d'un cookie de nouvelle tentative : ≤ 120 s, et jamais au-delà de la validité du jeton ; null si expiré. */
const pendingMaxAge = (jwt: string | null): number | null => {
  if (!jwt) return null;
  const left = cookieMaxAgeFor(jwt);
  return left === null ? null : Math.min(left, REVOKE_PENDING_MAX_SECONDS);
};

const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_USER = 10;
const ATTEMPT_WINDOW_SECONDS = 300;

const emptyLegs: { cookie: Outcome; bearer: Outcome } = { cookie: "temporary", bearer: "temporary" };

function refused(status: number, extra: Partial<LogoutResponse> = {}) {
  const body: LogoutResponse = {
    confirmed: false, legs: emptyLegs, serverCookieClearIssued: false, pendingRetry: false, deduplicated: false, rateLimited: false, ...extra,
  };
  return json(body, status);
}

/**
 * DELETE /api/auth/session — RÉVOCATION de session. Ce n'est PAS un endpoint d'autorisation d'accès à l'espace Coach :
 * il n'appelle ni `requireActiveCoach` ni la vérification de session active, afin qu'un Coach suspendu, une session
 * déjà révoquée ou un compte Google sans cookie puissent toujours terminer leur déconnexion.
 *
 * Ordre : (1) origine (CSRF) ; (2) limiteur ; (3) credentials ; (4) révocation. Rien n'est lu ni révoqué avant (1).
 *
 * Branches : cookie A (`sb-access-token`, `sb-refresh-token`, cookies de nouvelle tentative A) et Bearer B (+ cookie
 * de nouvelle tentative B). La réponse décrit PAR BRANCHE ce qui est prouvé ; le statut HTTP n'est pas la preuve.
 *
 * Cookies : `sb-access-token` est effacé dès qu'une tentative autorisée commence ; `sb-refresh-token` n'est effacé que
 * si la branche est confirmée, déclarée inutilisable, ou si sa valeur est TRANSFÉRÉE dans la même réponse vers un
 * cookie HttpOnly de nouvelle tentative (SameSite=Strict, Path=/api/auth/session, ≤ 120 s, sans attribut Domain).
 * Aucun jeton, refresh token, cookie ni en-tête Authorization n'est journalisé.
 */
export async function DELETE(req: NextRequest) {
  const origin = checkLogoutOrigin({
    origin: req.headers.get("origin"),
    secFetchSite: req.headers.get("sec-fetch-site"),
    host: req.headers.get("host"),
    forwardedHost: req.headers.get("x-forwarded-host"),
  });
  if (!origin.ok) return refused(403);

  const ip = clientIp(req);
  if (!(await checkRateLimit(`logout:ip:${ip}`, "logout_attempt", MAX_ATTEMPTS_PER_IP, ATTEMPT_WINDOW_SECONDS))) {
    return refused(429, { rateLimited: true }); // limiteur de l'application : aucune révocation, aucun cookie touché
  }

  const c = (name: string) => req.cookies.get(name)?.value ?? "";
  const bearer = bearerOf(req);
  const creds: Credentials = {
    cookieAccess: [c(ACCESS_COOKIE), c(REVOKE_PENDING_A)],
    cookieRefresh: [c(REFRESH_COOKIE), c(REVOKE_PENDING_A_REFRESH)],
    bearer: [bearer ?? "", c(REVOKE_PENDING_B)],
  };
  const anyCredential = [...creds.cookieAccess, ...creds.cookieRefresh, ...creds.bearer].some(Boolean);
  if (anyCredential) await recordRateLimit(`logout:ip:${ip}`, "logout_attempt");

  const result = await revokeCredentials(creds, {
    gate: async (userIds) => {
      for (const id of userIds) {
        if (!(await checkRateLimit(`logout:uid:${id}`, "logout_attempt", MAX_ATTEMPTS_PER_USER, ATTEMPT_WINDOW_SECONDS))) return false;
      }
      await Promise.all(userIds.map((id) => recordRateLimit(`logout:uid:${id}`, "logout_attempt")));
      return true;
    },
  });
  if (result.rateLimited) return refused(429, { rateLimited: true });

  const { cookie, bearer: b } = result;
  const confirmedA = cookie.outcome === "revoked" || cookie.outcome === "already_revoked" || cookie.outcome === "no_cookie";
  const confirmedB = b.outcome === "revoked" || b.outcome === "already_revoked";

  // Instructions de cookies collectées, puis appliquées sur la réponse finale (statut et corps définitifs).
  type Op = { name: string; value: string; options: Record<string, unknown> };
  const ops: Op[] = [];
  // Instructions de suppression ÉMISES (leur application côté navigateur n'est pas vérifiable pour un cookie HttpOnly).
  ops.push({ name: ACCESS_COOKIE, value: "", options: { ...baseCookie("/"), maxAge: 0 } });

  let pendingRetry = false;
  const setPending = (name: string, value: string | null, maxAge: number | null) => {
    if (value && maxAge !== null && maxAge > 0) { ops.push({ name, value, options: { ...pendingCookie(), maxAge } }); pendingRetry = true; }
    else ops.push({ name, value: "", options: { ...pendingCookie(), maxAge: 0 } });
  };

  // Branche A.
  setPending(REVOKE_PENDING_A, confirmedA ? null : cookie.retainAccess, pendingMaxAge(cookie.retainAccess));
  const refreshA = !confirmedA && cookie.retainRefresh ? cookie.retainRefresh : null;
  setPending(REVOKE_PENDING_A_REFRESH, refreshA, refreshA ? REVOKE_PENDING_MAX_SECONDS : null);
  // `sb-refresh-token` : effacé seulement si absent, confirmé, déclaré inutilisable, ou TRANSFÉRÉ dans cette même réponse.
  if (c(REFRESH_COOKIE) === "" || confirmedA || cookie.outcome === "invalid_token" || refreshA !== null) {
    ops.push({ name: REFRESH_COOKIE, value: "", options: { ...baseCookie("/"), maxAge: 0 } });
  }
  // Branche B.
  setPending(REVOKE_PENDING_B, confirmedB ? null : b.retainAccess, pendingMaxAge(b.retainAccess));

  const legs = { cookie: cookie.outcome, bearer: b.outcome };
  const body: LogoutResponse = {
    confirmed: isLogoutConfirmed(legs),
    legs,
    serverCookieClearIssued: true,
    pendingRetry,
    deduplicated: result.deduplicated,
    rateLimited: false,
  };
  const res = json(body, pendingRetry ? 503 : 200);
  for (const op of ops) res.cookies.set(op.name, op.value, op.options);
  return res;
}
