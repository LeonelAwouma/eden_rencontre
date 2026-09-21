"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  CreditCard,
  TrendingUp,
  Users,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string;
  transaction_ref: string;
  paid_at: string | null;
  created_at: string;
  user?: { id: string; name: string; email: string };
  plan?: { id: string; name: string; price_cents: number; interval: string };
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "completed", label: "Complétés" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échoués" },
  { value: "refunded", label: "Remboursés" },
];

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-[#FF9E45]/10 text-[#FF9E45]",
  completed: "bg-[#38C172]/10 text-[#38C172]",
  failed: "bg-[#F56565]/10 text-[#F56565]",
  refunded: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  completed: "Complété",
  failed: "Échoué",
  refunded: "Remboursé",
};

const formatCurrency = (cents: number, currency = "XAF") => {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, minimumFractionDigits: 0 }).format(cents / 100);
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalRevenue: 0, monthlyRevenue: 0, activeSubscriptions: 0, failedPayments: 0, refundedPayments: 0,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const exportCSV = () => {
    const headers = ["ID", "Utilisateur", "Email", "Plan", "Montant", "Statut", "Date"];
    const rows = payments.map((p) => [
      p.id, p.user?.name || "", p.user?.email || "", p.plan?.name || "",
      formatCurrency(p.amount_cents, p.currency), STATUS_LABELS[p.status] || p.status,
      new Date(p.created_at).toLocaleDateString("fr-FR"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "payments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Mock revenue chart data (in production, derive from real data)
  const revenueChartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11 + i);
    return {
      month: d.toLocaleDateString("fr-FR", { month: "short" }),
      revenue: Math.round(stats.totalRevenue / 100 * (0.5 + Math.random())),
    };
  });

  const statCards = [
    { label: "Revenu total", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-[#38C172]", bg: "bg-[#38C172]/10" },
    { label: "Revenu mensuel", value: formatCurrency(stats.monthlyRevenue), icon: TrendingUp, color: "text-[#4F7DF3]", bg: "bg-[#4F7DF3]/10" },
    { label: "Abonnements actifs", value: stats.activeSubscriptions, icon: Users, color: "text-[#FF9E45]", bg: "bg-[#FF9E45]/10" },
    { label: "Paiements échoués", value: stats.failedPayments, icon: AlertCircle, color: "text-[#F56565]", bg: "bg-[#F56565]/10" },
    { label: "Remboursements", value: stats.refundedPayments, icon: RotateCcw, color: "text-[#8B5CF6]", bg: "bg-[#8B5CF6]/10" },
  ];

  return (
    <>
      

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Paiements
        </h1>
        <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium mb-6">{total} transaction{total !== 1 ? "s" : ""}</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-white rounded-[20px] border border-[#E5E7EB] p-5"
          >
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-[22px] font-bold text-[#1a1a1a] leading-none">{card.value}</p>
            <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[20px] border border-[#E5E7EB] p-6 mb-6"
      >
        <h2 className="text-[18px] font-semibold text-[#1a1a1a] tracking-tight mb-5" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
          Revenus — 12 derniers mois
        </h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38C172" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#38C172" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", fontSize: 13, fontWeight: 500 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#38C172" strokeWidth={2.5} fill="url(#revenueGradient)" dot={false} activeDot={{ r: 5, fill: "#38C172", stroke: "#fff", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Filters & Export */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex gap-1 bg-[#F9FAFB] rounded-xl p-1 border border-[#E5E7EB] overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all",
                statusFilter === opt.value ? "bg-white text-[#1a1a1a] shadow-sm border border-[#E5E7EB]" : "text-[#9CA3AF] hover:text-[#6B7280]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] text-[12px] font-semibold text-[#4B5563] hover:bg-[#F9FAFB] transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Exporter CSV
        </button>
      </motion.div>

      {/* Payments Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-[3px] border-[#38C172]/20 border-t-[#38C172] rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-[#9CA3AF] mt-3 font-medium">Chargement…</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-[#D1D5DB]" />
            </div>
            <p className="text-[15px] font-semibold text-[#6B7280]">Aucun paiement</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Les transactions apparaîtront ici</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#F3F4F6]">
                    {["Utilisateur", "Plan", "Montant", "Statut", "Méthode", "Date"].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] px-6 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9FAFB]">
                  {payments.map((payment, i) => (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="hover:bg-[#FAFAFA] transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-semibold text-[#1a1a1a]">{payment.user?.name || "—"}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{payment.user?.email || "—"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-medium text-[#374151]">{payment.plan?.name || "—"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[13px] font-bold text-[#1a1a1a]">{formatCurrency(payment.amount_cents, payment.currency)}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full", STATUS_CLASSES[payment.status])}>
                          {STATUS_LABELS[payment.status] || payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[12px] text-[#6B7280] font-medium capitalize">{payment.payment_method || "—"}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-[12px] text-[#9CA3AF] font-medium">
                          {new Date(payment.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#F9FAFB]">
              {payments.map((payment, i) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-semibold text-[#1a1a1a]">{payment.user?.name || "—"}</p>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", STATUS_CLASSES[payment.status])}>
                      {STATUS_LABELS[payment.status]}
                    </span>
                  </div>
                  <p className="text-[18px] font-bold text-[#1a1a1a]">{formatCurrency(payment.amount_cents, payment.currency)}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{payment.plan?.name || "—"} • {new Date(payment.created_at).toLocaleDateString("fr-FR")}</p>
                </motion.div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#F3F4F6]">
                <p className="text-[12px] text-[#9CA3AF] font-medium">Page {page} sur {totalPages}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}