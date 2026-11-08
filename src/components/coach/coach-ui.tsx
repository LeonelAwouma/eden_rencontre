"use client";

import type { ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, RefreshCw } from "lucide-react";
import { Badge, EmptyBlock, HEADING_FONT, LoadingBlock } from "@/components/admin/admin-ui";
import type { Coverage, FormationState } from "@/lib/coach/members-view";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CoachDataState } from "./use-coach-data";

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight text-[#1C241F]" style={HEADING_FONT}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#56615A] max-w-2xl">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Chargement / erreur avec « Réessayer » ; rend `children(data)` quand la réponse du serveur est arrivée. */
export function DataState<T>({ state, reload, notFound, children }: {
  state: CoachDataState<T>;
  reload: () => void;
  /** Affiché pour un 404 (introuvable ou non autorisé) au lieu de l'erreur générique. */
  notFound?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const { t } = useI18n();
  if (state.status === "loading") return <LoadingBlock label={t("coachCommon.loading")} />;
  if (state.status === "error") {
    if (state.httpStatus === 404 && notFound) return <>{notFound}</>;
    return (
      <div role="alert" className="rounded-2xl border border-[#E3C5BF] bg-[#FBF3F1] p-6 text-center space-y-3">
        <AlertTriangle className="w-6 h-6 mx-auto text-[#8A3B2E]" aria-hidden="true" />
        <h2 className="font-semibold text-[#1C241F]">{t("coachCommon.errorTitle")}</h2>
        <p className="text-sm text-[#56615A]">{t("coachCommon.errorDesc")}</p>
        <button type="button" onClick={reload}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1F4D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173b2d]">
          <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t("coachCommon.retry")}
        </button>
      </div>
    );
  }
  return <>{children(state.data)}</>;
}

/** Avertissements de couverture : plafond atteint (troncature) et profils non exploitables — deux choses distinctes. */
export function CoverageNotice({ coverage }: { coverage: Coverage }) {
  const { t } = useI18n();
  if (!coverage.truncated && coverage.excludedProfiles === 0) return null;
  return (
    <div className="mb-5 space-y-2" role="note">
      {coverage.truncated && (
        <p className="flex gap-2 rounded-xl border border-[#E8D9B0] bg-[#FBF6E6] px-4 py-3 text-sm text-[#6B5A1F]">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {t("coachCommon.truncatedNotice", { loaded: coverage.loadedMembers, active: coverage.activeMembers })}
        </p>
      )}
      {coverage.excludedProfiles > 0 && (
        <p className="flex gap-2 rounded-xl border border-[#E6EAE5] bg-white px-4 py-3 text-sm text-[#56615A]">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {t("coachCommon.excludedNotice", { count: coverage.excludedProfiles })}
        </p>
      )}
    </div>
  );
}

const STATE_TONE = { completed: "green", inProgress: "blue", notStarted: "neutral", unavailable: "amber" } as const;

export function FormationStateBadge({ state }: { state: FormationState }) {
  const { t } = useI18n();
  return <Badge tone={STATE_TONE[state]}>{t(`coachMembers.state.${state}`)}</Badge>;
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}
      className="h-2 w-full rounded-full bg-[#E6EAE5] overflow-hidden">
      <div className="h-full rounded-full bg-[#3F704D] transition-[width] duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

/** Pagination localisée (le composant admin est en français). */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  if (totalPages <= 1) return null;
  const btn = "inline-flex items-center gap-1 rounded-lg border border-[#E6EAE5] bg-white px-3 py-2 text-sm font-medium text-[#1C241F] hover:bg-[#F0F4EF] disabled:opacity-40 disabled:hover:bg-white";
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label={t("coachCommon.pagination")}>
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="w-4 h-4" aria-hidden="true" /> {t("coachCommon.previous")}
      </button>
      <span className="text-sm text-[#56615A]" aria-live="polite">{t("coachCommon.pageOf", { page, total: totalPages })}</span>
      <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {t("coachCommon.next")} <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(locale, { dateStyle: "medium" });
}

export { EmptyBlock, cn };
