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
  ChevronDown,
  Heart,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { Monogram } from "@/components/ornaments";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  adminName: string;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Utilisateurs",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Matching",
    href: "/admin/matching",
    icon: Heart,
  },
  {
    label: "Témoignages",
    href: "/admin/testimonials",
    icon: MessageSquare,
  },
  {
    label: "Chat Monitoring",
    href: "/admin/chat-monitoring",
    icon: MessageCircle,
  },
  {
    label: "Meets",
    href: "/admin/events",
    icon: CalendarDays,
  },
  {
    label: "Rendez-vous vidéo",
    href: "/admin/meetings",
    icon: CalendarDays,
  },
  {
    label: "Rapports",
    href: "/admin/reports",
    icon: ShieldCheck,
  },
  {
    label: "Paiements",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Paramètres",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function Sidebar({ isOpen, onClose, onLogout, adminName }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[272px] bg-white flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto",
          "border-r border-[#E5E7EB]/60",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo area */}
        <div className="h-[72px] flex items-center gap-3 px-6 flex-shrink-0">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <div>
            <p
              className="font-bold text-[15px] text-[#1a1a1a] tracking-tight"
              style={{ fontFamily: "'Playfair Display', 'Plus Jakarta Sans', serif" }}
            >
              Eden{" "}
              <span className="italic font-normal" style={{ color: "#486B46" }}>
                Connexion
              </span>
            </p>
            <p className="text-[10px] text-[#9CA3AF] font-medium uppercase tracking-[0.12em]">
              Administration
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563] hover:bg-[#F3F4F6] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-[#E5E7EB]/60" />

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const itemPath = item.href.split("?")[0];
            const itemSearchParams = new URL(item.href, "http://localhost").searchParams;

            let isActive: boolean;
            if (item.href === "/admin/dashboard") {
              isActive = pathname === "/admin/dashboard";
            } else if (itemSearchParams.has("status")) {
              // Items with query params (e.g., Vérifications) require exact match on both path AND param
              isActive = pathname === itemPath && searchParams.get("status") === itemSearchParams.get("status");
            } else {
              // Items without query params are active only when pathname matches AND no conflicting query param
              // For /admin/users, it's active only when there's no status=pending param
              const hasStatusParam = searchParams.has("status");
              if (itemPath === "/admin/users" && hasStatusParam) {
                isActive = false;
              } else {
                isActive = pathname.startsWith(itemPath);
              }
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "eden-sidebar-active text-[#38C172]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] transition-colors flex-shrink-0",
                    isActive
                ? "text-[#38C172]"
                      : "text-[#9CA3AF] group-hover:text-[#6B7280]"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-3 border-t border-[#E5E7EB]/60">
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white text-xs font-bold">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">
                {adminName}
              </p>
              <p className="text-[10px] text-[#9CA3AF]">Super Admin</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#6B7280] hover:bg-red-50 hover:text-[#F56565] transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}