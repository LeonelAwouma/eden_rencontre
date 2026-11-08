"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Badge, type Tone } from "@/components/admin/admin-ui";
import type { CoachFormationSummary } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";
import { ProgressBar } from "./coach-ui";

const PILLAR_TONE: Record<string, Tone> = { done: "green", inProgress: "blue", todo: "neutral", locked: "neutral" };

/**
 * Progression d'un membre par pilier, textes localisés. Distinct du panneau de l'administration (en français,
 * non modifié). Les titres de pilier et de leçon sont déjà dans la langue active (résolus côté serveur à partir de
 * « Bâtir sur le roc » FR/EN). La progression est DÉCLARÉE par le membre : elle n'est pas vérifiée par un formateur.
 */
export function CoachFormationPanel({ summary }: { summary: CoachFormationSummary }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-[#1C241F]">
            {t("coachMembers.lessonsDone", { done: summary.done, total: summary.total })}
          </p>
          <p className="text-sm font-semibold text-[#28543C] tabular-nums">{summary.percent}%</p>
        </div>
        <ProgressBar percent={summary.percent} label={t("coachMembers.progressLabel")} />
        <p className="mt-2 text-xs text-[#56615A]">
          {summary.current
            ? t("coachMembers.nextLesson", { number: summary.current.number, title: summary.current.title })
            : t("coachMembers.allDone")}
        </p>
      </div>

      <ul className="space-y-2">
        {summary.pillars.map((p) => (
          <li key={p.number} className="rounded-xl border border-[#E6EAE5] bg-white">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1C241F]">{t("coachMembers.pillar", { n: p.number })} — {p.title}</span>
                  <span className="block text-xs text-[#56615A]">{t("coachMembers.lessonsDone", { done: p.done, total: p.total })}</span>
                </span>
                <Badge tone={PILLAR_TONE[p.status] ?? "neutral"}>{t(`coachMembers.pillarStatus.${p.status}`)}</Badge>
              </summary>
              <ul className="border-t border-[#F0F2EF] px-4 py-3 space-y-1.5">
                {p.lessons.map((l) => (
                  <li key={l.slug} className="flex items-start gap-2 text-sm">
                    {l.done
                      ? <CheckCircle2 className="w-4 h-4 mt-0.5 text-[#3F704D] shrink-0" aria-label={t("coachMembers.lessonDone")} />
                      : <Circle className="w-4 h-4 mt-0.5 text-[#B7BFB9] shrink-0" aria-label={t("coachMembers.lessonTodo")} />}
                    <span className={l.done ? "text-[#1C241F]" : "text-[#56615A]"}>{l.number} {l.title}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
