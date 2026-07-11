"use client";

import { useEffect, useState } from "react";
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
import { ONBOARDING_STEPS, getMyOnboarding, saveOnboarding, type Field } from "@/lib/onboarding";

const SKIP_KEY = "eden_onboarding_skipped";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const total = ONBOARDING_STEPS.length;
  const step = ONBOARDING_STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / total) * 100);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSession();
      if (!session) { router.replace("/login"); return; }
      const { answers: saved, completed } = await getMyOnboarding();
      if (!active) return;
      if (completed) { router.replace("/dashboard"); return; }
      setAnswers(saved || {});
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  const setField = (id: string, value: any) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const persist = async (completed: boolean) => {
    setSaving(true);
    const res = await saveOnboarding(answers, completed);
    setSaving(false);
    if (!res.ok) {
      toast({ title: "Échec de l'enregistrement", description: res.error || "Réessayez.", variant: "destructive" });
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
      localStorage.removeItem(SKIP_KEY);
      toast({ title: "Profil complété 🙏", description: "Vos réponses guideront vos suggestions d'affinité." });
      router.push("/dashboard");
    }
  };

  const back = () => {
    if (stepIndex > 0) { setStepIndex((i) => i - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const skip = () => {
    localStorage.setItem(SKIP_KEY, "1");
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Monogram className="w-12 h-10 text-primary animate-pulse" style={{ animationDuration: "2s" }} />
        <p className="text-foreground/50 text-sm">Préparation de votre parcours…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-secondary/15 px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Monogram className="w-9 h-8 text-primary shrink-0" />
          <span className="font-headline text-xl font-bold text-foreground">Eden <span>Connexion</span></span>
        </div>
        <button onClick={skip} className="text-foreground/50 hover:text-foreground text-sm font-medium transition-colors">
          Passer pour l'instant
        </button>
      </header>

      <main className="px-4 sm:px-6 py-8 sm:py-12 max-w-2xl mx-auto">
        {/* Progression */}
        <div className="space-y-3 mb-8">
          <Progress value={progress} className="h-1.5 bg-foreground/5" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">{step.qSubtitle}</span>
            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Étape {stepIndex + 1} / {total}</span>
          </div>
        </div>

        {/* En-tête de section */}
        <div className="text-center flex flex-col items-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-secondary/80 font-bold mb-2">{step.qTitle}</span>
          <h1 className="font-headline text-3xl sm:text-4xl font-bold text-foreground">{step.title}</h1>
          {step.intro && <p className="text-muted-foreground text-sm mt-3 max-w-lg">{step.intro}</p>}
          {step.private && (
            <span className="inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-secondary bg-secondary/10 border border-secondary/25 rounded-full px-3 py-1">
              <Lock className="w-3.5 h-3.5" /> Privé — visible par vous seul
            </span>
          )}
          <Flourish className="w-40 h-3 text-secondary/40 mt-5" />
          <p className="text-[11px] text-muted-foreground/60 mt-4 max-w-md text-center leading-relaxed">
            Les informations collectées nous permettent de garantir un matching sûr, pertinent et efficace.
          </p>
        </div>

        {/* Champs */}
        <div className="space-y-7">
          {step.fields.map((f) => (
            <FieldRenderer key={f.id} field={f} value={answers[f.id]} onChange={(v) => setField(f.id, v)} />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-secondary/15">
          <Button
            onClick={back}
            disabled={stepIndex === 0 || saving}
            variant="outline"
            className="h-12 px-5 rounded-xl border-secondary/20 text-foreground/60 hover:text-foreground font-bold gap-2 disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" /> Précédent
          </Button>
          <Button
            onClick={next}
            disabled={saving}
            className="h-12 px-7 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 shadow-lg shadow-primary/15 disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : stepIndex === total - 1 ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            {stepIndex === total - 1 ? "Terminer" : "Enregistrer et continuer"}
          </Button>
        </div>

        <p className="text-center text-foreground/30 text-xs mt-6">
          Vos réponses sont enregistrées à chaque étape — vous pouvez reprendre plus tard.
        </p>
      </main>
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
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
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className="h-12 rounded-xl bg-card border-secondary/15 focus-visible:ring-secondary/40" />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {labelEl}
        <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} rows={4} className="rounded-xl bg-card border-secondary/15 resize-none focus-visible:ring-secondary/40" />
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
                value === opt ? "bg-secondary/10 border-secondary text-secondary" : "bg-card text-foreground/60 border-secondary/15 hover:border-secondary/40"
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
                  sel ? "bg-secondary/10 border-secondary text-secondary" : "bg-card text-foreground/60 border-secondary/15 hover:border-secondary/40"
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
                  sel ? "bg-secondary/10 border-secondary" : "bg-card border-secondary/15 hover:border-secondary/40"
                )}
              >
                <span className={cn("shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black", sel ? "bg-secondary text-secondary-foreground" : "bg-foreground/5 text-foreground/50")}>{letter}</span>
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
            <span className="text-xs text-foreground/40 uppercase tracking-widest">De</span>
            <Input type="number" min={18} max={99} value={range.min ?? ""} onChange={(e) => onChange({ ...range, min: e.target.value })} className="w-20 h-12 rounded-xl bg-card border-secondary/15 text-center" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/40 uppercase tracking-widest">à</span>
            <Input type="number" min={18} max={99} value={range.max ?? ""} onChange={(e) => onChange({ ...range, max: e.target.value })} className="w-20 h-12 rounded-xl bg-card border-secondary/15 text-center" />
            <span className="text-xs text-foreground/40 uppercase tracking-widest">ans</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
