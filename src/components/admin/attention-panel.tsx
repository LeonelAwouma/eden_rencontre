"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, Flag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, SectionTitle } from "@/components/admin/admin-ui";
import { attentionTotal, type AttentionItem } from "@/lib/admin-dashboard";

const ICONS: Record<AttentionItem["id"], LucideIcon> = {
  "pending-users": Clock,
  "pending-reports": Flag,
};

/**
 * « À traiter » : ce qui attend une décision de l'administrateur, avec un lien
 * direct vers la liste concernée. Les chiffres viennent des API existantes ;
 * une donnée non lue s'affiche « indisponible » et non « 0 ».
 */
export function AttentionPanel({ items, className }: { items: AttentionItem[]; className?: string }) {
  const total = attentionTotal(items);
  const subtitle = total > 0
    ? `${total} élément${total > 1 ? "s" : ""} en attente de décision`
    : "Rien n'attend de décision pour le moment";

  return (
    <section aria-labelledby="attention-title" className={className}>
      <SectionTitle id="attention-title" title="À traiter" subtitle={subtitle} />
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = ICONS[item.id];
          const unavailable = item.count === null;
          const urgent = (item.count ?? 0) > 0;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                )}
              >
                <Card className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition-colors duration-150",
                  urgent ? "border-[#F59E0B]/40 bg-[#FFF8EC] group-hover:bg-[#FFF2DB]" : "group-hover:border-[#D9D4CC] group-hover:bg-[#FCFBF9]"
                )}>
                  <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    urgent ? "bg-[#F59E0B]/15 text-[#9A5A06]" : "bg-primary/[0.08] text-primary")}>
                    {urgent || unavailable ? <Icon className="w-[18px] h-[18px]" aria-hidden="true" /> : <CheckCircle2 className="w-[18px] h-[18px]" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[24px] font-bold leading-none text-[#1F2A23] tabular-nums">
                        {unavailable ? "—" : (item.count as number).toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[14px] font-semibold text-[#1F2A23] truncate">{item.label}</span>
                    </span>
                    <span className="block text-[12px] text-[#5F6B63] mt-1">
                      {unavailable ? "Donnée indisponible — ouvrir la page pour vérifier" : item.hint ?? "Rien à traiter"}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[#9AA39D] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
