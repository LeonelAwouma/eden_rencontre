"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Monogram, Flourish } from "@/components/ornaments";
import { ArrowLeft, ArrowRight, Check, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { MemberGate } from "@/components/member-gate";
import { getOnboardingSteps, getMyOnboarding, saveOnboarding, completeOnboarding, applyAnswer, isFieldVisible, type Field, type SupportedLocale } from "@/lib/onboarding";
import { LoadingScreen } from "@/components/loading-screen";

const SKIP_KEY = "eden_onboarding_skipped";
// Étape en cours, par utilisateur, pour reprendre là où on s'est arrêté.
const STEP_KEY_PREFIX = "eden_onboarding_step:";
const AUTOSAVE_DELAY_MS = 800;

type AutoSaveState = "idle" | "saving" | "saved" | "error";

const hasValue = (v: any) =>
  v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

function readStoredStep(userId: string): number | null {
  try {
    const raw = localStorage.getItem(STEP_KEY_PREFIX + userId);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function OnboardingPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { locale, t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState<AutoSaveState>("idle");

  // Sauvegarde automatique : réponses modifiées non encore envoyées.
  const answersRef = useRef(answers);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Une fois la finalisation lancée, plus d'autosave (il remettrait onboarding_completed à false).
  const finishingRef = useRef(false);
  const inflightRef = useRef<Promise<unknown> | null>(null);

  const steps = getOnboardingSteps(locale as SupportedLocale);
  const total = steps.length;
  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / total) * 100);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSession();
      if (!session) { router.replace("/login"); return; }
      const { answers: saved, completed } = await getMyOnboarding();
      if (!active) return;
      if (completed) { router.replace("/dashboard"); return; }
      const initial = saved || {};
      // Reprise : étape mémorisée, sinon dernière étape contenant une réponse.
      const allSteps = getOnboardingSteps(locale as SupportedLocale);
      const uid = session.id ?? null;
      let resume = uid ? readStoredStep(uid) : null;
      if (resume === null) {
        let lastAnswered = 0;
        allSteps.forEach((s, i) => { if (s.fields.some((f) => hasValue(initial[f.id]))) lastAnswered = i; });
        resume = lastAnswered;
      }
      answersRef.current = initial;
      setAnswers(initial);
      setUserId(uid);
      setStepIndex(Math.min(resume, allSteps.length - 1));
      setLoading(false);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!dirtyRef.current || finishingRef.current) return;
    dirtyRef.current = false;
    setAutoSave("saving");
    const request = saveOnboarding(answersRef.current, false);
    inflightRef.current = request;
    const res = await request;
    if (inflightRef.current === request) inflightRef.current = null;
    if (finishingRef.current) return;
    if (res.ok) {
      setAutoSave(dirtyRef.current ? "saving" : "saved");
    } else {
      dirtyRef.current = true; // renvoyé à la prochaine modification ou au changement d'étape
      setAutoSave("error");
    }
  }, []);

  // Chaque modification déclenche une sauvegarde différée.
  useEffect(() => {
    answersRef.current = answers;
    if (!dirtyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void flush(); }, AUTOSAVE_DELAY_MS);
  }, [answers, flush]);

  // Mémorise l'étape courante pour la reprise.
  useEffect(() => {
    if (!userId || loading) return;
    try { localStorage.setItem(STEP_KEY_PREFIX + userId, String(stepIndex)); } catch {}
  }, [userId, stepIndex, loading]);

  // Onglet masqué / page quittée / démontage : on envoie ce qui reste.
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") void flush(); };
    const onPageHide = () => { void flush(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      void flush();
    };
  }, [flush]);

  const setField = (id: string, value: any) => {
    dirtyRef.current = true;
    setAnswers((prev) => applyAnswer(prev, id, value));
  };

  const persist = async (completed: boolean) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    dirtyRef.current = false;
    if (completed) finishingRef.current = true;
    // Un autosave encore en vol ne doit pas arriver après l'envoi final.
    if (inflightRef.current) await inflightRef.current;
    const ok = await submit(completed);
    if (ok) {
      setAutoSave("saved");
    } else {
      // Échec : on garde les réponses à renvoyer et on réactive l'autosave.
      dirtyRef.current = true;
      finishingRef.current = false;
    }
    return ok;
  };

  const submit = async (completed: boolean) => {
    setSaving(true);
    if (completed) {
      // Le serveur enregistre et crée la demande de badge si tout est rempli.
      const res = await completeOnboarding(answers);
      setSaving(false);
      if (!res.ok) {
        toast({ title: t("onboarding.saveFailed"), description: res.error || t("onboarding.retry"), variant: "destructive" });
        return false;
      }
      return true;
    }
    const res = await saveOnboarding(answers, completed);
    setSaving(false);
    if (!res.ok) {
      toast({ title: t("onboarding.saveFailed"), description: res.error || t("onboarding.retry"), variant: "destructive" });
      return false;
    }
    return true;
  };

  const next = async () => {
    const ok = await persist(stepIndex === total - 1);
    if (!ok) return;
    if (stepIndex < total - 1) {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      try {
        localStorage.removeItem(SKIP_KEY);
        if (userId) localStorage.removeItem(STEP_KEY_PREFIX + userId);
      } catch {}
      toast({ title: t("onboarding.profileCompleted"), description: t("onboarding.profileCompletedDesc") });
      router.push("/dashboard");
    }
  };

  const back = () => {
    void flush();
    if (stepIndex > 0) { setStepIndex((i) => i - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const skip = async () => {
    await flush();
    try { localStorage.setItem(SKIP_KEY, "1"); } catch {}
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <LoadingScreen label={t("onboarding.preparing")} />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-primary/15 px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <span className="font-headline text-xl font-bold text-foreground">Garden <span>of Alliance</span></span>
        </div>
        <button onClick={skip} className="text-foreground/50 hover:text-foreground text-sm font-medium transition-colors">
          {t("onboarding.skipForNow")}
        </button>
      </header>

      <main className="px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto">
        {/* Progression */}
        <div className="space-y-3 mb-8">
          <Progress value={progress} className="h-1.5 bg-foreground/5" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{step.qSubtitle}</span>
            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">{t("onboarding.stepOf", { current: stepIndex + 1, total })}</span>
          </div>
        </div>

        {/* En-tête de section */}
        <div className="text-center flex flex-col items-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary/80 font-bold mb-2">{step.qTitle}</span>
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">{step.title}</h1>
          {step.intro && <p className="text-muted-foreground text-sm mt-3 max-w-lg">{step.intro}</p>}
          {step.private && (
            <span className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-primary bg-primary/10 border border-primary/25 rounded-full px-3 py-1">
              <Lock className="w-3.5 h-3.5" /> {t("onboarding.privateBadge")}
            </span>
          )}
          <Flourish className="w-40 h-3 text-primary/40 mt-5" />
          {step.note ? (
            <div className="mt-4 max-w-lg mx-auto bg-primary/5 border border-primary/20 rounded-xl px-5 py-3.5 text-center">
              <p className="text-[12px] text-primary font-semibold leading-relaxed">
                {step.note}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground/60 mt-4 max-w-md text-center leading-relaxed">
              {t("questionnaire.dataNote")}
            </p>
          )}
        </div>

        {/* Champs */}
        <div className="space-y-7">
          {step.fields.filter((f) => isFieldVisible(f, answers)).map((f) => (
            <div key={f.id} className={cn(f.showIf && "-mt-3 ml-2 pl-4 border-l-2 border-primary/25 animate-in fade-in slide-in-from-top-1 duration-300")}>
              <FieldRenderer field={f} value={answers[f.id]} onChange={(v) => setField(f.id, v)} />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-primary/15">
          <Button
            onClick={back}
            disabled={stepIndex === 0 || saving}
            variant="outline"
            className="h-12 px-5 rounded-xl border-primary/20 text-foreground/60 hover:text-foreground font-bold gap-2 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> {t("onboarding.previous")}
          </Button>
          <Button
            onClick={next}
            disabled={saving}
            className="h-12 px-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/15 disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : stepIndex === total - 1 ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            {stepIndex === total - 1 ? t("onboarding.finish") : t("onboarding.saveAndContinue")}
          </Button>
        </div>

        <p
          aria-live="polite"
          className={cn(
            "text-center text-xs mt-6 inline-flex w-full items-center justify-center gap-1.5",
            autoSave === "error" ? "text-destructive/80" : "text-foreground/30",
          )}
        >
          {autoSave === "saving" && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("onboarding.autoSaving")}</>}
          {autoSave === "saved" && <><Check className="w-3.5 h-3.5 text-primary" /> {t("onboarding.autoSaved")}</>}
          {autoSave === "error" && t("onboarding.autoSaveError")}
          {autoSave === "idle" && t("onboarding.autoSaveNote")}
        </p>
      </main>
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const { t, locale } = useI18n();
  const labelEl = (
    <Label className="text-sm font-bold text-foreground block mb-2">
      {field.label}
      {field.help && <span className="block text-xs font-medium text-foreground/40 mt-0.5">{field.help}</span>}
    </Label>
  );

  if (field.type === "text") {
    return (
      <div>
        {labelEl}
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="h-12 rounded-xl bg-card border-primary/15 focus-visible:ring-primary/40" />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {labelEl}
        <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} className="rounded-xl bg-card border-primary/15 resize-none focus-visible:ring-primary/40" />
      </div>
    );
  }

  if (field.type === "single") {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "px-4 h-11 rounded-xl text-sm font-bold border transition-colors",
                value === opt ? "bg-primary/10 border-primary text-primary" : "bg-card text-foreground/60 border-primary/15 hover:border-primary/40"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "multi") {
    const arr: string[] = Array.isArray(value) ? value : [];
    const toggle = (opt: string) => {
      if (arr.includes(opt)) onChange(arr.filter((v) => v !== opt));
      else if (!field.max || arr.length < field.max) onChange([...arr, opt]);
    };
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map((opt) => {
            const sel = arr.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={cn(
                  "px-4 h-11 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2",
                  sel ? "bg-primary/10 border-primary text-primary" : "bg-card text-foreground/60 border-primary/15 hover:border-primary/40"
                )}
              >
                {sel && <Check className="w-4 h-4" />} {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "qcm") {
    return (
      <div>
        {labelEl}
        <div className="space-y-2.5">
          {field.options?.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const sel = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors",
                  sel ? "bg-primary/10 border-primary" : "bg-card border-primary/15 hover:border-primary/40"
                )}
              >
                <span className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black", sel ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-foreground/50")}>{letter}</span>
                <span className={cn("text-sm leading-relaxed", sel ? "text-foreground font-medium" : "text-foreground/70")}>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "agerange") {
    const range = value && typeof value === "object" ? value : { min: "", max: "" };
    return (
      <div>
        {labelEl}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/40 uppercase tracking-widest">{locale === "en" ? "From" : "De"}</span>
            <Input type="number" min={18} max={99} value={range.min ?? ""} onChange={(e) => onChange({ ...range, min: e.target.value })} className="w-20 h-12 rounded-xl bg-card border-primary/15 text-center" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/40 uppercase tracking-widest">{locale === "en" ? "to" : "à"}</span>
            <Input type="number" min={18} max={99} value={range.max ?? ""} onChange={(e) => onChange({ ...range, max: e.target.value })} className="w-20 h-12 rounded-xl bg-card border-primary/15 text-center" />
            <span className="text-xs text-foreground/40 uppercase tracking-widest">{locale === "en" ? "years" : "ans"}</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/** Réservé aux comptes approuvés par l'admin. */
export default function OnboardingPage() {
  return <MemberGate><OnboardingPageContent /></MemberGate>;
}
