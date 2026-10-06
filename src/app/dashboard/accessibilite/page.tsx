"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Trash2, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Stars, StarInput, Distribution } from "@/components/accessibility/stars";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { REVIEW_COMMENT_MAX, accessibilityLevel, type MyReview, type ReviewSummary } from "@/lib/accessibility-reviews";

const TEXT = {
  fr: {
    back: "Retour", title: "Accessibilité de la plateforme",
    intro: "Garden of Alliance est-elle facile à utiliser pour vous ? Votre avis nous aide à l'améliorer pour tous.",
    average: "Note moyenne", reviews: (n: number) => `${n} évaluation${n > 1 ? "s" : ""}`,
    none: "Soyez le premier à donner votre avis.",
    yourRating: "Votre note d'accessibilité", yourComment: "Votre expérience (facultatif)",
    placeholder: "Taille du texte, lisibilité, navigation, utilisation sur mobile, lecteur d'écran… Qu'est-ce qui a facilité ou compliqué votre usage ?",
    labels: ["Très difficile", "Difficile", "Correct", "Facile", "Très facile"],
    publish: "Publier mon avis", update: "Enregistrer les modifications", saving: "Enregistrement…",
    delete: "Supprimer mon avis", cancel: "Annuler",
    deleteTitle: "Supprimer votre avis ?", deleteText: "La moyenne sera recalculée. Vous pourrez en publier un nouveau à tout moment.",
    published: "Merci ! Votre avis a été publié.", updated: "Votre avis a été modifié.", deleted: "Votre avis a été supprimé.",
    pickRating: "Choisissez d'abord une note de 1 à 5 étoiles.", error: "Une erreur est survenue. Réessayez.", session: "Session expirée. Reconnectez-vous.",
    mine: "Votre avis", level: { none: "Pas encore évaluée", low: "À améliorer", mid: "Accessibilité moyenne", high: "Plutôt accessible", top: "Très accessible" },
    aria: "Note d'accessibilité",
  },
  en: {
    back: "Back", title: "Platform accessibility",
    intro: "Is Garden of Alliance easy for you to use? Your feedback helps us improve it for everyone.",
    average: "Average rating", reviews: (n: number) => `${n} rating${n > 1 ? "s" : ""}`,
    none: "Be the first to share your feedback.",
    yourRating: "Your accessibility rating", yourComment: "Your experience (optional)",
    placeholder: "Text size, readability, navigation, mobile use, screen reader… What made it easier or harder to use?",
    labels: ["Very difficult", "Difficult", "Fair", "Easy", "Very easy"],
    publish: "Publish my review", update: "Save changes", saving: "Saving…",
    delete: "Delete my review", cancel: "Cancel",
    deleteTitle: "Delete your review?", deleteText: "The average will be recalculated. You can post a new one at any time.",
    published: "Thank you! Your review has been published.", updated: "Your review has been updated.", deleted: "Your review has been deleted.",
    pickRating: "Please pick a rating from 1 to 5 stars first.", error: "Something went wrong. Please try again.", session: "Session expired. Please sign in again.",
    mine: "Your review", level: { none: "Not rated yet", low: "Needs improvement", mid: "Average accessibility", high: "Fairly accessible", top: "Very accessible" },
    aria: "Accessibility rating",
  },
} as const;

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : null;
}

export default function AccessibilityReviewPage() {
  const { locale } = useI18n();
  const tx = TEXT[locale === "fr" ? "fr" : "en"];
  const { toast } = useToast();

  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [mine, setMine] = useState<MyReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorText, setErrorText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) { setErrorText(tx.session); setState("error"); return; }
    try {
      const res = await fetch("/api/accessibility-reviews", { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrorText(data.error || tx.error); setState("error"); return; }
      setSummary(data.summary);
      setMine(data.mine);
      setRating(data.mine?.rating ?? 0);
      setComment(data.mine?.comment ?? "");
      setState("ready");
    } catch { setErrorText(tx.error); setState("error"); }
  }, [tx.error, tx.session]);

  useEffect(() => { load(); }, [load]);

  const call = async (method: "PUT" | "DELETE") => {
    const headers = await authHeaders();
    if (!headers) { toast({ title: tx.session, variant: "destructive" }); return null; }
    try {
      const res = await fetch("/api/accessibility-reviews", {
        method, headers, body: method === "PUT" ? JSON.stringify({ rating, comment }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast({ title: data.error || tx.error, variant: "destructive" }); return null; }
      return data;
    } catch { toast({ title: tx.error, variant: "destructive" }); return null; }
  };

  const save = async () => {
    if (!rating) { toast({ title: tx.pickRating, variant: "destructive" }); return; }
    setSaving(true);
    const data = await call("PUT");
    setSaving(false);
    if (!data) return;
    const message = data.created ? tx.published : tx.updated;
    setSummary(data.summary);
    setMine(data.review);
    setDone(message);
    toast({ title: message });
  };

  const remove = async () => {
    setConfirmDelete(false);
    setSaving(true);
    const data = await call("DELETE");
    setSaving(false);
    if (!data) return;
    setSummary(data.summary);
    setMine(null); setRating(0); setComment(""); setDone(null);
    toast({ title: tx.deleted });
  };

  const levelOf = (s: ReviewSummary) => {
    const l = accessibilityLevel(s.average, s.count);
    if (l.tone === "none") return tx.level.none;
    if (l.tone === "low") return tx.level.low;
    if (l.tone === "mid") return tx.level.mid;
    return s.average >= 4.2 ? tx.level.top : tx.level.high;
  };

  const dirty = !mine || mine.rating !== rating || mine.comment !== comment.trim();

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> {tx.back}
        </Link>
        <header className="space-y-2">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-foreground">{tx.title}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{tx.intro}</p>
        </header>

        {state === "loading" && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {state === "error" && <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errorText}</p>}

        {state === "ready" && summary && (
          <>
            {/* Indicateur communautaire */}
            <section aria-label={tx.average} className="rounded-3xl border border-sage/30 bg-card p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <div className="flex flex-col items-center sm:items-start gap-1.5 shrink-0">
                  <span className="text-5xl font-headline font-bold text-foreground tabular-nums">
                    {summary.count ? summary.average.toFixed(1).replace(".", locale === "fr" ? "," : ".") : "—"}
                    <span className="text-lg text-muted-foreground font-normal"> / 5</span>
                  </span>
                  <Stars value={summary.average} size="w-5 h-5" />
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" /> {tx.reviews(summary.count)}
                  </span>
                  <span className="mt-1 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{levelOf(summary)}</span>
                </div>
                <div className="flex-1">
                  {summary.count ? <Distribution distribution={summary.distribution} count={summary.count} /> : <p className="text-sm text-muted-foreground text-center sm:text-left">{tx.none}</p>}
                </div>
              </div>
            </section>

            {/* Mon avis */}
            <section aria-label={tx.mine} className="rounded-3xl border border-sage/30 bg-card p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-foreground mb-2">{tx.yourRating}</h2>
                <StarInput value={rating} onChange={(v) => { setRating(v); setDone(null); }} labels={[...tx.labels]} ariaLabel={tx.aria} />
              </div>
              <div className="space-y-2">
                <label htmlFor="a11y-comment" className="font-semibold text-foreground text-sm">{tx.yourComment}</label>
                <Textarea
                  id="a11y-comment" value={comment} rows={5} maxLength={REVIEW_COMMENT_MAX}
                  onChange={(e) => { setComment(e.target.value); setDone(null); }}
                  placeholder={tx.placeholder} className="resize-y text-base"
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">{comment.length} / {REVIEW_COMMENT_MAX}</p>
              </div>

              {done && (
                <p role="status" className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {done}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                {mine ? (
                  <Button type="button" variant="ghost" disabled={saving} onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-12 sm:h-10">
                    <Trash2 className="w-4 h-4 mr-2" /> {tx.delete}
                  </Button>
                ) : <span />}
                <Button type="button" onClick={save} disabled={saving || !dirty} className="h-12 sm:h-10 px-6">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {saving ? tx.saving : mine ? tx.update : tx.publish}
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tx.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tx.deleteText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tx.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{tx.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
