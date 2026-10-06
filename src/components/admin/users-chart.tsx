"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface Point { label: string; count: number }
interface Series { points: Point[]; total: number; changePct: number | null }

const RANGES = [
  { value: 7, short: "7 j", long: "7 derniers jours" },
  { value: 30, short: "30 j", long: "30 derniers jours" },
  { value: 90, short: "3 mois", long: "3 derniers mois" },
  { value: 365, short: "1 an", long: "12 derniers mois" },
] as const;

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const n = payload[0].value;
  return (
    <div className="bg-white rounded-xl border border-[#E8E5E0] px-3 py-2 shadow-[0_4px_16px_rgba(31,51,40,0.08)]">
      <p className="text-[12px] font-medium text-[#5F6B63]">{label}</p>
      <p className="text-[14px] font-bold text-[#1F2A23]">
        {n} <span className="text-[12px] font-medium text-[#5F6B63]">inscription{n > 1 ? "s" : ""}</span>
      </p>
    </div>
  );
};

/**
 * Inscriptions sur une période au choix. `initialData` (30 jours, fourni par
 * /api/admin/stats) s'affiche tout de suite ; la période et la variation
 * viennent ensuite de /api/admin/stats/registrations.
 */
export function UsersChart({ data: initialData, className }: { data: { date: string; count: number }[]; className?: string }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>(30);
  const [series, setSeries] = useState<Series>(() => ({
    points: initialData.map((d) => ({ label: d.date, count: d.count })),
    total: initialData.reduce((s, d) => s + d.count, 0),
    changePct: null,
  }));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/stats/registrations?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !cancelled) setSeries({ points: d.points, total: d.total, changePct: d.changePct }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const current = RANGES.find((r) => r.value === range)!;
  const up = (series.changePct ?? 0) >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
      aria-labelledby="chart-title"
      className={cn("bg-white rounded-2xl border border-[#E8E5E0] p-5 sm:p-6 min-w-0", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="chart-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            Inscriptions — {current.long}
          </h2>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[28px] font-bold leading-none text-[#1F2A23] tabular-nums" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
              {series.total.toLocaleString("fr-FR")}
            </span>
            <span className="text-[13px] text-[#5F6B63]">inscription{series.total > 1 ? "s" : ""}</span>
            {series.changePct !== null && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
                up ? "bg-primary/[0.08] text-primary" : "bg-[#D64545]/[0.08] text-[#B83333]")}>
                {up ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : <TrendingDown className="w-3 h-3" aria-hidden="true" />}
                {up && series.changePct > 0 ? "+" : ""}{series.changePct} % vs période précédente
              </span>
            )}
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5F6B63]" aria-label="Chargement" />}
          </div>
        </div>

        <div role="radiogroup" aria-label="Période" className="inline-flex rounded-xl border border-[#E8E5E0] bg-[#FAF8F5] p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-3 h-8 rounded-lg text-[12px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                range === r.value ? "bg-white text-primary shadow-[0_1px_2px_rgba(31,51,40,0.08)]" : "text-[#56615A] hover:text-[#1F2A23]"
              )}
            >
              {r.short}
            </button>
          ))}
        </div>
      </div>

      {series.total === 0 && !loading ? (
        <div className="mt-4 h-[220px] flex items-center justify-center rounded-xl bg-[#FAF8F5]">
          <p className="text-[13px] text-[#5F6B63] font-medium">Aucune inscription sur cette période</p>
        </div>
      ) : (
        <div className="mt-4 h-[220px] sm:h-[240px] -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="edenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#486B46" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#486B46" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1EEE9" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={24}
                tick={{ fontSize: 12, fill: "#5F6B63" }} dy={6} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={32}
                tick={{ fontSize: 12, fill: "#5F6B63" }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#486B46", strokeOpacity: 0.2 }} />
              <Area type="monotone" dataKey="count" stroke="#486B46" strokeWidth={2} fill="url(#edenGradient)"
                dot={false} activeDot={{ r: 4, fill: "#486B46", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.section>
  );
}
