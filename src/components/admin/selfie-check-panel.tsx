"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, ShieldAlert, RefreshCw, Loader2, ScanFace, AlertTriangle, ImageOff, X, ChevronLeft, ChevronRight, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LivenessCheck, PhotoCheck, PhotoIssue } from "@/lib/face-rules";

/**
 * Admin → fiche membre : vérification du selfie, photo par photo.
 * Le selfie est affiché à côté de chaque photo de profil avec son score de
 * correspondance et le problème détecté, plus le résultat de la preuve de
 * présence. « Revérifier » repasse le membre aux règles actuelles
 * (utile pour les inscrits d'avant le renforcement).
 */

export interface SelfieDetails {
  photos?: PhotoCheck[];
  liveness?: LivenessCheck | null;
  reason?: string;
  checked_at?: string;
  rechecked_by_admin?: boolean;
}

const ISSUE_LABEL: Record<Exclude<PhotoIssue, null>, string> = {
  no_face: "Aucun visage net",
  several_faces: "Plusieurs visages",
  mismatch: "Ne correspond pas",
  unreadable: "Illisible",
};

export function SelfieCheckPanel({ userId, selfieUrl, photos, verified, score, details, onUpdated }: {
  userId: string;
  selfieUrl: string | null;
  photos: string[];
  verified: boolean;
  score: number;
  details: SelfieDetails | null;
  onUpdated: (patch: { selfie_verified: boolean; selfie_verification_score: number; selfie_verification_details: SelfieDetails }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Photo ouverte dans la comparaison côte à côte (index), ou null.
  const [compareIndex, setCompareIndex] = useState<number | null>(null);

  const reverify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reverify-selfie`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "La revérification a échoué."); return; }
      onUpdated({ selfie_verified: data.selfie_verified, selfie_verification_score: data.selfie_verification_score, selfie_verification_details: data.details });
    } catch {
      setError("La revérification a échoué.");
    } finally {
      setBusy(false);
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

  const checks = details?.photos ?? [];
  const liveness = details?.liveness ?? null;
  const oldRule = !details; // vérifié avant le renforcement (une seule photo devait correspondre)

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Vérification du selfie</h2>
          <p className={cn("mt-2 inline-flex items-center gap-1.5 text-sm font-semibold", verified ? "text-emerald-700" : "text-red-700")}>
            {verified ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {verified ? "Vérifié" : "Non vérifié"} · score {score || 0} %
          </p>
          {details?.reason && <p className="text-[13px] text-gray-600 mt-1 max-w-xl">{details.reason}</p>}
        </div>
        <button onClick={reverify} disabled={busy}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Revérifier
        </button>
      </div>

      {oldRule && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[12.5px] text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          Vérifié avec l&apos;ancienne règle (une seule photo sur trois devait ressembler au selfie). Cliquez sur « Revérifier » pour appliquer les règles actuelles.
        </p>
      )}
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
          const c = checks[i];
          const ok = c && !c.issue;
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
                className={cn("group relative block w-full aspect-square rounded-lg overflow-hidden border-2", !c ? "border-gray-200" : ok ? "border-emerald-500" : "border-red-500")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-md bg-black/55 text-white flex items-center justify-center opacity-80 group-hover:opacity-100">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
              </button>
              <figcaption className="mt-1.5 text-[12px]">
                <span className="font-semibold text-gray-700">Photo {i + 1}</span>
                {c ? (
                  <span className={cn("block font-semibold", ok ? "text-emerald-700" : "text-red-700")}>
                    {ok ? `Correspond · ${c.score} %` : `${ISSUE_LABEL[c.issue as Exclude<PhotoIssue, null>]} · ${c.score} %`}
                  </span>
                ) : (
                  <span className="block text-gray-400">Non analysée</span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {photos.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-amber-700">
          Aucune photo de profil n&apos;a été enregistrée pour ce membre (inscription ancienne ou incomplète) : la comparaison n&apos;est pas possible.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-gray-500">Cliquez sur une photo pour la comparer au selfie, côte à côte et en grand.</p>
      )}

      {/* Preuve de présence */}
      <div className="mt-4 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[12.5px] text-gray-700">
        <span className="font-semibold">Preuve de présence (tête qui tourne pendant la capture) : </span>
        {!liveness ? <span className="text-gray-500">non contrôlée (inscription antérieure au contrôle)</span>
          : liveness.passed ? <span className="text-emerald-700 font-semibold">confirmée</span>
          : <span className="text-red-700 font-semibold">échouée — {liveness.reason}</span>}
        {liveness && <span className="text-gray-500"> · {liveness.framesWithFace} images avec visage, rotation {liveness.yawRange}</span>}
      </div>
      <p className="mt-2 text-[11.5px] text-gray-500">
        La vérification automatique aide à repérer les faux profils mais ne remplace pas votre regard : comparez vous-même le selfie et les photos avant d&apos;approuver.
      </p>

      {compareIndex !== null && photos[compareIndex] && (
        <CompareModal
          selfieUrl={selfieUrl}
          photos={photos}
          checks={checks}
          index={compareIndex}
          onIndex={setCompareIndex}
          onClose={() => setCompareIndex(null)}
        />
      )}
    </section>
  );
}

/** Selfie et photo de profil côte à côte, en grand, avec navigation entre les photos. */
function CompareModal({ selfieUrl, photos, checks, index, onIndex, onClose }: {
  selfieUrl: string; photos: string[]; checks: PhotoCheck[]; index: number;
  onIndex: (i: number) => void; onClose: () => void;
}) {
  const count = photos.length;
  const c = checks[index];

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
        <p className="text-sm font-semibold">
          Selfie ↔ Photo {index + 1} sur {count}
          {c && (
            <span className={cn("ml-2 px-2 py-0.5 rounded-md text-[12px]", c.issue ? "bg-red-600" : "bg-emerald-600")}>
              {c.issue ? ISSUE_LABEL[c.issue as Exclude<PhotoIssue, null>] : "Correspond"} · {c.score} %
            </span>
          )}
        </p>
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

      {count > 1 && (
        <div className="mt-3 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          {photos.map((src, i) => (
            <button key={i} onClick={() => onIndex(i)} aria-label={`Photo ${i + 1}`}
              className={cn("w-14 h-14 rounded-md overflow-hidden border-2", i === index ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
