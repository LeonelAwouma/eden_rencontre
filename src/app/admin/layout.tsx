"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/loading-screen";
import { ADMIN_LESSON_PREVIEW_PATH, ADMIN_STORY_PREVIEW_PATH } from "@/lib/formation/paths";
import { useAnnouncements, useDiscoverOnVisit } from "@/components/whats-new/use-announcements";
import { AnnouncementSlot } from "@/components/whats-new/announcement-card";

interface AdminInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

const AdminContext = createContext<{
  admin: AdminInfo | null;
  setAdmin: (admin: AdminInfo | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}>({
  admin: null,
  setAdmin: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export function useAdmin() {
  return useContext(AdminContext);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    fetch("/api/admin/stats")
      .then((res) => {
        if (res.ok) {
          return res.json().then(() => {
            setAdmin({ id: "", email: "", name: "Administrateur", role: "admin" });
          });
        } else {
          setAdmin(null);
        }
      })
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, [isLoginPage]);

  // Session expirée pendant que la page reste ouverte : toute API admin répond
  // 401. Plutôt que d'afficher des pages vides (et de relancer les
  // notifications en boucle), on renvoie vers la connexion, puis ici.
  useEffect(() => {
    if (isLoginPage) return;
    const originalFetch = window.fetch;
    let redirecting = false;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401 && !redirecting) {
        const input = args[0];
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const path = new URL(url, window.location.origin).pathname;
        if (path.startsWith("/api/admin/") && !path.startsWith("/api/admin/auth/")) {
          redirecting = true;
          const next = window.location.pathname + window.location.search;
          window.location.assign(`/admin/login?expired=1&next=${encodeURIComponent(next)}`);
        }
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [isLoginPage]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // Aperçu d'une leçon : plein écran, comme pour les membres. La session admin
  // reste exigée par le middleware (vérification côté serveur de /admin/*).
  const isLessonPreview = (pathname?.startsWith(`${ADMIN_LESSON_PREVIEW_PATH}/`) || pathname?.startsWith(`${ADMIN_STORY_PREVIEW_PATH}/`)) ?? false;

  // Nouveautés destinées aux administrateurs (jamais chargées sur la connexion ni les aperçus plein écran).
  const announcements = useAnnouncements("admin", !loading && !isLoginPage && !isLessonPreview);
  useDiscoverOnVisit(announcements, pathname ?? "", null);

  if (isLoginPage || isLessonPreview) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <LoadingScreen className="eden-admin" label="Chargement de l'administration…" />
    );
  }

  return (
    <AdminContext.Provider
      value={{ admin, setAdmin, sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen }}
    >
      <div className="eden-admin eden-admin-body min-h-screen flex bg-background text-foreground">
        {/* Lien d'évitement : visible uniquement au focus clavier, saute la navigation. */}
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-[#1F2A23] focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          Aller au contenu principal
        </a>
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          adminName={admin?.name || "Administrateur"}
          newHrefs={announcements.badgeTargets}
        />

        <div
          className={cn(
            "flex-1 flex flex-col min-h-screen min-w-0 transition-[margin] duration-200 ease-out",
            sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[248px]"
          )}
        >
          {/* Montée une seule fois ici : elle était recopiée dans 21 pages, où
              son bouton menu mobile était branché sur un callback vide. */}
          <AdminTopbar adminName={admin?.name || "Administrateur"} />

          {/* `empty:hidden` : sans annonce, aucun espace réservé. */}
          <AnnouncementSlot
            api={announcements}
            className="w-full max-w-[1600px] mx-auto px-4 pt-4 sm:px-6 lg:px-8 empty:hidden"
          />

          <main id="admin-main" tabIndex={-1} className="flex-1 focus:outline-none px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-[1600px] w-full min-w-0 mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}