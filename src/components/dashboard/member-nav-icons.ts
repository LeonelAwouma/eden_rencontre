import {
  Crown, Eye, Gift, GraduationCap, Heart, Home, LifeBuoy, LogOut, MessageCircle,
  MessagesSquare, Search, Settings, Star, UserCircle, type LucideIcon,
} from "lucide-react";

/**
 * Icônes des destinations membre, indexées par l'`id` de `src/lib/member-nav.ts`.
 * Séparé du registre pour que celui-ci reste de la donnée pure, testable sous
 * vitest (environnement `node`).
 */
export const MEMBER_NAV_ICONS: Record<string, LucideIcon> = {
  home: Home,
  discover: Search,
  messages: MessageCircle,
  requests: Star,
  favorites: Heart,
  visitors: Eye,
  forum: MessagesSquare,
  academy: GraduationCap,
  referral: Gift,
  profile: UserCircle,
  subscription: Crown,
  settings: Settings,
  help: LifeBuoy,
  logout: LogOut,
};
