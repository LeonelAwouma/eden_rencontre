"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { CoachAvatar } from "./coach-avatar";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COACH_GROUPS, isCoachRouteActive } from "@/lib/coach-nav";
import { COACH_NAV_ICONS } from "./coach-nav-icons";
import { useCoachChrome } from "./coach-chrome";

/** Largeur de la colonne desktop : le contenu est décalé d'autant (même valeur que l'espace membre). */
export const COACH_SIDEBAR_OFFSET_CLASS = "lg:pl-64";

const itemBase = cn(
  "group relative flex items-center gap-3 w-full min-h-[44px] px-3 rounded-[10px] text-[14px] text-left",
  "transition-[background-color,color] duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
);
const itemIdle = "font-medium text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]";
const itemActive = "font-semibold bg-[#EEF5EE] text-[#28543C]";

interface Props {
  /** « fixed » : colonne desktop ; « drawer » : contenu du tiroir mobile. */
  variant?: "fixed" | "drawer";
  onClose?: () => void;
  /** Contenu additionnel au-dessus du bloc identité (ex. langue dans le tiroir). */
  footer?: ReactNode;
}

/** Navigation Coach : toutes les destinations viennent de `src/lib/coach-nav.ts`. */
export function CoachSidebar({ variant = "fixed", onClose, footer }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { coach, initial, logout } = useCoachChrome();

  return (
    <aside
      aria-label={t("coachNav.navLabel")}
      className={cn(
        "flex flex-col bg-[#FAF9F6]",
        variant === "fixed"
          ? "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40 border-r border-[#E6EAE5]"
          : "h-full w-full"
      )}
    >
      <div className="h-[72px] flex items-center justify-between gap-2 px-5 shrink-0">
        <Link href="/coach" onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45">
          <Monogram className="w-10 h-9 text-[#1F4D3A] shrink-0" />
          <span className="font-headline text-[21px] font-bold leading-none text-[#1C241F]">
            Garden <span className="italic font-medium text-[#3F704D]">of Alliance</span>
          </span>
        </Link>
        {variant === "drawer" && onClose && (
          <button type="button" onClick={onClose} aria-label={t("coachNav.closeMenu")}
            className="w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-[#4A564F] hover:bg-[#F0F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {COACH_GROUPS.map((group, gi) => (
          <div key={group.key} className={cn(gi > 0 && "mt-6")}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B746E]">{t(group.labelKey)}</p>
            <ul className="space-y-0.5">
              {group.dests.map((dest) => {
                const Icon = COACH_NAV_ICONS[dest.id];
                const active = dest.kind === "route" && isCoachRouteActive(pathname, dest.href);
                const body = (
                  <>
                    {active && <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[#28543C]" />}
                    <Icon className={cn("w-[19px] h-[19px] shrink-0", dest.kind === "action" ? "text-[#B42318]" : active ? "text-current" : "text-[#6B746E] group-hover:text-[#3F704D]")} aria-hidden="true" />
                    <span className="flex-1">{t(dest.labelKey)}</span>
                  </>
                );
                const cls = cn(itemBase, active ? itemActive : itemIdle,
                  dest.kind === "action" && "text-[#B42318] hover:text-[#B42318] hover:bg-[#FEF2F2]");
                return (
                  <li key={dest.id}>
                    {dest.kind === "route" ? (
                      <Link href={dest.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cls}>{body}</Link>
                    ) : (
                      <button type="button" className={cls} onClick={() => { onClose?.(); void logout(); }}>{body}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-[#E6EAE5] p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {footer}
        <div className="flex items-center gap-3 px-2 py-1">
          {/* Même photo que l'en-tête : toutes deux lues dans le contexte (source unique). */}
          <CoachAvatar url={coach.avatarUrl} name={coach.name || initial} className="ring-1 ring-[#E6EAE5] shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold text-[#1C241F] truncate">{coach.name}</span>
            <span className="block text-[12px] text-[#5C665F] truncate">{t("coachNav.roleLabel")}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
