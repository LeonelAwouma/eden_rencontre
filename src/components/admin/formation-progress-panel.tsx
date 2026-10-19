"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, GraduationCap, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormationSummary } from "@/lib/formation/admin-summary";
import type { PillarStatus } from "@/lib/formation/batir-sur-le-roc";

const STATUS: Record<PillarStatus, { label: string; chip: string }> = {
  done: { label: "Terminé", chip: "bg-[#486B46] text-white" },
  inProgress: { label: "En cours", chip: "bg-[#486B46]/10 text-[#486B46]" },
  todo: { label: "À commencer", chip: "bg-gray-100 text-gray-600" },
  locked: { label: "Verrouillé", chip: "bg-gray-100 text-gray-400" },
};

/**
 * Fiche d'un membre : sa progression dans « Bâtir sur le roc », pilier par pilier.
 * Seules les leçons terminées sont enregistrées sur sa fiche (la lecture en cours et
 * les réflexions restent sur son appareil).
 */
export function FormationProgressPanel({ summary }: { summary: FormationSummary | null | undefined }) {
  // Le pilier en cours est ouvert d'emblée, les autres restent repliés.
  const [open, setOpen] = useState<number | null>(() => summary?.current?.pillar ?? summary?.pillars[0]?.number ?? null);
  if (!summary) return null;
  const started = summary.done > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-5 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-[#486B46]" /> Formation « Bâtir sur le roc »
      </h2>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-gray-700">
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{summary.done}</span>
            <span className="text-gray-500"> / {summary.total} leçons terminées</span>
          </p>
          <span className="text-sm font-bold text-[#486B46] tabular-nums">{summary.percent} %</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done} aria-label="Progression dans la formation">
          <div className="h-full rounded-full bg-[#486B46] transition-all" style={{ width: `${summary.percent}%` }} />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {summary.current
            ? <>{started ? "Prochaine leçon" : "N'a pas encore commencé la formation. Première leçon"} : <span className="font-semibold text-gray-700">{summary.current.number} — {summary.current.title}</span></>
            : <span className="font-semibold text-[#486B46]">Toutes les leçons disponibles sont terminées.</span>}
        </p>
      </div>

      <ul className="mt-5 space-y-2">
        {summary.pillars.map((p) => {
          const isOpen = open === p.number;
          return (
            <li key={p.number} className="rounded-lg border border-gray-100 overflow-hidden">
              <button type="button" onClick={() => setOpen(isOpen ? null : p.number)} aria-expanded={isOpen}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                {p.status === "locked" ? <Lock className="w-4 h-4 text-gray-300 shrink-0" /> : isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-semibold leading-snug", p.status === "locked" ? "text-gray-400" : "text-gray-900")}>
                    Pilier {p.number} · {p.title}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-gray-500 shrink-0">{p.done} / {p.total}</span>
                <span className={cn("hidden sm:inline-flex h-6 items-center px-2.5 rounded-full text-[11px] font-bold shrink-0", STATUS[p.status].chip)}>
                  {STATUS[p.status].label}
                </span>
              </button>
              {isOpen && (
                <ol className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-1.5">
                  {p.lessons.map((l) => (
                    <li key={l.slug} className="flex items-start gap-2.5 text-[13px] leading-snug">
                      <span className={cn("mt-px w-4 h-4 rounded-full shrink-0 flex items-center justify-center",
                        l.done ? "bg-[#486B46]" : "border border-gray-300")} aria-label={l.done ? "Terminée" : "Non terminée"}>
                        {l.done && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className={cn(l.done ? "text-gray-800" : "text-gray-500")}>
                        <span className="font-semibold tabular-nums">{l.number}</span> — {l.title}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
        Seules les leçons terminées sont enregistrées sur la fiche du membre : la lecture en cours, les quiz et les réflexions restent sur son appareil.
      </p>
    </div>
  );
}
