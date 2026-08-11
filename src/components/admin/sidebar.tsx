"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShieldCheck,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
  adminName: string;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    section: "main",
  },
  {
    label: "Utilisateurs",
    href: "/admin/users",
    icon: Users,
    section: "main",
  },
  {
    label: "Matching",
    href: "/admin/matching",
    icon: Heart,
    section: "main",
  },
  {
    label: "Témoignages",
    href: "/admin/testimonials",
    icon: MessageSquare,
    section: "engagement",
  },
  {
    label: "Chat Monitoring",
    href: "/admin/chat-monitoring",
    icon: MessageCircle,
    section: "engagement",
  },
  {
    label: "Meets",
    href: "/admin/events",
    icon: CalendarDays,
    section: "engagement",
  },
  {
    label: "Rendez-vous vidéo",
    href: "/admin/meetings",
    icon: CalendarDays,
    section: "engagement",
  },
  {
    label: "Rapports",
    href: "/admin/reports",
    icon: ShieldCheck,
    section: "system",
  },
  {
    label: "Paiements",
    href: "/admin/payments",
    icon: CreditCard,
    section: "system",
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    section: "system",
  },
  {
    label: "Paramètres",
    href: "/admin/settings",
    icon: Settings,
    section: "system",
  },
];

const SECTIONS = [
  { key: "main", label: "Principal" },
  { key: "engagement", label: "Engagement" },
  { key: "system", label: "Système" },
];

export function Sidebar({
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  onLogout,
  adminName,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    const itemPath = item.href.split("?")[0];
    const itemSearchParams = new URL(
      item.href,
      "http://localhost"
    ).searchParams;

    if (item.href === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    } else if (itemSearchParams.has("status")) {
      return (
        pathname === itemPath &&
        searchParams.get("status") === itemSearchParams.get("status")
      );
    } else {
      const hasStatusParam = searchParams.has("status");
      if (itemPath === "/admin/users" && hasStatusParam) {
        return false;
      }
      return pathname.startsWith(itemPath);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          "bg-white border-r border-[#E8E5E0]",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full",
          // Width: collapsed vs expanded
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            "flex items-center flex-shrink-0 h-[64px] border-b border-[#E8E5E0]/60 transition-all duration-300",
            isCollapsed ? "justify-center px-3" : "gap-3 px-5"
          )}
        >
          <Monogram className="w-8 h-7 text-[#486B46] shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p
                  className="font-bold text-sm text-[#2F2F2F] tracking-tight whitespace-nowrap"
                  style={{
                    fontFamily:
                      "'Playfair Display', 'Plus Jakarta Sans', serif",
                  }}
                >
                  Eden{" "}
                  <span className="italic font-normal" style={{ color: "#486B46" }}>
                    Connexion
                  </span>
                </p>
                <p className="text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-[0.1em] whitespace-nowrap">
                  Administration
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className={cn(
              "lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#2F2F2F] hover:bg-[#F3F4F6] transition-all ml-auto"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
          {SECTIONS.map((section) => {
            const sectionItems = NAV_ITEMS.filter(
              (item) => item.section === section.key
            );
            return (
              <div key={section.key} className="mb-1">
                {/* Section label */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "px-4 mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]",
                        isCollapsed && "sr-only"
                      )}
                    >
                      {section.label}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Nav items */}
                <div className={cn("space-y-0.5", isCollapsed ? "px-2" : "px-2")}>
                  {sectionItems.map((item) => {
                    const active = isActive(item);
                    return (
                      <div key={item.label} className="relative">
                        <Link
                          href={item.href}
                          onClick={onClose}
                          onMouseEnter={() => setHoveredItem(item.label)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={cn(
                            "group flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 relative",
                            isCollapsed
                              ? "justify-center px-0 py-2.5 mx-1"
                              : "gap-3 px-3 py-2.5",
                            active
                              ? "bg-[#EEF5EC] text-[#486B46] font-semibold"
                              : "text-[#777777] hover:bg-[#F8F5F2] hover:text-[#2F2F2F]"
                          )}
                        >
                          {/* Active indicator bar */}
                          {active && (
                            <motion.div
                              layoutId="sidebar-active-indicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[#486B46] rounded-r-full"
                              transition={{
                                type: "spring",
                                stiffness: 350,
                                damping: 30,
                              }}
                            />
                          )}

                          <item.icon
                            className={cn(
                              "w-[18px] h-[18px] transition-colors flex-shrink-0",
                              active
                                ? "text-[#486B46]"
                                : "text-[#9CA3AF] group-hover:text-[#777777]"
                            )}
                          />

                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden whitespace-nowrap"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>

                        {/* Tooltip for collapsed state */}
                        <AnimatePresence>
                          {isCollapsed && hoveredItem === item.label && (
                            <motion.div
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none"
                            >
                              <div className="bg-[#2F2F2F] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                {item.label}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#2F2F2F]" />
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

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block px-2 pb-2">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[12px] font-medium text-[#9CA3AF] hover:text-[#777777] hover:bg-[#F8F5F2] transition-all duration-200",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4" />
                <span className="whitespace-nowrap">Réduire le menu</span>
              </>
            )}
          </button>
        </div>

        {/* User / Logout */}
        <div
          className={cn(
            "border-t border-[#E8E5E0]/60 transition-all duration-300",
            isCollapsed ? "p-2" : "p-3"
          )}
        >
          <div
            className={cn(
              "flex items-center mb-1",
              isCollapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#486B46] to-[#6E8B63] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-[13px] font-semibold text-[#2F2F2F] truncate">
                    {adminName}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF]">Super Admin</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onLogout}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#777777] hover:bg-[#FEF2F2] hover:text-[#F56565] transition-all duration-200",
              isCollapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
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