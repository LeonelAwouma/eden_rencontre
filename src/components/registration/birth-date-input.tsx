"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, CalendarIcon, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  maskBirthDateInput,
  formatBirthDateDisplay,
  validateBirthDateDisplay,
  type BirthDateErrorKey,
} from "@/lib/birth-date";
import { ageFromBirthDate } from "@/lib/auth";
import { MIN_REGISTRATION_AGE } from "@/lib/registration-rules";

const ERROR_KEY_TO_I18N: Record<Exclude<BirthDateErrorKey, null>, string> = {
  incomplete: "birthDate.errorIncomplete",
  invalidDate: "birthDate.errorInvalidDate",
  future: "birthDate.errorFuture",
  tooYoung: "birthDate.errorTooYoung",
  implausibleYear: "birthDate.errorImplausibleYear",
};

/**
 * Date de naissance saisie au clavier au format JJ/MM/AAAA (jamais de défilement
 * d'années obligatoire), avec un calendrier en alternative secondaire. Reçoit et
 * émet l'ISO (AAAA-MM-JJ) : le format d'affichage ne fuite jamais vers le parent,
 * donc la reprise de brouillon (formData.birthDate) n'a pas besoin de changer de
 * forme. N'importe jamais de calcul d'âge dupliqué — tout passe par
 * registration-rules.ts (isRealBirthDateIso / isAdultBirthDate) via birth-date.ts.
 */
export function BirthDateInput({
  valueIso,
  onChangeIso,
  autoFocus,
}: {
  valueIso: string;
  onChangeIso: (iso: string) => void;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const [display, setDisplay] = useState(() => formatBirthDateDisplay(valueIso));
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);

  // Hydratation depuis l'extérieur (reprise de brouillon, préremplissage Google) :
  // ne réécrit l'affichage local que si la valeur externe a changé sous nos pieds.
  useEffect(() => {
    setDisplay(formatBirthDateDisplay(valueIso));
  }, [valueIso]);

  const validation = display.length > 0 ? validateBirthDateDisplay(display) : null;
  const showError = touched && display.length > 0 && validation && !validation.ok && validation.errorKey !== "incomplete";
  const age = valueIso ? ageFromBirthDate(valueIso) : null;

  const applyDisplay = (next: string) => {
    setDisplay(next);
    const result = next.length === 10 ? validateBirthDateDisplay(next) : null;
    // Règle anti-valeur-fantôme : on ne garde jamais silencieusement l'ancien ISO
    // quand la saisie affichée devient incomplète ou invalide.
    onChangeIso(result?.ok ? result.iso! : "");
  };

  const currentYear = new Date().getUTCFullYear();

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-xs font-bold uppercase tracking-widest text-foreground/60">
        {t("birthDate.label")}
      </Label>
      <div className="relative">
        <input
          id={inputId}
          autoFocus={autoFocus}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="JJ/MM/AAAA"
          value={display}
          onChange={(e) => applyDisplay(maskBirthDateInput(e.target.value))}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (!pasted) return;
            e.preventDefault();
            applyDisplay(maskBirthDateInput(pasted));
          }}
          onBlur={() => setTouched(true)}
          aria-describedby={`${inputId}-example ${showError ? `${inputId}-error` : ""}`.trim()}
          aria-invalid={showError || undefined}
          className={cn(
            "w-full h-14 pl-4 pr-24 rounded-xl border bg-card text-base text-foreground placeholder:text-foreground/20 outline-none focus:ring-2",
            showError ? "border-destructive/50 focus:ring-destructive/20" : "border-foreground/10 focus:border-primary focus:ring-primary/30"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {validation?.ok && <CheckCircle2 className="w-5 h-5 text-primary" />}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("birthDate.openCalendar")}
                className="h-9 w-9 text-foreground/40 hover:text-foreground"
              >
                <CalendarIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                fromYear={currentYear - 100}
                toYear={currentYear - MIN_REGISTRATION_AGE}
                defaultMonth={valueIso ? new Date(`${valueIso}T00:00:00Z`) : new Date(currentYear - 30, 0, 1)}
                selected={valueIso ? new Date(`${valueIso}T00:00:00Z`) : undefined}
                onSelect={(date) => {
                  if (!date) return;
                  const iso = `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
                  setTouched(true);
                  setDisplay(formatBirthDateDisplay(iso));
                  onChangeIso(iso);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {showError ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {t(ERROR_KEY_TO_I18N[validation!.errorKey as Exclude<BirthDateErrorKey, null>], { minAge: MIN_REGISTRATION_AGE })}
        </p>
      ) : validation?.ok && age !== null ? (
        <p className="text-[11px] text-foreground/30 uppercase tracking-widest">{t("birthDate.ageYears", { age })}</p>
      ) : (
        <p id={`${inputId}-example`} className="text-[11px] text-foreground/30">{t("birthDate.example")}</p>
      )}
    </div>
  );
}
