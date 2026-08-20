"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  Check,
  CheckCheck,
  Calendar,
  User,
  MessageSquare,
  Star,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface DashboardHeaderProps {
  adminName: string;
  onMenuClick: () => void;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "event":
      return <Calendar className="w-4 h-4" />;
    case "user":
      return <User className="w-4 h-4" />;
    case "testimonial":
      return <Star className="w-4 h-4" />;
    case "meeting":
      return <MessageSquare className="w-4 h-4" />;
    case "report":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case "event":
      return "bg-blue-50 text-blue-600";
    case "user":
      return "bg-emerald-50 text-emerald-600";
    case "testimonial":
      return "bg-amber-50 text-amber-600";
    case "meeting":
      return "bg-violet-50 text-violet-600";
    case "report":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-50 text-gray-600";
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function DashboardHeader({
  adminName,
  onMenuClick,
}: DashboardHeaderProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(id: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  function handleNotificationClick(notif: AdminNotification) {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
    setIsOpen(false);
  }

  // Get current date formatted
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-6 sm:mb-8"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        {/* Left: Menu + Greeting */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 transition-all active:scale-95 flex-shrink-0"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-tight truncate"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
            >
              Bonjour, {adminName} <span className="inline-block animate-bounce-slow">👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 font-medium hidden sm:block">
              Voici un aperçu de l&apos;activité de votre plateforme
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-all active:scale-95"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <div className="hidden md:flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 w-52 lg:w-64 hover:border-zinc-300 focus-within:border-[#3D6B3B] focus-within:ring-2 focus-within:ring-[#3D6B3B]/10 transition-all">
            <Search className="w-4 h-4 text-zinc-300 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-zinc-900 placeholder:text-zinc-300 outline-none w-full font-medium"
            />
            <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
              ⌘K
            </kbd>
          </div>

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "relative w-9 h-9 rounded-lg bg-white border flex items-center justify-center transition-all active:scale-95",
                isOpen
                  ? "border-[#3D6B3B] text-zinc-900 shadow-sm"
                  : "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
              )}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center px-0.5 shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-12 w-[340px] sm:w-[380px] bg-white rounded-xl shadow-xl border border-zinc-200 z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <h3 className="text-sm font-bold text-zinc-900">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs text-[#3D6B3B] hover:text-[#2D5029] font-semibold transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Tout lire
                      </button>
                    )}
                  </div>

                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-[#3D6B3B] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-3">
                          <Bell className="w-6 h-6 text-zinc-300" />
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">
                          Aucune notification
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Les notifications apparaîtront ici
                        </p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-zinc-50 last:border-0",
                            notif.is_read
                              ? "bg-white hover:bg-zinc-50"
                              : "bg-[#F0FDF4] hover:bg-[#ECFDF5]"
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                              getNotificationColor(notif.type)
                            )}
                          >
                            {getNotificationIcon(notif.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "text-sm truncate",
                                  notif.is_read
                                    ? "font-medium text-zinc-700"
                                    : "font-bold text-zinc-900"
                                )}
                              >
                                {notif.title}
                              </p>
                              {!notif.is_read && (
                                <span className="w-1.5 h-1.5 bg-[#3D6B3B] rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1 font-medium">
                              {timeAgo(notif.created_at)}
                            </p>
                          </div>

                          {!notif.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                              }}
                              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#3D6B3B] hover:bg-[#F0FDF4] transition-colors mt-0.5"
                              title="Marquer comme lu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="border-t border-zinc-100 px-4 py-2.5">
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          router.push("/admin/dashboard");
                        }}
                        className="w-full text-center text-xs text-[#3D6B3B] hover:text-[#2D5029] font-semibold transition-colors py-1"
                      >
                        Voir toutes les notifications
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div className="hidden sm:flex ml-1 w-9 h-9 rounded-full bg-gradient-to-br from-[#3D6B3B] to-[#5A7D54] items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            {adminName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Mobile search bar (expandable) */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-white border border-[#E8E5E0] rounded-xl px-3 py-2.5 mb-4 focus-within:border-[#486B46] focus-within:ring-2 focus-within:ring-[#486B46]/10 transition-all">
              <Search className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur, événement…"
                className="bg-transparent text-sm text-[#2F2F2F] placeholder:text-[#D1D5DB] outline-none w-full font-medium"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date bar */}
      <div className="hidden md:flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-[#E8E5E0] to-transparent" />
        <span className="text-[11px] font-medium text-[#9CA3AF] capitalize">
          {currentDate}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-[#E8E5E0] to-transparent" />
      </div>
    </motion.header>
  );
}