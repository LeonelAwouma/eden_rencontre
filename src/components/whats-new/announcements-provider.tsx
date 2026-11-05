"use client";

import { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TABS, canonicalTab, type Tab } from "@/components/dashboard/dashboard-types";
import { useMemberChrome } from "@/components/dashboard/member-chrome";
import type { AnnouncementView } from "@/lib/whats-new";
import { AnnouncementSlot } from "./announcement-card";
import { useAnnouncements, useDiscoverOnVisit, type AnnouncementsApi } from "./use-announcements";

/**
 * Annonces de l'espace membre, chargées UNE fois pour tout le monde : la carte de
 * l'accueil, la sidebar, le tiroir et la barre inférieure lisent la même source.
 */

const INERT: AnnouncementsApi = {
  items: [], loaded: false, card: null, badgeTargets: [],
  dismiss: () => {}, discover: () => {}, trackView: () => {},
};

const MemberAnnouncementsContext = createContext<AnnouncementsApi>(INERT);

/** Sans fournisseur (ex. page hors espace membre), un jeu vide : aucun badge, aucune carte. */
export function useMemberAnnouncements(): AnnouncementsApi {
  return useContext(MemberAnnouncementsContext);
}

export function MemberAnnouncementsProvider({ children }: { children: ReactNode }) {
  const api = useAnnouncements("member");
  const pathname = usePathname();
  const { activeTab } = useMemberChrome();

  // La découverte est la visite de la vraie destination, pas d'une section parente.
  useDiscoverOnVisit(api, pathname, activeTab ? canonicalTab(activeTab) : null);

  return <MemberAnnouncementsContext.Provider value={api}>{children}</MemberAnnouncementsContext.Provider>;
}

/**
 * La carte « Nouveauté » de l'accueil membre.
 *
 * Absente des écrans immersifs (conversation ouverte, forum) : elle ne peut donc
 * jamais gêner un champ de saisie, et reste intacte pour plus tard. Dans le flux,
 * jamais en position fixe : elle ne chevauche pas la barre inférieure.
 */
export function MemberAnnouncement({ className }: { className?: string }) {
  const api = useMemberAnnouncements();
  const { immersive, goToTab } = useMemberChrome();
  const router = useRouter();

  // Un `href` d'onglet (`/dashboard?tab=X`) doit changer d'onglet sur place : le paramètre
  // n'est lu qu'au montage de la page, un simple lien ne ferait rien.
  const onDiscover = (announcement: AnnouncementView, event: MouseEvent<HTMLAnchorElement>) => {
    if (!announcement.href.startsWith("/dashboard?tab=")) return;
    event.preventDefault();
    const tab = new URLSearchParams(announcement.href.split("?")[1]).get("tab");
    if (tab && (TABS as string[]).includes(tab)) goToTab(tab as Tab);
    else router.push(announcement.href);
  };

  return <AnnouncementSlot api={api} suppressed={immersive} onDiscover={onDiscover} className={className} />;
}
