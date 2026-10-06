"use client";

/**
 * Briques visuelles communes aux écrans d'administration, alignées sur le
 * tableau de bord : cartes blanches à bordure discrète, vert Garden of Alliance
 * en couleur principale, accents de statut subtils, textes secondaires
 * contrastés (WCAG AA), transitions de 150 ms.
 */

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/avatar";

// ── Tokens ─────────────────────────────────────────────────────
export const HEADING_FONT = { fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" } as const;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1";

export const btn = {
  primary: cn("inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary/90 transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", focusRing),
  secondary: cn("inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#E8E5E0] bg-white text-[14px] font-medium text-[#3A443E] hover:bg-[#F5F3EF] hover:border-[#D9D4CC] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", focusRing),
  danger: cn("inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#C23B3B] text-white text-[14px] font-semibold hover:bg-[#A83232] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", focusRing),
  /** Petite action contextuelle (dans une carte, une ligne). */
  small: cn("inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E8E5E0] bg-white text-[13px] font-medium text-[#3A443E] hover:bg-[#F5F3EF] hover:border-[#D9D4CC] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", focusRing),
  icon: cn("inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E8E5E0] bg-white text-[#56615A] hover:text-[#1F2A23] hover:bg-[#F5F3EF] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none", focusRing),
  ghostIcon: cn("inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#56615A] hover:text-[#1F2A23] hover:bg-[#F5F3EF] transition-colors duration-150", focusRing),
};

export const inputClass = cn(
  "w-full h-10 px-3.5 rounded-xl border border-[#E8E5E0] bg-white text-[14px] text-[#1F2A23] placeholder:text-[#8A938D]",
  "focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-colors duration-150"
);
export const textareaClass = cn(inputClass, "h-auto py-2.5 resize-y leading-relaxed");

// ── Badges de statut ───────────────────────────────────────────
export type Tone = "green" | "amber" | "red" | "blue" | "neutral" | "gold";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-primary/[0.08] text-primary ring-primary/20",
  amber: "bg-[#F59E0B]/[0.12] text-[#8A4F05] ring-[#F59E0B]/30",
  red: "bg-[#D64545]/[0.08] text-[#B83333] ring-[#D64545]/20",
  blue: "bg-[#3B6FD9]/[0.08] text-[#2F5DBF] ring-[#3B6FD9]/20",
  neutral: "bg-[#6B746E]/10 text-[#4A534D] ring-[#6B746E]/20",
  gold: "bg-[#C6A15B]/[0.12] text-[#7A5F27] ring-[#C6A15B]/30",
};

export const toneText: Record<Tone, string> = {
  green: "text-primary", amber: "text-[#9A5A06]", red: "text-[#B83333]", blue: "text-[#2F5DBF]", neutral: "text-[#4A534D]", gold: "text-[#7A5F27]",
};
export const toneBg: Record<Tone, string> = {
  green: "bg-primary/[0.08]", amber: "bg-[#F59E0B]/[0.12]", red: "bg-[#D64545]/[0.08]", blue: "bg-[#3B6FD9]/[0.08]", neutral: "bg-[#6B746E]/10", gold: "bg-[#C6A15B]/[0.12]",
};

export function Badge({ tone = "neutral", dot = true, icon: Icon, children, className }: {
  tone?: Tone; dot?: boolean; icon?: LucideIcon; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset", TONE_CLASSES[tone], className)}>
      {Icon ? <Icon className="w-3 h-3" aria-hidden="true" /> : dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

// ── Cartes ─────────────────────────────────────────────────────
export function Card({ children, className, as: Tag = "div", ...rest }: {
  children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("bg-white rounded-2xl border border-[#E8E5E0]", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ title, subtitle, actions, id }: { title: string; subtitle?: string; actions?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={HEADING_FONT}>{title}</h2>
        {subtitle && <p className="text-[13px] text-[#5F6B63] mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/** Statistique compacte (≈ 76 px) : pastille d'icône, valeur, libellé. */
export function StatTile({ icon: Icon, label, value, tone = "green", hint }: {
  icon: LucideIcon; label: string; value: number | string; tone?: Tone; hint?: string;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3.5">
      <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", toneBg[tone], toneText[tone])}>
        <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[24px] font-bold leading-none text-[#1F2A23] tabular-nums" style={HEADING_FONT}>
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </p>
        <p className="text-[13px] text-[#56615A] mt-1 leading-tight truncate">{label}</p>
        {hint && <p className="text-[12px] text-[#5F6B63] leading-tight">{hint}</p>}
      </div>
    </Card>
  );
}

// ── Onglets de filtre (contrôle segmenté) ──────────────────────
export function FilterTabs<T extends string>({ options, value, onChange, label, className }: {
  options: { value: T; label: string; icon?: LucideIcon; count?: number }[];
  value: T; onChange: (v: T) => void; label: string; className?: string;
}) {
  return (
    <div role="tablist" aria-label={label}
      className={cn("inline-flex max-w-full overflow-x-auto rounded-xl border border-[#E8E5E0] bg-[#FAF8F5] p-1 gap-0.5", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button key={opt.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap h-8 px-3 rounded-lg text-[13px] font-medium transition-colors duration-150",
              focusRing,
              active ? "bg-white text-primary font-semibold shadow-[0_1px_2px_rgba(31,51,40,0.08)]" : "text-[#56615A] hover:text-[#1F2A23]"
            )}>
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {opt.label}
            {opt.count !== undefined && opt.count > 0 && (
              <span className={cn("min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center tabular-nums",
                active ? "bg-primary/10 text-primary" : "bg-[#ECE8E1] text-[#4A534D]")}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────
export function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 mt-6">
      <p className="text-[13px] text-[#5F6B63]">Page {page} sur {totalPages} · {total} résultat{total > 1 ? "s" : ""}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={btn.icon} aria-label="Page précédente">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={btn.icon} aria-label="Page suivante">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}

// ── Avatar ─────────────────────────────────────────────────────
export function MemberAvatar({ name, url, size = 40, className }: { name?: string | null; url?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarSrc(url, size > 64 ? 128 : 64)} alt="" style={style} onError={() => setBroken(true)}
      className={cn("rounded-full object-cover shrink-0 bg-[#F5F3EF] ring-1 ring-[#E8E5E0]", className)} />;
  }
  return (
    <span style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.36)) }}
      className={cn("rounded-full shrink-0 inline-flex items-center justify-center bg-primary/10 text-primary font-semibold", className)}>
      {initial}
    </span>
  );
}

// ── États ──────────────────────────────────────────────────────
export function EmptyBlock({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-14 px-6">
      <span className="w-12 h-12 rounded-2xl bg-[#F5F2EC] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#6B746E]" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-[#1F2A23]">{title}</p>
      {description && <p className="text-[13px] text-[#5F6B63] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function LoadingBlock({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#5F6B63]" role="status">
      <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

// ── Modale ─────────────────────────────────────────────────────
export function AdminModal({ open, onClose, title, description, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1F2A23]/30 backdrop-blur-[2px] p-0 sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={cn("w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-[0_16px_48px_rgba(31,51,40,0.16)] max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-[#F1EEE9]">
          <div className="min-w-0">
            <h3 id="admin-modal-title" className="text-[18px] font-semibold text-[#1F2A23] tracking-tight" style={HEADING_FONT}>{title}</h3>
            {description && <p className="text-[13px] text-[#5F6B63] mt-0.5">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className={btn.ghostIcon} aria-label="Fermer"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-[#F1EEE9] flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Libellé + valeur dans une grille de détails. */
export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-[#5F6B63]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium text-[#1F2A23]">{children}</dd>
    </div>
  );
}

/** Bandeau de confirmation / erreur, en bas à droite. */
export function Toast({ notice, onClose }: { notice: { kind: "success" | "error"; text: string } | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div role={notice.kind === "error" ? "alert" : "status"}
      className={cn("fixed bottom-4 right-4 left-4 sm:left-auto z-[60] sm:max-w-sm flex items-start gap-3 px-4 py-3 rounded-xl border bg-white text-[14px] shadow-[0_8px_24px_rgba(31,51,40,0.12)] animate-in fade-in slide-in-from-bottom-2 duration-200",
        notice.kind === "success" ? "border-primary/25 text-[#2F5A2D]" : "border-[#D64545]/30 text-[#B83333]")}>
      <span className="flex-1">{notice.text}</span>
      <button type="button" onClick={onClose} className="text-[#5F6B63] hover:text-[#1F2A23]" aria-label="Fermer"><X className="w-4 h-4" /></button>
    </div>
  );
}
