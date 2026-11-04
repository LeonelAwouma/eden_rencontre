"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { MEMBER_GROUPS, destHref, type MemberDest } from "@/lib/member-nav";
import { NewBadge } from "@/components/whats-new/new-badge";
import { useMemberAnnouncements } from "@/components/whats-new/announcements-provider";
import { canonicalTab } from "./dashboard-types";
import { MEMBER_NAV_ICONS } from "./member-nav-icons";
import { useMemberChrome } from "./member-chrome";

/** Largeur de la sidebar desktop : le layout décale le contenu d'autant (lg:pl-64). */
export const SIDEBAR_OFFSET_CLASS = "lg:pl-64";

interface SidebarProps {
  /** « fixed » : colonne desktop ; « drawer » : contenu du tiroir mobile. */
  variant?: "fixed" | "drawer";
  /** Tiroir mobile : fermeture (après navigation ou via la croix). */
  onClose?: () => void;
  /** Contenu additionnel au-dessus du bloc identité (ex. langue dans le tiroir). */
  footer?: ReactNode;
}

const itemBase = cn(
  "group relative flex items-center gap-3 w-full min-h-[44px] px-3 rounded-[10px] text-[14px] text-left",
  "transition-[background-color,color] duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
);
const itemIdle = "font-medium text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]";
// eden-sidebar-active : recoloré par la couleur d'accent des Paramètres admin (AccentColorProvider).
const itemActive = "eden-sidebar-active font-semibold bg-[#EEF5EE] text-[#28543C]";
const iconIdle = "text-[#6B746E] group-hover:text-[#3F704D]";

/**
 * Navigation de l'espace membre : colonne fixe en lg+, contenu du tiroir en dessous.
 * Les destinations viennent toutes de `src/lib/member-nav.ts` ; plus aucune liste ici.
 */
export function DashboardSidebar({ variant = "fixed", onClose, footer }: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const {
    activeTab, goToTab, displayName, displayInitial, avatarUrl, displayLocation,
    badges, logoutGuard, logout,
  } = useMemberChrome();

  const isActive = (dest: MemberDest) => {
    if (dest.kind === "tab") return activeTab !== null && canonicalTab(activeTab) === dest.tab;
    if (dest.kind === "route") return pathname === dest.href || pathname.startsWith(`${dest.href}/`);
    return false;
  };

  const badgeFor = (id: string) =>
    id === "messages" ? badges.totalUnread : id === "requests" ? badges.incomingRequestCount : 0;

  const { badgeTargets } = useMemberAnnouncements();

  const premiumActive = activeTab !== null && canonicalTab(activeTab) === "Premium";

  return (
    <aside
      aria-label={t("dashboardSidebar.navLabel")}
      className={cn(
        "flex flex-col bg-[#FAF9F6]",
        variant === "fixed"
          ? "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 z-40 border-r border-[#E6EAE5]"
          : "h-full w-full"
      )}
    >
      {/* Marque */}
      <div className="h-[72px] flex items-center justify-between gap-2 px-5 shrink-0">
        <Link href="/dashboard" onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45">
          <Monogram className="w-10 h-9 text-[#1F4D3A] shrink-0" />
          <span className="font-headline text-[21px] font-bold leading-none text-[#1C241F]">
            Garden <span className="italic font-medium text-[#3F704D]">of Alliance</span>
          </span>
        </Link>
        {variant === "drawer" && onClose && (
          <button type="button" onClick={onClose} aria-label={t("dashboardSidebar.closeMenu")}
            className="w-11 h-11 -mr-2 rounded-lg flex items-center justify-center text-[#4A564F] hover:bg-[#F0F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 custom-scrollbar">
        {MEMBER_GROUPS.map((group, gi) => (
          <div key={group.key} className={cn(gi > 0 && "mt-6")}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B746E]">
              {t(group.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {group.dests.map((dest) => {
                // La déconnexion disparaît tant que des modifications ne sont pas enregistrées.
                if (dest.kind === "action" && logoutGuard) return null;

                const Icon = MEMBER_NAV_ICONS[dest.id];
                const active = isActive(dest);
                const count = badgeFor(dest.id);
                // « Nouveau » sur l'entrée désignée par `navHref ?? href` ; jamais à côté d'un compteur de non-lus.
                const href = destHref(dest);
                const isNew = count === 0 && href !== null && badgeTargets.includes(href);
                const icon = (
                  <Icon
                    className={cn("w-[19px] h-[19px] shrink-0 transition-colors duration-150",
                      dest.kind === "action" ? "text-[#B42318]" : active ? "text-current" : iconIdle)}
                    aria-hidden="true"
                  />
                );
                const body = (
                  <>
                    {active && <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--sidebar-active-bar,#28543C)]" />}
                    {icon}
                    <span className="flex-1">{t(dest.labelKey)}</span>
                    {isNew && <NewBadge />}
                    {count > 0 && (
                      <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#28543C] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                        {count > 9 ? "9+" : count}
                        <span className="sr-only"> {t("dashboardSidebar.unread")}</span>
                      </span>
                    )}
                  </>
                );
                const cls = cn(itemBase, active ? itemActive : itemIdle,
                  dest.kind === "action" && "text-[#B42318] hover:text-[#B42318] hover:bg-[#FEF2F2]");

                return (
                  <li key={dest.id}>
                    {dest.kind === "route" && (
                      <Link href={dest.href} onClick={onClose} aria-current={active ? "page" : undefined} className={cls}>{body}</Link>
                    )}
                    {dest.kind === "external" && (
                      <a href={dest.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={cls}>{body}</a>
                    )}
                    {dest.kind === "tab" && (
                      <button type="button" aria-current={active ? "page" : undefined} className={cls}
                        onClick={() => { goToTab(dest.tab); onClose?.(); }}>{body}</button>
                    )}
                    {dest.kind === "action" && (
                      <button type="button" className={cls} onClick={() => { onClose?.(); void logout(); }}>{body}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Appel à l'abonnement + identité (non interactive : « Profil » est déjà dans le menu) */}
      <div className="shrink-0 border-t border-[#E6EAE5] p-3 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {footer}

        {!premiumActive && (
          <button type="button" onClick={() => { goToTab("Premium"); onClose?.(); }}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left",
              "bg-[linear-gradient(135deg,#F3F8F2_0%,#FAF9F6_100%)] border border-[#DCE6DA]",
              "transition-[border-color,box-shadow] duration-150 hover:border-[#C6A15B]/60 hover:shadow-[0_4px_16px_rgba(20,40,30,0.06)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
            )}>
            <span className="w-9 h-9 rounded-lg bg-white ring-1 ring-[#C6A15B]/30 flex items-center justify-center shrink-0">
              <Crown className="w-[18px] h-[18px] text-[#C6A15B]" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[#1C241F]">{t("dashboardSidebar.upgrade")}</span>
              <span className="block text-[12px] text-[#5C665F] truncate">{t("dashboardSidebar.premiumCardText")}</span>
            </span>
          </button>
        )}

        <div className="flex items-center gap-3 px-2 py-1">
          <Avatar className="w-10 h-10 ring-1 ring-[#E6EAE5]">
            <AvatarImage src={avatarSrc(avatarUrl)} alt="" />
            <AvatarFallback className="bg-[#EEF5EE] text-[#28543C] font-semibold">{displayInitial}</AvatarFallback>
          </Avatar>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold text-[#1C241F] truncate">{displayName}</span>
            {displayLocation && <span className="block text-[12px] text-[#5C665F] truncate">{displayLocation}</span>}
          </span>
        </div>
      </div>
    </aside>
  );
}
