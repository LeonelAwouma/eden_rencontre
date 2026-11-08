/**
 * Synchronisation du cookie de session de l'espace Coach (logique PURE, testable sans navigateur).
 *
 * Le cookie `sb-access-token` expire avec le jeton (≈ 1 h) alors que la session du navigateur (Supabase, localStorage)
 * est renouvelée. Quatre déclencheurs le resynchronisent : le minuteur de 30 min, le retour de l'onglet au premier plan
 * (`visibilitychange`), le retour du réseau (`online`) — `focus` est volontairement omis : il double
 * `visibilitychange` et multiplierait les appels.
 *
 * Garanties : une seule synchronisation à la fois (single-flight), délai minimal entre deux tentatives, aucune
 * tentative onglet masqué / hors ligne / pendant ou après une déconnexion, erreur réseau sans déconnexion, et un refus
 * du serveur (compte suspendu…) n'est jamais contourné : `onDenied` redemande au SERVEUR de rejouer la garde.
 */

/** Délai minimal entre deux tentatives (jamais contourné, pour ne pas marteler le serveur). */
export const COACH_SYNC_MIN_GAP_MS = 15_000;

/** Résultat de l'appel réseau de synchronisation (voir `syncCoachSessionCookie`). */
export type SyncOutcome = "ok" | "denied" | "network_error" | "no_session" | "unconfirmed_old_session";

export type SyncResult = SyncOutcome | "skipped_hidden" | "skipped_offline" | "skipped_gap" | "skipped_inflight" | "skipped_logout";

export type SyncReason = "interval" | "visible" | "online";

export interface SchedulerDeps {
  now: () => number;
  isVisible: () => boolean;
  isOnline: () => boolean;
  /** Une déconnexion est en cours ou terminée : plus aucune synchronisation. */
  isLoggingOut: () => boolean;
  sync: () => Promise<SyncOutcome>;
  /** Le serveur a refusé : redemander au serveur de rejouer la garde (aucune déconnexion décidée ici). */
  onDenied: () => void | Promise<void>;
  minGapMs?: number;
}

export function createCookieSyncScheduler(deps: SchedulerDeps) {
  const minGap = deps.minGapMs ?? COACH_SYNC_MIN_GAP_MS;
  let inflight = false;
  let lastStartedAt: number | null = null;

  async function request(_reason: SyncReason): Promise<SyncResult> {
    if (deps.isLoggingOut()) return "skipped_logout";
    if (inflight) return "skipped_inflight";
    if (!deps.isVisible()) return "skipped_hidden";
    if (!deps.isOnline()) return "skipped_offline";
    const now = deps.now();
    if (lastStartedAt !== null && now >= lastStartedAt && now - lastStartedAt < minGap) return "skipped_gap";
    inflight = true;
    lastStartedAt = now;
    try {
      const outcome = await deps.sync();
      // Déconnexion démarrée pendant l'appel : on ne réagit plus à son résultat.
      if (deps.isLoggingOut()) return "skipped_logout";
      if (outcome === "denied") await deps.onDenied();
      return outcome;
    } catch {
      return "network_error"; // une erreur temporaire ne déconnecte jamais
    } finally {
      inflight = false;
    }
  }

  return { request };
}

/** Cibles d'événements minimales (le `document`/`window` du navigateur, ou un faux dans les tests). */
export interface EventTargetLike {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface WiringEnv {
  doc: EventTargetLike & { visibilityState: string };
  win: EventTargetLike;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
}

/** Branche le minuteur et les écouteurs ; retourne le nettoyage complet (démontage du composant). */
export function startCookieSync(
  scheduler: { request: (r: SyncReason) => Promise<SyncResult> },
  env: WiringEnv,
  intervalMs: number
): () => void {
  const onVisibility = () => { if (env.doc.visibilityState === "visible") void scheduler.request("visible"); };
  const onOnline = () => { void scheduler.request("online"); };
  const timer = env.setInterval(() => { void scheduler.request("interval"); }, intervalMs);
  env.doc.addEventListener("visibilitychange", onVisibility);
  env.win.addEventListener("online", onOnline);
  return () => {
    env.clearInterval(timer);
    env.doc.removeEventListener("visibilitychange", onVisibility);
    env.win.removeEventListener("online", onOnline);
  };
}
