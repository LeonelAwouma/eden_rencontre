"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
interface Settings {
  display_level: string;
}

const T = {
  fr: {
    title: "Confidentialité de ma localisation",
    none: "Renseignez d'abord votre ville ci-dessus.",
    auto: "Votre ville est affichée sur votre profil et sert automatiquement à vous proposer des profils compatibles de la même ville. Votre compatibilité n'est jamais modifiée par la distance.",
    error: "Opération impossible.",
    download: "Télécharger mes données de localisation",
    remove: "Supprimer ma localisation",
    removeConfirm: "Supprimer votre localisation et son historique ? Vous ne serez plus rapproché des membres de votre ville. Votre profil et vos compatibilités ne changent pas.",
    removed: "Localisation supprimée.",
  },
  en: {
    title: "My location privacy",
    none: "Set your city above first.",
    auto: "Your city is shown on your profile and automatically used to suggest compatible profiles from the same city. Distance never changes your compatibility.",
    error: "Something went wrong.",
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
 * Le rapprochement par ville est automatique dès qu'une ville est renseignée, et la ville est toujours affichée sur
 * le profil : aucun réglage. Restent l'export et la suppression de mes données de localisation.
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
  return (
    <div className="rounded-2xl p-4 space-y-4 sm:col-span-3" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }}>
      <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#486B46" }}>{tx.title}</h5>
      {state === "none" || !s ? (
        <p className="text-sm" style={{ color: "#6B746E" }}>{tx.none}</p>
      ) : (
        <>
          <p className="text-sm" style={{ color: "#56615A" }}>{tx.auto}</p>
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
