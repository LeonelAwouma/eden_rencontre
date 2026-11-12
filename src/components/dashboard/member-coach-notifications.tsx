"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, HeartHandshake } from "lucide-react";
import { authHeaders } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  coachNotifAction, coachNotifTextKey, markAllReadLocal, markReadLocal, unreadAfter,
  type MemberCoachNotification,
} from "@/lib/coach/member-notifications";

export interface MemberCoachNotifications {
  items: MemberCoachNotification[];
  /** Nombre TOTAL de non lues (comptage exact du serveur, pas seulement les 30 lignes affichées). */
  unread: number;
  loaded: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Notifications d'accompagnement du membre (table coach_notifications, via /api/coach-notifications).
 * Chargées dès que le membre est connu : la cloche, l'en-tête et la barre mobile affichent le bon compteur
 * avant même l'ouverture de l'onglet Notifications. Un 401/403 (non membre) donne simplement une liste vide.
 */
export function useMemberCoachNotifications(enabled: boolean): MemberCoachNotifications {
  const [items, setItems] = useState<MemberCoachNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const unreadRef = useRef(0);
  unreadRef.current = unread;

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/coach-notifications", { headers: await authHeaders(), cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      if (Array.isArray(body?.notifications)) setItems(body.notifications);
      if (typeof body?.unread === "number") setUnread(body.unread);
    } catch { /* silencieux : la liste reste vide, la notification en base n'est pas perdue */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { if (enabled) void reload(); }, [enabled, reload]);

  // Rafraîchissement quand le membre revient sur l'onglet du navigateur (nouvelle proposition reçue entre-temps).
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, reload]);

  const markRead = useCallback(async (id: string) => {
    let wasUnread = false;
    try {
      const res = await fetch("/api/coach-notifications", {
        method: "PATCH",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return; // rien n'est affiché comme lu tant que le serveur n'a pas confirmé
      setItems((cur) => {
        const target = cur.find((n) => n.id === id);
        wasUnread = !!target && !target.read_at;
        return markReadLocal(cur, id, new Date().toISOString());
      });
      setUnread((u) => (wasUnread ? unreadAfter(u, 1) : u));
    } catch { /* ignoré */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const res = await fetch("/api/coach-notifications", {
        method: "PATCH",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) return;
      setItems((cur) => markAllReadLocal(cur, new Date().toISOString()));
      setUnread(0);
    } catch { /* ignoré */ }
  }, []);

  return { items, unread, loaded, markRead, markAllRead, reload };
}

/** Bloc « Accompagnement » de l'onglet Notifications. Rien n'est affiché sans notification. */
export function MemberCoachNotificationsPanel({ state, onOpenProposal }: {
  state: MemberCoachNotifications;
  onOpenProposal: () => void;
}) {
  const { t, locale } = useI18n();
  const { items, unread, markRead, markAllRead } = state;
  if (items.length === 0) return null;

  const open = async (n: MemberCoachNotification) => {
    if (!n.read_at) await markRead(n.id);
    if (coachNotifAction(n) === "open-proposal") onOpenProposal();
  };

  return (
    <div className="space-y-2" data-testid="member-coach-notifications">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "#486B46" }}>{t("coachMemberNotif.title")}</p>
        {unread > 0 && (
          <button type="button" onClick={() => void markAllRead()}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#486B46] hover:underline">
            <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" /> {t("coachMemberNotif.markAll")}
          </button>
        )}
      </div>
      <ul className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
        {items.map((n) => {
          const key = coachNotifTextKey(n.kind);
          const title = key === "generic" ? n.title : t(`coachMemberNotif.${key}.title`);
          const body = key === "generic" ? (n.body ?? "") : t(`coachMemberNotif.${key}.body`);
          const isProposal = coachNotifAction(n) === "open-proposal";
          return (
            <li key={n.id}>
              <button type="button" onClick={() => void open(n)}
                className="w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-[#FAF9F6]"
                style={{ borderLeft: n.read_at ? "3px solid transparent" : "3px solid #486B46" }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF5EC" }}>
                  <HeartHandshake className="w-5 h-5" style={{ color: "#486B46" }} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: "#2F2F2F" }}>{title}</span>
                  {body && <span className="block text-xs mt-1 leading-relaxed" style={{ color: "#4B5563" }}>{body}</span>}
                  <span className="block text-[10px] mt-1.5" style={{ color: "#9CA3AF" }}>
                    {new Date(n.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {isProposal && !n.read_at ? ` · ${t("coachMemberNotif.open")}` : ""}
                  </span>
                </span>
                {!n.read_at && <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "#486B46" }} aria-label={t("coachMemberNotif.unread")} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
