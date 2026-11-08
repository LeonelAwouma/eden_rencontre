"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_LABELS, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CoachSidebar } from "./coach-sidebar";
import { useCoachChrome } from "./coach-chrome";

/** Bascule FR / EN du tiroir. */
function LanguageToggle() {
  const { t, locale, setLocale } = useI18n();
  return (
    <div className="flex items-center gap-2 px-2" role="group" aria-label={t("coachNav.language")}>
      <Globe className="w-[18px] h-[18px] text-[#6B746E] shrink-0" aria-hidden="true" />
      <div className="flex flex-1 rounded-lg bg-[#F0F4EF] p-0.5">
        {LOCALES.map((loc) => (
          <button key={loc} type="button" onClick={() => setLocale(loc)} aria-pressed={locale === loc}
            className={cn(
              "flex-1 min-h-[40px] rounded-md text-[13px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45",
              locale === loc ? "bg-white text-[#28543C] shadow-sm" : "text-[#4A564F]"
            )}>
            {LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Tiroir mobile de l'espace Coach (Radix Dialog : Échap, clic extérieur, piège de focus, aria-modal). */
export function CoachDrawer() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { menuOpen, setMenuOpen } = useCoachChrome();
  const close = () => setMenuOpen(false);

  // Toute navigation (y compris retour arrière) ferme le tiroir.
  useEffect(() => { setMenuOpen(false); }, [pathname, setMenuOpen]);

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#1C241F]/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-[60] w-[288px] max-w-[86vw] shadow-[8px_0_32px_rgba(20,40,30,0.12)] outline-none lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:duration-200 data-[state=open]:duration-200"
        >
          <Dialog.Title className="sr-only">{t("coachNav.navLabel")}</Dialog.Title>
          <CoachSidebar variant="drawer" onClose={close} footer={<LanguageToggle />} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
