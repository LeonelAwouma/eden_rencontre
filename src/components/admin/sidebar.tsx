"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import {
  LayoutDashboard, Users, CalendarDays, ShieldCheck, BarChart3,
  CreditCard, Settings, LogOut, X, Heart, MessageSquare,
  MessageCircle, PanelLeftClose, PanelLeftOpen, Video, Library,
  BookOpen, Send, Keyboard,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
  adminName: string;
}

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard, section: "main", shortcut: "⌘D" },
  { label: "Utilisateurs", href: "/admin/users", icon: Users, section: "main", shortcut: "⌘U" },
  { label: "Matching", href: "/admin/matching", icon: Heart, section: "main" },
  { label: "Témoignages", href: "/admin/testimonials", icon: MessageSquare, section: "content" },
  { label: "Chat Monitoring", href: "/admin/chat-monitoring", icon: MessageCircle, section: "content" },
  { label: "Messagerie", href: "/admin/messages", icon: Send, section: "content" },
  { label: "Événements", href: "/admin/events", icon: CalendarDays, section: "content" },
  { label: "Google Meets", href: "/admin/meets", icon: Video, section: "content" },
  { label: "Médiathèque", href: "/admin/mediatheque", icon: Library, section: "content" },
  { label: "Blog", href: "/admin/blog", icon: BookOpen, section: "content" },
  { label: "Rapports", href: "/admin/reports", icon: ShieldCheck, section: "platform" },
  { label: "Paiements", href: "/admin/payments", icon: CreditCard, section: "platform" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, section: "platform" },
  { label: "Paramètres", href: "/admin/settings", icon: Settings, section: "platform" },
];

const SECTIONS = [
  { key: "main", label: "Général" },
  { key: "content", label: "Contenu & Communication" },
  { key: "platform", label: "Plateforme" },
];

export function Sidebar({
  isOpen, isCollapsed, onClose, onToggleCollapse, onLogout, adminName,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    const itemPath = item.href.split("?")[0];
    const itemSearchParams = new URL(item.href, "http://localhost").searchParams;
    if (item.href === "/admin/dashboard") return pathname === "/admin/dashboard";
    if (itemSearchParams.has("status")) {
      return pathname === itemPath && searchParams.get("status") === itemSearchParams.get("status");
    }
    return pathname.startsWith(itemPath);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 lg:hidden" />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col",
        "bg-white border-r border-zinc-100 shadow-[0_0_40px_-12px_rgba(0,0,0,0.06)]",
        "transition-all duration-300 ease-in-out",
        "lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-[68px]" : "lg:w-[256px]", "w-[280px]"
      )}>
        {/* Header */}
        <div className={cn("flex items-center border-b border-zinc-100 transition-all duration-300",
          isCollapsed ? "px-2 py-4 justify-center" : "px-4 py-4 justify-between")}>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 overflow-hidden">
                {/* Logo de marque, identique à l'espace membre : monogramme + « Garden of Alliance » */}
                <Monogram className="w-9 h-8 text-[#486B46] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-headline text-[18px] leading-tight font-bold text-[#1F3328] truncate">
                    Garden <span className="italic font-normal text-[#486B46]">of Alliance</span>
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Administration</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <Monogram className="w-9 h-8 text-[#486B46]" />
          )}
          <button onClick={onClose} className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          {SECTIONS.map((section, sectionIndex) => {
            const items = NAV_ITEMS.filter((i) => i.section === section.key);
            return (
              <div key={section.key} className={cn(sectionIndex > 0 && "mt-0.5")}>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 px-3 pt-5 pb-1.5">
                      {section.label}
                    </motion.p>
                  )}
                </AnimatePresence>
                {isCollapsed && sectionIndex > 0 && <div className="mx-3 my-3 h-px bg-zinc-100" />}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <div key={item.href} className="relative group">
                        <Link href={item.href}
                          onMouseEnter={() => setHoveredItem(item.href)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg transition-all duration-150 relative",
                            isCollapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2 mx-1",
                            active ? "bg-[#F0FDF4] text-[#3D6B3B]" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                          )}>
                          {active && (
                            <motion.div layoutId="sidebar-active-indicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#3D6B3B] rounded-r-full"
                              transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                          )}
                          <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 transition-colors",
                            active ? "text-[#3D6B3B]" : "text-zinc-400 group-hover:text-zinc-500")} />
                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }}
                                className={cn("text-[13px] whitespace-nowrap overflow-hidden flex-1",
                                  active ? "font-semibold text-[#3D6B3B]" : "font-medium")}>
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {!isCollapsed && item.shortcut && (
                            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border opacity-0 group-hover:opacity-100 transition-opacity",
                              active ? "text-[#3D6B3B]/60 border-[#3D6B3B]/15 bg-[#3D6B3B]/5" : "text-zinc-300 border-zinc-200 bg-zinc-50")}>
                              {item.shortcut}
                            </span>
                          )}
                        </Link>
                        <AnimatePresence>
                          {isCollapsed && hoveredItem === item.href && (
                            <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }} transition={{ duration: 0.15 }}
                              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50">
                              <div className="bg-zinc-900 text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                {item.label}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Keyboard shortcuts hint */}
        {!isCollapsed && (
          <div className="mx-3 mb-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <Keyboard className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-[10px] text-zinc-400 font-medium">
                Appuyez sur <kbd className="px-1 py-0.5 bg-white rounded border border-zinc-200 text-zinc-500 font-mono text-[9px]">?</kbd> pour les raccourcis
              </span>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="hidden lg:block px-2 pb-1">
          <button onClick={onToggleCollapse}
            className={cn("flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all duration-200",
              isCollapsed && "justify-center px-0")}>
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span className="whitespace-nowrap">Réduire</span></>}
          </button>
        </div>

        {/* User / Logout */}
        <div className={cn("border-t border-zinc-100 transition-all duration-300", isCollapsed ? "p-2" : "p-3")}>
          <div className={cn("flex items-center mb-1", isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2")}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3D6B3B] to-[#5A7D54] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[13px] font-semibold text-zinc-900 truncate">{adminName}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">Super Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={onLogout}
            className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200",
              isCollapsed && "justify-center px-0")}>
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden whitespace-nowrap">
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>
    </>
  );
}
