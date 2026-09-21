"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { cn } from "@/lib/utils";

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

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="eden-admin min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-[3px] border-border border-t-primary animate-spin" />
          <div className="text-center">
            <p className="font-headline text-base font-bold text-foreground">Garden of Alliance</p>
            <p className="text-xs text-muted-foreground mt-1">Chargement de l&apos;administration…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{ admin, setAdmin, sidebarCollapsed, setSidebarCollapsed, sidebarOpen, setSidebarOpen }}
    >
      <div className="eden-admin eden-admin-body min-h-screen flex bg-background text-foreground">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          adminName={admin?.name || "Administrateur"}
        />

        <div
          className={cn(
            "flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[256px]"
          )}
        >
          {/* Montée une seule fois ici : elle était recopiée dans 21 pages, où
              son bouton menu mobile était branché sur un callback vide. */}
          <AdminTopbar adminName={admin?.name || "Administrateur"} />

          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}