"use client";

import { useState, useEffect } from "react";
import { Users, Clock, ShieldCheck, ShieldOff, CalendarDays } from "lucide-react";
import { DashboardHeader } from "@/components/admin/dashboard-header";
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
  details: Record<string, unknown>;
  created_at: string;
}

interface Growth {
  totalUsers: number | null;
  approvedUsers: number | null;
  suspendedUsers: number | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<Growth>({ totalUsers: null, approvedUsers: null, suspendedUsers: null });
  const [dailyRegistrations, setDailyRegistrations] = useState<{ date: string; count: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <div className="space-y-6">
        {/* Skeleton loading */}
        <div className="h-16 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-white rounded-[20px] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-80 bg-white rounded-[20px] animate-pulse lg:col-span-2" />
          <div className="h-80 bg-white rounded-[20px] animate-pulse" />
        </div>
      </div>
    );
  }

  // Real 30-day growth from the API — undefined when there's no 30-day-old
  // baseline to compare against (e.g. a brand-new platform), in which case
  // the badge is simply omitted rather than showing a fabricated number.
  const trendFrom = (pct: number | null) =>
    pct === null ? undefined : { value: `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct)}%`, positive: pct >= 0 };

  const KPI_CARDS = [
    {
      title: "Utilisateurs",
      value: stats.totalUsers,
      icon: Users,
      accentColor: "blue" as const,
      trend: trendFrom(growth.totalUsers),
    },
    {
      title: "En attente de vérification",
      value: stats.pendingUsers,
      icon: Clock,
      accentColor: "orange" as const,
      status: "À réviser",
    },
    {
      title: "Comptes approuvés",
      value: stats.approvedUsers,
      icon: ShieldCheck,
      accentColor: "green" as const,
      trend: trendFrom(growth.approvedUsers),
    },
    {
      title: "Comptes suspendus",
      value: stats.suspendedUsers,
      icon: ShieldOff,
      accentColor: "red" as const,
      trend: trendFrom(growth.suspendedUsers),
    },
  ];

  return (
    <>
      <DashboardHeader
        adminName="Administrateur"
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPI_CARDS.map((card, i) => (
          <KPICard key={card.title} {...card} index={i} />
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <UsersChart data={dailyRegistrations} />
        <QuickActions />
      </div>

      {/* Recent Users + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <RecentUsers users={recentUsers} />
        </div>
        <ActivityTimeline entries={auditLog} />
      </div>

      {/* Meet Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1">
          <MeetStats
            publishedEvents={stats.publishedEvents}
            totalEvents={stats.totalEvents}
            totalUsers={stats.totalUsers}
            approvedUsers={stats.approvedUsers}
          />
        </div>
      </div>
    </>
  );
}