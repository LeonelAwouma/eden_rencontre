"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COACH_PRIMARY, isCoachRouteActive } from "@/lib/coach-nav";
import { COACH_NAV_ICONS } from "./coach-nav-icons";
import { useCoachChrome } from "./coach-chrome";

const itemBase = cn(
  "relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 h-full px-1",
  "transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3F704D]/45"
);
const labelClass = "text-[10px] font-semibold tracking-wide truncate max-w-full";

/** Barre inférieure mobile et tablette (< 1024 px) : les entrées principales + « Menu » (tiroir). */
export function CoachBottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { menuOpen, setMenuOpen } = useCoachChrome();
  const colour = (active: boolean) => (active ? "text-[#28543C]" : "text-[#6B746E]");

  return (
    <nav aria-label={t("coachNav.navLabel")}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 member-nav-h pb-[env(safe-area-inset-bottom)] flex items-stretch bg-white/95 backdrop-blur-xl border-t border-[#E6EAE5]">
      {COACH_PRIMARY.map((dest) => {
        if (dest.kind !== "route") return null;
        const active = isCoachRouteActive(pathname, dest.href);
        const Icon = COACH_NAV_ICONS[dest.id];
        return (
          <Link key={dest.id} href={dest.href} aria-current={active ? "page" : undefined} className={cn(itemBase, colour(active))}>
            <Icon className="w-[22px] h-[22px]" aria-hidden="true" />
            <span className={labelClass}>{t(dest.labelKey)}</span>
            {active && <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-[#28543C]" />}
          </Link>
        );
      })}
      <button type="button" onClick={() => setMenuOpen(true)} aria-haspopup="dialog" aria-expanded={menuOpen}
        className={cn(itemBase, colour(menuOpen))}>
        <Menu className="w-[22px] h-[22px]" aria-hidden="true" />
        <span className={labelClass}>{t("coachNav.menu")}</span>
      </button>
    </nav>
  );
}
