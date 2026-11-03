"use client";

import { useState } from "react";
import { filterCountries, filterCities } from "@/lib/geo";

/**
 * Logique partagée du sélecteur pays → ville, réutilisée par le rendu étendu
 * de l'inscription (`country-city-inline.tsx`) et le rendu compact en popover
 * de l'édition de profil (`country-city-popover.tsx`). Ne connaît ni `region`
 * ni l'indicatif téléphonique : c'est à l'appelant d'enchaîner cette logique
 * dans `onChangeCountry` (voir `RegistrationProfileStep`).
 */
export function useCountryCityPicker({
  country,
  onChangeCountry,
  onChangeCity,
}: {
  country: string;
  onChangeCountry: (country: string) => void;
  onChangeCity: (city: string) => void;
}) {
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [cityMode, setCityMode] = useState<"search" | "manual">("search");

  const filteredCountries = country ? [] : filterCountries(null, countrySearch);
  const filteredCities = country ? filterCities(country, citySearch) : [];

  const selectCountry = (name: string) => {
    onChangeCountry(name);
    onChangeCity(""); // changer de pays réinitialise toujours la ville choisie
    setCitySearch("");
    setManualCity("");
    setCityMode("search");
  };

  const changeCountry = () => {
    onChangeCountry("");
    onChangeCity("");
    setCountrySearch("");
    setCitySearch("");
    setManualCity("");
    setCityMode("search");
  };

  const selectCity = (city: string) => {
    onChangeCity(city);
  };

  const startManualCity = () => setCityMode("manual");

  const confirmManualCity = () => {
    const value = manualCity.trim();
    if (!value) return; // jamais de valeur imposée silencieusement : il faut une saisie réelle
    onChangeCity(value);
  };

  const changeCity = () => {
    onChangeCity("");
    setCitySearch("");
    setManualCity("");
    setCityMode("search");
  };

  return {
    countrySearch, setCountrySearch,
    citySearch, setCitySearch,
    manualCity, setManualCity,
    cityMode,
    filteredCountries, filteredCities,
    selectCountry, changeCountry,
    selectCity, startManualCity, confirmManualCity, changeCity,
  };
}
