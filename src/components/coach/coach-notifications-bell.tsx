"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { coachApi } from "@/lib/coach/client";
import type { ActivityDto } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useCoachChrome } from "./coach-chrome";

/**
 * Cloche des notifications du coach. Elle lit `/api/coach/notifications` (DTO à 4 champs) : le texte affiché
 * est dérivé du TYPE de notification et traduit — aucun texte libre de la base n'est reçu ni affiché.
 * Le marquage « lu » réutilise `PATCH /api/coach-notifications` (filtré par destinataire côté serveur).
 */
export function CoachNotificationsBell() {
  const { t, locale } = useI18n();
  const { onDenied } = useCoachChrome();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await coachApi<{ notifications: ActivityDto[]; unread: number }>("/api/coach/notifications");
    if (res.ok) { setItems(res.data.notifications); setUnread(res.data.unread); setFailed(false); return; }
    if (res.status === 401 || res.status === 403) { void onDenied(); return; }
    setFailed(true);
  }, [onDenied]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const markAllRead = async () => {
    if (busy) return;
    setBusy(true);
    const res = await coachApi<{ ok: boolean }>("/api/coach-notifications", { method: "PATCH", body: { all: true } });
    if (res.ok) await load();
    setBusy(false);
  };

  const label = unread > 0 ? `${t("coachNav.notifications")} (${unread})` : t("coachNav.notifications");

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-expanded={open} aria-haspopup="dialog"
        onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        className={cn("relative w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-150 text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45", open && "bg-[#EEF5EE] text-[#28543C]")}>
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center bg-[#28543C] text-white ring-2 ring-[#FAF9F6] tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label={t("coachNav.notifications")}
          className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-[#E6EAE5] bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#E6EAE5]">
            <h2 className="text-sm font-semibold text-[#1C241F]">{t("coachNav.notifications")}</h2>
            {unread > 0 && (
              <button type="button" onClick={() => void markAllRead()} disabled={busy}
                className="text-xs font-semibold text-[#28543C] hover:underline disabled:opacity-60">{t("coachCommon.markAllRead")}</button>
            )}
          </div>
          {failed ? (
            <p className="px-4 py-6 text-sm text-[#8A3B2E]">{t("coachCommon.bellError")}</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#56615A]">{t("coachCommon.bellEmpty")}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[#F0F2EF]">
              {items.map((n) => (
                <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read && "bg-[#F6FAF5]")}>
                  <p className={cn("text-[#1C241F]", !n.read && "font-semibold")}>{t(`coachDashboard.activity.${n.kind}`)}</p>
                  {n.createdAt && (
                    <p className="text-xs text-[#6B746E] mt-0.5">
                      {new Date(n.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
