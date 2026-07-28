"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/admin/dashboard-header";

interface TestimonialUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  city: string;
  country: string;
  subscription_plan: string;
}

interface Testimonial {
  id: string;
  user_id: string;
  couple_names: string | null;
  title: string | null;
  content: string;
  rating: number | null;
  status: string;
  admin_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  is_featured: boolean;
  match_id: string | null;
  image_url: string | null;
  created_at: string;
  user: TestimonialUser;
  reviewer?: { id: string; name: string; email: string } | null;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Tous", icon: MessageSquare },
  { value: "pending_review", label: "En attente", icon: Clock },
  { value: "approved", label: "Approuvés", icon: CheckCircle2 },
  { value: "rejected", label: "Rejetés", icon: XCircle },
  { value: "needs_changes", label: "Modifs requises", icon: Edit3 },
];

const STATUS_CLASSES: Record<string, string> = {
  pending_review: "bg-[#FF9E45]/10 text-[#FF9E45]",
  approved: "bg-[#38C172]/10 text-[#38C172]",
  rejected: "bg-[#F56565]/10 text-[#F56565]",
  needs_changes: "bg-[#4F7DF3]/10 text-[#4F7DF3]",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
  needs_changes: "Modifs requises",
};

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const limit = 20;

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/testimonials?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTestimonials(data.testimonials || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch testimonials:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const handleAction = async (testimonialId: string, status: string) => {
    setActionLoading(testimonialId);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testimonialId, status, admin_feedback: feedbackText || undefined }),
      });
      if (res.ok) {
        await fetchTestimonials();
        setSelectedTestimonial(null);
        setFeedbackText("");
      }
    } catch (e) {
      console.error("Failed to update testimonial:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleFeatured = async (testimonialId: string, currentFeatured: boolean) => {
    setActionLoading(testimonialId);
    try {
      await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testimonialId, is_featured: !currentFeatured }),
      });
      await fetchTestimonials();
    } catch (e) {
      console.error("Failed to toggle featured:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardHeader adminName="Admin" onMenuClick={() => {}} />

      {/* Page Title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Gestion des Témoignages
          </h2>
          <p className="text-sm text-[#9CA3AF] mt-1">Modérez les témoignages soumis par les membres</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: stats.total, color: "#486B46" },
          { label: "En attente", value: stats.pending, color: "#FF9E45" },
          { label: "Approuvés", value: stats.approved, color: "#38C172" },
          { label: "Rejetés", value: stats.rejected, color: "#F56565" },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-[#E5E7EB] p-4 text-center"
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[#9CA3AF] font-medium mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
              statusFilter === opt.value
                ? "bg-[#486B46] text-white"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
            )}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Testimonials List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#38C172] animate-spin" />
        </div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E7EB]">
          <MessageSquare className="w-12 h-12 text-[#E5E7EB] mx-auto mb-3" />
          <p className="text-[#9CA3AF] font-medium">Aucun témoignage trouvé</p>
          <p className="text-[#9CA3AF] text-sm mt-1">Les témoignages soumis apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {testimonials.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:border-[#C6D4C0] transition-all"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {/* User info */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C6A15B] to-[#D4B97A] flex items-center justify-center text-white text-sm font-bold">
                    {t.user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{t.user?.name || "Anonyme"}</p>
                    <p className="text-xs text-[#9CA3AF]">{t.couple_names || ""}</p>
                  </div>
                </div>

                {/* Image thumbnail */}
                {t.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#E5E7EB] shrink-0">
                    <img
                      src={t.image_url}
                      alt="Photo du couple"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content preview */}
                <div className="flex-1 min-w-0">
                  {t.title && <p className="text-sm font-semibold text-[#374151] mb-1">{t.title}</p>}
                  <p className="text-sm text-[#6B7280] line-clamp-2">{t.content}</p>
                  {t.rating && (
                    <div className="flex items-center gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn("w-3.5 h-3.5", star <= t.rating! ? "text-[#C6A15B] fill-[#C6A15B]" : "text-[#E5E7EB]")}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    {t.is_featured && (
                      <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-[#C6A15B]/10 text-[#C6A15B]">
                        ⭐ Vedette
                      </span>
                    )}
                    <span className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold", STATUS_CLASSES[t.status])}>
                      {STATUS_LABELS[t.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedTestimonial(t); setFeedbackText(t.admin_feedback || ""); }}
                      className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#374151] transition-all"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {t.status === "approved" && (
                      <button
                        onClick={() => handleToggleFeatured(t.id, t.is_featured)}
                        disabled={actionLoading === t.id}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50",
                          t.is_featured
                            ? "bg-[#C6A15B]/10 text-[#C6A15B]"
                            : "border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
                        )}
                        title={t.is_featured ? "Retirer de la vedette" : "Mettre en vedette"}
                      >
                        <Star className={cn("w-4 h-4", t.is_featured && "fill-[#C6A15B]")} />
                      </button>
                    )}
                    {t.status === "pending_review" && (
                      <>
                        <button
                          onClick={() => handleAction(t.id, "approved")}
                          disabled={actionLoading === t.id}
                          className="w-8 h-8 rounded-lg bg-[#38C172]/10 flex items-center justify-center text-[#38C172] hover:bg-[#38C172]/20 transition-all disabled:opacity-50"
                          title="Approuver"
                        >
                          {actionLoading === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleAction(t.id, "needs_changes")}
                          disabled={actionLoading === t.id}
                          className="w-8 h-8 rounded-lg bg-[#4F7DF3]/10 flex items-center justify-center text-[#4F7DF3] hover:bg-[#4F7DF3]/20 transition-all disabled:opacity-50"
                          title="Demander des modifications"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(t.id, "rejected")}
                          disabled={actionLoading === t.id}
                          className="w-8 h-8 rounded-lg bg-[#F56565]/10 flex items-center justify-center text-[#F56565] hover:bg-[#F56565]/20 transition-all disabled:opacity-50"
                          title="Rejeter"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-[10px] text-[#9CA3AF]">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E5E7EB]">
          <p className="text-sm text-[#9CA3AF]">
            Page {page} sur {totalPages} · {total} résultats
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] disabled:opacity-40 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTestimonial && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTestimonial(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Détails du Témoignage
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C6A15B] to-[#D4B97A] flex items-center justify-center text-white font-bold">
                  {selectedTestimonial.user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{selectedTestimonial.user?.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{selectedTestimonial.user?.email}</p>
                  <p className="text-xs text-[#9CA3AF]">{selectedTestimonial.user?.city}, {selectedTestimonial.user?.country}</p>
                </div>
              </div>

              {/* Uploaded image */}
              {selectedTestimonial.image_url && (
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Photo du couple</p>
                  <div className="rounded-xl overflow-hidden border border-[#E5E7EB]">
                    <img
                      src={selectedTestimonial.image_url}
                      alt="Photo du couple"
                      className="w-full max-h-80 object-contain bg-[#F9FAFB]"
                    />
                  </div>
                </div>
              )}

              {selectedTestimonial.couple_names && (
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Noms du couple</p>
                  <p className="text-sm font-medium">{selectedTestimonial.couple_names}</p>
                </div>
              )}

              {selectedTestimonial.title && (
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Titre</p>
                  <p className="text-sm font-semibold">{selectedTestimonial.title}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-[#9CA3AF] mb-1">Témoignage</p>
                <p className="text-sm text-[#374151] leading-relaxed p-4 bg-[#F9FAFB] rounded-xl">{selectedTestimonial.content}</p>
              </div>

              {selectedTestimonial.rating && (
                <div>
                  <p className="text-xs text-[#9CA3AF] mb-1">Note</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn("w-4 h-4", star <= selectedTestimonial.rating! ? "text-[#C6A15B] fill-[#C6A15B]" : "text-[#E5E7EB]")}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#F9FAFB] rounded-xl text-sm grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[#9CA3AF] text-xs">Statut</p>
                  <span className={cn("inline-block px-2 py-1 rounded-md text-xs font-semibold mt-1", STATUS_CLASSES[selectedTestimonial.status])}>
                    {STATUS_LABELS[selectedTestimonial.status]}
                  </span>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">Plan</p>
                  <p className="font-semibold capitalize">{selectedTestimonial.user?.subscription_plan || "free"}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">Soumis le</p>
                  <p className="font-semibold">{new Date(selectedTestimonial.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
                <div>
                  <p className="text-[#9CA3AF] text-xs">En vedette</p>
                  <p className="font-semibold">{selectedTestimonial.is_featured ? "Oui" : "Non"}</p>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="text-sm font-medium text-[#374151] mb-1 block">Retour / Feedback admin</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Motif du rejet ou suggestions de modification…"
                  className="w-full p-3 border border-[#E5E7EB] rounded-xl text-sm text-[#374151] outline-none focus:border-[#486B46] resize-none"
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedTestimonial.status === "pending_review" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(selectedTestimonial.id, "approved")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#38C172] text-white font-semibold text-sm hover:bg-[#2FA860] transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approuver
                  </button>
                  <button
                    onClick={() => handleAction(selectedTestimonial.id, "needs_changes")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F7DF3] text-white font-semibold text-sm hover:bg-[#3A6BD9] transition-all disabled:opacity-50"
                  >
                    <Edit3 className="w-4 h-4" />
                    Modifications
                  </button>
                  <button
                    onClick={() => handleAction(selectedTestimonial.id, "rejected")}
                    disabled={!!actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F56565] text-white font-semibold text-sm hover:bg-[#E04E4E] transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedTestimonial(null)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-[#6B7280] font-medium text-sm hover:bg-[#F9FAFB] transition-all"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}