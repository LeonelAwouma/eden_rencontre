import { BookOpen, CalendarClock, ClipboardList, GraduationCap, LayoutDashboard, Library, LogOut, UserCircle, Users, type LucideIcon } from "lucide-react";

/** Icônes des destinations Coach, indexées par l'`id` de `src/lib/coach-nav.ts` (registre gardé pur). */
export const COACH_NAV_ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  members: Users,
  formation: GraduationCap,
  academie: BookOpen,
  mediatheque: Library,
  sessions: CalendarClock,
  reports: ClipboardList,
  profile: UserCircle,
  logout: LogOut,
};
