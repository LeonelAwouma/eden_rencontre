"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserPlus,
  UserCheck,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Percent,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface AnalyticsData {
  stats: {
    totalUsers: number;
    newRegistrations: number;
    activeUsers: number;
    conversionRate: number;
    approvalRate: number;
    totalMeets: number;
    publishedMeets: number;
    completedMeets: number;
  };
  dailyRegistrations: { date: string; total: number; approved: number; pending: number }[];
  genderDistribution: { name: string; value: number; color: string }[];
  topCities: { city: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

const PERIOD_OPTIONS = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 365, label: "1 an" },
];


export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${period}`);
      const result = await res.json();
      if (res.ok && !result.error) {
        setData(result);
      } else {
        console.error("Analytics API error:", result.error || "Unknown error");
        setData(null);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const statCards = data ? [
    { label: "Total utilisateurs", value: data.stats.totalUsers, icon: Users, color: "text-[#4B5563]", bg: "bg-[#F3F4F6]" },
    { label: "Nouvelles inscriptions", value: data.stats.newRegistrations, icon: UserPlus, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
    { label: "Utilisateurs actifs", value: data.stats.activeUsers, icon: UserCheck, color: "text-[#4F7DF3]", bg: "bg-[#4F7DF3]/10" },
    { label: "Taux de conversion", value: `${data.stats.conversionRate}%`, icon: Percent, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
    { label: "Taux d'approbation", value: `${data.stats.approvalRate}%`, icon: CheckCircle2, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
    { label: "Meets créés", value: data.stats.totalMeets, icon: Calendar, color: "text-[#FF9E45]", bg: "bg-[#FF9E45]/10" },
    { label: "Meets publiés", value: data.stats.publishedMeets, icon: Activity, color: "text-[#4F7DF3]", bg: "bg-[#4F7DF3]/10" },
    { label: "Meets terminés", value: data.stats.completedMeets, icon: TrendingUp, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
  ] : [];

  const chartDays = data?.dailyRegistrations.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
  })) || [];

  return (
    <>
      

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Analytics
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">Statistiques et tendances de la plateforme</p>
        </div>
        <div className="flex gap-1 bg-[#F9FAFB] rounded-xl p-1 border border-[#E5E7EB]">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all",
                period === opt.value ? "bg-white text-[#1a1a1a] shadow-sm border border-[#E5E7EB]" : "text-[#9CA3AF] hover:text-[#6B7280]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement des analytics…</p>
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-[#9CA3AF]">Erreur de chargement</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="bg-white rounded-[20px] border border-[#E5E7EB] p-5"
              >
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-[28px] font-bold text-[#1a1a1a] leading-none">{card.value}</p>
                <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">{card.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Daily Registrations Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 mb-6"
          >
            <h2 className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
              Inscriptions quotidiennes
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDays}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38C172" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#38C172" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F7DF3" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4F7DF3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", fontSize: 13, fontWeight: 500 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                  <Area name="Total" type="monotone" dataKey="total" stroke="#38C172" strokeWidth={2.5} fill="url(#totalGrad)" dot={false} activeDot={{ r: 5, fill: "#38C172", stroke: "#fff", strokeWidth: 2 }} />
                  <Area name="Approuvés" type="monotone" dataKey="approved" stroke="#4F7DF3" strokeWidth={2} fill="url(#approvedGrad)" dot={false} activeDot={{ r: 4, fill: "#4F7DF3", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Two-column: Gender + Cities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Gender Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-[20px] border border-[#E5E7EB] p-6"
            >
              <h2 className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                Répartition par genre
                <span className="ml-2 text-[12px] font-medium text-[#9CA3AF]">tous les membres</span>
              </h2>
              {data.genderDistribution.length > 0 ? (
                <div className="h-[250px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.genderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {data.genderDistribution.map((g) => (
                          <Cell key={g.name} fill={g.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 500 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[13px] text-[#9CA3AF]">Aucune donnée disponible</div>
              )}
            </motion.div>

            {/* Top Cities */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-[20px] border border-[#E5E7EB] p-6"
            >
              <h2 className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                Top villes
              </h2>
              {data.topCities.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topCities} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} />
                      <YAxis type="category" dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#4B5563", fontWeight: 500 }} width={80} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 500 }} />
                      <Bar dataKey="count" fill="#38C172" radius={[0, 6, 6, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-[13px] text-[#9CA3AF]">Aucune donnée disponible</div>
              )}
            </motion.div>
          </div>

          {/* Country Distribution */}
          {data.topCountries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-white rounded-[20px] border border-[#E5E7EB] p-6"
            >
              <h2 className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                Distribution géographique
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.topCountries.map((c, i) => (
                  <div key={c.country} className="bg-[#F9FAFB] rounded-xl p-4 border border-[#E5E7EB]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">{c.country}</p>
                    <p className="text-[22px] font-bold text-[#1a1a1a]">{c.count}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </>
  );
}