"use client";

import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

/**
 * Barre « Étape X/3 » commune aux deux parcours. `step` est l'étape macro
 * affichée (1, 2 ou 3) — jamais un sous-écran interne (ex. les 4 écrans de
 * l'étape 3 : charte/photo/selfie/avatar restent comptés comme une seule étape).
 */
export function RegistrationProgress({ step, titleKey, subtitleKey }: {
  step: 1 | 2 | 3;
  titleKey: string;
  subtitleKey: string;
}) {
  const { t } = useI18n();
  const progress = (step / 3) * 100;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="space-y-3">
        <Progress value={progress} className="h-1.5 bg-foreground/5" />
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            {t("register.stepProgress", { step, total: 3 })}
          </span>
          <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">
            {t("register.percentComplete", { percent: Math.round(progress) })}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-headline font-bold text-foreground">{t(titleKey)}</h1>
        <p className="text-foreground/50 text-base">{t(subtitleKey)}</p>
      </div>
    </div>
  );
}
