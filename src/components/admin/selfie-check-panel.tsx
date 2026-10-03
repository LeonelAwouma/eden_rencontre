"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, ScanFace, ImageOff, X, ChevronLeft, ChevronRight, Maximize2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Admin → fiche membre : vérification du selfie, faite par l'admin.
 * Il n'y a plus de comparaison automatique des visages : l'admin regarde le
 * selfie pris à l'inscription à côté de chaque photo de profil (en grand,
 * côte à côte) et enregistre son verdict — « Le selfie correspond » ou
 * « Ne correspond pas » (/api/admin/users/[id]/selfie-decision).
 */

export interface SelfieDetails {
  /** Verdict de l'admin (méthode actuelle). */
  method?: "admin";
  decision?: "match" | "mismatch";
  reviewed_by?: string;
  reviewed_at?: string;
  /** Champs de l'ancienne vérification automatique (membres inscrits avant le changement). */
  reason?: string;
  checked_at?: string;
}

type Status = "match" | "mismatch" | "legacy_auto" | "to_review";

function statusOf(verified: boolean, details: SelfieDetails | null): Status {
  if (details?.method === "admin") return details.decision === "match" ? "match" : "mismatch";
  return verified ? "legacy_auto" : "to_review";
}

const STATUS_UI: Record<Status, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  match: { label: "Le selfie correspond", className: "text-emerald-700", Icon: ShieldCheck },
  mismatch: { label: "Ne correspond pas", className: "text-red-700", Icon: ShieldAlert },
  legacy_auto: { label: "Validé automatiquement (ancienne méthode) — à confirmer", className: "text-amber-700", Icon: ShieldQuestion },
  to_review: { label: "À comparer", className: "text-amber-700", Icon: ShieldQuestion },
};

const formatDate = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

export function SelfieCheckPanel({ userId, selfieUrl, photos, verified, details, onUpdated }: {
  userId: string;
  selfieUrl: string | null;
  photos: string[];
  verified: boolean;
  details: SelfieDetails | null;
  onUpdated: (patch: { selfie_verified: boolean; selfie_verification_score: number; selfie_verification_details: SelfieDetails }) => void;
}) {
  const [busy, setBusy] = useState<"match" | "mismatch" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Photo ouverte dans la comparaison côte à côte (index), ou null.
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  const decide = async (match: boolean) => {
    setBusy(match ? "match" : "mismatch");
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/selfie-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "La décision n'a pas été enregistrée."); return; }
      onUpdated({ selfie_verified: data.selfie_verified, selfie_verification_score: data.selfie_verification_score, selfie_verification_details: data.details });
    } catch {
      setError("La décision n'a pas été enregistrée.");
    } finally {
      setBusy(null);
    }
  };

  if (!selfieUrl) {
    return (
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Vérification du selfie</h2>
        <p className="text-sm text-gray-500 mt-3">Aucun selfie enregistré pour ce membre.</p>
      </section>
    );
  }

  const status = statusOf(verified, details);
  const ui = STATUS_UI[status];
  const decided = status === "match" || status === "mismatch";

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Vérification du selfie</h2>
          <p className={cn("mt-2 inline-flex items-center gap-1.5 text-sm font-semibold", ui.className)}>
            <ui.Icon className="w-4 h-4" /> {ui.label}
          </p>
          {decided && details?.reviewed_at && (
            <p className="text-[12.5px] text-gray-500 mt-1">
              Décidé{details.reviewed_by ? ` par ${details.reviewed_by}` : ""} le {formatDate(details.reviewed_at)}
            </p>
          )}
        </div>
        <DecisionButtons status={status} busy={busy} disabled={photos.length === 0} onDecide={decide} />
      </div>

      {error && <p role="alert" className="mt-3 text-[13px] text-red-700">{error}</p>}

      {/* Le selfie face à chaque photo de profil (3 emplacements, même vides) */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <figure>
          <button type="button" onClick={() => photos.length > 0 && setCompareIndex(0)} title="Comparer avec les photos"
            className="block w-full aspect-square rounded-lg overflow-hidden border-2 border-[#2D5016]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
          </button>
          <figcaption className="mt-1.5 text-[12px] font-semibold text-gray-700 flex items-center gap-1"><ScanFace className="w-3.5 h-3.5" /> Selfie (caméra)</figcaption>
        </figure>
        {[0, 1, 2].map((i) => {
          const src = photos[i];
          if (!src) {
            return (
              <figure key={i}>
                <div className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 text-gray-400">
                  <ImageOff className="w-6 h-6" />
                  <span className="text-[11px] text-center px-2">Aucune photo enregistrée</span>
                </div>
                <figcaption className="mt-1.5 text-[12px] font-semibold text-gray-700">Photo {i + 1}</figcaption>
              </figure>
            );
          }
          return (
            <figure key={i}>
              <button type="button" onClick={() => setCompareIndex(i)} title="Comparer avec le selfie"
                className="group relative block w-full aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-[#2D5016]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-md bg-black/55 text-white flex items-center justify-center opacity-80 group-hover:opacity-100">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
              </button>
              <figcaption className="mt-1.5 text-[12px] font-semibold text-gray-700">Photo {i + 1}</figcaption>
            </figure>
          );
        })}
      </div>
      {photos.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-amber-700">
          Aucune photo de profil n&apos;a été enregistrée pour ce membre (inscription ancienne ou incomplète) : la comparaison n&apos;est pas possible.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-gray-500">
          Cliquez sur une photo pour la comparer au selfie, côte à côte et en grand. Chaque photo doit montrer la même personne que le selfie.
        </p>
      )}

      {compareIndex !== null && photos[compareIndex] && (
        <CompareModal
          selfieUrl={selfieUrl}
          photos={photos}
          index={compareIndex}
          onIndex={setCompareIndex}
          onClose={() => setCompareIndex(null)}
          footer={<DecisionButtons status={status} busy={busy} disabled={false} onDecide={async (m) => { await decide(m); setCompareIndex(null); }} dark />}
        />
      )}
    </section>
  );
}

function DecisionButtons({ status, busy, disabled, onDecide, dark }: {
  status: Status; busy: "match" | "mismatch" | null; disabled: boolean; onDecide: (match: boolean) => void; dark?: boolean;
}) {
  const base = "inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-[13px] font-semibold disabled:opacity-60";
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => onDecide(true)} disabled={disabled || busy !== null || status === "match"}
        className={cn(base, "bg-[#2D5016] text-white hover:bg-[#24410f]")}>
        {busy === "match" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Le selfie correspond
      </button>
      <button onClick={() => onDecide(false)} disabled={disabled || busy !== null || status === "mismatch"}
        className={cn(base, dark ? "bg-white/10 text-white border border-white/25 hover:bg-white/20" : "border border-red-200 text-red-700 hover:bg-red-50")}>
        {busy === "mismatch" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Ne correspond pas
      </button>
    </div>
  );
}

/** Selfie et photo de profil côte à côte, en grand, avec navigation entre les photos. */
function CompareModal({ selfieUrl, photos, index, onIndex, onClose, footer }: {
  selfieUrl: string; photos: string[]; index: number;
  onIndex: (i: number) => void; onClose: () => void; footer: ReactNode;
}) {
  const count = photos.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + count) % count);
      if (e.key === "ArrowRight") onIndex((index + 1) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, onIndex, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col p-3 sm:p-6" role="dialog" aria-modal="true"
      aria-label="Comparaison du selfie et des photos de profil" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 text-white mb-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold">Selfie ↔ Photo {index + 1} sur {count}</p>
        <button onClick={onClose} aria-label="Fermer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 sm:gap-4" onClick={(e) => e.stopPropagation()}>
        <figure className="min-h-0 flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selfieUrl} alt="Selfie" className="flex-1 min-h-0 w-full object-contain rounded-lg bg-black" />
          <figcaption className="mt-2 text-center text-[13px] font-semibold text-white">Selfie pris à l&apos;inscription</figcaption>
        </figure>
        <figure className="relative min-h-0 flex flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[index]} alt={`Photo ${index + 1}`} className="flex-1 min-h-0 w-full object-contain rounded-lg bg-black" />
          <figcaption className="mt-2 text-center text-[13px] font-semibold text-white">Photo de profil {index + 1}</figcaption>
          {count > 1 && (
            <>
              <button onClick={() => onIndex((index - 1 + count) % count)} aria-label="Photo précédente"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => onIndex((index + 1) % count)} aria-label="Photo suivante"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </figure>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        {count > 1 && photos.map((src, i) => (
          <button key={i} onClick={() => onIndex(i)} aria-label={`Photo ${i + 1}`}
            className={cn("w-14 h-14 rounded-md overflow-hidden border-2", i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        <div className="w-full sm:w-auto flex justify-center sm:ml-4">{footer}</div>
      </div>
    </div>
  );
}
