/**
 * Opérations d'authentification SERVEUR utilisées par la révocation de session. Fine enveloppe autour du SDK
 * (`@supabase/supabase-js` / auth-js 2.108.2), isolée pour être remplacée dans les tests de route.
 *
 * Aucun jeton, refresh token, en-tête ni cookie n'est journalisé ici.
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sessionIdOfVerifiedToken } from "@/lib/session-guard";
import type { AuthErrorLike } from "@/lib/coach/logout-outcome";

export type VerifyResult =
  /** Jeton authentifié par le service Auth (`getUser`) : l'identité de session est alors fiable. */
  | { state: "valid"; userId: string; sessionId: string | null }
  /** Refusé par le service Auth (expiré, signature, session inconnue…) : AUCUNE identité de session vérifiée. */
  | { state: "invalid" }
  /** Service injoignable : on ne sait pas. */
  | { state: "unavailable" };

export async function verifyAccessToken(jwt: string): Promise<VerifyResult> {
  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(jwt);
    if (data?.user?.id) return { state: "valid", userId: data.user.id, sessionId: sessionIdOfVerifiedToken(jwt) };
    const e = error as AuthErrorLike | null;
    if (e && (e.name === "AuthRetryableFetchError" || e.status === undefined || e.status === 0 || e.status >= 500 || e.status === 429)) {
      return { state: "unavailable" };
    }
    return { state: "invalid" };
  } catch {
    return { state: "unavailable" };
  }
}

/** `auth.admin.signOut(jwt, "local")` — scope EXPLICITE, jamais `global` ni `others`. */
export async function adminSignOutLocal(jwt: string): Promise<AuthErrorLike | null> {
  try {
    const { error } = await getSupabaseAdmin().auth.admin.signOut(jwt, "local");
    return (error as AuthErrorLike | null) ?? null;
  } catch {
    return { name: "AuthRetryableFetchError", status: 0 };
  }
}

export const REFRESH_DEADLINE_MS = 5000;

export type RefreshResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: AuthErrorLike | null; timedOut: boolean };

/**
 * Récupération UNIQUE de l'access token d'une session à partir de son refresh token, avec un client TEMPORAIRE :
 * sans persistance, sans auto-refresh, sans détection d'URL. Le nouveau couple de jetons n'est jamais stocké.
 * Le SDK réessaie en interne (backoff) : on borne donc l'attente par une échéance ; un dépassement est signalé comme
 * `timedOut` (rotation incertaine), jamais comme un échec franc.
 */
export async function refreshAccessTokenOnce(refreshToken: string, deadlineMs = REFRESH_DEADLINE_MS): Promise<RefreshResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, error: { name: "ConfigError", status: 500 }, timedOut: false };
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), deadlineMs); });
  try {
    const outcome = await Promise.race([client.auth.refreshSession({ refresh_token: refreshToken }), timeout]);
    if (outcome === "timeout") return { ok: false, error: null, timedOut: true };
    const token = outcome.data?.session?.access_token;
    if (!outcome.error && token) return { ok: true, accessToken: token };
    return { ok: false, error: (outcome.error as AuthErrorLike | null) ?? null, timedOut: false };
  } catch {
    return { ok: false, error: { name: "AuthRetryableFetchError", status: 0 }, timedOut: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
