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
}>({ admin: null, setAdmin: () => {} });

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

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FCFCFC 0%, #F8F5F2 50%, #FCFCFC 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin" />
          <p className="text-[13px] text-[#9CA3AF] font-medium">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ admin, setAdmin }}>
      <div className="eden-admin-body min-h-screen flex">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          adminName={admin?.name || "Administrateur"}
        />

        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}