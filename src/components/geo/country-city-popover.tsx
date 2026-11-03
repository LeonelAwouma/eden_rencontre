"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Globe, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { countryLabel, findCountry } from "@/lib/geo";
import { Flag } from "@/components/flag";
import { useCountryCityPicker } from "./use-country-city-picker";

const TRIGGER_CLASS =
  "w-full flex items-center gap-2 border border-[#E0DDD8] rounded-xl px-4 py-2.5 text-sm text-left bg-white hover:border-[#486B46] focus:outline-none focus:border-[#486B46] focus:ring-2 focus:ring-[#486B46]/20";

/**
 * Rendu compact (popover) du sélecteur pays → ville pour l'édition de profil
 * — une pastille-bouton par champ, cohérente avec les autres champs resserrés
 * de cette page. Se ferme automatiquement dès qu'une valeur est choisie
 * (même idiome `open`/`onOpenChange` que `BirthDateInput`).
 */
export function CountryCityPicker({
  country,
  city,
  onChangeCountry,
  onChangeCity,
}: {
  country: string;
  city: string;
  onChangeCountry: (country: string) => void;
  onChangeCity: (city: string) => void;
}) {
  const { t, locale } = useI18n();
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const {
    countrySearch, setCountrySearch, citySearch, setCitySearch, manualCity, setManualCity,
    cityMode, filteredCountries, filteredCities,
    selectCountry, selectCity, startManualCity, confirmManualCity,
  } = useCountryCityPicker({ country, onChangeCountry, onChangeCity });

  return (
    <>
      <div>
        <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider mb-1 block">{t("profilePage.country")}</label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={TRIGGER_CLASS}>
              {country ? (
                <><Flag iso={findCountry(country)?.iso ?? ""} /> <span className="truncate">{country}</span></>
              ) : (
                <><Globe size={16} className="text-[#777777]" /> <span className="text-[#777777]">{t("geo.selectCountryPrompt")}</span></>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            <Input
              autoFocus
              placeholder={t("registrationV2.countryPlaceholder")}
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="h-10 mb-2"
            />
            <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredCountries.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { selectCountry(c.name); setCountryOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-[#F5F3F0]"
                >
                  <Flag iso={c.iso} /> <span className="truncate">{countryLabel(c, locale)}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider mb-1 block">{t("profilePage.city")}</label>
        <Popover
          open={cityOpen}
          onOpenChange={(next) => {
            setCityOpen(next && !!country);
          }}
        >
          <PopoverTrigger asChild>
            <button type="button" disabled={!country} className={`${TRIGGER_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {city ? (
                <><MapPin size={16} className="text-[#486B46] shrink-0" /> <span className="truncate">{city}</span></>
              ) : (
                <><MapPin size={16} className="text-[#777777]" /> <span className="text-[#777777]">{t("geo.selectCityPrompt")}</span></>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-3">
            {cityMode === "manual" ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder={t("geo.manualCityPlaceholder")}
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  className="h-10"
                />
                <button
                  type="button"
                  disabled={!manualCity.trim()}
                  onClick={() => { confirmManualCity(); setCityOpen(false); }}
                  className="w-full h-9 rounded-lg border border-[#486B46]/50 text-[#486B46] text-sm font-bold disabled:opacity-40"
                >
                  {t("geo.confirmCity")}
                </button>
              </div>
            ) : (
              <>
                <Input
                  autoFocus
                  placeholder={t("registrationV2.cityPlaceholder")}
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="h-10 mb-2"
                />
                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { selectCity(c); setCityOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-[#F5F3F0]"
                    >
                      <MapPin size={14} className="shrink-0" /> <span className="truncate">{c}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startManualCity}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left italic text-[#777777] hover:bg-[#F5F3F0]"
                  >
                    <Plus size={14} className="shrink-0" /> {t("geo.cityNotListed")}
                  </button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
