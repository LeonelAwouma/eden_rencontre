"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/accessibility/stars";
import { REVIEW_COMMENT_MAX } from "@/lib/accessibility-reviews";

const TEXT = {
  fr: {
    approved: "Votre inscription a été approuvée",
    title: "Comment avez-vous trouvé le parcours d'inscription ?",
    intro: "Votre note nous aide à rendre l'inscription plus simple pour les prochains membres.",
    labels: ["Très difficile", "Difficile", "Correct", "Facile", "Très facile"],
    aria: "Note du parcours d'inscription",
    comment: "Un commentaire ? (facultatif)",
    placeholder: "Une étape compliquée, une question peu claire, un souci sur mobile… ou ce qui vous a plu.",
    send: "Envoyer ma note", skip: "Passer", close: "Continuer",
    thanks: "Merci pour votre retour !", thanksText: "Bienvenue dans Garden of Alliance.",
    pickRating: "Choisissez une note de 1 à 5 étoiles.", error: "Une erreur est survenue. Réessayez.",
  },
  en: {
    approved: "Your registration has been approved",
    title: "How did you find the registration process?",
    intro: "Your rating helps us make registration easier for future members.",
    labels: ["Very difficult", "Difficult", "Fair", "Easy", "Very easy"],
    aria: "Registration process rating",
    comment: "Any comment? (optional)",
    placeholder: "A confusing step, an unclear question, a problem on mobile… or what you liked.",
    send: "Send my rating", skip: "Skip", close: "Continue",
    thanks: "Thank you for your feedback!", thanksText: "Welcome to Garden of Alliance.",
    pickRating: "Please pick a rating from 1 to 5 stars.", error: "Something went wrong. Please try again.",
  },
} as const;

/** Mémorise, par membre, que la note a été donnée ou passée : la fenêtre ne revient pas. */
export const registrationFeedbackKey = (userId: string) => `eden_registration_feedback_done:${userId}`;

export function markRegistrationFeedbackDone(userId: string) {
  try { localStorage.setItem(registrationFeedbackKey(userId), "1"); } catch {}
}

/**
 * Le membre a-t-il encore à noter son parcours d'inscription ?
 * Faux s'il l'a déjà fait (ici ou sur un autre appareil) ou s'il a passé.
 */
export async function needsRegistrationFeedback(userId: string): Promise<boolean> {
  try { if (localStorage.getItem(registrationFeedbackKey(userId))) return false; } catch {}
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!token) return false;
  try {
    const res = await fetch("/api/accessibility-reviews", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.mine) { markRegistrationFeedbackDone(userId); return false; }
    return true;
  } catch { return false; }
}

/**
 * Fenêtre affichée une seule fois au membre dont l'inscription vient d'être
 * approuvée : note du parcours d'inscription (1-5) et commentaire facultatif.
 * Les réponses sont lues dans Admin → Accessibilité.
 */
export function RegistrationFeedbackDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { locale } = useI18n();
  const tx = TEXT[locale === "fr" ? "fr" : "en"];
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const finish = () => { markRegistrationFeedbackDone(userId); onClose(); };

  const send = async () => {
    if (!rating) { setError(tx.pickRating); return; }
    setSaving(true);
    setError(null);
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/accessibility-reviews", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || tx.error); return; }
      markRegistrationFeedbackDone(userId);
      setSent(true);
    } catch { setError(tx.error); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-labelledby="registration-feedback-title">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {sent ? (
          <div className="text-center space-y-3 py-2">
            <CheckCircle2 className="w-12 h-12 mx-auto text-[#486B46]" />
            <h2 id="registration-feedback-title" className="text-xl font-bold text-[#2F2F2F]">{tx.thanks}</h2>
            <p className="text-sm text-[#777777]">{tx.thanksText}</p>
            <Button onClick={onClose} className="w-full h-12 mt-2 bg-primary text-primary-foreground font-bold rounded-xl">{tx.close}</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF5EC] px-3 py-1 text-xs font-bold text-[#486B46]">
                <PartyPopper className="w-3.5 h-3.5" /> {tx.approved}
              </p>
              <h2 id="registration-feedback-title" className="text-xl font-bold text-[#2F2F2F]">{tx.title}</h2>
              <p className="text-sm text-[#777777]">{tx.intro}</p>
            </div>
            <StarInput value={rating} onChange={(v) => { setRating(v); setError(null); }} labels={[...tx.labels]} ariaLabel={tx.aria} />
            <div className="space-y-2">
              <label htmlFor="registration-feedback-comment" className="text-sm font-semibold text-[#2F2F2F]">{tx.comment}</label>
              <Textarea id="registration-feedback-comment" value={comment} rows={4} maxLength={REVIEW_COMMENT_MAX}
                onChange={(e) => setComment(e.target.value)} placeholder={tx.placeholder} className="resize-y text-base" />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={finish} disabled={saving} className="flex-1 h-12 rounded-xl">{tx.skip}</Button>
              <Button onClick={send} disabled={saving} className="flex-1 h-12 bg-primary text-primary-foreground font-bold rounded-xl">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : tx.send}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
