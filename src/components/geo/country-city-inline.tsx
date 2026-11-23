"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { countryLabel, findCountry } from "@/lib/geo";
import { Flag } from "@/components/flag";
import { useCountryCityPicker } from "./use-country-city-picker";
import { CameroonCityPicker, DisplayLevelSelect, type LocationChoice } from "./cameroon-city-picker";

/**
 * Rendu étendu du sélecteur pays → ville (inscription, classique et Google —
 * un seul composant partagé). Reprend les classes déjà en place pour le pays
 * et applique le même traitement (pastille + « Modifier ») à la ville.
 *
 * Cameroun : recherche de localité avec contexte administratif (référentiel géo). Tous les autres pays
 * gardent le fonctionnement existant. `location` / `onChangeLocation` sont facultatifs : sans eux le
 * composant se comporte exactement comme avant.
 */
export function CountryCityInline({
  country,
  city,
  onChangeCountry,
  autoFocusCountry,
  onChangeCity,
  location,
  onChangeLocation,
}: {
  country: string;
  city: string;
  onChangeCountry: (country: string) => void;
  onChangeCity: (city: string) => void;
  autoFocusCountry?: boolean;
  location?: LocationChoice | null;
  onChangeLocation?: (location: LocationChoice | null) => void;
}) {
  const { t, locale } = useI18n();
  const {
    countrySearch, setCountrySearch, citySearch, setCitySearch, manualCity, setManualCity,
    cityMode, filteredCountries, filteredCities,
    selectCountry, changeCountry, selectCity, startManualCity, confirmManualCity, changeCity,
  } = useCountryCityPicker({
    country,
    onChangeCountry: (c) => { onChangeCountry(c); onChangeLocation?.(null); },
    onChangeCity: (c) => { onChangeCity(c); if (!c) onChangeLocation?.(null); },
  });

  if (!country) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
          <Input
            autoFocus={autoFocusCountry}
            placeholder={t("registrationV2.countryPlaceholder")}
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2">
          {filteredCountries.map((c) => (
            <Button
              key={c.name}
              type="button"
              variant="outline"
              onClick={() => selectCountry(c.name)}
              className="h-12 rounded-xl border-foreground/5 bg-card hover:border-primary/50 text-sm font-bold text-foreground/70 text-left justify-start px-4"
            >
              <Flag iso={c.iso} className="mr-2" /> <span className="truncate">{countryLabel(c, locale)}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const legacyCity = city ? (
    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <span className="flex items-center gap-2 font-bold text-foreground">
        <MapPin className="w-4 h-4 shrink-0" /> {city}
      </span>
      <button type="button" onClick={changeCity} className="text-xs font-semibold text-primary underline underline-offset-2">
        {t("geo.changeCity")}
      </button>
    </div>
  ) : cityMode === "manual" ? (
    <div className="space-y-3">
      <Input
        autoFocus
        placeholder={t("geo.manualCityPlaceholder")}
        value={manualCity}
        onChange={(e) => setManualCity(e.target.value)}
        className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
      />
      <Button
        type="button"
        onClick={confirmManualCity}
        disabled={!manualCity.trim()}
        variant="outline"
        className="w-full h-12 rounded-xl border-primary/50 text-primary font-bold disabled:opacity-40"
      >
        {t("geo.confirmCity")}
      </Button>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
        <Input
          placeholder={t("registrationV2.cityPlaceholder")}
          value={citySearch}
          onChange={(e) => setCitySearch(e.target.value)}
          className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2">
        {filteredCities.map((c) => (
          <Button
            key={c}
            type="button"
            variant="outline"
            onClick={() => selectCity(c)}
            className="h-12 rounded-xl text-sm font-bold text-left justify-start px-4 border-foreground/5 bg-card text-foreground/70 hover:border-primary/50"
          >
            <MapPin className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{c}</span>
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={startManualCity}
          className="h-12 rounded-xl text-sm font-bold text-left justify-start px-4 italic border-foreground/5 bg-card text-foreground/40"
        >
          <Plus className="w-4 h-4 mr-2 shrink-0" /> {t("geo.cityNotListed")}
        </Button>
      </div>
    </div>
  );

  const structured = country === "Cameroun" && !!onChangeLocation;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <span className="flex items-center gap-2 font-bold text-foreground">
          <Flag iso={findCountry(country)?.iso ?? ""} /> {country}
        </span>
        <button type="button" onClick={changeCountry} className="text-xs font-semibold text-primary underline underline-offset-2">
          {t("geo.changeCountry")}
        </button>
      </div>

      {structured ? (
        <CameroonCityPicker
          city={city}
          location={location ?? null}
          onChange={(c, l) => { onChangeCity(c); onChangeLocation?.(l); }}
          fallback={() => legacyCity}
        />
      ) : (
        <>
          {legacyCity}
          {city && onChangeLocation && (
            <DisplayLevelSelect
              value={location?.displayLevel ?? "none"}
              onChange={(displayLevel) => onChangeLocation({ ...(location ?? {}), displayLevel })}
            />
          )}
        </>
      )}
    </div>
  );
}
