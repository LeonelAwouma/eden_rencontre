"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, CheckCircle2, XCircle, Clock, Star, Eye, Loader2, Edit3, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";
import {
  AdminModal, Badge, Card, DetailItem, EmptyBlock, FilterTabs, LoadingBlock, MemberAvatar, Pagination, StatTile,
  btn, textareaClass, type Tone,
} from "@/components/admin/admin-ui";

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

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  pending_review: { label: "En attente", tone: "amber" },
  approved: { label: "Approuvé", tone: "green" },
  rejected: { label: "Rejeté", tone: "red" },
  needs_changes: { label: "Modifs requises", tone: "blue" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] || { label: status, tone: "neutral" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function Rating({ value, size = "w-3.5 h-3.5" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Note : ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} aria-hidden="true" className={cn(size, star <= value ? "text-[#C6A15B] fill-[#C6A15B]" : "text-[#E1DCD3]")} />
      ))}
    </span>
  );
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

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
  const sel = selectedTestimonial;
  const busy = (id: string) => actionLoading === id;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Témoignages" subtitle="Modérez les témoignages soumis par les membres avant leur publication." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatTile icon={MessageSquare} label="Total" value={stats.total} tone="green" />
        <StatTile icon={Clock} label="En attente" value={stats.pending} tone="amber" />
        <StatTile icon={CheckCircle2} label="Approuvés" value={stats.approved} tone="green" />
        <StatTile icon={XCircle} label="Rejetés" value={stats.rejected} tone="red" />
      </div>

      <FilterTabs
        label="Filtrer par statut"
        className="mb-5"
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v); setPage(1); }}
        options={STATUS_OPTIONS.map((o) => ({ ...o, count: o.value === "pending_review" ? stats.pending : undefined }))}
      />

      {loading ? (
        <Card><LoadingBlock label="Chargement des témoignages…" /></Card>
      ) : testimonials.length === 0 ? (
        <EmptyBlock icon={Quote} title="Aucun témoignage" description={statusFilter === "all" ? "Les témoignages soumis par les membres apparaîtront ici." : "Aucun témoignage ne correspond à ce filtre."} />
      ) : (
        <ul className="space-y-3">
          {testimonials.map((t) => (
            <Card as="li" key={t.id} className="p-4 sm:p-5 transition-colors duration-150 hover:border-[#D9D4CC]">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Auteur */}
                <div className="flex items-center gap-3 md:w-56 shrink-0 min-w-0">
                  <MemberAvatar name={t.user?.name} url={t.user?.avatar_url} size={40} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#1F2A23] truncate">{t.user?.name || "Anonyme"}</p>
                    <p className="text-[12px] text-[#5F6B63] truncate">{t.couple_names || formatDate(t.created_at)}</p>
                  </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0 flex gap-3">
                  {t.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.image_url} alt="Photo du couple" className="w-16 h-16 rounded-xl object-cover ring-1 ring-[#E8E5E0] shrink-0" />
                  )}
                  <div className="min-w-0">
                    {t.title && <p className="text-[14px] font-semibold text-[#1F2A23] mb-0.5">{t.title}</p>}
                    <p className="text-[14px] text-[#3A443E] leading-relaxed line-clamp-2">{t.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {t.rating ? <Rating value={t.rating} /> : null}
                      <span className="text-[12px] text-[#5F6B63]">{formatDate(t.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Statut & actions */}
                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {t.is_featured && <Badge tone="gold" icon={Star}>Vedette</Badge>}
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { setSelectedTestimonial(t); setFeedbackText(t.admin_feedback || ""); }} className={btn.small}>
                      <Eye className="w-4 h-4" aria-hidden="true" /> Détails
                    </button>
                    {t.status === "approved" && (
                      <button type="button" onClick={() => handleToggleFeatured(t.id, t.is_featured)} disabled={busy(t.id)}
                        className={cn(btn.icon, "w-8 h-8", t.is_featured && "text-[#7A5F27] bg-[#C6A15B]/10 border-[#C6A15B]/30")}
                        aria-pressed={t.is_featured}
                        aria-label={t.is_featured ? "Retirer de la vedette" : "Mettre en vedette"}
                        title={t.is_featured ? "Retirer de la vedette" : "Mettre en vedette"}>
                        <Star className={cn("w-4 h-4", t.is_featured && "fill-[#C6A15B] text-[#C6A15B]")} />
                      </button>
                    )}
                    {t.status === "pending_review" && (
                      <>
                        <button type="button" onClick={() => handleAction(t.id, "approved")} disabled={busy(t.id)}
                          className={cn(btn.icon, "w-8 h-8 text-primary hover:text-primary hover:bg-primary/[0.08]")} aria-label="Approuver" title="Approuver">
                          {busy(t.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => handleAction(t.id, "needs_changes")} disabled={busy(t.id)}
                          className={cn(btn.icon, "w-8 h-8")} aria-label="Demander des modifications" title="Demander des modifications">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleAction(t.id, "rejected")} disabled={busy(t.id)}
                          className={cn(btn.icon, "w-8 h-8 text-[#B83333] hover:text-[#B83333] hover:bg-[#D64545]/[0.08]")} aria-label="Rejeter" title="Rejeter">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />

      <AdminModal
        open={!!sel}
        onClose={() => setSelectedTestimonial(null)}
        title="Détails du témoignage"
        description={sel ? `Soumis le ${formatDate(sel.created_at)}` : undefined}
        footer={sel && (sel.status === "pending_review" ? (
          <>
            <button type="button" onClick={() => handleAction(sel.id, "rejected")} disabled={!!actionLoading} className={cn(btn.secondary, "text-[#B83333]")}>
              <XCircle className="w-4 h-4" /> Rejeter
            </button>
            <button type="button" onClick={() => handleAction(sel.id, "needs_changes")} disabled={!!actionLoading} className={btn.secondary}>
              <Edit3 className="w-4 h-4" /> Demander des modifications
            </button>
            <button type="button" onClick={() => handleAction(sel.id, "approved")} disabled={!!actionLoading} className={btn.primary}>
              {actionLoading === sel.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approuver
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setSelectedTestimonial(null)} className={btn.secondary}>Fermer</button>
        ))}
      >
        {sel && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <MemberAvatar name={sel.user?.name} url={sel.user?.avatar_url} size={48} />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[#1F2A23]">{sel.user?.name || "Anonyme"}</p>
                <p className="text-[13px] text-[#5F6B63] truncate">{sel.user?.email}</p>
                {(sel.user?.city || sel.user?.country) && (
                  <p className="text-[13px] text-[#5F6B63]">{[sel.user?.city, sel.user?.country].filter(Boolean).join(", ")}</p>
                )}
              </div>
            </div>

            {sel.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sel.image_url} alt="Photo du couple" className="w-full max-h-80 object-contain rounded-xl bg-[#FAF8F5] ring-1 ring-[#E8E5E0]" />
            )}

            <div>
              {sel.title && <p className="text-[15px] font-semibold text-[#1F2A23] mb-1.5">{sel.title}</p>}
              <blockquote className="text-[14px] text-[#3A443E] leading-relaxed whitespace-pre-wrap rounded-xl bg-[#FAF8F5] border border-[#F1EEE9] p-4">
                {sel.content}
              </blockquote>
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-[#F1EEE9] p-4">
              <DetailItem label="Statut"><StatusBadge status={sel.status} /></DetailItem>
              <DetailItem label="Note">{sel.rating ? <Rating value={sel.rating} size="w-4 h-4" /> : "—"}</DetailItem>
              {sel.couple_names && <DetailItem label="Noms du couple">{sel.couple_names}</DetailItem>}
              <DetailItem label="Formule"><span className="capitalize">{sel.user?.subscription_plan || "free"}</span></DetailItem>
              <DetailItem label="En vedette">{sel.is_featured ? "Oui" : "Non"}</DetailItem>
            </dl>

            <div>
              <label htmlFor="testimonial-feedback" className="block text-[14px] font-semibold text-[#1F2A23] mb-1">Retour à l&apos;auteur</label>
              <p className="text-[12px] text-[#5F6B63] mb-2">Motif du rejet ou suggestions de modification, transmis avec votre décision.</p>
              <textarea id="testimonial-feedback" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Motif du rejet ou suggestions de modification…" rows={3} className={textareaClass} />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
