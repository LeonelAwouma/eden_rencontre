"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Monogram } from "@/components/ornaments";

/**
 * L'Académie du Mariage est réservée aux membres connectés.
 * La session Supabase vit dans le navigateur : la vérification se fait donc ici,
 * et un visiteur non connecté est renvoyé vers la connexion, qui le ramène
 * ensuite à la page demandée.
 */
export default function AcademieLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((user) => {
        if (cancelled) return;
        if (user) setAllowed(true);
        else router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard/academie")}`);
      })
      .catch(() => { if (!cancelled) router.replace("/login?next=/dashboard/academie"); });
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!allowed) {
    return (
      <div className="eden-public min-h-screen bg-background flex flex-col items-center justify-center gap-4" aria-busy="true">
        <Monogram className="w-12 h-12 text-primary animate-pulse" style={{ animationDuration: "2s" }} />
        <p className="text-sm text-[#56615A]">Ouverture de l&apos;Académie…</p>
      </div>
    );
  }

  return <>{children}</>;
}
