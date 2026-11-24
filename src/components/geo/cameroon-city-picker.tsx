"use client";

import { useI18n } from "@/lib/i18n";
import type { DisplayLevel } from "@/lib/geo/public-label";
import { CityTypeahead } from "./city-typeahead";

/**
 * Choix de la ville au Cameroun. Le membre ne saisit QUE sa ville : l'arrondissement, le département et la région
 * sont déduits en silence par le serveur (saveMemberLocation) et ne sont jamais affichés ici.
 * La ville est toujours affichée sur le profil (aucun réglage d'affichage).
 */
export interface LocationChoice {
  regionId?: string | null;
  departmentId?: string | null;
  arrondissementId?: string | null;
  placeId?: string | null;
  displayLevel: DisplayLevel;
}

const TEXT = {
  fr: { search: "Tapez votre ville (ex. Yaoundé)…" },
  en: { search: "Type your city (e.g. Yaoundé)…" },
} as const;

/** Ville au Cameroun : un seul champ, la saisie EST la ville (aucun clic requis). */
export function CameroonCityPicker({
  city,
  onChange,
}: {
  city: string;
  location?: LocationChoice | null;
  onChange: (city: string, location: LocationChoice | null) => void;
  /** Ancien rendu de repli : le champ gère désormais lui-même l'absence de référentiel. */
  fallback?: () => React.ReactNode;
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  return (
    <CityTypeahead
      value={city}
      country="Cameroun"
      useReferential
      placeholder={T.search}
      onChange={(name, placeId) => onChange(name, { placeId, displayLevel: "city" })}
    />
  );
}
