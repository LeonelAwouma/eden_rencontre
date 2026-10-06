"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  MessageCircle,
  Star,
  Eye,
  Heart,
  Crown,
  UserCircle,
  LogOut, GraduationCap, MessagesSquare, Accessibility
} from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import type { Tab } from "./dashboard-types";

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
}

const sidebarNav: { name: Tab; icon: any; badge?: number; dot?: boolean; highlight?: boolean }[] = [
  { name: "Home", icon: Home },
  { name: "Discover", icon: Search },
  { name: "Messages", icon: MessageCircle },
  { name: "Requests", icon: Star },
  { name: "Visitors", icon: Eye },
  { name: "Favorites", icon: Heart },
  { name: "Profile", icon: UserCircle },
];

export function DashboardSidebar({
  activeTab,
  setActiveTab,
  displayName,
  displayInitial,
  myAvatar,
  displayLocation,
  totalUnread,
  incomingRequestCount,
  onLogout,
}: SidebarProps) {
  const router = useRouter();
  const { t, locale } = useI18n();

  const handleNavClick = (name: Tab) => {
    if (name === "Profile") {
      router.push("/dashboard/profile");
    } else {
      setActiveTab(name);
    }
  };

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-[280px] z-40"
      style={{ background: "#FAF9F6", borderRight: "1px solid #E8E5E0" }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="h-20 flex items-center px-6 shrink-0"
        style={{ borderBottom: "1px solid #E8E5E0" }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Monogram className="w-9 h-8 text-primary shrink-0 group-hover:scale-110 transition-transform duration-500" />
          <span className="font-headline text-xl font-bold text-foreground">
            Garden{" "}
            <span className="italic font-normal" style={{ color: "#486B46" }}>
              of Alliance
            </span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar" role="menubar">
        {sidebarNav.map((item) => {
          const active = activeTab === item.name;
          const badgeCount =
            item.name === "Messages"
              ? totalUnread
              : item.name === "Requests"
              ? incomingRequestCount
              : 0;
          return (
            <button
              key={item.name}
              role="menuitem"
              onClick={() => handleNavClick(item.name)}
              className={cn("sidebar-nav-item", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  item.highlight && !active && "text-[#C6A15B]"
                )}
              />
              <span className="flex-1 text-left">{t(TAB_LABEL_KEY[item.name] || item.name)}</span>
              {badgeCount > 0 && (
                <span
                  className="w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center"
                  style={{
                    background: "#486B46",
                    color: "#FFFFFF",
                  }}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
        {/* Forum : échanges entre tous les membres sur les thèmes de l'Académie. */}
        <Link href="/dashboard/forum" role="menuitem" className="sidebar-nav-item">
          <MessagesSquare className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-left">{t("forum.title")}</span>
        </Link>
        {/* Avis sur l'accessibilité de la plateforme. */}
        <Link href="/dashboard/accessibilite" role="menuitem" className="sidebar-nav-item">
          <Accessibility className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-left">{locale === "fr" ? "Accessibilité" : "Accessibility"}</span>
        </Link>
        {/* Académie du mariage : une page à part entière (formation « Bâtir sur le roc »). */}
        <Link href="/dashboard/academie" role="menuitem" className="sidebar-nav-item">
          <GraduationCap className="w-5 h-5 shrink-0" />
          <span className="flex-1 text-left">{t("dashboard.academyTitle")}</span>
        </Link>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-4 shrink-0" style={{ borderTop: "1px solid #E8E5E0" }}>
        {/* Premium Card */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: "linear-gradient(135deg, #EEF5EC 0%, #FAF9F6 100%)",
            border: "1px solid #C6D4C0",
          }}
        >
          <Crown className="w-6 h-6 mx-auto mb-2" style={{ color: "#C6A15B" }} />
          <p className="font-headline font-bold text-sm" style={{ color: "#2F2F2F" }}>
            {t("dashboardSidebar.premiumCardTitle")}
          </p>
          <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: "#777777" }}>
            {t("dashboardSidebar.premiumCardText")}
          </p>
          <Button
            onClick={() => setActiveTab("Premium")}
            className="w-full h-9 font-bold rounded-xl text-xs"
            style={{ background: "#486B46", color: "#FFFFFF" }}
          >
            {t("dashboardSidebar.upgrade")}
          </Button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10" style={{ border: "1px solid #E8E5E0" }}>
            <AvatarImage src={avatarSrc(myAvatar)} />
            <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>
              {displayInitial}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => handleNavClick("Profile")}
            className="flex-1 min-w-0 text-left group"
          >
            <p
              className="text-sm font-bold truncate group-hover:transition-colors"
              style={{ color: "#2F2F2F" }}
            >
              {displayName}
            </p>
            <p className="text-xs truncate" style={{ color: "#777777" }}>
              {displayLocation}
            </p>
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title={t("dashboardSidebar.logout")}
              className="transition-colors p-1 hover:opacity-70"
              style={{ color: "#777777" }}
              aria-label={t("dashboardSidebar.logout")}
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}