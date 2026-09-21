"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  CalendarDays,
  MapPin,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MeetEvent {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  meeting_link: string | null;
  location: string | null;
  event_date: string;
  participant_limit: number | null;
  is_public: boolean;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "cancelled", label: "Annulé" },
];

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-[#F3F4F6] text-[#6B7280]",
  published: "bg-[#38C172]/10 text-[#38C172]",
  cancelled: "bg-[#F56565]/10 text-[#F56565]",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<MeetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/events?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setEvents(data.events);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (res.ok) fetchEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1
            className="text-[24px] font-bold text-[#1a1a1a] tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
          >
            Événements Meet
          </h1>
          <p className="text-[13px] text-[#9CA3AF] mt-0.5 font-medium">
            {total} événement{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#38C172] to-[#22C55E] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(255,158,69,0.3)] hover:shadow-[0_6px_24px_rgba(255,158,69,0.4)] transition-all"
        >
          <Plus className="w-4 h-4" />
          Nouvel événement
        </Link>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex gap-1 bg-[#F9FAFB] rounded-xl p-1 border border-[#E5E7EB] overflow-x-auto">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={cn(
                "px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-200",
                statusFilter === opt.value
                  ? "bg-white text-[#1a1a1a] shadow-sm border border-[#E5E7EB]"
                  : "text-[#9CA3AF] hover:text-[#6B7280]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchEvents(); }} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1D5DB]" />
            <input
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[13px] text-[#374151] placeholder:text-[#D1D5DB] focus:outline-none focus:ring-2 focus:ring-[#38C172]/20 focus:border-[#38C172] transition-all font-medium"
            />
          </div>
        </form>
      </motion.div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-white rounded-[20px] border border-[#E5E7EB] animate-pulse" />
          ))
        ) : events.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center mb-4">
              <CalendarDays className="w-7 h-7 text-[#D1D5DB]" />
            </div>
            <p className="text-[15px] font-semibold text-[#6B7280]">Aucun événement</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Créez votre premier événement Meet</p>
          </div>
        ) : (
          events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="bg-white rounded-[20px] border border-[#E5E7EB] overflow-hidden group hover:border-[#86EFAC] hover:shadow-[0_4px_24px_rgba(255,158,69,0.08)] transition-all duration-300"
            >
              {event.cover_image_url ? (
                <div
                  className="h-36 bg-cover bg-center"
                  style={{ backgroundImage: `url(${event.cover_image_url})` }}
                />
              ) : (
                <div className="h-36 bg-gradient-to-br from-[#38C172]/8 to-[#86EFAC]/12 flex items-center justify-center">
                  <CalendarDays className="w-12 h-12 text-[#38C172]/20" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      STATUS_CLASSES[event.status] || "bg-gray-100 text-gray-500"
                    )}
                  >
                    {STATUS_LABELS[event.status] || event.status}
                  </span>
                  {event.is_public ? (
                    <Globe className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  )}
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a1a] line-clamp-1" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
                  {event.title}
                </h3>
                <p className="text-[12px] text-[#9CA3AF] mt-1 line-clamp-2 font-medium">
                  {event.description || "Pas de description"}
                </p>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-[#6B7280] font-medium">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {event.location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F3F4F6]">
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    className="flex-1 text-center text-[12px] font-semibold text-[#38C172] bg-[#38C172]/5 py-2.5 rounded-xl hover:bg-[#38C172]/10 transition-colors"
                  >
                    Modifier
                  </Link>
                  {event.meeting_link && (
                    <a
                      href={event.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D1D5DB] hover:text-[#4F7DF3] hover:bg-[#4F7DF3]/5 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    disabled={deletingId === event.id}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#D1D5DB] hover:text-[#F56565] hover:bg-[#F56565]/5 transition-all disabled:opacity-50"
                  >
                    {deletingId === event.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mt-6 px-2"
        >
          <p className="text-[12px] text-[#9CA3AF] font-medium">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F9FAFB] border border-[#E5E7EB] disabled:opacity-30 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}