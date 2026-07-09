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

// Generate demo data for last 30 days
const generateChartData = () => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      inscriptions: Math.floor(Math.random() * 20) + 5 + Math.floor(i / 5) * 3,
    });
  }
  return data;
};

const chartData = generateChartData();

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3 shadow-lg">
        <p className="text-[11px] font-medium text-[#9CA3AF] mb-1">{label}</p>
        <p className="text-[15px] font-bold text-[#1a1a1a]">
          {payload[0].value}{" "}
          <span className="text-[12px] font-medium text-[#9CA3AF]">inscriptions</span>
        </p>
      </div>
    );
  }
  return null;
};

export function UsersChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 col-span-1 lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Registrations — Last 30 Days
          </h2>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">
            Tendance des inscriptions utilisateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38C172]" />
          <span className="text-[12px] font-medium text-[#6B7280]">Inscriptions</span>
        </div>
      </div>

      <div className="h-[260px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="edenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38C172" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#38C172" stopOpacity={0} />
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
              tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
              interval={4}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="inscriptions"
              stroke="#38C172"
              strokeWidth={2.5}
              fill="url(#edenGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#38C172",
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}