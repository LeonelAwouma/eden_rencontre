"use client";

import { MemberGate } from "@/components/member-gate";

/** Tout l'espace membre (/dashboard/*) est réservé aux comptes approuvés par l'admin. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MemberGate>{children}</MemberGate>;
}
