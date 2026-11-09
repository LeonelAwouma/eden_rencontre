"use client";

import { useEffect, useMemo, useRef } from "react";
import { Target } from "lucide-react";
import { Blocks, SectionTitle } from "@/components/formation/lesson-reader";
import { SpeechPlayer } from "@/components/formation/speech-player";
import { RichText, SpeechWordsProvider, Words } from "@/components/formation/rich-text";
import { useI18n } from "@/lib/i18n";
import type { CoachLesson } from "@/lib/coach/academie";

/**
 * Lecture protégée d'une leçon de l'Académie, pour un coach : texte + audio associé dans la même fiche.
 *
 * MÉCANISMES DE DISSUASION (aucune application Web ne peut garantir l'impossibilité de copier un texte affiché ni
 * d'enregistrer un son diffusé ; captures d'écran, enregistrement externe et outils du navigateur restent possibles) :
 *   - sélection de texte désactivée ; copie, coupe, glisser, clic droit et raccourcis de copie/impression/enregistrement
 *     bloqués tant que la fiche est affichée ;
 *   - rendu masqué à l'impression ;
 *   - filigrane discret et dynamique (nom du coach) sur toute la fiche ;
 *   - aucun bouton Copier / Exporter / Télécharger, aucune adresse de fichier source ; l'audio est lu depuis la route
 *     serveur authentifiée, dans un lecteur sans commande de téléchargement.
 */

const BLOCKED_KEYS = new Set(["c", "x", "p", "s", "a", "u"]);

export function ProtectedLesson({ lesson, coachName, coachId }: { lesson: CoachLesson; coachName: string; coachId: string }) {
  const { t } = useI18n();
  const contentRef = useRef<HTMLElement>(null);
  const speechOn = !!lesson.audio?.transcript;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) e.preventDefault();
    };
    const onCtx = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", onCtx);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("contextmenu", onCtx); };
  }, []);

  // Filigrane : motif SVG répété (nom + identifiant professionnel court), très léger, sans effet sur les clics.
  const watermark = useMemo(() => {
    const label = `${coachName} · ${coachId.slice(0, 8)}`.replace(/[<>&"']/g, "");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='200'><text x='20' y='110' font-family='sans-serif' font-size='15' fill='#1C241F' fill-opacity='0.07' transform='rotate(-20 180 100)'>${label}</text></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [coachName, coachId]);

  const block = (e: React.SyntheticEvent) => e.preventDefault();
  const part = (n: number) => t("coachAcademie.part", { n });

  return (
    <div className="relative">
      <style>{"@media print { .coach-protected { display: none !important; } .coach-print-note { display: block !important; } }"}</style>
      <p className="coach-print-note hidden">{t("coachAcademie.protectedNote")}</p>
      <div className="coach-protected relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: watermark }} />

        <p className="mb-4 rounded-xl bg-[#EEF5EC] px-4 py-2.5 text-[13px] text-[#2E4A36]">{t("coachAcademie.protectedNote")}</p>

        {lesson.audio ? (
          <SpeechPlayer key={lesson.slug} src={lesson.audio.src} transcriptSrc={lesson.audio.transcript ?? undefined}
            summary={lesson.audio.summary} rootRef={contentRef} title={`${lesson.number} — ${lesson.title}`} />
        ) : (
          <p className="my-4 rounded-xl border border-dashed border-[#C6D4C0] px-4 py-3 text-sm text-[#56615A]">{t("coachAcademie.audioUnavailable")}</p>
        )}

        <article
          ref={contentRef}
          className="mt-6 space-y-5 text-[17px] leading-[1.75] text-[#2E3A33] select-none"
          style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
          onCopy={block} onCut={block} onDragStart={block} onContextMenu={block}
        >
          <SpeechWordsProvider value={speechOn}>
            <SectionTitle id="introduction" eyebrow={t("coachAcademie.introduction")}><Words text={lesson.intro.heading} /></SectionTitle>
            <Blocks blocks={lesson.intro.blocks} />

            {lesson.objective && (
              <aside className="my-8 flex gap-4 rounded-2xl bg-primary/[0.07] border border-primary/20 px-5 py-4">
                <Target className="w-5 h-5 text-primary shrink-0 mt-1" aria-hidden="true" />
                <p className="text-[16px] leading-relaxed">
                  <strong className="block text-[12px] font-bold uppercase tracking-[0.16em] text-primary mb-1">{t("coachAcademie.objective")}</strong>
                  <Words text={lesson.objective} />
                </p>
              </aside>
            )}

            {lesson.parts.map((p, i) => (
              <section key={i}>
                <SectionTitle id={`partie-${i + 1}`} eyebrow={part(i + 1)}><Words text={p.heading} /></SectionTitle>
                <div className="space-y-5"><Blocks blocks={p.blocks} /></div>
              </section>
            ))}

            {lesson.caseStudy && (
              <section>
                <SectionTitle id="cas-pratique" eyebrow={t("coachAcademie.caseStudy")}><Words text={lesson.caseStudy.title} /></SectionTitle>
                <p className="text-[#3F4A43]"><RichText text={lesson.caseStudy.context} /></p>
                <div className="mt-5 grid gap-3">
                  {lesson.caseStudy.responses.map((r, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card px-5 py-4 text-[16px] leading-relaxed">
                      <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6B746E]">{r.label}</p>
                      <p className="text-foreground"><RichText text={r.text} /></p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {lesson.compass && (
              <section>
                <div id="boussole" className="mt-14 rounded-3xl border border-[#D9C9A3] bg-[#FBF7EC] px-6 py-6">
                  <p className="font-headline text-[22px] font-bold text-[#6E4A00]"><Words text={lesson.compass.title} /></p>
                  <div className="mt-3 space-y-4 text-[16.5px] leading-[1.75] text-[#3F3A2E]"><Blocks blocks={lesson.compass.blocks} /></div>
                </div>
              </section>
            )}
          </SpeechWordsProvider>
        </article>
      </div>
    </div>
  );
}
