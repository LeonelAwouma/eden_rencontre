"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";

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
}>({
  admin: null,
  setAdmin: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #FAF9F6 0%, #F8F5F2 50%, #FAF9F6 100%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#E8E5E0] border-t-[#486B46] animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2F2F2F]">Eden Connexion</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Chargement de l'administration…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{ admin, setAdmin, sidebarCollapsed, setSidebarCollapsed }}
    >
      <div className="eden-admin-body min-h-screen flex bg-[#FAF9F6]">
        <Sidebar
          isOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onLogout={handleLogout}
          adminName={admin?.name || "Administrateur"}
        />

        <div
          className="flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out"
          style={{
            marginLeft: 0,
          }}
        >
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}