"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Eye, Lightbulb, Quote } from "lucide-react";
import { Monogram, Flourish } from "@/components/ornaments";
import { RichText, frenchSpacing } from "./rich-text";
import { Blocks, SectionTitle, preventContentCopy } from "./lesson-reader";
import {
  ADMIN_FORMATION_PATH, ADMIN_LESSON_PREVIEW_PATH, ADMIN_STORY_PREVIEW_PATH, FORMATION_BASE_PATH, STORIES_BASE_PATH,
} from "@/lib/formation/paths";
import { storyReadingMinutes } from "@/lib/formation/stories";
import type { Story, StoryBlock } from "@/lib/formation/types";
import { useFormationLocale } from "@/lib/formation/ui";

function StoryBlocks({ blocks }: { blocks: StoryBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "quote") {
          return (
            <figure key={i} className="my-6 relative pl-6 sm:pl-7 border-l-2 border-primary/40">
              <Quote aria-hidden className="absolute -left-3 -top-1 w-6 h-6 p-1 rounded-full bg-background text-primary/70" />
              <blockquote className="font-headline italic text-[18px] sm:text-[19px] leading-relaxed text-foreground">
                <RichText text={b.text} />
              </blockquote>
            </figure>
          );
        }
        if (b.type === "scene") {
          return <h3 key={i} className="pt-4 text-[13px] font-bold uppercase tracking-[0.14em] text-primary">{frenchSpacing(b.text)}</h3>;
        }
        return <Blocks key={i} blocks={[b]} />;
      })}
    </>
  );
}

/**
 * Lecture d'une histoire de l'Académie. `preview` : aperçu admin — liens vers
 * les aperçus admin, bandeau d'aperçu, retour vers l'Académie de l'admin.
 */
export function StoryReader({ story: storyFr, preview = false }: { story: Story; preview?: boolean }) {
  const { ui, localizeStory, stories, find } = useFormationLocale();
  const story = localizeStory(storyFr);
  const academyHref = preview ? ADMIN_FORMATION_PATH : "/dashboard/academie";
  const storyBase = preview ? ADMIN_STORY_PREVIEW_PATH : STORIES_BASE_PATH;
  const lessonBase = preview ? ADMIN_LESSON_PREVIEW_PATH : FORMATION_BASE_PATH;
  const minutes = storyReadingMinutes(story);
  const related = story.lessons.map((slug) => find(slug)?.lesson).filter((l): l is NonNullable<typeof l> => !!l);
  const others = stories.filter((st) => st.slug !== story.slug);
  let chapterNumber = 0;

  const [scroll, setScroll] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScroll(max > 0 ? Math.min(1, h.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [story.slug]);

  return (
    <div className="eden-public min-h-screen bg-background text-foreground">
      {preview && (
        <div className="bg-[#2E4A36] text-white text-[13px]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2">
            <Eye className="w-4 h-4 shrink-0" />
            <p className="min-w-0 flex-1"><strong>{ui.previewBanner}</strong><span className="hidden sm:inline">{ui.storyPreviewBannerDetail}</span></p>
            <Link href={academyHref} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">{ui.backToAcademyPage}</Link>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href={academyHref} className="flex items-center gap-2 min-w-0 text-[14px] font-semibold text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <Monogram className="w-7 h-6 text-primary shrink-0 hidden sm:block" />
            <span className="truncate">{ui.backToAcademy}</span>
          </Link>
        </div>
        <div className="h-[3px] bg-transparent" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${scroll * 100}%` }} />
        </div>
      </header>

      <article className="max-w-[68ch] mx-auto px-5 sm:px-6 pb-20">
        {/* Titre */}
        <div className="pt-10 sm:pt-14 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-primary">{ui.storyEyebrow}</p>
          <h1 className="mt-3 font-headline text-[34px] sm:text-[46px] font-bold leading-[1.08] tracking-tight text-foreground">
            {frenchSpacing(story.title)}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13.5px] text-[#56615A]">
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> {ui.readingTime(minutes)}</span>
            <span className="inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {ui.chaptersCount(story.chapters.filter((c) => !c.epilogue).length)}</span>
          </div>
          <Flourish className="w-40 h-3 text-primary/40 mx-auto mt-6" />
        </div>

        <div
          className="mt-8 space-y-5 text-[17px] sm:text-[18px] leading-[1.75] text-[#2E3A33] select-none"
          style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
          onCopy={preventContentCopy} onCut={preventContentCopy}
        >
          {/* Résumé */}
          <aside className="rounded-2xl bg-primary/[0.07] border border-primary/20 px-5 sm:px-6 py-5 text-[16px] sm:text-[17px] leading-relaxed">
            <strong className="block text-[12px] font-bold uppercase tracking-[0.16em] text-primary mb-2">{ui.storySummary}</strong>
            <RichText text={story.summary} />
          </aside>

          {story.chapters.map((chapter, i) => {
            if (!chapter.epilogue) chapterNumber += 1;
            return (
              <section key={i}>
                <SectionTitle id={`chapitre-${i + 1}`} eyebrow={chapter.epilogue ? ui.epilogue : ui.chapterLabel(chapterNumber)}>
                  {frenchSpacing(chapter.title)}
                </SectionTitle>
                <div className="space-y-5"><StoryBlocks blocks={chapter.blocks} /></div>
              </section>
            );
          })}

          {/* Enseignements clés */}
          <section className="mt-14 rounded-3xl border border-border bg-card px-5 sm:px-7 py-6 sm:py-7">
            <h2 className="flex items-center gap-2.5 font-headline text-[22px] sm:text-[24px] font-bold text-foreground">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Lightbulb className="w-5 h-5" /></span>
              {ui.takeawaysTitle}
            </h2>
            <ol className="mt-5 space-y-4 text-[16px] sm:text-[17px] leading-relaxed">
              {story.takeaways.map((tk, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="w-7 h-7 mt-0.5 rounded-full bg-primary text-white text-[13px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span>
                    <strong className="font-semibold text-foreground"><RichText text={tk.lead} /></strong>{" "}
                    <RichText text={tk.text} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Leçons liées */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#56615A]">{ui.relatedLessons}</h2>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {related.map((l) => (
                <Link key={l.slug} href={`${lessonBase}/${l.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:border-primary/40 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[13px] font-bold">{l.number}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground leading-snug group-hover:text-primary">{l.title}</span>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Autres histoires */}
        {others.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#56615A]">{ui.otherStories}</h2>
            <div className="mt-3 grid gap-3">
              {others.map((st) => (
                <Link key={st.slug} href={`${storyBase}/${st.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 hover:border-primary/40 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold text-foreground leading-snug group-hover:text-primary">{frenchSpacing(st.title)}</span>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
