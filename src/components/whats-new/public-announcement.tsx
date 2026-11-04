"use client";

import { useAdminBannerVisible } from "@/lib/banner-slot";
import { AnnouncementSlot } from "./announcement-card";
import { useAnnouncements } from "./use-announcements";

/**
 * Bandeau « Nouveautés » des visiteurs (accueil public), une seule ligne.
 *
 * S'efface tant que l'`AnnouncementBar` de l'administrateur est visible : jamais deux
 * bandeaux empilés, surtout sur mobile. Mémoire de fermeture : l'appareil seulement
 * (`localStorage`), aucun cookie ni donnée serveur pour un visiteur.
 */
export function PublicAnnouncement() {
  const api = useAnnouncements("public");
  const adminBannerVisible = useAdminBannerVisible();
  return <AnnouncementSlot api={api} variant="strip" suppressed={adminBannerVisible} className="empty:hidden" />;
}
