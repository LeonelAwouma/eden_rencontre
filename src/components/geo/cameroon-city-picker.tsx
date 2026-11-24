"use client";

import { useI18n } from "@/lib/i18n";
import { isCityFilled } from "@/lib/geo/city-suggestions";
import type { DisplayLevel } from "@/lib/geo/public-label";
import { CityTypeahead } from "./city-typeahead";

/**
 * Choix de la ville au Cameroun. Le membre ne saisit QUE sa ville : l'arrondissement, le département et la région
 * sont déduits en silence par le serveur (saveMemberLocation) et ne sont jamais affichés ici.
 */
export interface LocationChoice {
  regionId?: string | null;
  departmentId?: string | null;
  arrondissementId?: string | null;
  placeId?: string | null;
  displayLevel: DisplayLevel;
}

/** Niveaux d'affichage proposés au membre. */
export const MEMBER_DISPLAY_LEVELS: readonly DisplayLevel[] = ["none", "city"];

const TEXT = {
  fr: {
    search: "Tapez votre ville (ex. Yaoundé)…",
    display: "Localisation affichée sur mon profil",
    displayHint: "Votre ville sert à vous proposer des profils compatibles de la même ville. Elle n'est affichée sur votre profil que si vous le choisissez.",
    levels: { none: "Ne pas afficher", city: "Afficher ma ville" } as Partial<Record<DisplayLevel, string>>,
  },
  en: {
    search: "Type your city (e.g. Yaoundé)…",
    display: "Location shown on my profile",
    displayHint: "Your city is used to suggest compatible profiles from the same city. It only appears on your profile if you choose so.",
    levels: { none: "Don't show", city: "Show my city" } as Partial<Record<DisplayLevel, string>>,
  },
} as const;

/** Niveau d'affichage de la localisation sur le profil (« Ne pas afficher » par défaut). */
export function DisplayLevelSelect({
  value,
  onChange,
  levels = MEMBER_DISPLAY_LEVELS,
}: {
  value: DisplayLevel;
  onChange: (l: DisplayLevel) => void;
  levels?: readonly DisplayLevel[];
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  // Un ancien niveau (région, département…) s'affiche comme « Ne pas afficher » : c'est ce que le serveur applique.
  const current = levels.includes(value) ? value : "none";
  return (
    <div className="space-y-1.5 pt-1">
      <label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{T.display}</label>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as DisplayLevel)}
        className="h-12 w-full rounded-xl border border-foreground/10 bg-card px-3 text-sm text-foreground"
      >
        {levels.map((l) => <option key={l} value={l}>{T.levels[l] ?? l}</option>)}
      </select>
      <p className="text-xs text-foreground/50">{T.displayHint}</p>
    </div>
  );
}

/**
 * Ville au Cameroun : un seul champ, la saisie EST la ville (aucun clic requis). Les suggestions du référentiel
 * corrigent l'orthographe ; le niveau d'affichage apparaît dès qu'une ville est saisie.
 */
export function CameroonCityPicker({
  city,
  location,
  onChange,
}: {
  city: string;
  location: LocationChoice | null;
  onChange: (city: string, location: LocationChoice | null) => void;
  /** Ancien rendu de repli : le champ gère désormais lui-même l'absence de référentiel. */
  fallback?: () => React.ReactNode;
}) {
  const { locale } = useI18n();
  const T = locale === "en" ? TEXT.en : TEXT.fr;
  const display: DisplayLevel = location?.displayLevel ?? "none";

  return (
    <div className="space-y-3">
      <CityTypeahead
        value={city}
        country="Cameroun"
        useReferential
        placeholder={T.search}
        onChange={(name, placeId) => onChange(name, { placeId, displayLevel: display })}
      />
      {isCityFilled(city) && (
        <DisplayLevelSelect value={display} onChange={(l) => onChange(city, { ...(location ?? {}), displayLevel: l })} />
      )}
    </div>
  );
}
