"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Menu, Check, CheckCheck, Calendar, User,
  MessageSquare, Star, AlertTriangle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/app/admin/layout";

/**
 * Barre supérieure de l'administration — montée **une seule fois** par le
 * layout.
 *
 * Elle remplace l'ancien DashboardHeader, qui était recopié dans 21 pages :
 * chacune saluait l'administrateur comme sur le tableau de bord, et passait un
 * `onMenuClick` vide, si bien que le bouton menu mobile ne faisait rien
 * ailleurs que sur le tableau de bord. Le titre propre à chaque page est
 * désormais rendu par PageHeader.
 */

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function notificationIcon(type: string) {
  switch (type) {
    case "event": return <Calendar className="w-4 h-4" />;
    case "user": return <User className="w-4 h-4" />;
    case "testimonial": return <Star className="w-4 h-4" />;
    case "meeting": return <MessageSquare className="w-4 h-4" />;
    case "report": return <AlertTriangle className="w-4 h-4" />;
    default: return <Info className="w-4 h-4" />;
  }
}

function notificationTone(type: string) {
  switch (type) {
    case "event": return "bg-primary/10 text-primary";
    case "user": return "bg-success/10 text-success";
    case "testimonial": return "bg-warning/10 text-warning";
    case "meeting": return "bg-sage/20 text-deep-eden";
    case "report": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)} j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function AdminTopbar({ adminName = "Administrateur" }: { adminName?: string }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setSidebarOpen } = useAdmin();

  const fetchNotifications = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading) setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // silencieux : une barre de navigation ne doit pas bloquer la page
    } finally {
      if (opts?.showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAsRead(id: string) {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((p) => Math.max(0, p - 1));
    } catch { /* ignoré */ }
  }

  async function markAllAsRead() {
    try {
      await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignoré */ }
  }

  const iconButton =
    "w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center " +
    "text-[#56615A] hover:text-foreground hover:border-primary/40 transition-colors duration-150 active:scale-95 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-[#ECE8E1]">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-14 sm:h-16">
        <button
          onClick={() => setSidebarOpen(true)}
          className={cn(iconButton, "lg:hidden shrink-0")}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              const next = !isOpen;
              setIsOpen(next);
              if (next) fetchNotifications({ showLoading: true });
            }}
            className={cn(iconButton, "relative", isOpen && "border-primary text-foreground")}
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
            aria-expanded={isOpen}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-destructive rounded-full text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 top-11 w-[min(22rem,calc(100vw-2rem))] bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-primary hover:text-deep-eden font-semibold transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Tout lire
                    </button>
                  )}
                </div>

                <div className="max-h-[380px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <Bell className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-foreground font-medium">Aucune notification</p>
                      <p className="text-xs text-muted-foreground mt-1">Elles apparaîtront ici</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          if (n.link) router.push(n.link);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-border/60 last:border-0",
                          n.is_read ? "hover:bg-muted/60" : "bg-primary/5 hover:bg-primary/10"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", notificationTone(n.type))}>
                          {notificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm truncate", n.is_read ? "text-foreground/80" : "font-semibold text-foreground")}>
                              {n.title}
                            </p>
                            {!n.is_read && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Marquer comme lu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profil administrateur */}
        <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-[#ECE8E1]" title={adminName}>
          <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[13px] font-bold">
            {adminName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden md:block leading-tight">
            <span className="block text-[13px] font-semibold text-[#1F2A23]">{adminName}</span>
            <span className="block text-[12px] text-[#5F6B63]">Super Admin</span>
          </span>
        </div>
      </div>
    </header>
  );
}
