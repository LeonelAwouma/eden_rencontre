"use client";

import { useEffect } from "react";
import { isPrivatePath, listenForLogout } from "@/lib/logout-broadcast";

/**
 * Autres onglets : quand un onglet se déconnecte, les pages privées reviennent à la connexion (navigation complète :
 * l'état en mémoire du client est purgé). Un nettoyage de secours du stockage ne notifie pas les autres instances du
 * client Supabase ; ce signal explicite comble ce manque. Les pages publiques ne sont pas touchées.
 */
export function LogoutListener() {
  useEffect(() => listenForLogout(() => {
    if (isPrivatePath(window.location.pathname)) window.location.assign("/login");
  }), []);
  return null;
}
