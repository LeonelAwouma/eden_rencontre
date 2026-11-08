"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, RefreshCw } from "lucide-react";
import { logout } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Monogram } from "@/components/ornaments";

/**
 * Affiché par le layout serveur quand l'accès ne peut pas être vérifié (panne de lecture) : ni accès par défaut,
 * ni déconnexion automatique. « Réessayer » rejoue la garde serveur (`router.refresh()`).
 */
export function CoachUnavailable() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-5">
      <div role="alert" className="w-full max-w-md rounded-3xl border border-[#E6EAE5] bg-white p-8 text-center space-y-5 shadow-sm">
        <Monogram className="w-11 h-9 text-primary mx-auto" />
        <h1 className="font-headline text-2xl font-bold text-[#1C241F]">{t("coachCommon.gateErrorTitle")}</h1>
        <p className="text-sm text-[#56615A]">{t("coachCommon.gateErrorDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => router.refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F4D3A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173b2d]">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> {t("coachCommon.retry")}
          </button>
          <button type="button" disabled={busy}
            onClick={async () => { setBusy(true); await logout(); router.replace("/login"); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E6EAE5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1C241F] hover:bg-[#F0F4EF] disabled:opacity-60">
            <LogIn className="w-4 h-4" aria-hidden="true" /> {t("coachCommon.reconnect")}
          </button>
        </div>
      </div>
    </div>
  );
}
