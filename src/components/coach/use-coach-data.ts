"use client";

import { useCallback, useEffect, useState } from "react";
import { coachApi } from "@/lib/coach/client";
import { useCoachChrome } from "./coach-chrome";

export type CoachDataState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  /** `httpStatus` : code HTTP (404 = introuvable ou non autorisé), 0 = réseau. */
  | { status: "error"; httpStatus: number };

/**
 * Charge une route `/api/coach/*`. 401/403 en cours de session → `onDenied` (le serveur rejoue sa garde, aucune
 * déconnexion déduite côté navigateur) ; toute erreur → état « error » avec possibilité de réessayer.
 * Jamais de donnée affichée sans réponse du serveur.
 */
export function useCoachData<T>(path: string): { state: CoachDataState<T>; reload: () => void } {
  const { onDenied } = useCoachChrome();
  const [state, setState] = useState<CoachDataState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void coachApi<T>(path).then((res) => {
      if (cancelled) return;
      if (res.ok) { setState({ status: "ready", data: res.data }); return; }
      // Refus d'accès : on laisse le SERVEUR rejouer sa garde (redirection éventuelle) sans rien conclure ici ; si la
      // garde laisse l'accès intact (refus ponctuel), la page affiche l'erreur avec « Réessayer » au lieu de rester bloquée.
      if (res.status === 401 || res.status === 403) void onDenied();
      setState({ status: "error", httpStatus: res.status });
    });
    return () => { cancelled = true; };
  }, [path, nonce, onDenied]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { state, reload };
}
