/**
 * Déroulé de la déconnexion côté navigateur, avec dépendances injectées (testable sans navigateur).
 *
 * Quatre faits INDÉPENDANTS, jamais confondus :
 *  - `serverCookieClearIssued` : le serveur a émis les instructions de suppression des cookies ;
 *  - `refreshTokenRevocationConfirmed` : preuve explicite de révocation pour CHAQUE session (corps de la réponse,
 *    jamais le seul statut HTTP) ;
 *  - `localSessionCleared` : stockage Supabase du navigateur effectivement vide APRÈS coup ;
 *  - `accessTokenRejected` : jamais déclaré ici.
 *
 * Ordre : (1) le Bearer B est capturé EN MÉMOIRE de l'opération (jamais journalisé, jamais stocké) ; (2) DELETE
 * serveur : révocation de A (cookies) et de B (Bearer), avec UNE nouvelle tentative avec le même Bearer si la
 * réponse est perdue ; (3) nettoyage local, de secours si `signOut` échoue ; (4) diffusion aux autres onglets.
 * Un nettoyage local réussi n'est JAMAIS une preuve de révocation serveur.
 */
import {
  isLogoutConfirmed, mergeRetryLegs, parseLogoutResponse, parseStoredLogoutState,
  type LogoutFacts, type LogoutResponse, type StoredLogoutState,
} from "@/lib/coach/logout-outcome";
import { markLoggingOut } from "@/lib/logout-state";

export type DeleteAttempt = { status: number; body: unknown } | "network_error";

export interface LogoutFlowDeps {
  /** Jeton d'accès courant du navigateur (rafraîchi si besoin) ; null si aucun ou injoignable. */
  getBearer: () => Promise<string | null>;
  deleteSession: (bearer: string | null) => Promise<DeleteAttempt>;
  /** `supabase.auth.signOut({ scope: "local" })` — l'erreur éventuelle est remontée, jamais avalée. */
  signOutLocal: () => Promise<{ error: unknown | null }>;
  /** La session locale existe-t-elle encore (API du client ET clé de stockage) ? */
  localSessionPresent: () => Promise<boolean>;
  /** Suppression manuelle des clés de stockage Supabase (nettoyage de secours). */
  forceClearLocal: () => void;
  announce: () => void;
  isOnline: () => boolean;
  sleep: (ms: number) => Promise<void>;
  saveState: (state: StoredLogoutState | null) => void;
}

export interface LogoutOutcomeFacts extends LogoutFacts {
  /** Le nettoyage de secours a été nécessaire : l'appelant doit recharger la page (état en mémoire à purger). */
  manualLocalCleanup: boolean;
  /** Nombre de requêtes DELETE envoyées (1 ou 2, jamais plus). */
  deleteAttempts: number;
}

export const CLIENT_RETRY_DELAY_MS = 500;

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try { return await fn(); } catch { return fallback; }
};

function interpret(attempt: DeleteAttempt): { response: LogoutResponse | null; retryable: boolean } {
  if (attempt === "network_error") return { response: null, retryable: true };
  const parsed = parseLogoutResponse(attempt.body);
  if (parsed.kind === "response") return { response: parsed.response, retryable: false };
  // Corps absent ou illisible : une erreur de passerelle (5xx) peut être transitoire ; 403/429 non.
  return { response: null, retryable: attempt.status >= 500 };
}

export async function performLogout(deps: LogoutFlowDeps): Promise<LogoutOutcomeFacts> {
  markLoggingOut(); // plus aucune synchronisation de cookie à partir d'ici
  let bearer: string | null = null;
  try {
    bearer = await safe(deps.getBearer, null);

    let attempts = 1;
    let attempt = await safe(() => deps.deleteSession(bearer), "network_error" as DeleteAttempt);
    let seen = interpret(attempt);
    if (!seen.response && seen.retryable && deps.isOnline()) {
      await deps.sleep(CLIENT_RETRY_DELAY_MS);
      attempts = 2;
      attempt = await safe(() => deps.deleteSession(bearer), "network_error" as DeleteAttempt);
      seen = interpret(attempt);
    }

    // Nettoyage local : toujours tenté, même si le serveur est injoignable.
    await safe(deps.signOutLocal, { error: "signOut_threw" as unknown });
    let present = await safe(deps.localSessionPresent, true);
    let manual = false;
    if (present) {
      deps.forceClearLocal();
      manual = true;
      present = await safe(deps.localSessionPresent, true);
    }
    deps.announce();

    const response = seen.response;
    const facts: LogoutOutcomeFacts = {
      localSessionCleared: !present,
      serverCookieClearIssued: response?.serverCookieClearIssued === true,
      refreshTokenRevocationConfirmed: response?.confirmed === true,
      accessTokenRejected: false,
      legs: response?.legs ?? null,
      rateLimited: response?.rateLimited === true,
      pendingRetry: response?.pendingRetry === true,
      manualLocalCleanup: manual,
      deleteAttempts: attempts,
    };
    deps.saveState(facts.refreshTokenRevocationConfirmed ? null : {
      legs: facts.legs ?? { cookie: "temporary", bearer: "temporary" },
      pendingRetry: facts.pendingRetry,
      rateLimited: facts.rateLimited,
    });
    return facts;
  } finally {
    bearer = null; // jamais conservé au-delà de l'opération
  }
}

/** Résultat d'une nouvelle tentative explicite (bouton « Réessayer » de la page de connexion). */
export interface RetryResult {
  confirmed: boolean;
  state: StoredLogoutState | null;
  /** Aucune réponse exploitable (réseau, corps illisible) : rien n'est prouvé. */
  unconfirmed: boolean;
}

/**
 * UNE tentative explicite : un seul DELETE, sans Bearer (la session locale est déjà détruite) — le serveur utilise
 * les cookies de nouvelle tentative encore présents. Fusion branche par branche avec l'état précédent.
 */
export async function retryLogoutRevocation(
  deps: Pick<LogoutFlowDeps, "deleteSession" | "saveState">,
  previousRaw: string | null
): Promise<RetryResult> {
  const prev = parseStoredLogoutState(previousRaw);
  const attempt = await safe(() => deps.deleteSession(null), "network_error" as DeleteAttempt);
  const { response } = interpret(attempt);
  if (!response) return { confirmed: false, state: prev, unconfirmed: true };
  const legs = prev ? mergeRetryLegs(prev.legs, response.legs) : response.legs;
  const confirmed = !response.rateLimited && isLogoutConfirmed(legs);
  const state: StoredLogoutState | null = confirmed ? null : { legs, pendingRetry: response.pendingRetry, rateLimited: response.rateLimited };
  deps.saveState(state);
  return { confirmed, state, unconfirmed: false };
}
