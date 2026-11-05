"use client";

import { useSyncExternalStore } from "react";

/**
 * Un seul bandeau en tête de la page d'accueil publique.
 *
 * `AnnouncementBar` (texte libre de l'administrateur) et le bandeau « Nouveautés »
 * ne doivent jamais s'empiler, surtout sur mobile où chaque ligne coûte de la place.
 * La barre de l'administrateur déclare ici si elle est visible ; le bandeau
 * « Nouveautés » s'efface alors tant qu'elle l'est.
 */

let adminBannerVisible = false;
const listeners = new Set<() => void>();

export function setAdminBannerVisible(visible: boolean) {
  if (adminBannerVisible === visible) return;
  adminBannerVisible = visible;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useAdminBannerVisible(): boolean {
  // Instantané serveur : « non visible » — aucun écart d'hydratation, la barre se déclare après son chargement.
  return useSyncExternalStore(subscribe, () => adminBannerVisible, () => false);
}
