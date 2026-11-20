"use client";

import { Loader2, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { DistanceBand, GeoScope } from "@/lib/geo/discovery";
import type { useGeoDiscover } from "./use-geo-discover";

const T = {
  fr: {
    title: "Où chercher ?",
    scopes: {
      none: "Aucune restriction géographique",
      city: "Même ville",
      arrondissement: "Même arrondissement",
      department: "Même département",
      region: "Même région",
      radius25: "Dans un rayon de 25 km",
      radius50: "Dans un rayon de 50 km",
      radius100: "Dans un rayon de 100 km",
      radius250: "Dans un rayon de 250 km",
      country: "Partout dans mon pays",
    } as Record<GeoScope, string>,
    sortLabel: "Classer par",
    compat: "Compatibilité",
    proximity: "Proximité",
    includeUnlocated: "Inclure les profils sans localisation",
    note: "La géographie filtre et classe seulement des profils déjà compatibles : elle ne change jamais le pourcentage de compatibilité. Les distances sont approximatives (centre des villes).",
    loading: "Recherche dans cette zone…",
    errors: {
      error: "La recherche géographique a échoué. Réessayez.",
      unavailable: "La recherche géographique n'est pas encore disponible.",
      limited: "Trop de recherches pour le moment. Réessayez dans une minute.",
    },
    reasons: {
      viewer_no_location: "Renseignez votre localisation dans votre profil pour chercher par zone.",
      viewer_not_enabled: "Activez « Utiliser ma localisation pour chercher » dans votre profil pour chercher par zone.",
      viewer_missing_zone: "Votre localisation actuelle ne permet pas cette portée : précisez votre ville dans votre profil.",
      viewer_formation_locked: "Terminez le pilier 1 de « Bâtir sur le roc » pour chercher par zone.",
    } as Record<string, string>,
    goProfile: "Ouvrir mon profil",
    truncated: "Beaucoup de profils dans cette zone : affinez la portée pour voir les autres.",
    unlocatedTitle: "Localisation non renseignée",
    unlocatedHint: "Ces profils n'ont pas indiqué où ils se trouvent ; aucune distance n'est attribuée.",
    inviteTitle: "Complétez votre localisation",
    empty: "Aucun profil compatible dans cette zone pour le moment. Élargissez la portée.",
    bands: {
      same_city: "Même ville", lt25: "Moins de 25 km", "25_50": "25 à 50 km", "50_100": "50 à 100 km",
      "100_250": "100 à 250 km", gt250: "Plus de 250 km",
    } as Record<DistanceBand, string>,
  },
  en: {
    title: "Where to look?",
    scopes: {
      none: "No geographic restriction",
      city: "Same city",
      arrondissement: "Same district",
      department: "Same department",
      region: "Same region",
      radius25: "Within 25 km",
      radius50: "Within 50 km",
      radius100: "Within 100 km",
      radius250: "Within 250 km",
      country: "Anywhere in my country",
    } as Record<GeoScope, string>,
    sortLabel: "Sort by",
    compat: "Compatibility",
    proximity: "Proximity",
    includeUnlocated: "Include profiles without a location",
    note: "Geography only filters and sorts profiles that are already compatible: it never changes the compatibility percentage. Distances are approximate (city centres).",
    loading: "Searching this area…",
    errors: {
      error: "The geographic search failed. Please try again.",
      unavailable: "The geographic search is not available yet.",
      limited: "Too many searches right now. Try again in a minute.",
    },
    reasons: {
      viewer_no_location: "Add your location in your profile to search by area.",
      viewer_not_enabled: "Turn on “Use my location to search” in your profile to search by area.",
      viewer_missing_zone: "Your current location doesn't allow this scope: specify your city in your profile.",
      viewer_formation_locked: "Finish pillar 1 of “Building on the Rock” to search by area.",
    } as Record<string, string>,
    goProfile: "Open my profile",
    truncated: "Many profiles in this area: narrow the scope to see the others.",
    unlocatedTitle: "Location not provided",
    unlocatedHint: "These profiles haven't said where they are; no distance is assigned.",
    inviteTitle: "Complete your location",
    empty: "No compatible profile in this area yet. Widen the scope.",
    bands: {
      same_city: "Same city", lt25: "Under 25 km", "25_50": "25–50 km", "50_100": "50–100 km",
      "100_250": "100–250 km", gt250: "Over 250 km",
    } as Record<DistanceBand, string>,
  },
} as const;

export function useGeoText() {
  const { locale } = useI18n();
  return locale === "en" ? T.en : T.fr;
}

const SCOPE_ORDER: GeoScope[] = [
  "none", "city", "arrondissement", "department", "region", "radius25", "radius50", "radius100", "radius250", "country",
];

export function GeoDiscoverControls({
  geo, onOpenProfile, resultCount,
}: {
  geo: ReturnType<typeof useGeoDiscover>;
  onOpenProfile: () => void;
  resultCount: number;
}) {
  const tx = useGeoText();
  const reasonText = geo.reason ? tx.reasons[geo.reason] : null;
  const errorText = geo.status === "error" || geo.status === "unavailable" || geo.status === "limited" ? tx.errors[geo.status] : null;

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "#FFFFFF", border: "1px solid #E8E5E0" }}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[210px] flex-1 space-y-1">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "#6B746E" }}>
            <MapPin className="w-3.5 h-3.5" /> {tx.title}
          </span>
          <select
            value={geo.scope}
            onChange={(e) => geo.setScope(e.target.value as GeoScope)}
            className="h-11 w-full rounded-xl px-3 text-sm"
            style={{ background: "#FAF9F6", border: "1px solid #E8E5E0", color: "#2F2F2F" }}
          >
            {SCOPE_ORDER.map((s) => <option key={s} value={s}>{tx.scopes[s]}</option>)}
          </select>
        </label>

        {geo.active && (
          <div className="space-y-1">
            <span className="block text-xs font-bold uppercase tracking-wider" style={{ color: "#6B746E" }}>{tx.sortLabel}</span>
            <div className="inline-flex rounded-xl p-1" style={{ background: "#EEF5EC" }}>
              {(["compat", "proximity"] as const).map((s) => (
                <button key={s} type="button" onClick={() => geo.setSort(s)}
                  className="px-3 h-9 rounded-lg text-xs font-bold transition-colors"
                  style={geo.sort === s ? { background: "#486B46", color: "#FFFFFF" } : { color: "#486B46" }}>
                  {s === "compat" ? tx.compat : tx.proximity}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {geo.active && (
        <>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#2F2F2F" }}>
            <input type="checkbox" checked={geo.includeUnlocated} onChange={(e) => geo.setIncludeUnlocated(e.target.checked)}
              className="w-4 h-4 accent-[#486B46]" />
            {tx.includeUnlocated}
          </label>
          <p className="text-xs leading-relaxed" style={{ color: "#6B746E" }}>{tx.note}</p>
        </>
      )}

      {geo.status === "loading" && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "#486B46" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> {tx.loading}
        </p>
      )}
      {errorText && <p className="text-sm" style={{ color: "#B3402F" }}>{errorText}</p>}
      {reasonText && (
        <div className="rounded-xl p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: "#EEF5EC", border: "1px solid #C6D4C0" }}>
          <span className="text-sm" style={{ color: "#2F2F2F" }}>{reasonText}</span>
          <button type="button" onClick={onOpenProfile} className="text-xs font-bold underline underline-offset-2" style={{ color: "#486B46" }}>
            {tx.goProfile}
          </button>
        </div>
      )}
      {geo.status === "ready" && geo.truncated && <p className="text-xs" style={{ color: "#6B746E" }}>{tx.truncated}</p>}
      {geo.status === "ready" && !geo.reason && resultCount === 0 && <p className="text-sm" style={{ color: "#6B746E" }}>{tx.empty}</p>}
    </div>
  );
}
