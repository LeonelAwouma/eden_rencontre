"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeartHandshake, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authHeaders } from "@/lib/auth";
import {
  actionOutcome, buildConsentPayload, buildStopPayload, coachCardMode, coachDisplayName,
  type CardAssignment,
} from "@/lib/coach/card-mode";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

type Load = { kind: "loading" } | { kind: "error" } | { kind: "ready"; current: CardAssignment | null };

/**
 * Carte « accompagnement » de l'accueil membre : proposition d'un coach (Accepter / Refuser), suivi actif
 * (nom du coach, date de consentement, Arrêter). Rien n'est affiché sans proposition ni suivi.
 * Le membre est identifié par sa SESSION côté serveur : seules `assignment_id` (et la décision) sont envoyées.
 * Aucun succès n'est annoncé avant la réponse du serveur ; une proposition obsolète déclenche un rechargement.
 */
export function CoachProposalCard() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [slow, setSlow] = useState(false);
  const busyRef = useRef(false); // verrou synchrone : empêche une double soumission avant le re-rendu

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/member/coach", { headers: await authHeaders(), cache: "no-store" });
      // Pas membre approuvé (compte en cours d'inscription, coach…) : aucune carte, aucun message.
      if (res.status === 401 || res.status === 403) { setLoad({ kind: "ready", current: null }); return; }
      if (!res.ok) { setLoad({ kind: "error" }); return; }
      const body = await res.json().catch(() => null);
      setLoad({ kind: "ready", current: body?.current ?? null });
    } catch {
      setLoad({ kind: "error" });
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // Le squelette n'apparaît que si le chargement dure : pas de clignotement pour qui n'a aucun coach.
  useEffect(() => {
    if (load.kind !== "loading") { setSlow(false); return; }
    const id = setTimeout(() => setSlow(true), 500);
    return () => clearTimeout(id);
  }, [load.kind]);

  const act = async (kind: "accept" | "decline" | "stop", current: CardAssignment) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const url = kind === "stop" ? "/api/member/coach/stop" : "/api/member/coach/consent";
      const payload = kind === "stop" ? buildStopPayload(current.id) : buildConsentPayload(current.id, kind === "accept");
      const res = await fetch(url, {
        method: "POST",
        headers: { ...(await authHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      const expected = kind === "accept" ? "active" : kind === "decline" ? "declined" : ["revoked", "declined"];
      const outcome = actionOutcome(res.status, body, expected);

      if (outcome === "success") {
        toast({ title: t(kind === "accept" ? "coachMember.toastAccepted" : kind === "decline" ? "coachMember.toastDeclined" : "coachMember.toastStopped") });
      } else if (outcome === "stale") {
        toast({ title: t("coachMember.toastStale"), variant: "destructive" });
      } else {
        toast({ title: t("coachMember.toastError"), variant: "destructive" });
      }
      // Dans tous les cas, l'état affiché est celui du serveur.
      if (outcome !== "error") await reload();
    } catch {
      toast({ title: t("coachMember.toastError"), variant: "destructive" });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (load.kind === "loading") {
    return slow ? <div aria-busy="true" role="status" className="h-24 rounded-2xl border border-[#E6EAE5] bg-white animate-pulse" /> : null;
  }
  if (load.kind === "error") {
    return (
      <div role="alert" className="rounded-2xl border border-[#E6EAE5] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#56615A]">{t("coachMember.loadError")}</p>
        <button type="button" onClick={() => { setLoad({ kind: "loading" }); void reload(); }}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E6EAE5] px-3 py-1.5 text-sm font-medium hover:bg-[#F0F4EF]">
          <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t("coachMember.retry")}
        </button>
      </div>
    );
  }

  const current = load.current;
  const mode = coachCardMode(current);
  if (mode === "none" || !current) return null;

  const name = coachDisplayName(current.coachName) ?? t("coachMember.fallbackCoach");
  const initial = (name.trim()[0] || "C").toUpperCase();
  const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F4D3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173b2d] disabled:opacity-60";
  const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#E6EAE5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C241F] hover:bg-[#F0F4EF] disabled:opacity-60";

  return (
    <section aria-label={t("coachMember.sectionLabel")} className="rounded-2xl border border-[#DCE6DA] bg-gradient-to-br from-[#F3F8F2] to-white p-5">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 shrink-0 rounded-full bg-[#EEF5EE] text-[#28543C] font-semibold flex items-center justify-center ring-1 ring-[#DCE6DA]" aria-hidden="true">{initial}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#1C241F]">
            <HeartHandshake className="w-4 h-4 text-[#3F704D]" aria-hidden="true" />
            {mode === "proposal" ? t("coachMember.proposalTitle") : t("coachMember.activeTitle")}
          </h2>
          <p className="mt-1 text-sm text-[#56615A]">
            {mode === "proposal"
              ? t("coachMember.proposalDesc", { name })
              : t("coachMember.activeDesc", { name, date: current.consentAt ? new Date(current.consentAt).toLocaleDateString(locale, { dateStyle: "medium" }) : "—" })}
          </p>
          {mode === "proposal" && <p className="mt-1 text-xs text-[#6B746E]">{t("coachMember.shareNote")}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {mode === "proposal" ? (
              <>
                <button type="button" disabled={busy} onClick={() => void act("accept", current)} className={primary}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {t("coachMember.accept")}
                </button>
                <button type="button" disabled={busy} onClick={() => void act("decline", current)} className={secondary}>{t("coachMember.decline")}</button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => setConfirmStop(true)} className={secondary}>{t("coachMember.stop")}</button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("coachMember.stopConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("coachMember.stopConfirmDesc", { name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("coachMember.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void act("stop", current)}>{t("coachMember.stopConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
