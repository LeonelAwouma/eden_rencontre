"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ageFromBirthDate, MIN_AGE } from "@/lib/auth";
import { phoneIsoFor, findCountry, toE164, dialOfIso } from "@/lib/geo";
import { PhoneInput } from "@/components/phone-input";
import { BirthDateInput } from "@/components/registration/birth-date-input";
import { CountryCityInline } from "@/components/geo/country-city-inline";
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
  const { t } = useI18n();

  const age = ageFromBirthDate(formData.birthDate);
  const ageValid = age !== null && age >= MIN_AGE;

  const onChangeCountry = (country: string) => {
    if (!country) { setFormData({ country: "", region: "" }); return; }
    setFormData({ country, region: findCountry(country)?.region ?? "", phoneIso: phoneIsoFor(country) });
  };

  const phoneE164 = toE164(dialOfIso(formData.phoneIso), formData.phoneLocal);
  const phoneValid = !!phoneE164;

  // Un numéro = un compte : alerte anticipée (la soumission finale tranche si la vérification échoue).
  const [phoneTaken, setPhoneTaken] = useState(false);
  useEffect(() => {
    setPhoneTaken(false);
    if (!phoneE164 || mode !== "classic") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneE164 }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.available === false) setPhoneTaken(true);
      } catch { /* la soumission tranchera */ }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [phoneE164, mode]);

  const canContinue =
    !phoneTaken &&
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
        <CountryCityInline
          country={formData.country}
          city={formData.city}
          autoFocusCountry={mode === "google"}
          onChangeCountry={onChangeCountry}
          onChangeCity={(city) => setFormData({ city })}
        />
      </div>

      <PhoneInput
        iso={formData.phoneIso}
        local={formData.phoneLocal}
        onIso={(phoneIso) => setFormData({ phoneIso })}
        onLocal={(phoneLocal) => setFormData({ phoneLocal })}
      />
      {phoneTaken && (
        <p role="alert" className="-mt-4 text-sm text-destructive">{t("register.phoneTaken")}</p>
      )}

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
