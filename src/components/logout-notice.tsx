"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { retryLogoutRevocation } from "@/lib/logout-flow";
import { deleteSessionRequest, readLogoutState, saveLogoutState } from "@/lib/logout-browser";
import { parseStoredLogoutState, type StoredLogoutState } from "@/lib/coach/logout-outcome";
import { resetLoggingOut } from "@/lib/logout-state";

/**
 * Avertissement de déconnexion NON confirmée, affiché sur la page de connexion.
 *
 * La session locale est déjà détruite : ce bandeau ne dit JAMAIS que la déconnexion est complète tant que le serveur
 * n'a pas prouvé la révocation. « Réessayer » envoie UNE requête (pas de boucle, désactivé hors ligne). Le message de
 * réussite n'apparaît que si le corps de la réponse porte une confirmation explicite.
 */
export function LogoutNotice() {
  const { t } = useI18n();
  const [state, setState] = useState<StoredLogoutState | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    // Un nouvel écran de connexion ouvre une nouvelle vie de session : les synchronisations peuvent reprendre.
    resetLoggingOut();
    setState(parseStoredLogoutState(readLogoutState()));
    setOnline(navigator.onLine !== false);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  if (!state && !confirmed) return null;

  const retry = async () => {
    if (lock.current || !online) return; // verrou synchrone : pas de double clic, pas de boucle
    lock.current = true;
    setBusy(true);
    setUnreachable(false);
    try {
      const result = await retryLogoutRevocation({ deleteSession: deleteSessionRequest, saveState: saveLogoutState }, readLogoutState());
      if (result.confirmed) { setConfirmed(true); setState(null); }
      else { setState(result.state); setUnreachable(result.unconfirmed); }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (confirmed) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm leading-relaxed text-foreground/80">{t("login.logoutConfirmed")}</p>
      </div>
    );
  }

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="space-y-1">
          <p className="text-sm font-medium leading-relaxed text-foreground/90">{t("login.logoutUnconfirmedTitle")}</p>
          <p className="text-sm leading-relaxed text-foreground/70">{t(state?.rateLimited ? "login.logoutRateLimited" : "login.logoutUnconfirmedBody")}</p>
          {unreachable && <p className="text-sm leading-relaxed text-foreground/70">{t("login.logoutRetryFailed")}</p>}
          {!online && <p className="text-sm leading-relaxed text-foreground/70">{t("login.logoutOffline")}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void retry()}
        disabled={busy || !online}
        className="self-start rounded-lg border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 disabled:opacity-50"
      >
        {busy ? t("login.logoutRetrying") : t("login.logoutRetry")}
      </button>
    </div>
  );
}
