"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/admin/admin-ui";
import type { LegendItem } from "@/lib/geo/admin-map";

/** Légende : exactement les classes utilisées pour colorer la carte. */
export function MapLegend({ items, title = "Membres par zone" }: { items: LegendItem[]; title?: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#5F6B63]">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map((it) => (
          <li key={`${it.kind}-${it.label}`} className="flex items-center gap-1.5 text-[12px] text-[#1F2A23]">
            <span
              aria-hidden="true"
              className="h-3 w-5 rounded-[3px]"
              style={{
                background: it.color,
                boxShadow: "inset 0 0 0 1px rgba(31,42,35,0.12)",
                backgroundImage: it.kind === "noData" ? "repeating-linear-gradient(135deg, transparent 0 3px, rgba(31,42,35,0.14) 3px 4px)" : undefined,
              }}
            />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ZoneRowData { id: string; name: string; count: number; note?: string; color?: string }

/**
 * Liste textuelle des zones (alternative accessible à la carte) : effectif exact, tri décroissant,
 * zones à zéro comprises. Chaque ligne sélectionnable si `onPick` est fourni.
 */
export function ZoneList({
  rows, selectedId, onPick, caption, footer, emptyText = "Aucune zone à afficher.", codeOf,
}: {
  rows: ZoneRowData[];
  selectedId?: string | null;
  onPick?: (row: ZoneRowData) => void;
  caption: string;
  footer?: React.ReactNode;
  emptyText?: string;
  codeOf?: (row: ZoneRowData) => string | null;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#5F6B63]">{caption}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-[#5F6B63]">{emptyText}</p>
      ) : (
        <ol className="mt-2 max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-[#EFEDE8] rounded-xl border border-[#EFEDE8]">
          {rows.map((r) => {
            const sel = selectedId === r.id;
            const content = (
              <>
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color ?? "#C6D4C0", boxShadow: "inset 0 0 0 1px rgba(31,42,35,0.15)" }} />
                <span className="min-w-0 flex-1 truncate">
                  {r.name}
                  {codeOf?.(r) && <span className="ml-1.5 text-[11px] text-[#6B746E]">{codeOf(r)}</span>}
                  {r.note && <span className="block text-[11px] text-[#9A5A06]">{r.note}</span>}
                </span>
                <span className={cn("tabular-nums font-semibold", r.count === 0 ? "text-[#9AA39D]" : "text-[#1F2A23]")}>{r.count.toLocaleString("fr-FR")}</span>
                {onPick && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9AA39D]" aria-hidden="true" />}
              </>
            );
            return (
              <li key={r.id}>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    aria-current={sel ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                      sel ? "bg-[#EEF5EC]" : "hover:bg-[#FAF8F5]",
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2 text-[13px]">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {footer}
    </div>
  );
}

export function Breadcrumbs({ items, onGo }: { items: string[]; onGo: (depth: number) => void }) {
  return (
    <nav aria-label="Niveau géographique" className="flex flex-wrap items-center gap-1 text-[13px]">
      {items.map((label, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${i}-${label}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-[#9AA39D]" aria-hidden="true" />}
            {last ? (
              <span aria-current="page" className="font-semibold text-[#1F2A23]">{label}</span>
            ) : (
              <button type="button" onClick={() => onGo(i)} className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                {label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Repli quand la carte ne peut pas s'afficher : la liste reste la source de lecture. */
export function MapUnavailable({ text }: { text: string }) {
  return (
    <Card className="flex items-center justify-center p-8 text-center text-[13px] text-[#5F6B63]" style={{ minHeight: 220 }}>
      {text}
    </Card>
  );
}

export function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label="Chargement de la carte"
      className="w-full animate-pulse rounded-2xl border border-[#E8E5E0] bg-[#F3F1EC]"
      style={{ height: "clamp(360px, 60vh, 620px)" }}
    />
  );
}

/** Chiffre clé de la zone en cours (panneau latéral). */
export function FocusFigure({ label, value, sub }: { label: string; value: number | null; sub?: string }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#5F6B63]">{label}</p>
      <p className="mt-0.5 text-[30px] font-bold leading-none tabular-nums text-[#234B36]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        {value === null ? "—" : value.toLocaleString("fr-FR")}
      </p>
      {sub && <p className="mt-1 text-[12px] text-[#5F6B63]">{sub}</p>}
    </div>
  );
}
