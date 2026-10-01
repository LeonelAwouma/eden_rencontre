"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, GraduationCap, Route, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_FORMATION_PATH, ADMIN_LESSON_PREVIEW_PATH } from "@/lib/formation/paths";

/**
 * Médiathèque admin : quatre espaces sous un même menu.
 *  - Ressources : vidéos, livres, audios… (la bibliothèque)
 *  - Académie du mariage : la formation « Bâtir sur le roc » et ses histoires
 *  - Parcours : l'ordre des ressources, pilier par pilier
 *  - Catégories
 * Les onglets ne s'affichent que sur ces pages d'index : ni sur les formulaires
 * (ajout / modification), ni sur l'aperçu plein écran d'une leçon.
 */
const TABS = [
  { href: "/admin/mediatheque", label: "Ressources", icon: Library, exact: true },
  { href: ADMIN_FORMATION_PATH, label: "Académie du mariage", icon: GraduationCap },
  { href: "/admin/mediatheque/learning-paths", label: "Parcours", icon: Route },
  { href: "/admin/mediatheque/categories", label: "Catégories", icon: FolderTree },
];

const TAB_PAGES = new Set([
  "/admin/mediatheque",
  ADMIN_FORMATION_PATH,
  ADMIN_LESSON_PREVIEW_PATH,
  "/admin/mediatheque/learning-paths",
  "/admin/mediatheque/categories",
]);

export default function AdminMediathequeLayout({ children }: { children: React.ReactNode }) {
  const pathname = (usePathname() || "").replace(/\/$/, "");
  if (!TAB_PAGES.has(pathname)) return <>{children}</>;

  const isActive = (t: (typeof TABS)[number]) =>
    t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);

  return (
    <>
      <nav aria-label="Médiathèque" className="mb-6 -mx-1 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 border-b border-border px-1">
          {TABS.map((t) => {
            const active = isActive(t);
            return (
              <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center gap-2 h-11 px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
                  active ? "text-primary" : "text-[#6B746E] hover:text-foreground"
                )}>
                <t.icon className="w-4 h-4" />
                {t.label}
                {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}
