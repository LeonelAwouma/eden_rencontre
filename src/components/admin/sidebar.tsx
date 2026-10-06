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
  BookOpen, Send, Keyboard, MessagesSquare, Accessibility,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
  adminName: string;
}

const BRAND_GREEN = "#486B46";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard, section: "main", shortcut: "⌘D" },
  { label: "Utilisateurs", href: "/admin/users", icon: Users, section: "main", shortcut: "⌘U" },
  { label: "Matching", href: "/admin/matching", icon: Heart, section: "main" },
  { label: "Témoignages", href: "/admin/testimonials", icon: MessageSquare, section: "content" },
  { label: "Surveillance de la discussion", href: "/admin/chat-monitoring", icon: MessageCircle, section: "content" },
  { label: "Messagerie", href: "/admin/messages", icon: Send, section: "content" },
  { label: "Événements", href: "/admin/events", icon: CalendarDays, section: "content" },
  { label: "Visioconférences", href: "/admin/meets", icon: Video, section: "content" },
  { label: "Médiathèque", href: "/admin/mediatheque", icon: Library, section: "content" },
  { label: "Forum", href: "/admin/forum", icon: MessagesSquare, section: "content" },
  { label: "Blog", href: "/admin/blog", icon: BookOpen, section: "content" },
  { label: "Accessibilité", href: "/admin/accessibilite", icon: Accessibility, section: "platform" },
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
  // Tooltip du mode réduit : rendu hors de la nav (qui défile et rognerait un
  // tooltip en position absolue), aligné sur l'élément survolé.
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const showTooltip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, y: r.top + r.height / 2 });
  };

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

      <aside aria-label="Navigation de l'administration" className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col",
        "bg-white border-r border-[#ECE8E1]",
        "transition-[width,transform] duration-200 ease-out",
        "lg:translate-x-0", isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-[72px]" : "lg:w-[248px]", "w-[280px] max-w-[85vw]"
      )}>
        {/* Header */}
        <div className={cn("flex items-center border-b border-zinc-100 transition-all duration-300",
          isCollapsed ? "px-2 py-4 justify-center" : "px-4 py-4 justify-between")}>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 overflow-hidden">
                {/* Logo de marque, identique à l'espace membre : monogramme + « Garden of Alliance ».
                    Couleur en style inline : la couleur d'accent des Paramètres recolore toutes
                    les classes text-[#486B46] de l'admin, mais le logo reste vert. */}
                <Monogram className="w-9 h-8 flex-shrink-0" style={{ color: BRAND_GREEN }} />
                <div className="min-w-0">
                  <p className="font-headline text-[18px] leading-tight font-bold text-[#1F3328] truncate">
                    Garden <span className="italic font-normal" style={{ color: BRAND_GREEN }}>of Alliance</span>
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Administration</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <Monogram className="w-9 h-8" style={{ color: BRAND_GREEN }} />
          )}
          <button onClick={onClose} aria-label="Fermer le menu" className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-[#56615A] hover:text-zinc-900 hover:bg-zinc-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 custom-scrollbar">
          {SECTIONS.map((section, sectionIndex) => {
            const items = NAV_ITEMS.filter((i) => i.section === section.key);
            return (
              <div key={section.key} className={cn(sectionIndex > 0 && (isCollapsed ? "mt-2" : "mt-6"))}>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5F6B63] px-3 pb-2">
                      {section.label}
                    </motion.p>
                  )}
                </AnimatePresence>
                {isCollapsed && sectionIndex > 0 && <div className="mx-2 mb-2 h-px bg-[#ECE8E1]" />}
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <div key={item.href} className="relative group">
                        <Link href={item.href}
                          aria-current={active ? "page" : undefined}
                          aria-label={isCollapsed ? item.label : undefined}
                          onMouseEnter={showTooltip(item.label)}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={showTooltip(item.label)}
                          onBlur={() => setTooltip(null)}
                          className={cn(
                            "flex items-center gap-3 rounded-[10px] transition-colors duration-150 relative",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            isCollapsed ? "justify-center w-11 h-10 mx-auto" : "px-3 py-2 min-h-[38px]",
                            active ? "bg-primary/[0.08] text-[#2F5A2D]" : "text-[#4A534D] hover:bg-[#F5F3EF] hover:text-[#1F2A23]"
                          )}>
                          <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
                            active ? "text-primary" : "text-[#6B746E] group-hover:text-[#3A443E]")} aria-hidden="true" />
                          {!isCollapsed && (
                            <span className={cn("text-[14px] leading-snug flex-1 min-w-0", active ? "font-semibold" : "font-medium")}>
                              {item.label}
                            </span>
                          )}
                          {!isCollapsed && item.shortcut && (
                            <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                              active ? "text-primary/70 border-primary/15 bg-primary/5" : "text-[#6B746E] border-zinc-200 bg-zinc-50")}>
                              {item.shortcut}
                            </span>
                          )}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {isCollapsed && tooltip && (
          <div role="tooltip" style={{ top: tooltip.y }}
            className="hidden lg:block fixed left-[80px] -translate-y-1/2 z-[60] pointer-events-none">
            <div className="relative bg-[#1F2A23] text-white text-[12px] font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              {tooltip.label}
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1F2A23]" />
            </div>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        {!isCollapsed && (
          <div className="mx-3 mb-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <Keyboard className="w-3.5 h-3.5 text-[#6B746E]" aria-hidden="true" />
              <span className="text-[11px] text-[#5F6B63] font-medium">
                Appuyez sur <kbd className="px-1 py-0.5 bg-white rounded border border-zinc-200 text-zinc-500 font-mono text-[9px]">?</kbd> pour les raccourcis
              </span>
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <div className="hidden lg:block px-3 pb-1">
          <button onClick={onToggleCollapse} aria-label={isCollapsed ? "Déployer le menu" : "Réduire le menu"} aria-expanded={!isCollapsed}
            className={cn("flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-[#5F6B63] hover:text-[#1F2A23] hover:bg-[#F5F3EF] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isCollapsed && "justify-center px-0")}>
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span className="whitespace-nowrap">Réduire</span></>}
          </button>
        </div>

        {/* User / Logout */}
        <div className={cn("border-t border-[#ECE8E1]", isCollapsed ? "p-2" : "p-3")}>
          <div className={cn("flex items-center mb-1", isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2")}>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[13px] font-semibold text-zinc-900 truncate">{adminName}</p>
                  <p className="text-[12px] text-[#5F6B63] font-medium">Super Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={onLogout}
            aria-label={isCollapsed ? "Déconnexion" : undefined}
            className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[14px] font-medium text-[#56615A] hover:bg-red-50 hover:text-red-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
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
