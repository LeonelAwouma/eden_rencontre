"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MEMBER_PRIMARY, type MemberDest } from "@/lib/member-nav";
import { canonicalTab } from "./dashboard-types";
import { MEMBER_NAV_ICONS } from "./member-nav-icons";
import { useMemberChrome } from "./member-chrome";

const itemBase = cn(
  "relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 h-full px-1",
  "transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3F704D]/45"
);
const labelClass = "text-[10px] font-semibold tracking-wide truncate max-w-full";

function Badge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#28543C] text-white text-[10px] font-bold flex items-center justify-center tabular-nums ring-2 ring-white">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/**
 * Barre inférieure unique de l'espace membre, mobile et tablette (< 1024 px).
 * Cinq entrées : Accueil, Découvrir, Messages, Communauté (forum), Menu.
 *
 * Masquée sur les écrans immersifs (conversation ouverte, forum) : c'est ce qui
 * empêche toute superposition avec le champ de saisie.
 */
export function MemberBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { immersive, activeTab, goToTab, badges, menuOpen, setMenuOpen } = useMemberChrome();

  if (immersive) return null;

  const isActive = (dest: MemberDest) => {
    if (dest.kind === "tab") return activeTab !== null && canonicalTab(activeTab) === dest.tab;
    if (dest.kind === "route") return pathname === dest.href || pathname.startsWith(`${dest.href}/`);
    return false;
  };

  const labelOf = (dest: MemberDest) =>
    // « Forum » est présenté comme « Communauté » dans la barre, comme dans la mission.
    dest.id === "forum" ? t("memberNav.community") : t(dest.labelKey);

  const colour = (active: boolean) => (active ? "text-[#28543C]" : "text-[#6B746E]");
  const menuBadge = badges.incomingRequestCount + badges.notifCount;

  return (
    <nav
      aria-label={t("memberNav.navLabel")}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 member-nav-h pb-[env(safe-area-inset-bottom)] flex items-stretch bg-white/95 backdrop-blur-xl border-t border-[#E6EAE5]"
    >
      {MEMBER_PRIMARY.map((dest) => {
        const active = isActive(dest);
        const Icon = MEMBER_NAV_ICONS[dest.id];
        const content = (
          <>
            <span className="relative">
              <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
              {dest.id === "messages" && <Badge count={badges.totalUnread} label={t("dashboardSidebar.unread")} />}
            </span>
            <span className={labelClass}>{labelOf(dest)}</span>
            {active && <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[var(--sidebar-active-bar,#28543C)]" />}
          </>
        );

        if (dest.kind === "route") {
          return (
            <Link key={dest.id} href={dest.href} aria-current={active ? "page" : undefined} className={cn(itemBase, colour(active))}>
              {content}
            </Link>
          );
        }
        if (dest.kind === "tab") {
          return (
            <button key={dest.id} type="button" onClick={() => goToTab(dest.tab)} aria-current={active ? "page" : undefined} className={cn(itemBase, colour(active))}>
              {content}
            </button>
          );
        }
        return null;
      })}

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className={cn(itemBase, colour(menuOpen))}
      >
        <span className="relative">
          <Menu className="w-[22px] h-[22px]" aria-hidden="true" />
          <Badge count={menuBadge} label={t("dashboardSidebar.unread")} />
        </span>
        <span className={labelClass}>{t("memberNav.menu")}</span>
      </button>
    </nav>
  );
}
