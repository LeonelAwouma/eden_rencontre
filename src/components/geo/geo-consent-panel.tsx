"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_LEVELS, type DisplayLevel } from "@/lib/geo/public-label";

interface Settings {
  nearby_search_enabled: boolean;
  location_discoverable: boolean;
  display_level: DisplayLevel;
}

const T = {
  fr: {
    title: "Confidentialité de ma localisation",
    none: "Renseignez d'abord votre localisation ci-dessus pour régler ces options.",
    nearby: "Utiliser ma localisation pour découvrir des profils proches",
    nearbyHint: "Vous permet de chercher par ville, région ou rayon. Désactivé par défaut.",
    discoverable: "Autoriser mon profil à apparaître dans les recherches géographiques des autres",
    discoverableWarn:
      "Attention : autoriser votre profil à apparaître dans une recherche géographique peut révéler que vous êtes dans une zone, même si votre ville et votre distance restent masquées. Désactivé par défaut.",
    display: "Localisation affichée sur mon profil",
    displayHint: "Indépendant des deux options ci-dessus.",
    levels: { none: "Ne pas afficher", country: "Le pays", region: "La région", department: "Le département", arrondissement: "L'arrondissement", city: "La ville" } as Record<DisplayLevel, string>,
    saving: "Enregistrement…", saved: "Enregistré.", error: "Enregistrement impossible.",
    footer: "Refuser de partager votre localisation n'empêche ni l'inscription, ni le matching, ni l'utilisation normale de l'application.",
    download: "Télécharger mes données de localisation",
    remove: "Supprimer ma localisation",
    removeConfirm: "Supprimer votre localisation et son historique ? Vous n'apparaîtrez plus dans les recherches géographiques. Votre profil et vos compatibilités ne changent pas.",
    removed: "Localisation supprimée.",
  },
  en: {
    title: "My location privacy",
    none: "Set your location above first to adjust these options.",
    nearby: "Use my location to discover nearby profiles",
    nearbyHint: "Lets you search by city, region or radius. Off by default.",
    discoverable: "Allow my profile to appear in other members' geographic searches",
    discoverableWarn:
      "Note: allowing your profile to appear in a geographic search can reveal that you are in an area, even if your city and distance stay hidden. Off by default.",
    display: "Location shown on my profile",
    displayHint: "Independent of the two options above.",
    levels: { none: "Don't show", country: "Country", region: "Region", department: "Department", arrondissement: "District", city: "City" } as Record<DisplayLevel, string>,
    saving: "Saving…", saved: "Saved.", error: "Could not save.",
    footer: "Declining to share your location never blocks sign-up, matching or normal use of the app.",
    download: "Download my location data",
    remove: "Delete my location",
    removeConfirm: "Delete your location and its history? You will no longer appear in geographic searches. Your profile and compatibility are unchanged.",
    removed: "Location deleted.",
  },
} as const;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/**
 * Trois réglages INDÉPENDANTS, désactivés par défaut, appliqués immédiatement côté serveur
 * (PATCH /api/member/location). Rien n'est jamais activé automatiquement.
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

  const patch = async (change: Partial<{ nearbySearchEnabled: boolean; locationDiscoverable: boolean; displayLevel: DisplayLevel }>) => {
    setMsg(tx.saving);
    try {
      const res = await fetch("/api/member/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(change),
      });
      if (!res.ok) throw new Error();
      setS((cur) => cur && {
        ...cur,
        ...(change.nearbySearchEnabled !== undefined ? { nearby_search_enabled: change.nearbySearchEnabled } : {}),
        ...(change.locationDiscoverable !== undefined ? { location_discoverable: change.locationDiscoverable } : {}),
        ...(change.displayLevel !== undefined ? { display_level: change.displayLevel } : {}),
      });
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
  return (
    <div className="rounded-2xl p-4 space-y-4 sm:col-span-3" style={{ background: "#FAF9F6", border: "1px solid #E8E5E0" }}>
      <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#486B46" }}>{tx.title}</h5>
      {state === "none" || !s ? (
        <p className="text-sm" style={{ color: "#6B746E" }}>{tx.none}</p>
      ) : (
        <>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={s.nearby_search_enabled} onChange={(e) => patch({ nearbySearchEnabled: e.target.checked })}
              className="mt-1 w-4 h-4 accent-[#486B46]" />
            <span>
              <span className="block text-sm font-semibold" style={{ color: "#2F2F2F" }}>{tx.nearby}</span>
              <span className="block text-xs" style={{ color: "#6B746E" }}>{tx.nearbyHint}</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={s.location_discoverable} onChange={(e) => patch({ locationDiscoverable: e.target.checked })}
              className="mt-1 w-4 h-4 accent-[#486B46]" />
            <span>
              <span className="block text-sm font-semibold" style={{ color: "#2F2F2F" }}>{tx.discoverable}</span>
              <span className="block text-xs" style={{ color: "#8A5A00" }}>{tx.discoverableWarn}</span>
            </span>
          </label>
          <label className="block space-y-1">
            <span className="block text-sm font-semibold" style={{ color: "#2F2F2F" }}>{tx.display}</span>
            <select value={s.display_level} onChange={(e) => patch({ displayLevel: e.target.value as DisplayLevel })}
              className="h-11 w-full rounded-xl px-3 text-sm" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
              {DISPLAY_LEVELS.map((l) => <option key={l} value={l}>{tx.levels[l]}</option>)}
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
      <p className="text-xs" style={{ color: "#6B746E" }}>{tx.footer}</p>
    </div>
  );
}
