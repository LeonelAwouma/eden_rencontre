"use client";

import Link from "next/link";
import { GraduationCap, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { FORMATION_BASE_PATH, MATCHING_REQUIRED_LESSONS } from "@/lib/formation/batir-sur-le-roc";
import { useFormationLocale } from "@/lib/formation/ui";

/**
 * Remplace une fonctionnalité de matching tant que le pilier 1 de « Bâtir sur le roc »
 * n'est pas terminé : progression leçon par leçon et accès direct à la suivante.
 */
export function FormationLock({ completed }: { completed: string[] }) {
  const { t } = useI18n();
  const { formation } = useFormationLocale();
  const lessons = formation.pillars[0].lessons;
  const total = MATCHING_REQUIRED_LESSONS.length;
  const done = MATCHING_REQUIRED_LESSONS.filter((slug) => completed.includes(slug)).length;
  const next = lessons.find((l) => !completed.includes(l.slug));
  const href = next ? `${FORMATION_BASE_PATH}/${next.slug}` : FORMATION_BASE_PATH;

  return (
    <div className="max-w-xl mx-auto rounded-3xl p-6 sm:p-8 text-center"
      style={{ background: "linear-gradient(160deg, #FFFFFF 0%, #EEF5EC 100%)", border: "1px solid #C6D4C0" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#FFFFFF", border: "1px solid #C6D4C0" }}>
        <GraduationCap className="w-6 h-6" style={{ color: "#486B46" }} />
      </div>
      <h3 className="font-headline text-xl font-bold" style={{ color: "#2F2F2F" }}>{t("dashboard.formationLockedTitle")}</h3>
      <p className="text-sm mt-2 leading-relaxed" style={{ color: "#56615A" }}>
        {t("dashboard.formationLockedDesc", { total })}
      </p>
      <div className="mt-5">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E4E9E1" }}
          role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: "#486B46" }} />
        </div>
        <p className="text-xs font-bold mt-1.5 text-right" style={{ color: "#486B46" }}>{t("dashboard.formationLockedProgress", { done, total })}</p>
      </div>
      <ul className="mt-4 text-left rounded-2xl p-4 space-y-2" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
        {lessons.map((l) => {
          const isDone = completed.includes(l.slug);
          return (
            <li key={l.slug}>
              <Link href={`${FORMATION_BASE_PATH}/${l.slug}`} className="flex items-center gap-2.5 text-sm hover:underline" style={{ color: isDone ? "#6B746E" : "#2F2F2F" }}>
                {isDone ? (
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center" style={{ background: "#486B46" }} aria-hidden>
                    <Check className="w-3 h-3 text-white" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full shrink-0" style={{ border: "2px solid #C6D4C0" }} aria-hidden />
                )}
                <span className="font-semibold shrink-0">{l.number}</span>
                <span className="truncate">{l.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href={href} className="mt-5 inline-flex items-center justify-center h-11 rounded-xl font-bold text-sm px-6"
        style={{ background: "#486B46", color: "#FFFFFF" }}>
        {done === 0 ? t("dashboard.formationLockedStart") : t("dashboard.formationLockedContinue")}
      </Link>
    </div>
  );
}
