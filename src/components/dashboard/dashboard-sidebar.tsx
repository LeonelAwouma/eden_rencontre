"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Search,
  MessageCircle,
  Star,
  Eye,
  Heart,
  Bell,
  Crown,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import type { Tab } from "./dashboard-types";

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  displayName: string;
  displayInitial: string;
  myAvatar: string | undefined;
  displayLocation: string;
  totalUnread: number;
  incomingRequestCount: number;
  onLogout: () => void;
}

const sidebarNav: { name: Tab; icon: any; badge?: number; dot?: boolean; highlight?: boolean }[] = [
  { name: "Accueil", icon: Home },
  { name: "Découvrir", icon: Search },
  { name: "Messages", icon: MessageCircle },
  { name: "Demandes", icon: Star },
  { name: "Visiteurs", icon: Eye },
  { name: "Favoris", icon: Heart },
  { name: "Notifications", icon: Bell },
  { name: "Premium", icon: Crown, highlight: true },
  { name: "Profil", icon: Settings },
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
  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-[280px] z-40"
      style={{ background: "#FAF9F6", borderRight: "1px solid #E8E5E0" }}
      role="navigation"
      aria-label="Navigation principale"
    >
      {/* Logo */}
      <div
        className="h-20 flex items-center px-6 shrink-0"
        style={{ borderBottom: "1px solid #E8E5E0" }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <Monogram className="w-9 h-8 text-primary shrink-0 group-hover:text-secondary transition-colors" />
          <span className="font-headline text-xl font-bold text-foreground">
            Eden{" "}
            <span className="italic font-normal" style={{ color: "#486B46" }}>
              Rencontre
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
              : item.name === "Demandes"
              ? incomingRequestCount
              : 0;
          return (
            <button
              key={item.name}
              role="menuitem"
              onClick={() => setActiveTab(item.name)}
              className={cn("sidebar-nav-item", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  item.highlight && !active && "text-[#C6A15B]"
                )}
              />
              <span className="flex-1 text-left">{item.name}</span>
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
              {item.name === "Notifications" && totalUnread > 0 && !badgeCount && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#486B46" }}
                />
              )}
            </button>
          );
        })}
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
            Eden Or
          </p>
          <p className="text-xs mt-1 mb-3 leading-relaxed" style={{ color: "#777777" }}>
            Visibilité et messages illimités
          </p>
          <Button
            onClick={() => setActiveTab("Premium")}
            className="w-full h-9 font-bold rounded-xl text-xs"
            style={{ background: "#486B46", color: "#FFFFFF" }}
          >
            S'élever
          </Button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10" style={{ border: "1px solid #E8E5E0" }}>
            <AvatarImage src={myAvatar} />
            <AvatarFallback style={{ background: "#EEF5EC", color: "#486B46" }}>
              {displayInitial}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => setActiveTab("Profil")}
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
          <button
            onClick={onLogout}
            title="Se déconnecter"
            className="transition-colors p-1 hover:opacity-70"
            style={{ color: "#777777" }}
            aria-label="Se déconnecter"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}