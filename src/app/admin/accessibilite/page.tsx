"use client";

import { useCallback, useEffect, useState } from "react";
import { Accessibility, Flag, FlagOff, Loader2, Trash2, Users, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Stars, Distribution } from "@/components/accessibility/stars";
import { formatDateTime } from "@/components/admin/forum/forum-admin-shared";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { accessibilityLevel, type ReviewSort, type ReviewSummary } from "@/lib/accessibility-reviews";

interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  flagged: boolean;
  created_at: string;
  updated_at: string;
  author: { id: string; pseudo: string | null; name: string | null; email: string | null; avatar_url: string | null } | null;
}

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: "recent", label: "Plus récents" },
  { value: "relevance", label: "Pertinence" },
  { value: "rating_desc", label: "Meilleures notes" },
  { value: "rating_asc", label: "Notes les plus basses" },
];

const selectClass = "h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export default function AdminAccessibilityPage() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [sort, setSort] = useState<ReviewSort>("recent");
  const [rating, setRating] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);

  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(null), 3500); };

  const load = useCallback(async () => {
    const p = new URLSearchParams({ sort });
    if (rating) p.set("rating", rating);
    if (flaggedOnly) p.set("flagged", "1");
    try {
      const res = await fetch(`/api/admin/accessibility-reviews?${p}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Impossible de charger les avis."); return; }
      setError(null);
      setSummary(data.summary);
      setFlaggedCount(data.flaggedCount);
      setReviews(data.reviews);
    } catch { setError("Impossible de charger les avis."); }
    finally { setLoading(false); }
  }, [sort, rating, flaggedOnly]);

  useEffect(() => { load(); }, [load]);
  // Les avis arrivent en continu : la moyenne et la liste se rafraîchissent seules.
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(); }, 30000);
    return () => clearInterval(id);
  }, [load]);

  const toggleFlag = async (r: AdminReview) => {
    setBusy(r.id);
    const res = await fetch(`/api/admin/accessibility-reviews/${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagged: !r.flagged }),
    });
    setBusy(null);
    if (!res.ok) { flash("Action impossible. Réessayez."); return; }
    flash(r.flagged ? "Signalement retiré." : "Commentaire signalé comme inapproprié.");
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const r = toDelete;
    setToDelete(null);
    setBusy(r.id);
    const res = await fetch(`/api/admin/accessibility-reviews/${r.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) { flash("Suppression impossible. Réessayez."); return; }
    flash("Avis supprimé. La moyenne a été recalculée.");
    load();
  };

  const level = summary ? accessibilityLevel(summary.average, summary.count) : null;
  const filtered = !!rating || flaggedOnly;

  return (
    <div className="space-y-6">
      <PageHeader title="Accessibilité de la plateforme" subtitle="Avis des membres sur la facilité d'utilisation de Garden of Alliance." />

      {error && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">{notice}</p>}

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}

      {!loading && summary && (
        <>
          {/* Indicateur communautaire */}
          <section aria-label="Note globale" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex flex-col items-center md:items-start gap-1.5 shrink-0">
                <span className="text-5xl font-headline font-bold tabular-nums text-foreground">
                  {summary.count ? summary.average.toFixed(1).replace(".", ",") : "—"}
                  <span className="text-lg font-normal text-muted-foreground"> / 5</span>
                </span>
                <Stars value={summary.average} size="w-5 h-5" />
                <div className="mt-1 flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Users className="w-3.5 h-3.5" /> {summary.count} évaluation{summary.count > 1 ? "s" : ""}
                  </span>
                  {level && (
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold",
                      level.tone === "high" ? "bg-primary/15 text-primary" : level.tone === "mid" ? "bg-amber-100 text-amber-800" : level.tone === "low" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground")}>
                      {level.label}
                    </span>
                  )}
                  {flaggedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      <Flag className="w-3.5 h-3.5" /> {flaggedCount} signalé{flaggedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 max-w-md w-full mx-auto md:mx-0">
                <Distribution distribution={summary.distribution} count={summary.count} />
              </div>
            </div>
          </section>

          {summary.count === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card">
              <EmptyState icon={Accessibility} title="Aucun avis pour le moment" description="Dès qu'un membre évaluera l'accessibilité de la plateforme, son avis apparaîtra ici." />
            </div>
          ) : (
            <section aria-label="Avis des membres" className="space-y-4">
              {/* Filtres sur une seule ligne (défilement horizontal sur mobile) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <label className="sr-only" htmlFor="rv-sort">Trier par</label>
                <select id="rv-sort" value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)} className={selectClass}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <label className="sr-only" htmlFor="rv-rating">Filtrer par note</label>
                <select id="rv-rating" value={rating} onChange={(e) => setRating(e.target.value)} className={selectClass}>
                  <option value="">Toutes les notes</option>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} étoile{n > 1 ? "s" : ""}</option>)}
                </select>
                <button
                  type="button" aria-pressed={flaggedOnly} onClick={() => setFlaggedOnly((v) => !v)}
                  className={cn("h-10 shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 text-sm transition-colors",
                    flaggedOnly ? "border-red-300 bg-red-50 text-red-700" : "border-input bg-card text-foreground hover:bg-muted")}
                >
                  <Flag className="w-4 h-4" /> Signalés{flaggedCount ? ` (${flaggedCount})` : ""}
                </button>
              </div>

              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card">
                  <EmptyState icon={MessageSquareText} title="Aucun avis ne correspond" description={filtered ? "Modifiez ou retirez les filtres pour voir les autres avis." : "Rien à afficher."} />
                </div>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => {
                    const pseudo = r.author?.pseudo || r.author?.name || "Membre";
                    const edited = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime() > 60000;
                    return (
                      <li key={r.id} className={cn("rounded-2xl border bg-card p-4 sm:p-5", r.flagged ? "border-red-300" : "border-border")}>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-11 w-11 shrink-0">
                            <AvatarImage src={avatarSrc(r.author?.avatar_url)} alt="" />
                            <AvatarFallback>{pseudo.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <p className="font-semibold text-foreground truncate">
                                {pseudo}
                                {r.author?.name && r.author.pseudo && <span className="font-normal text-muted-foreground"> · {r.author.name}</span>}
                              </p>
                              <time dateTime={r.created_at} className="text-xs text-muted-foreground">
                                {formatDateTime(r.created_at)}{edited && " · modifié"}
                              </time>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Stars value={r.rating} />
                              <span className="text-xs font-semibold text-muted-foreground tabular-nums">{r.rating}/5</span>
                              {r.flagged && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                  <Flag className="w-3 h-3" /> Signalé
                                </span>
                              )}
                            </div>
                            {r.comment ? (
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">{r.comment}</p>
                            ) : (
                              <p className="mt-2 text-sm italic text-muted-foreground">Note sans commentaire</p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button" disabled={busy === r.id} onClick={() => toggleFlag(r)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                              >
                                {r.flagged ? <FlagOff className="w-3.5 h-3.5" /> : <Flag className="w-3.5 h-3.5" />}
                                {r.flagged ? "Retirer le signalement" : "Signaler comme inapproprié"}
                              </button>
                              <button
                                type="button" disabled={busy === r.id} onClick={() => setToDelete(r)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription>La moyenne sera recalculée. Le membre pourra publier un nouvel avis.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
