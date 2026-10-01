import Link from "next/link";
import Image from "next/image";
import { Eye, FileText, Clock, HelpCircle, ChevronRight, Library, Hourglass } from "lucide-react";
import { BATIR_SUR_LE_ROC, ALL_LESSONS } from "@/lib/formation/batir-sur-le-roc";
import { ADMIN_FORMATION_PATH, ADMIN_LESSON_PREVIEW_PATH, FORMATION_BASE_PATH } from "@/lib/formation/paths";

// Admin → Académie → Bâtir sur le roc : liste des leçons, comme côté membre
// (/dashboard/academie/batir-sur-le-roc), avec l'aperçu de chaque leçon telle que les membres la lisent. Le texte vit dans le code
// (src/lib/formation/batir-sur-le-roc.ts) : il n'est pas modifiable ici.

export const metadata = { title: "Bâtir sur le roc · Académie · Admin" };

export default function AdminBatirSurLeRocPage() {
  const f = BATIR_SUR_LE_ROC;
  const written = f.pillars.filter((p) => p.lessons.length > 0);
  const upcoming = f.pillars.filter((p) => p.lessons.length === 0);
  const totalMinutes = ALL_LESSONS.reduce((n, { lesson }) => n + lesson.readingMinutes, 0);
  const first = ALL_LESSONS[0]?.lesson;

  return (
    <div className="max-w-6xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-[12px] font-semibold text-[#56615A]">
            <Link href="/admin/mediatheque" className="hover:text-[#486B46] hover:underline">Médiathèque</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href={ADMIN_FORMATION_PATH} className="hover:text-[#486B46] hover:underline">Académie du mariage</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#486B46]">{f.title}</span>
          </nav>
          <h1 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight mt-1" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
            {f.title}
          </h1>
          <p className="text-[13px] text-[#56615A] mt-1 max-w-2xl">{f.tagline}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/admin/mediatheque/learning-paths"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#56615A] hover:bg-[#F9FAFB]">
            <Library className="w-4 h-4" /> Parcours
          </Link>
          {first && (
            <Link href={`${ADMIN_LESSON_PREVIEW_PATH}/${first.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#486B46] text-white text-[13px] font-semibold hover:bg-[#3A5A38] shadow-sm">
              <Eye className="w-4 h-4" /> Prévisualiser la leçon 1.1
            </Link>
          )}
        </div>
      </div>

      {/* Repères */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Piliers rédigés", value: `${written.length} / ${f.pillars.length}` },
          { label: "Leçons", value: String(ALL_LESSONS.length) },
          { label: "Lecture totale", value: `${totalMinutes} min` },
          { label: "Questions de quiz", value: String(ALL_LESSONS.reduce((n, { lesson }) => n + lesson.quiz.length, 0)) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E5E0] px-4 py-3.5">
            <p className="text-[22px] font-bold text-[#1a1a1a] leading-none" style={{ fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>{s.value}</p>
            <p className="text-[12px] text-[#56615A] font-semibold mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Piliers rédigés */}
      {written.map((pillar) => (
        <section key={pillar.slug} className="mb-8">
          <div className="mb-4">
            <h2 className="text-[16px] font-bold text-[#2F2F2F]">Pilier {pillar.number} · {pillar.title}</h2>
            {pillar.summary && <p className="text-[13px] text-[#56615A] mt-1 max-w-3xl">{pillar.summary}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pillar.lessons.map((lesson) => (
              <article key={lesson.slug} className="bg-white rounded-2xl border border-[#E8E5E0] overflow-hidden flex flex-col hover:shadow-[0_4px_24px_rgba(72,107,70,0.08)] transition-shadow">
                <Link href={`${ADMIN_LESSON_PREVIEW_PATH}/${lesson.slug}`} className="relative aspect-[16/10] bg-[#F4F3EF] block">
                  <Image src={lesson.image.card} alt="" fill sizes="(min-width: 1280px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  <span className="absolute top-3 left-3 px-2 py-1 rounded-md bg-white/90 text-[11px] font-bold text-[#486B46]">Leçon {lesson.number}</span>
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-[15px] font-semibold text-[#2F2F2F] leading-snug">{lesson.title}</h3>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#56615A]">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lesson.readingMinutes} min</span>
                    <span className="inline-flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> {lesson.quiz.length} questions</span>
                    <span>{lesson.parts.length} parties</span>
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center gap-2">
                    <Link href={`${ADMIN_LESSON_PREVIEW_PATH}/${lesson.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EEF5EC] text-[#486B46] text-[12px] font-semibold hover:bg-[#E0EEDC]">
                      <Eye className="w-3.5 h-3.5" /> Prévisualiser
                    </Link>
                    <a href={lesson.pdf} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#56615A] hover:bg-[#F9FAFB]">
                      <FileText className="w-3.5 h-3.5" /> PDF
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Piliers à venir */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[16px] font-bold text-[#2F2F2F] mb-3">Piliers en préparation</h2>
          <div className="flex flex-wrap gap-2">
            {upcoming.map((p) => (
              <span key={p.slug} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-dashed border-[#D8D4CB] text-[12px] font-semibold text-[#6B746E]">
                <Hourglass className="w-3.5 h-3.5" /> Pilier {p.number}
              </span>
            ))}
          </div>
        </section>
      )}

      <p className="text-[12px] text-[#6B746E] max-w-3xl">
        L&apos;aperçu reprend exactement la page que lisent les membres ({FORMATION_BASE_PATH}/…). Vos réponses au quiz et vos
        réflexions n&apos;y sont pas enregistrées. Le texte des leçons est intégré au site : pour le modifier ou ajouter un pilier,
        il faut une mise à jour du code.
      </p>
    </div>
  );
}
