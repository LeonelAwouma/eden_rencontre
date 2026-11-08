/**
 * Diffusion de la déconnexion aux AUTRES onglets du même navigateur.
 *
 * Quand `signOut()` réussit, auth-js prévient lui-même les autres instances du client. Mais après un nettoyage de
 * secours (suppression manuelle de la clé de stockage), rien n'est diffusé : retirer une entrée de localStorage ne
 * prouve pas que les autres onglets ont reçu `SIGNED_OUT`. On publie donc un signal explicite
 * (BroadcastChannel + repli sur l'événement `storage`), et chaque onglet privé revient à la page de connexion.
 *
 * Aucun jeton n'est jamais diffusé : le signal ne contient que l'heure.
 */
export const LOGOUT_CHANNEL = "eden-logout";
export const LOGOUT_SIGNAL_KEY = "eden-logout-signal";

export interface BroadcastEnv {
  createChannel?: (name: string) => { postMessage: (m: unknown) => void; close: () => void; onmessage: ((e: unknown) => void) | null } | null;
  storage?: { setItem: (k: string, v: string) => void } | null;
  now?: () => number;
}

export function announceLogout(env: BroadcastEnv = browserEnv()): void {
  try {
    const channel = env.createChannel?.(LOGOUT_CHANNEL);
    channel?.postMessage({ at: (env.now ?? Date.now)() });
    channel?.close();
  } catch { /* canal indisponible : le repli storage prend le relais */ }
  try { env.storage?.setItem(LOGOUT_SIGNAL_KEY, String((env.now ?? Date.now)())); } catch { /* stockage indisponible */ }
}

export interface ListenEnv {
  createChannel?: BroadcastEnv["createChannel"];
  addStorageListener?: (fn: (e: { key: string | null }) => void) => void;
  removeStorageListener?: (fn: (e: { key: string | null }) => void) => void;
}

/** Écoute le signal ; retourne le nettoyage (fermeture du canal, retrait de l'écouteur). */
export function listenForLogout(onLogout: () => void, env: ListenEnv = browserListenEnv()): () => void {
  let channel: ReturnType<NonNullable<BroadcastEnv["createChannel"]>> = null;
  try {
    channel = env.createChannel?.(LOGOUT_CHANNEL) ?? null;
    if (channel) channel.onmessage = () => onLogout();
  } catch { channel = null; }
  const onStorage = (e: { key: string | null }) => { if (e.key === LOGOUT_SIGNAL_KEY) onLogout(); };
  env.addStorageListener?.(onStorage);
  return () => {
    try { channel?.close(); } catch { /* déjà fermé */ }
    env.removeStorageListener?.(onStorage);
  };
}

function browserEnv(): BroadcastEnv {
  if (typeof window === "undefined") return {};
  return {
    createChannel: typeof BroadcastChannel === "undefined" ? undefined : (n) => new BroadcastChannel(n) as never,
    storage: (() => { try { return window.localStorage; } catch { return null; } })(),
  };
}

function browserListenEnv(): ListenEnv {
  if (typeof window === "undefined") return {};
  return {
    createChannel: typeof BroadcastChannel === "undefined" ? undefined : (n) => new BroadcastChannel(n) as never,
    addStorageListener: (fn) => window.addEventListener("storage", fn as never),
    removeStorageListener: (fn) => window.removeEventListener("storage", fn as never),
  };
}

/** Pages réservées aux comptes connectés : seules à être quittées quand un autre onglet se déconnecte. */
export const PRIVATE_PREFIXES = ["/dashboard", "/coach", "/onboarding", "/reunion", "/searching", "/register/pending"];
export const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
