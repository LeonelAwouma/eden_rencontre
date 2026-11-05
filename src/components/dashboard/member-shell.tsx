"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DashboardSidebar, SIDEBAR_OFFSET_CLASS } from "./dashboard-sidebar";
import { MemberBottomNav } from "./member-bottom-nav";
import { MemberChromeProvider, useMemberChrome } from "./member-chrome";
import { MemberDrawer } from "./member-drawer";
import { MemberHeader } from "./member-header";
import { MemberAnnouncementsProvider } from "@/components/whats-new/announcements-provider";

function ShellFrame({ children }: { children: ReactNode }) {
  const { immersive } = useMemberChrome();
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Desktop : colonne fixe, montée une seule fois pour toutes les routes membres. */}
      <DashboardSidebar />

      {/*
        La réserve de la barre inférieure n'existe que si la barre est visible : sur un
        écran immersif (conversation, forum) elle est retirée, sinon le champ de saisie
        flotterait au-dessus d'un vide.
      */}
      <div className={cn(SIDEBAR_OFFSET_CLASS, !immersive && "member-nav-gap")}>
        <MemberHeader />
        {children}
      </div>

      <MemberBottomNav />
      <MemberDrawer />
    </div>
  );
}

/** Chrome unique de l'espace membre : sidebar, en-tête, barre inférieure, tiroir. */
export function MemberShell({ children }: { children: ReactNode }) {
  return (
    <MemberChromeProvider>
      <MemberAnnouncementsProvider>
        <ShellFrame>{children}</ShellFrame>
      </MemberAnnouncementsProvider>
    </MemberChromeProvider>
  );
}
