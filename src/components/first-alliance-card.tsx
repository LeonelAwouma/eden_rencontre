"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, HeartHandshake, Inbox, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authHeaders } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { FirstAllianceStep } from "@/lib/first-alliance-journey";

/**
 * Accompagnement « première alliance » du tableau de bord.
 * Lecture seule : le bloc n'envoie ni demande ni message. Chaque bouton ne fait que
 * conduire le membre vers une fonctionnalité existante, où il agit volontairement.
 */

interface Summary { step: FirstAllianceStep; friendId: string | null; conversationId: string | null }

interface Props {
  /** Membre connecté ; sans identifiant, rien n'est chargé. */
  userId: string | undefined;
  /** Garde-fous côté interface (les droits réels restent contrôlés par le serveur). */
  verified: boolean;
  profileComplete: boolean;
  isCoach: boolean;
  /** Pilier 1 de « Bâtir sur le roc » terminé (même source que le verrou du matching). */
  pillarOneDone: boolean;
  /** À incrémenter quand les alliances changent (temps réel) pour rafraîchir le bloc. */
  refreshKey: number;
  onDiscover: () => void;
  onRequests: () => void;
  onLocked: () => void;
  /** Ouvre (ou crée, côté serveur sécurisé) la conversation ; renvoie false en cas d'échec. */
  onOpenConversation: (friendId: string, conversationId: string | null) => Promise<boolean>;
}

export function FirstAllianceCard({
  userId, verified, profileComplete, isCoach, pillarOneDone, refreshKey, onDiscover, onRequests, onLocked, onOpenConversation,
}: Props) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const enabled = !!userId && verified && profileComplete && !isCoach;

  useEffect(() => {
    if (!enabled) { setSummary(null); return; }
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/member/first-alliance", { headers: await authHeaders(), cache: "no-store" });
      if (!res.ok) { if (!cancelled) setSummary(null); return; }
      const data = (await res.json()) as Summary;
      if (!cancelled) setSummary(data);
    })().catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [enabled, userId, refreshKey]);

  if (!enabled || !summary || summary.step === "hidden") return null;

  // Le verrou du pilier 1 suit la même règle que le matching du tableau de bord (progression synchronisée).
  const step: FirstAllianceStep = summary.step === "none" || summary.step === "locked_formation"
    ? (pillarOneDone ? "none" : "locked_formation")
    : summary.step;
  const content = {
    none: { key: "none", Icon: HeartHandshake, action: onDiscover },
    request_pending: { key: "pending", Icon: Send, action: onRequests },
    request_received: { key: "received", Icon: Inbox, action: onRequests },
    alliance_accepted: { key: "accepted", Icon: MessageCircle, action: null },
    conversation_empty: { key: "accepted", Icon: MessageCircle, action: null },
    locked_formation: { key: "locked", Icon: BookOpen, action: onLocked },
  }[step];

  const openConversation = async () => {
    if (!summary.friendId || busy) return;
    setBusy(true); setFailed(false);
    const ok = await onOpenConversation(summary.friendId, summary.conversationId).catch(() => false);
    setBusy(false);
    if (!ok) setFailed(true);
  };

  const base = `dashboard.firstAlliance.${content.key}`;
  return (
    <section aria-labelledby="first-alliance-title" className="rounded-2xl p-5"
      style={{
        background: "linear-gradient(135deg, #E4EFE0 0%, #FAF9F6 100%)",
        border: "1px solid #B5CBAE",
        boxShadow: "0 1px 3px rgba(72,107,70,0.06), 0 6px 20px rgba(72,107,70,0.10)",
      }}>
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 mb-3"
        style={{ background: "#FFFFFF", color: "#486B46", border: "1px solid #C6D4C0" }}>
        <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> {t("dashboard.firstAlliance.badge")}
      </p>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FFFFFF" }}>
          <content.Icon className="w-[18px] h-[18px]" style={{ color: "#486B46" }} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 id="first-alliance-title" className="font-headline font-bold text-[15px] leading-snug" style={{ color: "#2F2F2F" }}>{t(`${base}.title`)}</h3>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "#555555" }}>{t(`${base}.body`)}</p>
          {step === "none" && <p className="mt-2 text-xs leading-relaxed" style={{ color: "#555555" }}>{t("dashboard.firstAlliance.none.body2")}</p>}
        </div>
      </div>

      <Button
        onClick={content.action ?? openConversation}
        disabled={busy}
        aria-busy={busy}
        className="w-full mt-4 h-10 rounded-xl font-bold text-sm text-white"
        style={{ background: "#486B46" }}>
        {busy ? t("dashboard.firstAlliance.opening") : t(`${base}.cta`)}
        {!busy && <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden />}
      </Button>
      {failed && <p role="alert" className="mt-2 text-xs font-medium" style={{ color: "#B42318" }}>{t("dashboard.firstAlliance.openError")}</p>}
    </section>
  );
}
