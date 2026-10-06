"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home, Search, MessageCircle, Star, Eye, Heart, Crown, UserCircle, LogOut, GraduationCap,
  MessagesSquare, Accessibility, ChevronsUpDown, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import type { Tab } from "./dashboard-types";

/** Largeur de la sidebar desktop : les pages décalent leur contenu d'autant (lg:pl-64). */
export const SIDEBAR_OFFSET_CLASS = "lg:pl-64";

const TAB_LABEL_KEY: Record<string, string> = {
  Home: "dashboardTabs.home", Accueil: "dashboardTabs.home",
  Discover: "dashboardTabs.discover", Découvrir: "dashboardTabs.discover",
  Visitors: "dashboardTabs.visitors", Visiteurs: "dashboardTabs.visitors",
  Favorites: "dashboardTabs.favorites", Favoris: "dashboardTabs.favorites",
  Requests: "dashboardTabs.requests", Demandes: "dashboardTabs.requests",
  Premium: "dashboardTabs.premium",
  Messages: "dashboardTabs.messages",
  Notifications: "dashboardTabs.notifications",
  Profile: "dashboardTabs.profile", Profil: "dashboardTabs.profile",
};

/** Onglets équivalents (FR / EN) : « Accueil » et « Home » désignent le même écran. */
const SAME_TAB: Record<string, string> = {
  Accueil: "Home", Découvrir: "Discover", Visiteurs: "Visitors", Favoris: "Favorites", Demandes: "Requests", Profil: "Profile",
};
const canonical = (tab: string) => SAME_TAB[tab] ?? tab;

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  displayName: string;
  displayInitial: string;
  myAvatar: string | undefined;
  displayLocation: string;
  totalUnread: number;
  incomingRequestCount: number;
  /** Déconnexion : fournie uniquement sur le profil (jamais pendant un questionnaire). */
  onLogout?: () => void;
  /** « fixed » : colonne desktop ; « drawer » : contenu du tiroir mobile. */
  variant?: "fixed" | "drawer";
  /** Tiroir mobile : fermeture (après navigation ou via la croix). */
  onClose?: () => void;
}

type NavEntry =
  | { kind: "tab"; tab: Tab; icon: LucideIcon }
  | { kind: "link"; href: string; icon: LucideIcon; label: (t: (k: string) => string, locale: string) => string };

const GROUPS: { key: string; entries: NavEntry[] }[] = [
  {
    key: "groupMain",
    entries: [
      { kind: "tab", tab: "Home", icon: Home },
      { kind: "tab", tab: "Discover", icon: Search },
      { kind: "tab", tab: "Messages", icon: MessageCircle },
      { kind: "tab", tab: "Requests", icon: Star },
    ],
  },
  {
    key: "groupMine",
    entries: [
      { kind: "tab", tab: "Visitors", icon: Eye },
      { kind: "tab", tab: "Favorites", icon: Heart },
      { kind: "tab", tab: "Profile", icon: UserCircle },
    ],
  },
  {
    key: "groupCommunity",
    entries: [
      { kind: "link", href: "/dashboard/forum", icon: MessagesSquare, label: (t) => t("forum.title") },
      { kind: "link", href: "/dashboard/academie", icon: GraduationCap, label: (t) => t("dashboard.academyTitle") },
    ],
  },
  {
    key: "groupSettings",
    entries: [
      { kind: "link", href: "/dashboard/accessibilite", icon: Accessibility, label: (_t, locale) => (locale === "en" ? "Accessibility" : "Accessibilité") },
    ],
  },
];

const itemBase = cn(
  "group relative flex items-center gap-3 w-full min-h-[44px] px-3 rounded-[10px] text-[14px] text-left",
  "transition-[background-color,color] duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
);
const itemIdle = "font-medium text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]";
// eden-sidebar-active : recoloré par la couleur d'accent des Paramètres admin (AccentColorProvider).
const itemActive = "eden-sidebar-active font-semibold bg-[#EEF5EE] text-[#28543C]";

export function DashboardSidebar({
  activeTab, setActiveTab, displayName, displayInitial, myAvatar, displayLocation,
  totalUnread, incomingRequestCount, onLogout, variant = "fixed", onClose,
}: SidebarProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const current = canonical(activeTab);

  const goTab = (tab: Tab) => {
    if (tab === "Profile") router.push("/dashboard/profile");
    else setActiveTab(tab);
    onClose?.();
  };

  const badgeFor = (tab: Tab) => (tab === "Messages" ? totalUnread : tab === "Requests" ? incomingRequestCount : 0);

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
      {/* ── 1. Marque ── */}
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
            className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-[#4A564F] hover:bg-[#F0F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── 2. Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        {GROUPS.map((group, gi) => (
          <div key={group.key} className={cn(gi > 0 && "mt-6")}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B746E]">
              {t(`dashboardSidebar.${group.key}`)}
            </p>
            <ul className="space-y-0.5">
              {group.entries.map((entry) => {
                if (entry.kind === "link") {
                  const Icon = entry.icon;
                  return (
                    <li key={entry.href}>
                      <Link href={entry.href} onClick={onClose} className={cn(itemBase, itemIdle)}>
                        <Icon className="w-[19px] h-[19px] shrink-0 text-[#6B746E] group-hover:text-[#3F704D] transition-colors duration-150" aria-hidden="true" />
                        <span className="flex-1">{entry.label(t, locale)}</span>
                      </Link>
                    </li>
                  );
                }
                const active = current === entry.tab;
                const count = badgeFor(entry.tab);
                const Icon = entry.icon;
                return (
                  <li key={entry.tab}>
                    <button type="button" onClick={() => goTab(entry.tab)} aria-current={active ? "page" : undefined}
                      className={cn(itemBase, active ? itemActive : itemIdle)}>
                      {active && <span aria-hidden="true" className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--sidebar-active-bar,#28543C)]" />}
                      <Icon className={cn("w-[19px] h-[19px] shrink-0 transition-colors duration-150",
                        active ? "text-current" : "text-[#6B746E] group-hover:text-[#3F704D]")} aria-hidden="true" />
                      <span className="flex-1">{t(TAB_LABEL_KEY[entry.tab] || entry.tab)}</span>
                      {count > 0 && (
                        <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#28543C] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                          {count > 9 ? "9+" : count}
                          <span className="sr-only"> {t("dashboardSidebar.unread")}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── 3. Abonnement + profil ── */}
      <div className="shrink-0 border-t border-[#E6EAE5] p-3 space-y-2">
        {current !== "Premium" && (
          <button type="button" onClick={() => goTab("Premium")}
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

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-[#F0F4EF]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
            )}
            aria-label={t("dashboardSidebar.accountMenu")}>
            <Avatar className="w-10 h-10 ring-1 ring-[#E6EAE5]">
              <AvatarImage src={avatarSrc(myAvatar)} alt="" />
              <AvatarFallback className="bg-[#EEF5EE] text-[#28543C] font-semibold">{displayInitial}</AvatarFallback>
            </Avatar>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold text-[#1C241F] truncate">{displayName}</span>
              {displayLocation && <span className="block text-[12px] text-[#5C665F] truncate">{displayLocation}</span>}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-[#6B746E] shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-[220px] rounded-xl">
            <DropdownMenuItem onSelect={() => goTab("Profile")}>
              <UserCircle className="w-4 h-4 mr-2" /> {t("dashboardSidebar.viewProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => goTab("Premium")}>
              <Crown className="w-4 h-4 mr-2 text-[#C6A15B]" /> {t("dashboardTabs.premium")}
            </DropdownMenuItem>
            {onLogout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout} className="text-[#B42318] focus:text-[#B42318]">
                  <LogOut className="w-4 h-4 mr-2" /> {t("dashboardSidebar.logout")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
