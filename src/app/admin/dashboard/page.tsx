"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, CalendarCheck, ShieldCheck, ShieldOff, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatTile, ErrorState, btn } from "@/components/admin/admin-ui";
import { AttentionPanel } from "@/components/admin/attention-panel";
import { UsersChart } from "@/components/admin/users-chart";
import { RecentUsers } from "@/components/admin/recent-users";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { buildAttentionItems, shareOf, trendFrom } from "@/lib/admin-dashboard";

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

interface ReportsSummary { pending: number; critical: number }

const HEADER = { title: "Tableau de bord", subtitle: "Vue d’ensemble de votre plateforme" };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<Growth>({ totalUsers: null, approvedUsers: null, suspendedUsers: null });
  const [dailyRegistrations, setDailyRegistrations] = useState<{ date: string; count: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  // `null` tant que non lu ou en cas d'échec : l'encart « À traiter » l'affiche « indisponible », jamais 0.
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/admin/stats")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.stats) {
          throw new Error(data?.error || `Le serveur a répondu avec l'erreur ${r.status}.`);
        }
        setStats(data.stats);
        setGrowth(data.growth || { totalUsers: null, approvedUsers: null, suspendedUsers: null });
        setDailyRegistrations(data.dailyRegistrations || []);
        setRecentUsers(data.recentUsers || []);
        setAuditLog(data.recentAudit || []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Connexion impossible."))
      .finally(() => setLoading(false));

    // Signalements : lecture secondaire. Un échec n'empêche pas le reste de la page.
    fetch("/api/admin/reports?limit=1")
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok || !data?.stats) throw new Error("reports");
        setReports({ pending: data.stats.pending ?? 0, critical: data.stats.critical ?? 0 });
      })
      .catch(() => setReports(null));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !stats) {
    return (
      <div aria-busy="true" aria-label="Chargement du tableau de bord">
        <PageHeader {...HEADER} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[...Array(2)].map((_, i) => <div key={i} className="h-[76px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[76px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          <div className="col-span-12 lg:col-span-8 h-[340px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />
          <div className="col-span-12 lg:col-span-4 h-[340px] bg-white border border-[#E8E5E0] rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <>
        <PageHeader {...HEADER} />
        <ErrorState
          title="Le tableau de bord n'a pas pu être chargé"
          description={error ?? undefined}
          onRetry={load}
        />
      </>
    );
  }

  const attention = buildAttentionItems({ pendingUsers: stats.pendingUsers, reports });
  const unpublishedEvents = Math.max(0, stats.totalEvents - stats.publishedEvents);
  const suspendedTrend = trendFrom(growth.suspendedUsers);

  return (
    <>
      <PageHeader
        {...HEADER}
        actions={
          <Link href="/admin/events/new" className={btn.primary}>
            <CalendarPlus className="w-4 h-4" aria-hidden="true" /> Créer un événement
          </Link>
        }
      />

      <AttentionPanel items={attention} className="mb-6" />

      {/* Indicateurs de supervision : chaque tuile mène à la liste détaillée. */}
      <section aria-label="Indicateurs clés" className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6 lg:mb-8">
        <StatTile
          icon={Users} tone="blue" label="Membres inscrits" value={stats.totalUsers}
          trend={trendFrom(growth.totalUsers)} hint={growth.totalUsers === null ? "Tous comptes confondus" : undefined}
          href="/admin/users"
        />
        <StatTile
          icon={ShieldCheck} tone="green" label="Comptes approuvés" value={stats.approvedUsers}
          trend={trendFrom(growth.approvedUsers)} hint={`${shareOf(stats.approvedUsers, stats.totalUsers)} % des inscrits`}
          href="/admin/users?status=approved"
        />
        <StatTile
          icon={ShieldOff} tone="red" label="Comptes suspendus" value={stats.suspendedUsers}
          // Pour les suspensions, une hausse n'est pas une bonne nouvelle : la couleur s'inverse.
          trend={suspendedTrend && { ...suspendedTrend, positive: (growth.suspendedUsers ?? 0) <= 0 }}
          hint={`${shareOf(stats.suspendedUsers, stats.totalUsers)} % des inscrits`}
          href="/admin/users?status=suspended"
        />
        <StatTile
          icon={CalendarCheck} tone="amber" label="Événements publiés" value={stats.publishedEvents}
          hint={`${unpublishedEvents} non publié${unpublishedEvents > 1 ? "s" : ""}`}
          href="/admin/events"
        />
      </section>

      <div className="grid grid-cols-12 gap-4 lg:gap-6">
        <UsersChart data={dailyRegistrations} className="col-span-12 lg:col-span-8" />
        <ActivityTimeline entries={auditLog} className="col-span-12 lg:col-span-4" />
        <RecentUsers users={recentUsers} className="col-span-12" />
      </div>
    </>
  );
}
