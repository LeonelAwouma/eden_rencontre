"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Anciennes réponses d'un membre qui ne correspondent à aucun choix actuel (ancienne inscription, ancien profil).
 * Affichées telles quelles tant que le membre n'a pas fait un nouveau choix : elles ne disparaissent jamais sans
 * qu'il le sache. Les valeurs viennent de `pendingLegacyValues` (src/lib/onboarding-legacy.ts).
 */
export function LegacyAnswersNotice({ values, className = "" }: { values: string[]; className?: string }) {
  const { t } = useI18n();
  if (values.length === 0) return null;
  return (
    <div role="note" className={`rounded-xl border border-[#E2C9A6] bg-[#FBF3E8] px-4 py-3 ${className}`}>
      <p className="text-xs font-bold text-[#6E4A00]">{t("questionnaire.legacyTitle")}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <li key={v} className="rounded-full border border-[#E2C9A6] bg-white px-2.5 py-0.5 text-xs font-medium text-[#3F3A2E]">{v}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-[#3F3A2E]">{t("questionnaire.legacyDesc")}</p>
    </div>
  );
}
