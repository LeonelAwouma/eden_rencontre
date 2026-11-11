"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import { NewBadge } from "@/components/whats-new/new-badge";
import {
  LayoutDashboard, Users, CalendarDays, ShieldCheck, BarChart3,
  CreditCard, Settings, LogOut, X, Heart, MessageSquare,
  MessageCircle, PanelLeftClose, PanelLeftOpen, Video, Library,
  BookOpen, Send, MessagesSquare, Accessibility, FileUp, Gift, Megaphone,
  UserCog, CalendarClock, GraduationCap, KeyRound, ChevronDown, Compass,
  HeartHandshake, Wallet, UserCheck, type LucideIcon,
} from "lucide-react";
import {
  ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ADMIN_SETTINGS_ITEM, activeAdminGroupId, activeAdminNavHref,
  parseOpenGroups, withActiveGroupOpen, type AdminNavGroupId, type AdminNavItem,
} from "@/lib/admin-nav";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  onLogout: () => void;
  adminName: string;
  /** Adresses d'entrées à marquer « Nouveau » (voir src/lib/whats-new.ts). */
  newHrefs?: string[];
}

const BRAND_GREEN = "#486B46";
const OPEN_GROUPS_KEY = "admin-nav-open-groups";

/** Icône de chaque rubrique (les libellés vivent dans src/lib/admin-nav.ts). */
const GROUP_ICONS: Record<AdminNavGroupId, LucideIcon> = {
  pilotage: Compass,
  members: Users,
  encounters: HeartHandshake,
  community: MessagesSquare,
  content: Library,
  finance: Wallet,
};

/** Icône de chaque entrée de `ADMIN_NAV_ITEMS` (la structure vit dans src/lib/admin-nav.ts). */
const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  photos: FileUp,
  "password-resets": KeyRound,
  accessibility: Accessibility,
  coaches: UserCog,
  "coach-assignments": UserCheck,
  matching: Heart,
  "chat-monitoring": MessageCircle,
  messages: Send,
  forum: MessagesSquare,
  reports: ShieldCheck,
  testimonials: MessageSquare,
  events: CalendarDays,
  meets: Video,
  meetings: CalendarClock,
  mediatheque: Library,
  blog: BookOpen,
  announcements: Megaphone,
  payments: CreditCard,
  referrals: Gift,
  analytics: BarChart3,
  "analytics-lessons": GraduationCap,
  settings: Settings,
};

export function Sidebar({
  isOpen, isCollapsed, onClose, onToggleCollapse, onLogout, adminName, newHrefs = [],
}: SidebarProps) {
  const pathname = usePathname();
  // Tooltip du mode réduit : rendu hors de la nav (qui défile et rognerait un
  // tooltip en position absolue), aligné sur l'élément survolé.
  const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null);
  const showTooltip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!isCollapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, y: r.top + r.height / 2 });
  };

  // Tiroir mobile ouvert : Échap le ferme et la page derrière ne défile plus.
  // (Sur desktop `isOpen` reste faux : la colonne est toujours visible.)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  // Une seule entrée active à la fois : la plus précise (voir activeAdminNavHref).
  const activeHref = activeAdminNavHref(pathname ?? "");
  const activeGroup = activeAdminGroupId(pathname ?? "");
  const isActive = (item: AdminNavItem) => item.href === activeHref;

  // Rubriques ouvertes : plusieurs à la fois, mémorisées d'une visite à l'autre.
  // La rubrique de la page consultée est toujours ouverte, quoi qu'on ait mémorisé.
  const [openGroups, setOpenGroups] = useState<Set<AdminNavGroupId>>(() => withActiveGroupOpen(new Set(), activeGroup));
  const [restored, setRestored] = useState(false);

  // Lecture après montage (pas pendant le rendu) pour rester identique au rendu serveur.
  useEffect(() => {
    let stored: AdminNavGroupId[] = [];
    try { stored = parseOpenGroups(window.localStorage.getItem(OPEN_GROUPS_KEY)); } catch { /* stockage indisponible */ }
    setOpenGroups((prev) => withActiveGroupOpen(new Set([...prev, ...stored]), activeGroup));
    setRestored(true);
    // Au montage seulement : les changements de page sont gérés par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation vers une autre rubrique : elle s'ouvre, les autres ne bougent pas.
  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((prev) => (prev.has(activeGroup) ? prev : withActiveGroupOpen(prev, activeGroup)));
  }, [activeGroup]);

  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify([...openGroups])); } catch { /* stockage indisponible */ }
  }, [openGroups, restored]);

  const toggleGroup = useCallback((id: AdminNavGroupId) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const hideTooltip = () => setTooltip(null);

  /** Lien d'une entrée (sous-entrée d'une rubrique, ou Paramètres en bas). */
  const renderLink = (item: AdminNavItem, nested: boolean) => {
    const active = isActive(item);
    const Icon = NAV_ICONS[item.id] ?? LayoutDashboard;
    const isNew = newHrefs.includes(item.href);
    return (
      <div key={item.href} className="relative group">
        <Link href={item.href}
          aria-current={active ? "page" : undefined}
          aria-label={isCollapsed ? `${item.label}${isNew ? " (nouveau)" : ""}` : undefined}
          onMouseEnter={showTooltip(item.label)}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip(item.label)}
          onBlur={hideTooltip}
          className={cn(
            "flex items-center gap-3 rounded-[10px] transition-colors duration-150 relative",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isCollapsed ? "justify-center w-11 h-10 mx-auto" : "px-3 py-2 min-h-[40px]",
            !isCollapsed && nested && "pl-3",
            active ? "bg-primary/[0.08] text-[#486B46]" : "text-[#4A534D] hover:bg-[#F5F3EF] hover:text-[#1F2A23]"
          )}>
          <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
            active ? "text-primary" : "text-[#6B746E] group-hover:text-[#3A443E]")} aria-hidden="true" />
          {!isCollapsed && (
            <span className={cn("text-[14px] leading-snug flex-1 min-w-0", active ? "font-semibold" : "font-medium")}>
              {item.label}
            </span>
          )}
          {!isCollapsed && isNew && <NewBadge />}
          {isCollapsed && isNew && <span className="absolute top-1 right-1"><NewBadge variant="dot" /></span>}
        </Link>
      </div>
    );
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
        "fixed top-0 left-0 h-[100dvh] z-50 flex flex-col",
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
                  <p className="text-[12px] font-semibold tracking-[0.04em] text-[#5F6B63]">Administration</p>
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

        {/* Navigation : six rubriques repliables (réduit : icônes seules, toutes les destinations restent des liens) */}
        <nav aria-label="Rubriques de l'administration" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 custom-scrollbar">
          {ADMIN_NAV_GROUPS.map((section, sectionIndex) => {
            const items = ADMIN_NAV_ITEMS.filter((i) => i.group === section.id);
            const GroupIcon = GROUP_ICONS[section.id];
            const open = openGroups.has(section.id);
            const hasActive = activeGroup === section.id;
            const hasNew = items.some((i) => newHrefs.includes(i.href));
            const panelId = `admin-nav-${section.id}`;
            return (
              <div key={section.id} role="group" aria-label={section.label}
                className={cn(sectionIndex > 0 && (isCollapsed ? "mt-2" : "mt-1.5"))}>
                {isCollapsed ? (
                  <>
                    {sectionIndex > 0 && <div className="mx-2 mb-2 h-px bg-[#ECE8E1]" />}
                    <div className="space-y-0.5">{items.map((item) => renderLink(item, false))}</div>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => toggleGroup(section.id)}
                      aria-expanded={open} aria-controls={panelId}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-[10px] text-left transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        "hover:bg-[#F5F3EF]", hasActive ? "text-[#486B46]" : "text-[#1F2A23]"
                      )}>
                      <GroupIcon className={cn("w-[18px] h-[18px] flex-shrink-0", hasActive ? "text-primary" : "text-[#4A534D]")} aria-hidden="true" />
                      <span className="flex-1 min-w-0 text-[14px] font-semibold leading-snug">{section.label}</span>
                      {!open && hasNew && <NewBadge variant="dot" />}
                      <ChevronDown aria-hidden="true"
                        className={cn("w-4 h-4 flex-shrink-0 text-[#6B746E] transition-transform duration-200", open && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div id={panelId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden">
                          <div className="ml-[22px] mt-0.5 mb-1 pl-2 border-l border-[#ECE8E1] space-y-0.5">
                            {items.map((item) => renderLink(item, true))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
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
          {/* Paramètres : entrée indépendante, séparée des rubriques métier */}
          <div className="mb-1">{renderLink(ADMIN_SETTINGS_ITEM, false)}</div>
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
