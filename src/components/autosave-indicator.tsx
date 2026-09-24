"use client";

import { Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { AutoSaveStatus } from "@/hooks/use-questionnaire-autosave";

/** État discret de la sauvegarde automatique, affiché à côté du bouton « Terminé ». */
export function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  const { t } = useI18n();
  if (status === "idle") return null;
  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{ color: status === "error" ? "#B4533A" : "#777777" }}
    >
      {status === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> {t("dashboard.autoSaving")}</>}
      {status === "saved" && <><Check className="w-3 h-3" style={{ color: "#486B46" }} /> {t("dashboard.autoSaved")}</>}
      {status === "error" && t("dashboard.autoSaveError")}
    </span>
  );
}
