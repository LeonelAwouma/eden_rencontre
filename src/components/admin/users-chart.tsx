"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface UsersChartProps {
  data: { date: string; count: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E5E0] px-4 py-3 shadow-lg">
        <p className="text-[11px] font-medium text-[#9CA3AF] mb-1">{label}</p>
        <p className="text-[15px] font-bold text-[#2F2F2F]">
          {payload[0].value}{" "}
          <span className="text-[12px] font-medium text-[#9CA3AF]">
            inscriptions
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function UsersChart({ data }: UsersChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-[#E8E5E0] p-4 sm:p-6 col-span-1 lg:col-span-2"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <h2
            className="text-base sm:text-lg font-semibold text-[#2F2F2F] tracking-tight"
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            Inscriptions — 30 derniers jours
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[#9CA3AF] mt-0.5 font-medium">
            Tendance des inscriptions utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#486B46]" />
          <span className="text-[12px] font-medium text-[#777777]">
            {total} inscription{total > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {total === 0 ? (
        <div className="h-[200px] sm:h-[240px] md:h-[260px] flex items-center justify-center">
          <p className="text-[13px] text-[#9CA3AF] font-medium">
            Aucune inscription sur les 30 derniers jours
          </p>
        </div>
      ) : (
      <div className="h-[200px] sm:h-[240px] md:h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="edenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#486B46" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#486B46" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#F3F4F6"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
              interval={4}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF", fontWeight: 500 }}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#486B46"
              strokeWidth={2.5}
              fill="url(#edenGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#486B46",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  );
}