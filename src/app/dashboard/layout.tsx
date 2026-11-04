"use client";

import { MemberGate } from "@/components/member-gate";
import { MemberShell } from "@/components/dashboard/member-shell";

/**
 * Tout l'espace membre (/dashboard/*) est réservé aux comptes approuvés par l'admin,
 * et partage une seule chrome de navigation (sidebar, en-tête, barre inférieure, tiroir).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MemberGate>
      <MemberShell>{children}</MemberShell>
    </MemberGate>
  );
}
