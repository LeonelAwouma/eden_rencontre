"use client";

/**
 * Dépendances NAVIGATEUR réelles du déroulé de déconnexion (`logout-flow.ts`).
 *
 * Aucun jeton n'est journalisé, stocké ou placé dans une URL : le Bearer n'existe que dans la mémoire de l'opération.
 */
import { supabase } from "./supabase";
import { announceLogout } from "./logout-broadcast";
import type { DeleteAttempt, LogoutFlowDeps } from "./logout-flow";
import { LOGOUT_STATE_KEY, type StoredLogoutState } from "./coach/logout-outcome";

/** Clés de session du client Supabase (la clé de stockage dépend du projet : on la reconnaît par son motif). */
const SESSION_KEY_PATTERN = /^sb-.+-auth-token(-code-verifier)?$/;

function sessionKeys(): string[] {
  try {
    return Object.keys(window.localStorage).filter((k) => SESSION_KEY_PATTERN.test(k));
  } catch {
    return [];
  }
}

/** Échéance des appels du SDK : hors ligne avec un jeton expiré, auth-js réessaie le rafraîchissement avec un backoff de ~25 s. */
export const SDK_DEADLINE_MS = 4000;
const REQUEST_DEADLINE_MS = 15000;

function withDeadline<T>(work: Promise<T>, fallback: T, ms = SDK_DEADLINE_MS): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work.then((v) => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(fallback); });
  });
}

export async function deleteSessionRequest(bearer: string | null): Promise<DeleteAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_DEADLINE_MS);
  try {
    const res = await fetch("/api/auth/session", {
      signal: controller.signal,
      method: "DELETE",
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
      credentials: "same-origin",
      cache: "no-store",
    });
    let body: unknown = null;
    try { body = await res.json(); } catch { /* corps illisible : le contrat le traite comme non confirmé */ }
    return { status: res.status, body };
  } catch {
    return "network_error"; // hors ligne, ou réponse perdue
  } finally {
    clearTimeout(timer);
  }
}

export function saveLogoutState(state: StoredLogoutState | null): void {
  try {
    if (state) window.sessionStorage.setItem(LOGOUT_STATE_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(LOGOUT_STATE_KEY);
  } catch { /* stockage indisponible : l'avertissement ne sera simplement pas affiché */ }
}

export function readLogoutState(): string | null {
  try { return window.sessionStorage.getItem(LOGOUT_STATE_KEY); } catch { return null; }
}

export function browserLogoutDeps(): LogoutFlowDeps {
  return {
    getBearer: () => withDeadline((async () => (await supabase?.auth.getSession())?.data.session?.access_token ?? null)(), null),
    deleteSession: deleteSessionRequest,
    signOutLocal: () => withDeadline(Promise.resolve(supabase ? supabase.auth.signOut({ scope: "local" }) : { error: null }), { error: "signOut_deadline" as unknown }),
    localSessionPresent: async () => {
      if (sessionKeys().some((k) => !k.endsWith("-code-verifier"))) return true;
      // Le client peut garder un verrou interne tant qu'un rafraîchissement échoue : échéance, jamais d'attente illimitée.
      const session = await withDeadline((async () => (await supabase?.auth.getSession())?.data.session ?? null)(), null);
      return Boolean(session);
    },
    forceClearLocal: () => {
      for (const k of sessionKeys()) {
        try { window.localStorage.removeItem(k); } catch { /* stockage indisponible */ }
      }
    },
    announce: () => announceLogout(),
    isOnline: () => typeof navigator === "undefined" || navigator.onLine !== false,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    saveState: saveLogoutState,
  };
}
