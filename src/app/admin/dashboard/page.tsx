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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
        setAuditLog(data.auditLog || []);
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

  const KPI_CARDS = [
    {
      title: "Utilisateurs",
      value: stats.totalUsers,
      icon: Users,
      accentColor: "blue" as const,
      iconBg: "bg-[#4F7DF3]/8",
      trend: { value: "+12%", positive: true },
    },
    {
      title: "En attente de vérification",
      value: stats.pendingUsers,
      icon: Clock,
      accentColor: "orange" as const,
      iconBg: "bg-[#38C172]/8",
      status: "À réviser",
    },
    {
      title: "Comptes approuvés",
      value: stats.approvedUsers,
      icon: ShieldCheck,
      accentColor: "green" as const,
      iconBg: "bg-[#38C172]/8",
      trend: { value: "+8%", positive: true },
    },
    {
      title: "Comptes suspendus",
      value: stats.suspendedUsers,
      icon: ShieldOff,
      accentColor: "red" as const,
      iconBg: "bg-[#F56565]/8",
      trend: { value: "−2%", positive: false },
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
        <UsersChart />
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