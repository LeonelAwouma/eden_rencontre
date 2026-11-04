"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authHeaders } from "@/lib/auth";
import {
  badgeTargets, matchesDestination, pickCard,
  type AnnouncementView, type Surface,
} from "@/lib/whats-new";

/**
 * Annonces d'une surface (public / member / admin) et leur mémoire.
 *
 *  - member : l'état fermé/découvert vit en base, lié au compte (il suit le membre d'un
 *    appareil à l'autre) ;
 *  - public et admin : aucune identité durable, donc `localStorage` de l'appareil.
 *
 * Fermer une annonce masque sa carte (`dismissed`) mais PAS son badge ; seule la
 * découverte de la destination (`discovered`) éteint les deux.
 */

const LOCAL_KEY = (id: string) => `eden-whatsnew:${id}`;
const VIEWED_KEY = (id: string) => `eden-whatsnew-viewed:${id}`;

interface LocalState { dismissed: boolean; discovered: boolean }

function readLocal(id: string): LocalState {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY(id)) || "{}");
    return { dismissed: raw.d === 1, discovered: raw.k === 1 };
  } catch {
    return { dismissed: false, discovered: false };
  }
}

function writeLocal(id: string, patch: Partial<LocalState>) {
  try {
    const cur = readLocal(id);
    const next = { ...cur, ...patch };
    localStorage.setItem(LOCAL_KEY(id), JSON.stringify({ d: next.dismissed ? 1 : 0, k: next.discovered ? 1 : 0 }));
  } catch { /* stockage indisponible (navigation privée…) : l'annonce pourra réapparaître, rien de grave */ }
}

/** Compteur agrégé et anonyme. Silencieux : un échec ne doit jamais se voir. */
function track(id: string, event: "view" | "click" | "dismiss") {
  try {
    fetch("/api/announcements/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, event }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignoré */ }
}

async function saveMemberState(id: string, action: "dismiss" | "discover") {
  try {
    await fetch("/api/announcements/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ id, action }),
    });
  } catch { /* hors ligne : l'état local de la session suffit, il sera rejoué à la prochaine action */ }
}

export interface AnnouncementsApi {
  items: AnnouncementView[];
  loaded: boolean;
  /** La carte à afficher (au plus une). */
  card: AnnouncementView | null;
  /** Entrées de navigation à badger (`navHref ?? href`). */
  badgeTargets: string[];
  dismiss: (id: string) => void;
  /** `viaCard` : le clic vient du bouton « Découvrir » (compté comme clic). */
  discover: (id: string, viaCard?: boolean) => void;
  /** Compte UN affichage par session et par annonce. À appeler quand la carte est réellement rendue. */
  trackView: (id: string) => void;
}

export function useAnnouncements(surface: Surface, enabled = true): AnnouncementsApi {
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = surface === "member" ? await authHeaders() : {};
        const res = await fetch(`/api/announcements?surface=${surface}`, { headers, cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const list: AnnouncementView[] = Array.isArray(data.announcements) ? data.announcements : [];
        if (cancelled) return;
        // Membres : l'état vient du serveur. Les autres : de l'appareil.
        setItems(surface === "member" ? list : list.map((v) => ({ ...v, ...readLocal(v.id) })));
      } catch {
        /* aucune annonce plutôt qu'une erreur visible */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [surface, enabled]);

  const patch = useCallback((id: string, change: Partial<Pick<AnnouncementView, "dismissed" | "discovered">>) => {
    setItems((prev) => prev.map((v) => (v.id === id ? { ...v, ...change } : v)));
  }, []);

  const dismiss = useCallback((id: string) => {
    patch(id, { dismissed: true });
    track(id, "dismiss");
    if (surface === "member") void saveMemberState(id, "dismiss");
    else writeLocal(id, { dismissed: true });
  }, [patch, surface]);

  const discover = useCallback((id: string, viaCard = false) => {
    patch(id, { discovered: true });
    if (viaCard) track(id, "click");
    if (surface === "member") void saveMemberState(id, "discover");
    else writeLocal(id, { discovered: true });
  }, [patch, surface]);

  const trackView = useCallback((id: string) => {
    try {
      if (sessionStorage.getItem(VIEWED_KEY(id))) return;
      sessionStorage.setItem(VIEWED_KEY(id), "1");
    } catch { /* sessionStorage indisponible : on compte quand même, le plafond serveur protège */ }
    track(id, "view");
  }, []);

  const card = useMemo(() => pickCard(items), [items]);
  const targets = useMemo(() => badgeTargets(items), [items]);

  return { items, loaded, card, badgeTargets: targets, dismiss, discover, trackView };
}

/**
 * « Découverte » = la VRAIE destination `href` atteinte (ou une page située dessous),
 * jamais l'ouverture d'une section parente. Ouvrir « Académie » n'éteint donc pas
 * l'annonce de formation ; ouvrir la formation elle-même, si.
 */
export function useDiscoverOnVisit(api: AnnouncementsApi, pathname: string, tab: string | null) {
  const { items, discover } = api;
  useEffect(() => {
    for (const it of items) {
      if (!it.discovered && matchesDestination(it.href, pathname, tab)) discover(it.id, false);
    }
  }, [items, pathname, tab, discover]);
}
