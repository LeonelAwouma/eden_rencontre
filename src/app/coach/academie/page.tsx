"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Headphones, Search } from "lucide-react";
import { DataState, PageTitle } from "@/components/coach/coach-ui";
import { useCoachData } from "@/components/coach/use-coach-data";
import { useI18n } from "@/lib/i18n";
import { lessonMetaOf, pillarMetaOf } from "@/lib/formation/structure";

interface Catalog {
  pillars: { number: number; lessons: { slug: string; number: string; title: string; hasAudio: boolean; readingMinutes: number }[] }[];
}

/** Académie du Mariage : catalogue de consultation (texte + audio). Aucune médiathèque, aucun téléchargement. */
export default function CoachAcademiePage() {
  const { t, locale } = useI18n();
  const lang: "fr" | "en" = locale === "en" ? "en" : "fr";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const id = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(id); }, [q]);
  const { state, reload } = useCoachData<Catalog>(`/api/coach/academie${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`);

  return (
    <>
      <PageTitle title={t("coachAcademie.title")} subtitle={t("coachAcademie.subtitle")} />
      <label className="relative mb-6 block max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[#56615A]" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} aria-label={t("coachAcademie.searchLabel")}
          placeholder={t("coachAcademie.searchPlaceholder")} className="w-full rounded-xl border border-[#E6EAE5] bg-white py-2.5 pl-9 pr-3 text-sm" />
      </label>
      <DataState state={state} reload={reload}>
        {(c) => c.pillars.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#C6D4C0] p-8 text-center text-sm text-[#56615A]">{t("coachAcademie.empty")}</p>
        ) : (
          <div className="space-y-8">
            {c.pillars.map((p) => (
              <section key={p.number} aria-labelledby={`pillar-${p.number}`}>
                <h2 id={`pillar-${p.number}`} className="mb-3 font-headline text-xl font-bold text-[#1C241F]">
                  <span className="block text-[12px] font-bold uppercase tracking-[0.18em] text-[#3F704D]">{t("coachAcademie.pillar", { n: p.number })}</span>
                  {pillarMetaOf(p.number, lang)?.title}
                </h2>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {p.lessons.map((l) => (
                    <li key={l.slug}>
                      <Link href={`/coach/academie/${l.slug}`} className="block rounded-2xl border border-[#E6EAE5] bg-white p-4 hover:border-[#3F704D]/50">
                        <p className="text-xs font-semibold text-[#3F704D]">{l.number}</p>
                        <p className="font-semibold text-[#1C241F]">{lessonMetaOf(l.slug, lang)?.title ?? l.title}</p>
                        <p className="mt-2 flex items-center gap-3 text-xs text-[#56615A]">
                          <span>{t("coachAcademie.minutes", { n: l.readingMinutes })}</span>
                          <span className="inline-flex items-center gap-1"><Headphones className="h-3.5 w-3.5" aria-hidden="true" />{l.hasAudio ? t("coachAcademie.audioYes") : t("coachAcademie.audioNo")}</span>
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DataState>
    </>
  );
}
