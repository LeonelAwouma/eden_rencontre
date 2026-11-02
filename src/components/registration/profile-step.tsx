"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ChevronLeft, Search, MapPin, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ageFromBirthDate, MIN_AGE } from "@/lib/auth";
import { filterCountries, filterCities, countryLabel, phoneIsoFor, findCountry, toE164, dialOfIso } from "@/lib/geo";
import { PhoneInput } from "@/components/phone-input";
import { Flag } from "@/components/flag";
import { BirthDateInput } from "@/components/registration/birth-date-input";
import { EDEN_SOLID_BUTTON } from "@/components/garden/button-styles";
import type { RegistrationFormData, RegistrationMode } from "@/components/registration/types";

const CIVIL_STATUS_KEYS = ["register.single", "register.widowed", "register.divorced"] as const;

/**
 * Étape 2 — Mon profil essentiel : tout sur un seul écran (une seule recherche
 * de géo pour pays+ville, pas d'écran région Afrique/Diaspora séparé — la
 * région se déduit automatiquement du pays choisi). Identique pour les deux
 * parcours, à l'exception de prénom/nom (masqués côté Google, déjà fournis par
 * le fournisseur et laissés privés).
 */
export function RegistrationProfileStep({
  mode,
  formData,
  setFormData,
  onContinue,
  onBack,
}: {
  mode: RegistrationMode;
  formData: Pick<RegistrationFormData, "firstName" | "lastName" | "gender" | "birthDate" | "civilStatus" | "country" | "city" | "phoneIso" | "phoneLocal">;
  setFormData: (patch: Partial<RegistrationFormData>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const age = ageFromBirthDate(formData.birthDate);
  const ageValid = age !== null && age >= MIN_AGE;

  const filteredCountries = formData.country ? [] : filterCountries(null, countrySearch);
  const filteredCities = formData.country ? filterCities(formData.country, citySearch) : [];

  const selectCountry = (country: string) => {
    setFormData({ country, city: "", region: findCountry(country)?.region ?? "", phoneIso: phoneIsoFor(country) });
    setCitySearch("");
  };

  const phoneValid = !!toE164(dialOfIso(formData.phoneIso), formData.phoneLocal);
  const canContinue =
    (mode === "google" || (formData.firstName.trim() && formData.lastName.trim())) &&
    !!formData.gender &&
    ageValid &&
    !!formData.civilStatus &&
    !!formData.country &&
    !!formData.city &&
    phoneValid;

  return (
    <div className="space-y-7">
      {mode === "classic" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.firstNameLabel")}</Label>
            <Input
              autoFocus
              placeholder={t("register.firstNamePlaceholder")}
              value={formData.firstName}
              onChange={(e) => setFormData({ firstName: e.target.value })}
              className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("register.lastNameLabel")}</Label>
            <Input
              placeholder={t("register.lastNamePlaceholder")}
              value={formData.lastName}
              onChange={(e) => setFormData({ lastName: e.target.value })}
              className="h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20 focus:border-primary focus-visible:ring-primary/30"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("registrationV2.genderLabel")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ gender: "homme" })}
            className={cn(
              "h-16 rounded-xl border-2 flex items-center justify-center gap-2 transition-all font-bold",
              formData.gender === "homme" ? "bg-primary/10 border-primary text-primary" : "bg-card border-foreground/5 text-foreground/60 hover:border-primary/50"
            )}
          >
            <span className="text-2xl">👦</span> {t("register.male")}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ gender: "femme" })}
            className={cn(
              "h-16 rounded-xl border-2 flex items-center justify-center gap-2 transition-all font-bold",
              formData.gender === "femme" ? "bg-primary/10 border-primary text-primary" : "bg-card border-foreground/5 text-foreground/60 hover:border-primary/50"
            )}
          >
            <span className="text-2xl">👧</span> {t("register.female")}
          </button>
        </div>
      </div>

      <BirthDateInput valueIso={formData.birthDate} onChangeIso={(birthDate) => setFormData({ birthDate })} />

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("registrationV2.civilStatusLabel")}</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CIVIL_STATUS_KEYS.map((key) => {
            const label = t(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFormData({ civilStatus: label })}
                className={cn(
                  "h-14 rounded-xl border-2 text-sm font-bold transition-all",
                  formData.civilStatus === label ? "bg-primary/10 border-primary text-primary" : "bg-card border-foreground/5 text-foreground/60 hover:border-primary/50"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-foreground/60">{t("registrationV2.locationLabel")}</Label>
        {formData.country ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="flex items-center gap-2 font-bold text-foreground">
                <Flag iso={findCountry(formData.country)?.iso ?? ""} /> {formData.country}
              </span>
              <button type="button" onClick={() => setFormData({ country: "", city: "" })} className="text-xs font-semibold text-primary underline underline-offset-2">
                {t("register.back")}
              </button>
            </div>
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
              {filteredCities.map((city) => (
                <Button
                  key={city}
                  type="button"
                  variant="outline"
                  onClick={() => setFormData({ city })}
                  className={cn("h-12 rounded-xl text-sm font-bold text-left justify-start px-4",
                    formData.city === city ? "border-primary bg-primary/10 text-primary" : "border-foreground/5 bg-card text-foreground/70 hover:border-primary/50")}
                >
                  <MapPin className="w-4 h-4 mr-2 shrink-0" /> <span className="truncate">{city}</span>
                  {formData.city === city && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({ city: citySearch || "Autre" })}
                className="h-12 rounded-xl text-sm font-bold text-left justify-start px-4 italic border-foreground/5 bg-card text-foreground/40"
              >
                <Plus className="w-4 h-4 mr-2 shrink-0" /> {t("register.enterCity", { city: citySearch || t("register.otherCity") })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20 w-5 h-5" />
              <Input
                autoFocus={mode === "google"}
                placeholder={t("registrationV2.countryPlaceholder")}
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                className="pl-12 h-14 bg-card border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2">
              {filteredCountries.map((country) => (
                <Button
                  key={country.name}
                  type="button"
                  variant="outline"
                  onClick={() => selectCountry(country.name)}
                  className="h-12 rounded-xl border-foreground/5 bg-card hover:border-primary/50 text-sm font-bold text-foreground/70 text-left justify-start px-4"
                >
                  <Flag iso={country.iso} className="mr-2" /> <span className="truncate">{countryLabel(country, locale)}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <PhoneInput
        iso={formData.phoneIso}
        local={formData.phoneLocal}
        onIso={(phoneIso) => setFormData({ phoneIso })}
        onLocal={(phoneLocal) => setFormData({ phoneLocal })}
      />

      <Button
        onClick={onContinue}
        disabled={!canContinue}
        className={cn("w-full h-14 text-base disabled:opacity-50", EDEN_SOLID_BUTTON)}
      >
        {t("register.continue")} <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
      <button type="button" onClick={onBack} className="w-full flex items-center justify-center gap-2 text-sm text-foreground/30 hover:text-primary transition-colors py-2">
        <ChevronLeft className="w-4 h-4" /> {t("register.back")}
      </button>
    </div>
  );
}
