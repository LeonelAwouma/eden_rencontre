"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMyAccountStatus, logout } from "@/lib/auth";
import { Monogram } from "@/components/ornaments";

/**
 * Espace membre réservé aux comptes approuvés par l'admin.
 *
 * La connexion email passe par /api/auth/login qui refuse les comptes non
 * approuvés, mais une session peut s'ouvrir autrement (Google OAuth, session
 * encore active quand l'admin suspend le compte). On revérifie donc le statut
 * à chaque entrée dans l'espace membre ; sans approbation, la session est
 * fermée et l'utilisateur renvoyé vers la page adaptée.
 */
export function MemberGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let account: Awaited<ReturnType<typeof getMyAccountStatus>>;
      try {
        account = await getMyAccountStatus();
      } catch {
        account = null;
      }
      if (cancelled) return;
      if (!account) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      if (account.status === "approved") {
        setAllowed(true);
        return;
      }
      await logout();
      if (cancelled) return;
      if (account.status === "pending") {
        router.replace(`/register/pending?email=${encodeURIComponent(account.email)}`);
      } else {
        router.replace(`/login?blocked=${account.status}`);
      }
    })();
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Monogram className="w-12 h-10 text-primary animate-pulse" style={{ animationDuration: "2s" }} />
      </div>
    );
  }
  return <>{children}</>;
}
