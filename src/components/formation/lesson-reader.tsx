"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Compass, Feather, HelpCircle,
  Lightbulb, RotateCcw, Target, X, BookOpenCheck, Quote, Eye, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Monogram } from "@/components/ornaments";
import { RichText, frenchSpacing } from "./rich-text";
import { useFormationProgress } from "@/lib/formation/progress";
import { FORMATION_BASE_PATH, BATIR_SUR_LE_ROC, ADMIN_FORMATION_PATH, ADMIN_LESSON_PREVIEW_PATH } from "@/lib/formation/batir-sur-le-roc";
import type { Lesson, LessonBlock, Pillar } from "@/lib/formation/types";

/* ─────────────────────────── Blocs de texte ─────────────────────────── */

function Blocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}><RichText text={b.text} /></p>;
          case "verse":
            return (
              <figure key={i} className="my-8 relative pl-6 sm:pl-8 border-l-2 border-primary/40">
                <Quote aria-hidden className="absolute -left-3 -top-1 w-6 h-6 p-1 rounded-full bg-background text-primary/70" />
                <blockquote className="font-headline italic text-[20px] sm:text-[22px] leading-snug text-foreground">
                  {frenchSpacing(`« ${b.text} »`)}
                </blockquote>
                <figcaption className="mt-2 text-[13px] font-semibold tracking-wide text-primary">{b.ref}</figcaption>
              </figure>
            );
          case "points":
            return (
              <ul key={i} className="space-y-4 my-6">
                {b.items.map((it, j) => (
                  <li key={j} className="eden-leaf-bullet">
                    <strong className="font-semibold text-foreground">{it.lead}</strong>{" "}
                    <RichText text={it.text} />
                  </li>
                ))}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className="space-y-3 my-6">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span className="w-7 h-7 mt-0.5 rounded-full bg-primary text-white text-[13px] font-bold flex items-center justify-center shrink-0">{j + 1}</span>
                    <span><RichText text={it} /></span>
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </>
  );
}

/**
 * Empêche la copie du contenu pédagogique (Ctrl+C, clic droit → Copier, menu
 * Édition). Le champ de réflexion personnelle reste copiable : il porte
 * `data-copyable`, et l'événement `copy` remonte jusqu'ici par bulles — on le
 * laisse donc passer quand il en vient. Ceci ne protège pas contre l'affichage
 * de la page source ou les outils de développement, qui restent hors de portée
 * de toute page web côté client.
 */
function preventContentCopy(e: React.ClipboardEvent) {
  if ((e.target as HTMLElement).closest("[data-copyable]")) return;
  e.preventDefault();
}

function SectionTitle({ id, eyebrow, children }: { id: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <header id={id} className="scroll-mt-28 mt-14 mb-5">
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-2">{eyebrow}</p>}
      <h2 className="font-headline text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">{children}</h2>
    </header>
  );
}

/* ─────────────────────────── Quiz ─────────────────────────── */

function Quiz({ lesson, answers, onAnswer, onReset }: {
  lesson: Lesson; answers: Record<number, number>;
  onAnswer: (q: number, o: number) => void; onReset: () => void;
}) {
  const answered = Object.keys(answers).length;
  const correct = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
  const done = answered === lesson.quiz.length;

  return (
    <div className="space-y-5 not-prose">
      {lesson.quiz.map((q, qi) => {
        const chosen = answers[qi];
        const isAnswered = chosen !== undefined;
        return (
          <fieldset key={qi} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <legend className="sr-only">Question {qi + 1}</legend>
            <p className="flex gap-3 text-[16px] font-semibold text-foreground leading-snug">
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[13px] font-bold flex items-center justify-center shrink-0">{qi + 1}</span>
              {frenchSpacing(q.question)}
            </p>
            <div className="mt-4 space-y-2" role="radiogroup" aria-label={`Réponses à la question ${qi + 1}`}>
              {q.options.map((opt, oi) => {
                const isRight = oi === q.answer;
                const isChosen = chosen === oi;
                return (
                  <button key={oi} type="button" role="radio" aria-checked={isChosen} disabled={isAnswered}
                    onClick={() => onAnswer(qi, oi)}
                    className={cn(
                      "w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border text-[15px] leading-snug transition-colors",
                      !isAnswered && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                      isAnswered && isRight && "border-primary bg-primary/10 text-foreground",
                      isAnswered && isChosen && !isRight && "border-[#B42318]/50 bg-[#B42318]/5 text-foreground",
                      isAnswered && !isRight && !isChosen && "border-border opacity-60",
                    )}>
                    <span className={cn(
                      "w-6 h-6 rounded-full border text-[12px] font-bold flex items-center justify-center shrink-0 mt-px",
                      isAnswered && isRight ? "bg-primary border-primary text-white"
                        : isAnswered && isChosen ? "bg-[#B42318] border-[#B42318] text-white"
                        : "border-[#B8B2A7] text-[#56615A]",
                    )}>
                      {isAnswered && isRight ? <Check className="w-3.5 h-3.5" /> : isAnswered && isChosen ? <X className="w-3.5 h-3.5" /> : String.fromCharCode(65 + oi)}
                    </span>
                    <span>{frenchSpacing(opt)}</span>
                  </button>
                );
              })}
            </div>
            <div aria-live="polite">
              {isAnswered && (
                <div className="mt-4 flex gap-3 rounded-xl bg-[#F6F3EA] px-4 py-3.5">
                  <Lightbulb className="w-5 h-5 text-[#8A5A00] shrink-0 mt-0.5" />
                  <p className="text-[14.5px] leading-relaxed text-[#3F4A43]">
                    <strong className="text-foreground">
                      {chosen === q.answer ? "Juste ! " : `Réponse attendue : ${String.fromCharCode(65 + q.answer)}. `}
                    </strong>
                    <span className="font-semibold text-[#8A5A00]">Éclairage — </span>{frenchSpacing(q.explanation)}
                  </p>
                </div>
              )}
            </div>
          </fieldset>
        );
      })}

      {answered > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
          <p className="text-[15px] text-foreground">
            {done
              ? <><strong>{correct} / {lesson.quiz.length}</strong> bonne{correct > 1 ? "s" : ""} réponse{correct > 1 ? "s" : ""}. {correct === lesson.quiz.length ? "La vision est bien ancrée." : "Relis les éclairages, puis réessaie."}</>
              : <>{answered} question{answered > 1 ? "s" : ""} sur {lesson.quiz.length}</>}
          </p>
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline">
            <RotateCcw className="w-3.5 h-3.5" /> Recommencer
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Réflexion ─────────────────────────── */

function Reflection({ lesson, value, onSave }: { lesson: Lesson; value: string; onSave: (t: string) => void }) {
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setText(value); }, [value]);

  const change = (t: string) => {
    setText(t); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { onSave(t); setSaved(true); }, 600);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[16px] leading-relaxed text-foreground"><RichText text={lesson.reflection.prompt} /></p>
      <label htmlFor={`reflexion-${lesson.slug}`} className="block mt-5 text-[13px] font-semibold text-foreground">Ce que je retiens de cette leçon</label>
      <textarea id={`reflexion-${lesson.slug}`} value={text} onChange={(e) => change(e.target.value)} rows={6}
        placeholder="Écris librement : personne d'autre que toi ne lira ces lignes."
        data-copyable
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] leading-relaxed text-foreground placeholder:text-[#7A847D] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-y select-text"
        style={{ WebkitUserSelect: "text" } as React.CSSProperties} />
      <p className="mt-2 text-[12.5px] text-[#56615A] flex items-center gap-1.5">
        {saved ? <><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Enregistré</> : <>Enregistrement automatique</>}
        <span aria-hidden>·</span> gardé uniquement sur cet appareil, jamais partagé.
      </p>
    </div>
  );
}

/* ─────────────────────────── Lecteur ─────────────────────────── */

/**
 * `preview` : aperçu depuis l'admin. Même rendu que pour les membres, mais les
 * liens restent dans l'admin et rien n'est enregistré (quiz, réflexion, progression).
 */
export function LessonReader({ lesson, pillar, previous, next, preview = false }: {
  lesson: Lesson; pillar: Pillar; previous: Lesson | null; next: Lesson | null; preview?: boolean;
}) {
  const { progress, ready, setCompleted, answer, resetQuiz, saveReflection, savePosition } = useFormationProgress({ persist: !preview });
  const basePath = preview ? ADMIN_LESSON_PREVIEW_PATH : FORMATION_BASE_PATH;
  const homeHref = preview ? ADMIN_FORMATION_PATH : "/dashboard/academie";
  const [scroll, setScroll] = useState(0);
  const isDone = progress.completed.includes(lesson.slug);
  const answers = progress.quiz[lesson.slug] || {};

  // ── Sauvegarde au fil de la lecture ──────────────────────────
  // Position de défilement enregistrée régulièrement (et à la sortie de la page) ;
  // la leçon devient « terminée » dès que le lecteur atteint sa fin.
  const savePositionRef = useRef(savePosition);
  savePositionRef.current = savePosition;
  const lastSaved = useRef({ at: 0, ratio: -1 });
  const ratioRef = useRef(0);
  // Rien n'est écrit avant d'avoir lu la position enregistrée : sinon le premier
  // calcul (haut de page) effacerait l'endroit où reprendre.
  const canSave = useRef(false);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Une seule complétion automatique par visite : si le membre la retire, on la respecte.
  const autoCompleted = useRef(false);

  useEffect(() => {
    const ratioNow = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      return max > 0 ? Math.min(1, h.scrollTop / max) : 0;
    };
    canSave.current = false;
    const persistNow = (force = false) => {
      if (!canSave.current) return;
      const r = ratioRef.current, last = lastSaved.current, now = Date.now();
      if (force || (now - last.at > 1500 && Math.abs(r - last.ratio) >= 0.02)) {
        lastSaved.current = { at: now, ratio: r };
        savePositionRef.current(lesson.slug, r);
      }
    };
    const onScroll = () => { ratioRef.current = ratioNow(); setScroll(ratioRef.current); persistNow(); };
    const onLeave = () => persistNow(true);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onLeave);
      onLeave(); // changement de leçon sans rechargement
    };
  }, [lesson.slug]);

  // À l'ouverture : proposer de reprendre là où la lecture s'était arrêtée.
  useEffect(() => {
    if (!ready) return;
    const saved = progress.positions[lesson.slug];
    setResumeAt(!progress.completed.includes(lesson.slug) && saved > 0.05 && saved < 0.95 ? saved : null);
    autoCompleted.current = false;
    lastSaved.current = { at: 0, ratio: -1 };
    savePositionRef.current(lesson.slug, saved ?? 0); // mémorise la leçon en cours
    canSave.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une fois par leçon, quand la progression est chargée
  }, [ready, lesson.slug]);

  useEffect(() => {
    if (resumeAt !== null && scroll >= resumeAt - 0.02) setResumeAt(null);
  }, [scroll, resumeAt]);

  const resume = () => {
    if (resumeAt === null) return;
    const h = document.documentElement;
    window.scrollTo({ top: resumeAt * (h.scrollHeight - h.clientHeight), behavior: "smooth" });
    setResumeAt(null);
  };

  useEffect(() => {
    const el = endRef.current;
    if (!el || !ready) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !autoCompleted.current) {
        autoCompleted.current = true;
        if (!isDone) setCompleted(lesson.slug, true);
      }
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ready, lesson.slug, isDone, setCompleted]);

  const toc = [
    { id: "introduction", label: "Introduction" },
    ...lesson.parts.map((p, i) => ({ id: `partie-${i + 1}`, label: p.heading })),
    { id: "cas-pratique", label: "Cas pratique" },
    { id: "boussole", label: lesson.compass.title },
    { id: "validation", label: "Validation des acquis" },
    { id: "reflexion", label: lesson.reflection.title },
  ];

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      {preview && (
        <div className="bg-[#2E4A36] text-white text-[13px]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
            <Eye className="w-4 h-4 shrink-0" />
            <p className="min-w-0 flex-1"><strong>Aperçu admin</strong><span className="hidden sm:inline"> · la leçon telle que la voient les membres. Réponses et progression ne sont pas enregistrées.</span></p>
            <Link href={ADMIN_FORMATION_PATH} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">Retour à l&apos;admin</Link>
          </div>
        </div>
      )}
      {/* En-tête de lecture */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href={homeHref} className="flex items-center gap-2 min-w-0 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <Monogram className="w-7 h-6 text-primary shrink-0 hidden sm:block" />
            <span className="truncate">{BATIR_SUR_LE_ROC.title}</span>
          </Link>
          <nav aria-label={`Leçons du pilier ${pillar.number}`} className="ml-auto hidden md:flex items-center gap-1.5">
            {pillar.lessons.map((l) => {
              const current = l.slug === lesson.slug;
              const done = progress.completed.includes(l.slug);
              return (
                <Link key={l.slug} href={`${basePath}/${l.slug}`} aria-current={current ? "page" : undefined}
                  title={`Leçon ${l.number} — ${l.title}${done ? " (terminée)" : ""}`}
                  className={cn("h-7 min-w-7 px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center border transition-colors",
                    current ? "bg-primary border-primary text-white"
                      : done ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-[#56615A] hover:border-primary/40")}>
                  {done && !current ? <Check className="w-3.5 h-3.5" /> : l.number}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="h-[3px] bg-transparent" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${scroll * 100}%` }} />
        </div>
      </header>

      {/* Image de la leçon — nette jusqu'au bord, sans voile */}
      <div className="max-w-6xl mx-auto sm:px-6 sm:pt-6">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] sm:rounded-3xl overflow-hidden bg-muted">
          <Image src={lesson.image.src} alt={lesson.image.alt} fill priority sizes="(min-width: 1152px) 1104px, 100vw"
            className="object-cover" style={{ objectPosition: lesson.image.position || "center" }} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
        <article className="max-w-[68ch] mx-auto lg:mx-0 lg:ml-auto w-full pb-20">
          {/* Titre */}
          <div className="pt-8 sm:pt-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">
              Pilier {pillar.number} · {pillar.title}
            </p>
            <h1 className="mt-3 font-headline text-[34px] sm:text-[44px] font-bold leading-[1.08] tracking-tight text-foreground">
              <span className="block text-[18px] sm:text-[20px] font-semibold text-[#56615A] mb-1.5 tracking-normal">Leçon {lesson.number}</span>
              {lesson.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-[#56615A]">
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {lesson.readingMinutes} min de lecture</span>
              <span className="inline-flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> {lesson.quiz.length} questions</span>
              {ready && isDone && <span className="inline-flex items-center gap-1.5 font-semibold text-primary"><CheckCircle2 className="w-4 h-4" /> Leçon terminée</span>}
            </div>
          </div>

          <div
            className="mt-8 space-y-5 text-[17px] sm:text-[18px] leading-[1.75] text-[#2E3A33] select-none"
            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
            onCopy={preventContentCopy} onCut={preventContentCopy}
          >
            <SectionTitle id="introduction" eyebrow="Introduction">{lesson.intro.heading}</SectionTitle>
            <Blocks blocks={lesson.intro.blocks} />

            {lesson.objective && (
              <aside className="my-8 flex gap-4 rounded-2xl bg-primary/[0.07] border border-primary/20 px-5 py-4">
                <Target className="w-5 h-5 text-primary shrink-0 mt-1" />
                <p className="text-[16px] leading-relaxed">
                  <strong className="block text-[12px] font-bold uppercase tracking-[0.16em] text-primary mb-1">Objectif de la leçon</strong>
                  {lesson.objective}
                </p>
              </aside>
            )}

            {lesson.parts.map((part, i) => (
              <section key={i}>
                <SectionTitle id={`partie-${i + 1}`} eyebrow={`Partie ${i + 1}`}>{part.heading}</SectionTitle>
                <div className="space-y-5"><Blocks blocks={part.blocks} /></div>
              </section>
            ))}

            {/* Cas pratique */}
            <section>
              <SectionTitle id="cas-pratique" eyebrow="Cas pratique">{lesson.caseStudy.title}</SectionTitle>
              <p className="text-[#3F4A43]"><RichText text={lesson.caseStudy.context} /></p>
              <div className="mt-5 grid gap-3">
                {lesson.caseStudy.responses.map((r, i) => (
                  <div key={i} className={cn("rounded-2xl border px-5 py-4 text-[16px] leading-relaxed",
                    r.right ? "border-primary/40 bg-primary/[0.07]" : "border-border bg-card")}>
                    <p className={cn("flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] mb-1.5",
                      r.right ? "text-primary" : "text-[#6B746E]")}>
                      {r.right ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {r.label}{r.right && " · la pratique"}
                    </p>
                    <p className="text-foreground"><RichText text={r.text} /></p>
                  </div>
                ))}
              </div>
            </section>

            {/* Boussole */}
            <section>
              <div id="boussole" className="scroll-mt-28 mt-14 rounded-3xl border border-[#D9C9A3] bg-[#FBF7EC] px-6 py-6 sm:px-8 sm:py-7">
                <p className="flex items-center gap-2.5 font-headline text-[22px] font-bold text-[#6E4A00]">
                  <Compass className="w-5 h-5" /> {lesson.compass.title}
                </p>
                <div className="mt-3 space-y-4 text-[16.5px] leading-[1.75] text-[#3F3A2E]"><Blocks blocks={lesson.compass.blocks} /></div>
              </div>
            </section>

            {/* Validation des acquis */}
            <section>
              <SectionTitle id="validation" eyebrow="Validation des acquis">Ancrer la vision</SectionTitle>
              <p className="text-[#3F4A43] mb-6">{lesson.quizIntro}</p>
              <Quiz lesson={lesson} answers={answers}
                onAnswer={(q, o) => answer(lesson.slug, q, o)} onReset={() => resetQuiz(lesson.slug)} />
            </section>

            {/* Réflexion */}
            <section>
              <SectionTitle id="reflexion" eyebrow="Pour aller plus loin">
                <span className="inline-flex items-center gap-2.5"><Feather className="w-6 h-6 text-primary" /> {lesson.reflection.title}</span>
              </SectionTitle>
              <Reflection lesson={lesson} value={progress.reflections[lesson.slug] || ""} onSave={(t) => saveReflection(lesson.slug, t)} />
            </section>

            {/* Fin de leçon — l'atteindre marque la leçon comme terminée */}
            <div ref={endRef} className="mt-14 rounded-3xl border border-border bg-card p-6 sm:p-8 text-center">
              <BookOpenCheck className="w-8 h-8 text-primary mx-auto" />
              <p className="mt-3 font-headline text-[22px] font-bold text-foreground">
                {isDone ? "Leçon terminée" : "Tu as parcouru cette leçon"}
              </p>
              <p className="mt-1 text-[15px] text-[#56615A]">
                {isDone
                  ? (preview ? "Aperçu : rien n'est enregistré." : "Ta progression est enregistrée automatiquement ; tu peux relire cette leçon quand tu veux.")
                  : "Marque-la comme terminée pour suivre ta progression dans le pilier."}
              </p>
              <div className="mt-5 flex items-center justify-center">
                <button type="button" onClick={() => setCompleted(lesson.slug, !isDone)}
                  className={cn("inline-flex items-center gap-2 h-11 px-5 rounded-full text-[14px] font-bold transition-colors",
                    isDone ? "border border-border text-foreground hover:bg-muted" : "bg-primary text-white hover:bg-primary/90")}>
                  {isDone ? <><RotateCcw className="w-4 h-4" /> Marquer comme non terminée</> : <><Check className="w-4 h-4" /> Marquer comme terminée</>}
                </button>
              </div>
            </div>

            {/* Navigation entre leçons */}
            <nav aria-label="Leçons voisines" className="mt-8 grid sm:grid-cols-2 gap-3">
              {previous ? (
                <LessonLink lesson={previous} direction="previous" basePath={basePath} />
              ) : <span className="hidden sm:block" />}
              {next ? (
                <LessonLink lesson={next} direction="next" basePath={basePath} onNavigate={() => !isDone && setCompleted(lesson.slug, true)} />
              ) : (
                <Link href={homeHref} className="group flex items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 text-right hover:border-primary/40">
                  <span>
                    <span className="block text-[12px] font-semibold text-[#56615A]">Fin du pilier {pillar.number}</span>
                    <span className="block text-[15px] font-semibold text-foreground group-hover:text-primary">Retour à la formation</span>
                  </span>
                  <ArrowRight className="w-5 h-5 text-primary" />
                </Link>
              )}
            </nav>
          </div>
        </article>

        {/* Sommaire (grand écran) */}
        <aside className="hidden lg:block">
          <nav aria-label="Dans cette leçon" className="sticky top-28 pt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#56615A] mb-3">Dans cette leçon</p>
            <ol className="space-y-1 border-l border-border">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block -ml-px pl-4 py-1.5 border-l-2 border-transparent text-[13px] leading-snug text-[#56615A] hover:text-primary hover:border-primary/60 transition-colors">
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>

      {/* Reprendre la lecture là où elle s'était arrêtée */}
      {resumeAt !== null && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[#2E4A36] text-white shadow-lg pl-1 pr-1.5 py-1">
            <button type="button" onClick={resume} className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[14px] font-semibold hover:bg-white/10">
              <ArrowDown className="w-4 h-4" /> Reprendre la lecture · {Math.round(resumeAt * 100)} %
            </button>
            <button type="button" onClick={() => setResumeAt(null)} aria-label="Masquer" className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonLink({ lesson, direction, basePath, onNavigate }: { lesson: Lesson; direction: "previous" | "next"; basePath: string; onNavigate?: () => void }) {
  const next = direction === "next";
  return (
    <Link href={`${basePath}/${lesson.slug}`} onClick={onNavigate}
      className={cn("group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:border-primary/40 transition-colors", next && "flex-row-reverse text-right")}>
      <span className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
        <Image src={lesson.image.card} alt="" fill sizes="80px" className="object-cover" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-[#56615A]">{next ? "Leçon suivante" : "Leçon précédente"} · {lesson.number}</span>
        <span className="block text-[15px] font-semibold text-foreground leading-snug group-hover:text-primary line-clamp-2">{lesson.title}</span>
      </span>
      {next ? <ArrowRight className="w-5 h-5 text-primary shrink-0" /> : <ArrowLeft className="w-5 h-5 text-primary shrink-0" />}
    </Link>
  );
}
