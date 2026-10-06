"use client";

import { useState, useEffect } from "react";
import { Users, Clock, ShieldCheck, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { KPICard } from "@/components/admin/kpi-card";
import { UsersChart } from "@/components/admin/users-chart";
import { QuickActions } from "@/components/admin/quick-actions";
import { RecentUsers } from "@/components/admin/recent-users";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { MeetStats } from "@/components/admin/meet-stats";

interface Stats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  rejectedUsers: number;
  suspendedUsers: number;
  totalEvents: number;
  publishedEvents: number;
}

interface RecentUser {
  id: string;
  name: string;
  pseudo?: string | null;
  email: string;
  status: string;
  created_at: string;
  city: string;
  country: string;
  avatar_url: string | null;
}

interface AuditEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string;
  target_id: string;
  target_label?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

interface Growth {
  totalUsers: number | null;
  approvedUsers: number | null;
  suspendedUsers: number | null;
}

const HEADER = { title: "Tableau de bord", subtitle: "Vue d’ensemble de votre plateforme" };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<Growth>({ totalUsers: null, approvedUsers: null, suspendedUsers: null });
  const [dailyRegistrations, setDailyRegistrations] = useState<{ date: string; count: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setGrowth(data.growth || { totalUsers: null, approvedUsers: null, suspendedUsers: null });
        setDailyRegistrations(data.dailyRegistrations || []);
        setRecentUsers(data.recentUsers || []);
        setAuditLog(data.recentAudit || []);
      })
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div aria-busy="true" aria-label="Chargement du tableau de bord">
        <PageHeader {...HEADER} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[148px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          <div className="col-span-12 lg:col-span-8 h-[340px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />
          <div className="col-span-12 lg:col-span-4 h-[340px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Croissance réelle sur 30 jours ; sans base de comparaison, le badge est omis.
  const trendFrom = (pct: number | null) =>
    pct === null ? undefined : { value: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)} % sur 30 j`, positive: pct >= 0 };
  const shareOf = (n: number) => (stats.totalUsers > 0 ? Math.round((n / stats.totalUsers) * 100) : 0);

  const KPI_CARDS = [
    { title: "Utilisateurs", value: stats.totalUsers, icon: Users, accentColor: "blue", trend: trendFrom(growth.totalUsers), hint: trendFrom(growth.totalUsers) ? undefined : "Tous comptes confondus" },
    { title: "En attente de vérification", value: stats.pendingUsers, icon: Clock, accentColor: "orange", status: stats.pendingUsers > 0 ? "À réviser" : undefined, hint: stats.pendingUsers > 0 ? undefined : "Rien à traiter" },
    { title: "Comptes approuvés", value: stats.approvedUsers, icon: ShieldCheck, accentColor: "green", trend: trendFrom(growth.approvedUsers), hint: `${shareOf(stats.approvedUsers)} % des inscrits` },
    // Pour les suspensions, une hausse n'est pas une bonne nouvelle : la couleur s'inverse.
    { title: "Comptes suspendus", value: stats.suspendedUsers, icon: ShieldOff, accentColor: "red",
      trend: (() => { const t = trendFrom(growth.suspendedUsers); return t && { ...t, positive: (growth.suspendedUsers ?? 0) <= 0 }; })(),
      hint: `${shareOf(stats.suspendedUsers)} % des inscrits` },
  ];

  return (
    <>
      <PageHeader {...HEADER} />

      {/* KPI : 4 sur une ligne (desktop), 2 × 2 (tablette), 1 par ligne (mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {KPI_CARDS.map((card, i) => <KPICard key={card.title} {...card} index={i} />)}
      </div>

      {/* Grille 12 colonnes */}
      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <UsersChart data={dailyRegistrations} className="col-span-12 lg:col-span-8" />
        <QuickActions pendingUsers={stats.pendingUsers} className="col-span-12 lg:col-span-4" />
        <RecentUsers users={recentUsers} className="col-span-12 lg:col-span-8" />
        <ActivityTimeline entries={auditLog} className="col-span-12 lg:col-span-4" />
        <MeetStats
          className="col-span-12"
          publishedEvents={stats.publishedEvents}
          totalEvents={stats.totalEvents}
          totalUsers={stats.totalUsers}
          approvedUsers={stats.approvedUsers}
        />
      </div>
    </>
  );
}
