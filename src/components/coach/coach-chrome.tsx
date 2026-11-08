"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { logout as authLogout } from "@/lib/auth";
import type { CoachMe } from "@/lib/coach/client";
import { createCookieSyncScheduler, startCookieSync } from "@/lib/coach/cookie-sync";
import { COACH_COOKIE_REFRESH_MS, syncCoachSessionCookie } from "@/lib/coach/session-cookie";
import { isLoggingOut } from "@/lib/logout-state";

interface CoachChromeValue {
  coach: CoachMe;
  initial: string;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  /** Déconnexion volontaire (bouton « Se déconnecter »). */
  logout: () => Promise<void>;
  /**
   * Une API Coach a refusé l'accès en cours de session. Le navigateur NE devine PAS pourquoi (suspension, rôle…) et
   * ne déconnecte personne : il redemande au SERVEUR de rejouer la garde du layout (`router.refresh()`), qui décide
   * d'après la base — coach désactivé → message de suspension, membre → son espace, coach actif → rien ne change.
   */
  onDenied: () => Promise<void>;
}

const CoachChromeContext = createContext<CoachChromeValue | null>(null);

/** Contexte de l'espace Coach : identité validée par le serveur, tiroir mobile, sorties de session. */
export function CoachChromeProvider({ coach, children }: { coach: CoachMe; children: ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = useCallback(async () => {
    await authLogout();
    router.replace("/login");
  }, [router]);

  const onDenied = useCallback(async () => {
    router.refresh();
  }, [router]);

  // Le cookie de session lu par la garde serveur expire avec le jeton (≈ 1 h) alors que la session du navigateur,
  // elle, est renouvelée : on le resynchronise toutes les 30 min, au retour de l'onglet (après une veille) et au retour
  // du réseau. Un seul planificateur : single-flight, délai minimal, aucune synchro onglet masqué / hors ligne / après
  // déconnexion. Un refus du serveur (suspension…) redemande au SERVEUR de rejouer la garde : jamais de cookie accordé
  // parce que le navigateur se réveille. Une erreur réseau ne déconnecte personne.
  useEffect(() => {
    const scheduler = createCookieSyncScheduler({
      now: () => Date.now(),
      isVisible: () => document.visibilityState === "visible",
      isOnline: () => navigator.onLine !== false,
      isLoggingOut,
      sync: syncCoachSessionCookie,
      onDenied: () => { void onDenied(); },
    });
    return startCookieSync(scheduler, { doc: document, win: window, setInterval: (fn, ms) => setInterval(fn, ms), clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>) }, COACH_COOKIE_REFRESH_MS);
  }, [onDenied]);

  const value = useMemo<CoachChromeValue>(() => ({
    coach,
    initial: (coach.name.trim()[0] || "C").toUpperCase(),
    menuOpen,
    setMenuOpen,
    logout,
    onDenied,
  }), [coach, menuOpen, logout, onDenied]);

  return <CoachChromeContext.Provider value={value}>{children}</CoachChromeContext.Provider>;
}

export function useCoachChrome(): CoachChromeValue {
  const ctx = useContext(CoachChromeContext);
  if (!ctx) throw new Error("useCoachChrome doit être utilisé dans <CoachShell>.");
  return ctx;
}
