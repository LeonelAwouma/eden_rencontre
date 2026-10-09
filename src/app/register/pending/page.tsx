"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Mail, ArrowLeft, CheckCircle2, ArrowRight, LogIn } from "lucide-react";
import { Monogram } from "@/components/ornaments";
import { useI18n } from "@/lib/i18n";
import { logout, reportIncident } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** Intervalle de vérification du statut pendant que la page reste ouverte. */
const POLL_MS = 20_000;
/** Délai d'affichage de « Votre profil a été validé » avant d'entrer dans l'espace membre. */
const ENTER_DELAY_MS = 3_500;
const MEMBER_HOME = "/searching";

type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

function PendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const email = searchParams.get("email") || "";
  const [approved, setApproved] = useState(false);
  /** null : vérification en cours ; false : aucune session, la page ne peut pas suivre le statut. */
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  /** Statut illisible (erreur technique) : on le dit, au lieu d'attendre une validation qui ne s'affichera jamais. */
  const [statusError, setStatusError] = useState(false);

  // La session est conservée pendant l'attente : la page surveille le statut
  // et fait entrer le membre dès que l'admin valide son profil. Sans danger :
  // la RLS (20260924_member_approval_rls.sql) ne laisse un compte non approuvé
  // lire que sa propre fiche, et MemberGate bloque l'espace membre.
  useEffect(() => {
    if (!supabase) { setHasSession(false); return; }
    const db = supabase;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let reported = false;

    const check = async () => {
      const { data: { session } } = await db.auth.getSession();
      if (cancelled) return;
      setHasSession(!!session);
      if (!session) return;
      const { data, error } = await db.from("profiles").select("status").eq("id", session.user.id).maybeSingle();
      if (cancelled) return;
      if (error) {
        setStatusError(true);
        if (!reported) { reported = true; void reportIncident("pending_status_unreadable", error.message); }
        return;
      }
      setStatusError(false);
      const status = data?.status as AccountStatus | undefined;
      if (cancelled || !status || status === "pending") return;
      stop();
      if (status === "approved") {
        setApproved(true);
        setTimeout(() => { if (!cancelled) router.replace(MEMBER_HOME); }, ENTER_DELAY_MS);
      } else {
        await logout();
        if (!cancelled) router.replace(`/login?blocked=${status}`);
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void check(); };
    const stop = () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };

    void check();
    timer = setInterval(check, POLL_MS);
    // Retour sur l'onglet (souvent depuis l'e-mail de validation) : vérification immédiate.
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; stop(); };
  }, [router]);

  if (approved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md text-center space-y-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Monogram className="w-10 h-10 text-primary shrink-0" />
            <span className="font-headline text-2xl font-bold tracking-tight text-foreground">
              Garden <span>of Alliance</span>
            </span>
          </Link>

          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>

          <div className="space-y-4" role="status" aria-live="polite">
            <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">
              {t("registerPending.approvedTitle")}
            </h1>
            <p className="text-foreground/50 text-base leading-relaxed">
              {t("registerPending.approvedBody")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.replace(MEMBER_HOME)}
            className="inline-flex items-center gap-2 rounded-full bg-deep-eden px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-deep-eden/90 transition-colors"
          >
            {t("registerPending.approvedCta")}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-foreground/15 text-[10px] font-medium uppercase tracking-widest">
            {t("registerPending.tagline")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <Monogram className="w-10 h-10 text-primary shrink-0" />
          <span className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Garden <span>of Alliance</span>
          </span>
        </Link>

        {/* Icon */}
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">
            {t("registerPending.title")}
          </h1>
          <p className="text-foreground/50 text-base leading-relaxed">
            {t("registerPending.subtitle")}
          </p>
        </div>

        {/* Email notification */}
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-left">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-primary" />
            <p className="font-bold text-sm text-foreground">{t("registerPending.confirmationSent")}</p>
          </div>
          <p className="text-sm text-foreground/50 leading-relaxed">
            {t("registerPending.confirmationBody", { email: email || t("registerPending.yourEmail") })}
          </p>
        </div>

        {/* What happens next */}
        <div className="space-y-3 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-foreground/30">{t("registerPending.nextSteps")}</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-foreground/60">{t("registerPending.step1")}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-foreground/60">{t("registerPending.step2")}</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-foreground/60">{t("registerPending.step3")}</p>
            </div>
          </div>
        </div>

        {hasSession === true && !statusError && (
          <p className="text-xs text-foreground/40 leading-relaxed">{t("registerPending.autoRefresh")}</p>
        )}

        {statusError && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-foreground/60 leading-relaxed">{t("registerPending.statusErrorHint")}</p>
            <button
              type="button"
              onClick={async () => { await logout().catch(() => {}); router.replace(`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`); }}
              className="inline-flex items-center gap-2 rounded-full bg-deep-eden px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-deep-eden/90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {t("registerPending.noSessionCta")}
            </button>
          </div>
        )}

        {/* Sans session (page ouverte depuis un lien, session fermée…), la page ne
            peut pas voir la validation : on propose de se connecter. */}
        {hasSession === false && (
          <div className="space-y-3">
            <p className="text-sm text-foreground/60 leading-relaxed">{t("registerPending.noSessionHint")}</p>
            <Link
              href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="inline-flex items-center gap-2 rounded-full bg-deep-eden px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-deep-eden/90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {t("registerPending.noSessionCta")}
            </Link>
          </div>
        )}

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("registerPending.backHome")}
        </Link>

        <p className="text-foreground/15 text-[10px] font-medium uppercase tracking-widest">
          {t("registerPending.tagline")}
        </p>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-[#FF9E45]/20 border-t-[#FF9E45] rounded-full animate-spin" /></div>}>
      <PendingContent />
    </Suspense>
  );
}
