"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSession, logout as authLogout } from "@/lib/auth";
import { listConversations } from "@/lib/chat";
import type { Tab } from "./dashboard-types";

/**
 * Chrome de l'espace membre : état partagé par l'en-tête, la barre inférieure et
 * le tiroir, montés une seule fois dans `app/dashboard/layout.tsx`.
 *
 * Avant ce contexte, chaque page recréait sa navigation : deux hamburgers sur le
 * tableau de bord, un troisième sur le profil, deux tiroirs distincts, et une
 * barre inférieure présente sur une seule route. Les composants de chrome lisent
 * désormais tout ici.
 */

export type MemberBadges = {
  totalUnread: number;
  incomingRequestCount: number;
  notifCount: number;
};

export type MemberHeaderConfig = {
  /** Titre affiché (desktop, et mobile sur les sous-pages). */
  title?: string;
  /** Destination du bouton retour. Absent = pas de bouton retour. */
  backHref?: string;
  /** Écran immersif : l'en-tête partagé ne s'affiche pas du tout. */
  hidden?: boolean;
};

type TabController = { activeTab: Tab; setActiveTab: (tab: Tab) => void };

interface MemberChromeValue {
  // Identité
  displayName: string;
  displayInitial: string;
  avatarUrl: string | undefined;
  displayLocation: string;

  // Badges
  badges: MemberBadges;
  /** `/dashboard` possède la donnée riche et écrase le comptage léger du provider. */
  publishBadges: (badges: Partial<MemberBadges>) => void;

  // Onglets de la SPA /dashboard
  /** `null` hors de `/dashboard` : la navigation passe alors par `?tab=`. */
  activeTab: Tab | null;
  goToTab: (tab: Tab) => void;
  registerTabController: (controller: TabController | null) => void;

  // Écrans immersifs (conversation ouverte, forum)
  immersive: boolean;
  setImmersive: (value: boolean) => void;

  // En-tête déclaratif
  header: MemberHeaderConfig;
  setHeader: (config: MemberHeaderConfig | null) => void;

  // Tiroir
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;

  // Compte
  /**
   * Non nul = des modifications ne sont pas enregistrées, la déconnexion est
   * retirée du tiroir. Reproduit la protection existante du profil, où
   * `onLogout` n'était fourni que hors questionnaire.
   */
  logoutGuard: string | null;
  setLogoutGuard: (reason: string | null) => void;
  logout: () => Promise<void>;
}

const MemberChromeContext = createContext<MemberChromeValue | null>(null);

export function useMemberChrome(): MemberChromeValue {
  const ctx = useContext(MemberChromeContext);
  if (!ctx) throw new Error("useMemberChrome doit être utilisé sous MemberChromeProvider");
  return ctx;
}

const NO_BADGES: MemberBadges = { totalUnread: 0, incomingRequestCount: 0, notifCount: 0 };

export function MemberChromeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("Membre");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [displayLocation, setDisplayLocation] = useState("");

  const [badges, setBadges] = useState<MemberBadges>(NO_BADGES);
  /** Vrai dès que `/dashboard` a publié ses compteurs : le provider cesse alors de les écrire. */
  const badgesOwned = useRef(false);

  const [tabController, setTabController] = useState<TabController | null>(null);
  const [immersive, setImmersive] = useState(false);
  const [header, setHeaderState] = useState<MemberHeaderConfig>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutGuard, setLogoutGuard] = useState<string | null>(null);

  // Identité (même source que le tableau de bord : la session), puis comptage léger
  // des non-lus pour les pages qui ne chargent pas les conversations.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getSession();
      if (cancelled || !user) return;
      setDisplayName(user.pseudo || user.name || "Membre");
      setAvatarUrl(user.avatar_url || undefined);
      setDisplayLocation([user.city, user.country].filter(Boolean).join(", "));

      if (badgesOwned.current || !user.id) return;
      try {
        const conversations = await listConversations(user.id);
        if (cancelled || badgesOwned.current) return;
        const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
        setBadges((prev) => ({ ...prev, totalUnread }));
      } catch {
        /* hors ligne : les badges restent à zéro, sans bloquer la navigation */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const publishBadges = useCallback((next: Partial<MemberBadges>) => {
    badgesOwned.current = true;
    setBadges((prev) => {
      const merged = { ...prev, ...next };
      const unchanged =
        merged.totalUnread === prev.totalUnread &&
        merged.incomingRequestCount === prev.incomingRequestCount &&
        merged.notifCount === prev.notifCount;
      return unchanged ? prev : merged;
    });
  }, []);

  const registerTabController = useCallback((controller: TabController | null) => {
    setTabController(controller);
  }, []);

  const setHeader = useCallback((config: MemberHeaderConfig | null) => {
    setHeaderState(config ?? {});
  }, []);

  /**
   * Depuis `/dashboard`, bascule d'onglet sans rechargement ; depuis une
   * sous-page, passe par `?tab=` que la page filtre déjà par la liste blanche
   * `TABS`. Une seule fonction, donc un seul comportement pour toute la chrome.
   */
  const goToTab = useCallback((tab: Tab) => {
    if (tabController) tabController.setActiveTab(tab);
    else router.push(`/dashboard?tab=${encodeURIComponent(tab)}`);
  }, [tabController, router]);

  const logout = useCallback(async () => {
    await authLogout();
    router.replace("/login");
  }, [router]);

  const value = useMemo<MemberChromeValue>(() => ({
    displayName,
    displayInitial: displayName.charAt(0).toUpperCase() || "M",
    avatarUrl,
    displayLocation,
    badges,
    publishBadges,
    activeTab: tabController?.activeTab ?? null,
    goToTab,
    registerTabController,
    immersive,
    setImmersive,
    header,
    setHeader,
    menuOpen,
    setMenuOpen,
    logoutGuard,
    setLogoutGuard,
    logout,
  }), [
    displayName, avatarUrl, displayLocation, badges, publishBadges, tabController,
    goToTab, registerTabController, immersive, header, setHeader, menuOpen,
    logoutGuard, logout,
  ]);

  return <MemberChromeContext.Provider value={value}>{children}</MemberChromeContext.Provider>;
}

/**
 * Déclare l'en-tête de la page courante. Les champs sont volontairement tous
 * primitifs : un `ReactNode` d'actions changerait d'identité à chaque rendu et
 * relancerait l'effet en boucle. Une page qui a besoin de boutons propres les
 * rend dans son contenu, sous l'en-tête.
 */
export function useMemberHeader(config: MemberHeaderConfig) {
  // Sans erreur hors du layout membre : les lecteurs de leçons servent aussi l'aperçu admin.
  const setHeader = useContext(MemberChromeContext)?.setHeader;
  const { title, backHref, hidden } = config;

  useEffect(() => {
    if (!setHeader) return;
    setHeader({ title, backHref, hidden });
    return () => setHeader(null);
  }, [setHeader, title, backHref, hidden]);
}

/**
 * Écran immersif : masque en-tête partagé et barre inférieure, et libère la
 * réserve de hauteur. Utilisé par le forum et par une conversation ouverte.
 */
export function useImmersiveScreen(active = true) {
  const { setImmersive } = useMemberChrome();
  useEffect(() => {
    setImmersive(active);
    return () => setImmersive(false);
  }, [setImmersive, active]);
}

/**
 * Pose une garde tant que des modifications ne sont pas enregistrées : la
 * déconnexion disparaît du tiroir, comme c'était le cas pendant le questionnaire.
 */
export function useLogoutGuard(reason: string | null) {
  const { setLogoutGuard } = useMemberChrome();
  useEffect(() => {
    setLogoutGuard(reason);
    return () => setLogoutGuard(null);
  }, [setLogoutGuard, reason]);
}
