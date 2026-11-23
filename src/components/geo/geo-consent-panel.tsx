"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import type { DisplayLevel } from "@/lib/geo/public-label";
import { MEMBER_DISPLAY_LEVELS } from "./cameroon-city-picker";

interface Settings {
  display_level: DisplayLevel;
}

const T = {
  fr: {
    title: "Confidentialité de ma localisation",
    none: "Renseignez d'abord votre ville ci-dessus.",
    auto: "Votre ville sert automatiquement à vous proposer des profils compatibles de la même ville. Votre compatibilité n'est jamais modifiée par la distance.",
    display: "Localisation affichée sur mon profil",
    displayHint: "Votre ville n'est affichée sur votre profil que si vous le choisissez.",
    levels: { none: "Ne pas afficher", city: "Afficher ma ville" } as Partial<Record<DisplayLevel, string>>,
    saving: "Enregistrement…", saved: "Enregistré.", error: "Enregistrement impossible.",
    download: "Télécharger mes données de localisation",
    remove: "Supprimer ma localisation",
    removeConfirm: "Supprimer votre localisation et son historique ? Vous ne serez plus rapproché des membres de votre ville. Votre profil et vos compatibilités ne changent pas.",
    removed: "Localisation supprimée.",
  },
  en: {
    title: "My location privacy",
    none: "Set your city above first.",
    auto: "Your city is automatically used to suggest compatible profiles from the same city. Distance never changes your compatibility.",
    display: "Location shown on my profile",
    displayHint: "Your city only appears on your profile if you choose so.",
    levels: { none: "Don't show", city: "Show my city" } as Partial<Record<DisplayLevel, string>>,
    saving: "Saving…", saved: "Saved.", error: "Could not save.",
    download: "Download my location data",
    remove: "Delete my location",
    removeConfirm: "Delete your location and its history? You will no longer be matched with members from your city. Your profile and compatibility are unchanged.",
    removed: "Location deleted.",
  },
} as const;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/**
 * Le rapprochement par ville est automatique dès qu'une ville est renseignée (aucune case à cocher). Le seul
 * réglage est l'affichage de la ville sur le profil (PATCH /api/member/location), appliqué immédiatement.
 */
export function GeoConsentPanel({ refreshKey = 0, onChanged }: { refreshKey?: number; onChanged?: () => void }) {
  const { locale } = useI18n();
  const tx = locale === "en" ? T.en : T.fr;
  const [s, setS] = useState<Settings | null>(null);
  const [state, setState] = useState<"loading" | "none" | "ready">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/member/location", { cache: "no-store", headers: await authHeader() });
        const data = res.ok ? (await res.json()).location : null;
        if (!alive) return;
        if (data) { setS(data); setState("ready"); } else setState("none");
      } catch { if (alive) setState("none"); }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  const setDisplay = async (displayLevel: DisplayLevel) => {
    setMsg(tx.saving);
    try {
      const res = await fetch("/api/member/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ displayLevel }),
      });
      if (!res.ok) throw new Error();
      setS((cur) => cur && { ...cur, display_level: displayLevel });
      setMsg(tx.saved);
      onChanged?.();
    } catch { setMsg(tx.error); }
  };

  const download = async () => {
    try {
      const res = await fetch("/api/member/location/export", { cache: "no-store", headers: await authHeader() });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = "ma-localisation.json"; a.click();
      URL.revokeObjectURL(url);
    } catch { setMsg(tx.error); }
  };

  const remove = async () => {
    if (!window.confirm(tx.removeConfirm)) return;
    try {
      const res = await fetch("/api/member/location", { method: "DELETE", headers: await authHeader() });
      if (!res.ok) throw new Error();
      setS(null); setState("none"); setMsg(tx.removed);
      onChanged?.();
    } catch { setMsg(tx.error); }
  };

  if (state === "loading") return null;
  // Un ancien niveau (région, département…) est appliqué comme « Ne pas afficher » côté serveur.
  const current: DisplayLevel = s && MEMBER_DISPLAY_LEVELS.includes(s.display_level) ? s.display_level : "none";
  return (
    <div className="rounded-2xl p-4 space-y-4 sm:col-span-3" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }}>
      <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#486B46" }}>{tx.title}</h5>
      {state === "none" || !s ? (
        <p className="text-sm" style={{ color: "#6B746E" }}>{tx.none}</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "#56615A" }}>{tx.auto}</p>
          <label className="block space-y-1">
            <span className="block text-sm font-semibold" style={{ color: "#2F2F2F" }}>{tx.display}</span>
            <select value={current} onChange={(e) => setDisplay(e.target.value as DisplayLevel)}
              className="h-11 w-full rounded-xl px-3 text-sm" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
              {MEMBER_DISPLAY_LEVELS.map((l) => <option key={l} value={l}>{tx.levels[l]}</option>)}
            </select>
            <span className="block text-xs" style={{ color: "#6B746E" }}>{tx.displayHint}</span>
          </label>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={download} className="text-xs font-bold underline underline-offset-2" style={{ color: "#486B46" }}>{tx.download}</button>
            <button type="button" onClick={remove} className="text-xs font-bold underline underline-offset-2" style={{ color: "#B3402F" }}>{tx.remove}</button>
          </div>
          {msg && <p className="text-xs" style={{ color: "#486B46" }} role="status">{msg}</p>}
        </>
      )}
    </div>
  );
}
