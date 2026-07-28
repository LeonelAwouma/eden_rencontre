"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Settings, Menu, Check, CheckCheck, Calendar, User, MessageSquare, Star, AlertTriangle, Info } from "lucide-react";
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
      return "bg-blue-100 text-blue-600";
    case "user":
      return "bg-green-100 text-green-600";
    case "testimonial":
      return "bg-yellow-100 text-yellow-600";
    case "meeting":
      return "bg-purple-100 text-purple-600";
    case "report":
      return "bg-red-100 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
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

export function DashboardHeader({ adminName, onMenuClick }: DashboardHeaderProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  // Fetch on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center justify-between gap-4 mb-8"
    >
      {/* Left: Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1
            className="text-[28px] sm:text-[32px] font-bold text-[#1a1a1a] tracking-tight leading-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Hello, {adminName} 👋
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5 font-medium">
            Welcome back to EDEN — Here's an overview of your platform's activity.
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="hidden sm:flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 w-56 hover:border-[#D1D5DB] transition-all">
          <Search className="w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Rechercher…"
            className="bg-transparent text-sm text-[#374151] placeholder:text-[#D1D5DB] outline-none w-full font-medium"
          />
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#9CA3AF]">
            ⌘K
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "relative w-10 h-10 rounded-xl bg-white border flex items-center justify-center transition-all",
              isOpen
                ? "border-[#38C172] text-[#374151] shadow-sm"
                : "border-[#E5E7EB] text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB]"
            )}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#F56565] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1">
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
                className="absolute right-0 top-12 w-[380px] bg-white rounded-2xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
                  <h3 className="text-sm font-bold text-[#1a1a1a]">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-[#38C172] hover:text-[#2D9F62] font-semibold transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-[400px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#38C172] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                      <Bell className="w-8 h-8 text-[#D1D5DB] mb-2" />
                      <p className="text-sm text-[#9CA3AF] font-medium">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[#F9FAFB] last:border-0",
                          notif.is_read ? "bg-white hover:bg-[#F9FAFB]" : "bg-[#F0FFF4] hover:bg-[#E6FFED]"
                        )}
                      >
                        {/* Icon */}
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", getNotificationColor(notif.type))}>
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm truncate", notif.is_read ? "font-medium text-[#374151]" : "font-bold text-[#1a1a1a]")}>
                              {notif.title}
                            </p>
                            {!notif.is_read && (
                              <span className="w-2 h-2 bg-[#38C172] rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-1">{timeAgo(notif.created_at)}</p>
                        </div>

                        {/* Mark as read button */}
                        {!notif.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-[#38C172] hover:bg-[#F0FFF4] transition-colors mt-0.5"
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
                  <div className="border-t border-[#F3F4F6] px-4 py-2.5">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/admin/dashboard");
                      }}
                      className="w-full text-center text-xs text-[#38C172] hover:text-[#2D9F62] font-semibold transition-colors"
                    >
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <button className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:text-[#374151] hover:border-[#D1D5DB] transition-all">
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Avatar */}
        <div className="ml-1 w-10 h-10 rounded-full bg-gradient-to-br from-[#38C172] to-[#86EFAC] flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:shadow-md transition-shadow">
          {adminName.charAt(0).toUpperCase()}
        </div>
      </div>
    </motion.header>
  );
}