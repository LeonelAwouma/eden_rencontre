"use client";

// Présence des membres dans l'espace membre.
//  - « En ligne » : Supabase Realtime Presence, canal partagé members-online (clé = id du membre).
//    On n'y figure que tant qu'une page /dashboard est visible : téléphone en veille ou onglet
//    caché = hors ligne.
//  - « Vu il y a… » : battement touch_presence() (~1/min) dans public.member_presence,
//    relu avec les conversations (listConversations → lastSeenAt).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const CHANNEL = "members-online";
const HEARTBEAT_MS = 60_000;

interface PresenceValue {
  isOnline: (userId: string | null | undefined) => boolean;
  /** Dernière présence la plus récente connue : départ observé en direct, sinon la valeur en base. */
  lastSeen: (userId: string | null | undefined, stored?: string | null) => string | null;
  /** Avance chaque minute : relit les libellés relatifs (« il y a 3 min »). */
  now: number;
}

const PresenceContext = createContext<PresenceValue>({
  isOnline: () => false,
  lastSeen: (_id, stored) => stored ?? null,
  now: 0,
});

function touchPresence() {
  supabase?.rpc("touch_presence").then(() => {}, () => {});
}

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());
  const [leftAt, setLeftAt] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let subscribed = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const visible = () => document.visibilityState === "visible";
    const goOnline = () => {
      touchPresence();
      if (channel && subscribed) channel.track({ at: Date.now() }).catch(() => {});
    };
    const goOffline = () => {
      touchPresence();
      if (channel && subscribed) channel.untrack().catch(() => {});
    };
    const onVisibility = () => (visible() ? goOnline() : goOffline());

    (async () => {
      const { data } = await client.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || cancelled) return;

      const ch = client.channel(CHANNEL, { config: { presence: { key: uid } } });
      channel = ch;
      ch.on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setOnlineIds(new Set(Object.keys(state).filter((k) => (state[k]?.length ?? 0) > 0)));
      })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (key) setLeftAt((prev) => ({ ...prev, [key]: new Date().toISOString() }));
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          subscribed = true;
          if (visible()) goOnline();
        });

      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pagehide", goOffline);
      heartbeat = setInterval(() => {
        setNow(Date.now());
        if (visible()) touchPresence();
      }, HEARTBEAT_MS);
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", goOffline);
      if (heartbeat) clearInterval(heartbeat);
      if (channel) client.removeChannel(channel);
    };
  }, []);

  const isOnline = useCallback((id: string | null | undefined) => !!id && onlineIds.has(id), [onlineIds]);
  const lastSeen = useCallback((id: string | null | undefined, stored?: string | null) => {
    const live = id ? leftAt[id] : undefined;
    if (live && (!stored || live > stored)) return live;
    return stored ?? null;
  }, [leftAt]);

  const value = useMemo(() => ({ isOnline, lastSeen, now }), [isOnline, lastSeen, now]);
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceValue {
  return useContext(PresenceContext);
}

/**
 * Administration : membres présents en ce moment dans l'espace membre. Écoute le canal
 * members-online sans s'y déclarer (l'admin n'est pas compté). ready = premier état reçu.
 */
export function useOnlineMembers(): { ids: string[]; ready: boolean } {
  const [state, setState] = useState<{ ids: string[]; ready: boolean }>({ ids: [], ready: false });
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    // Clé propre à cet écouteur : il ne doit pas se confondre avec un membre.
    const ch = client.channel(CHANNEL, { config: { presence: { key: `admin-observer-${Math.random().toString(36).slice(2)}` } } });
    ch.on("presence", { event: "sync" }, () => {
      const s = ch.presenceState();
      setState({ ids: Object.keys(s).filter((k) => !k.startsWith("admin-observer-") && (s[k]?.length ?? 0) > 0), ready: true });
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    });
    return () => { client.removeChannel(ch); };
  }, []);
  return state;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

/** « Vu à l'instant », « Vu il y a 12 minutes », « Vu hier », « Vu le 3 nov. ». */
export function formatLastSeen(iso: string, locale: string, t: Translate, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor(Math.max(0, now - then) / 60_000);
  const lang = locale === "en" ? "en" : "fr";
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "always" });
  if (diffMin < 1) return t("dashboard.lastSeenJustNow");
  if (diffMin < 60) return t("dashboard.lastSeen", { when: rtf.format(-diffMin, "minute") });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t("dashboard.lastSeen", { when: rtf.format(-diffH, "hour") });
  if (diffH < 48) return t("dashboard.lastSeenYesterday");
  const date = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short" }).format(new Date(then));
  return t("dashboard.lastSeenOn", { date });
}
