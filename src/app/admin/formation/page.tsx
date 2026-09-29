import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, GraduationCap, Library, Clock } from "lucide-react";
import { BATIR_SUR_LE_ROC, ALL_LESSONS } from "@/lib/formation/batir-sur-le-roc";
import { ADMIN_LESSON_PREVIEW_PATH, ADMIN_STORY_PREVIEW_PATH } from "@/lib/formation/paths";
import { STORIES, storyReadingMinutes } from "@/lib/formation/stories";
import fr from "@/locales/fr.json";

// Admin → Académie du mariage : même organisation que côté membre
// (/dashboard/academie) — la page de l'Académie présente « Bâtir sur le roc »,
// qui mène à la liste des leçons, puis à l'aperçu de chaque leçon.

export const metadata = { title: "Académie du mariage · Admin" };

const PLUS_LOIN = [
  fr.academie.lessons.criteresEssentiels,
  fr.academie.lessons.periodeConnaissance,
  fr.academie.lessons.prieDiscernement,
];
const THEMES = Object.values(fr.academie.themes) as { title: string }[];

export default function AdminAcademyPage() {
  const f = BATIR_SUR_LE_ROC;
  const written = f.pillars.filter((p) => p.lessons.length > 0).length;
  const totalMinutes = ALL_LESSONS.reduce((n, { lesson }) => n + lesson.readingMinutes, 0);

  return (
    <div className="max-w-6xl space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#486B46] flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" /> Préparation au mariage
          </p>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight mt-1" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
            Académie du mariage
          </h1>
          <p className="text-[13px] text-[#56615A] mt-1 max-w-2xl">
            Même organisation que pour les membres : l&apos;Académie présente la formation, qui mène à la liste des leçons, puis les histoires.
          </p>
        </div>
        <Link href="/admin/mediatheque/learning-paths"
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#56615A] hover:bg-[#F9FAFB] shrink-0">
          <Library className="w-4 h-4" /> Parcours de la médiathèque
        </Link>
      </div>

      {/* Formation « Bâtir sur le roc » — même carte que côté membre */}
      <Link href={ADMIN_LESSON_PREVIEW_PATH}
        className="group grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] rounded-2xl border border-[#E8E5E0] bg-white overflow-hidden hover:shadow-[0_8px_32px_rgba(72,107,70,0.12)] hover:border-[#C6D4C0] transition-all">
        <span className="relative block aspect-[4/5] md:aspect-auto md:min-h-[380px] bg-[#F4F3EF] overflow-hidden">
          <Image src="/batir_roc.png" alt="Un couple pose ensemble une pierre sur un rocher gravé « Jésus Christ, notre fondation — Matthieu 7:24-25 », devant une maison en construction."
            fill priority sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover object-[center_45%] group-hover:scale-[1.03] transition-transform duration-700" />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/95 text-[11px] font-bold text-[#486B46]">Pilier 1</span>
        </span>
        <span className="flex flex-col p-6 sm:p-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#486B46]">Formation · {ALL_LESSONS.length} leçons disponibles</span>
          <span className="mt-2 text-[30px] font-bold leading-tight text-[#1a1a1a] group-hover:text-[#486B46] transition-colors"
            style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
            {f.title}
          </span>
          <span className="mt-2 text-[14px] leading-relaxed text-[#3F4A43]">{f.tagline}</span>
          <span className="mt-4 pl-4 border-l-2 border-[#C6D4C0] block">
            <span className="block italic text-[14px] leading-snug text-[#2F2F2F]">« {f.verse.text} »</span>
            <span className="mt-1 block text-[12px] font-semibold text-[#486B46]">{f.verse.ref}</span>
          </span>

          <span className="mt-6 grid grid-cols-3 gap-2">
            {[
              { v: `${written} / ${f.pillars.length}`, l: "Piliers rédigés" },
              { v: String(ALL_LESSONS.length), l: "Leçons" },
              { v: `${totalMinutes} min`, l: "Lecture totale" },
            ].map((s) => (
              <span key={s.l} className="rounded-xl bg-[#FAF9F6] border border-[#F0EDE8] px-3 py-2.5">
                <span className="block text-[18px] font-bold text-[#1a1a1a] leading-none">{s.v}</span>
                <span className="block text-[11px] text-[#56615A] font-semibold mt-1">{s.l}</span>
              </span>
            ))}
          </span>

          <span className="mt-auto pt-6">
            <span className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#486B46] text-white text-[13px] font-semibold group-hover:bg-[#3A5A38] transition-colors">
              <BookOpen className="w-4 h-4" /> Voir les leçons <ArrowRight className="w-4 h-4" />
            </span>
          </span>
        </span>
      </Link>

      {/* Histoires — récits affichés aux membres sous la formation */}
      <section aria-labelledby="histoires" className="space-y-3">
        <div>
          <h2 id="histoires" className="text-[16px] font-bold text-[#2F2F2F]">Histoires</h2>
          <p className="text-[12px] text-[#6B746E] mt-0.5">Récits affichés aux membres sur la page de l&apos;Académie, en français et en anglais. Cliquez pour voir l&apos;aperçu.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {STORIES.map((st) => (
            <Link key={st.slug} href={`${ADMIN_STORY_PREVIEW_PATH}/${st.slug}`}
              className="group flex flex-col rounded-xl border border-[#E8E5E0] bg-white px-4 py-3.5 hover:border-[#C6D4C0] hover:shadow-[0_4px_16px_rgba(72,107,70,0.08)] transition-all">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-semibold text-[#2F2F2F] group-hover:text-[#486B46]">{st.title}</span>
                <ArrowRight className="w-4 h-4 text-[#486B46] shrink-0" />
              </span>
              <span className="text-[12.5px] text-[#56615A] mt-1 line-clamp-2">{st.summary.replace(/\*+/g, "")}</span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#6B746E]">
                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {storyReadingMinutes(st)} min</span>
                <span>{st.chapters.filter((c) => !c.epilogue).length} chapitres + épilogue</span>
                <span>Leçons {st.lessons.map((s) => s.replace("-", ".")).join(" · ")}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Pour aller plus loin — les modules complémentaires affichés aux membres */}
      <section aria-labelledby="plus-loin" className="space-y-3">
        <div>
          <h2 id="plus-loin" className="text-[16px] font-bold text-[#2F2F2F]">Pour aller plus loin</h2>
          <p className="text-[12px] text-[#6B746E] mt-0.5">Lectures courtes affichées aux membres sous la formation, sur la page de l&apos;Académie.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {PLUS_LOIN.map((l) => (
            <div key={l.title} className="rounded-xl border border-[#E8E5E0] bg-white px-4 py-3">
              <p className="text-[13px] font-semibold text-[#2F2F2F]">{l.title}</p>
              <p className="text-[12px] text-[#6B746E] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {l.duration}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map((th) => (
            <span key={th.title} className="px-2.5 py-1 rounded-full border border-[#E8E5E0] bg-white text-[12px] text-[#56615A]">{th.title}</span>
          ))}
        </div>
      </section>
    </div>
  );
}
