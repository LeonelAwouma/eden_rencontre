"use client";

import type { ReactNode } from "react";
import type { CoachMe } from "@/lib/coach/client";
import { CoachBottomNav } from "./coach-bottom-nav";
import { CoachChromeProvider } from "./coach-chrome";
import { CoachDrawer } from "./coach-drawer";
import { CoachHeader } from "./coach-header";
import { COACH_SIDEBAR_OFFSET_CLASS, CoachSidebar } from "./coach-sidebar";

/** Chrome unique de l'espace Coach : barre latérale (lg+), en-tête, barre inférieure et tiroir (mobile). */
export function CoachShell({ coach, children }: { coach: CoachMe; children: ReactNode }) {
  return (
    <CoachChromeProvider coach={coach}>
      <div className="min-h-screen bg-[#FAF9F6]">
        <CoachSidebar />
        <div className={`${COACH_SIDEBAR_OFFSET_CLASS} member-nav-gap`}>
          <CoachHeader />
          <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
        </div>
        <CoachBottomNav />
        <CoachDrawer />
      </div>
    </CoachChromeProvider>
  );
}
