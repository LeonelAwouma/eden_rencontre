"use client";

import Link from "next/link";
import { CoachAvatar } from "./coach-avatar";
import { Monogram } from "@/components/ornaments";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { useCoachChrome } from "./coach-chrome";
import { CoachNotificationsBell } from "./coach-notifications-bell";

/** En-tête compact : marque (mobile), notifications, langue, accès au profil. Le tiroir est dans la barre basse. */
export function CoachHeader() {
  const { t } = useI18n();
  const { initial, coach } = useCoachChrome();
  return (
    <header className="sticky top-0 z-30 border-b border-[#E6EAE5] bg-[#FAF9F6]/90 backdrop-blur-xl" style={{ height: "var(--member-header-h)" }}>
      <div className="h-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
        <Link href="/coach" className="flex items-center gap-2 min-w-0 lg:invisible">
          <Monogram className="w-8 h-7 text-[#1F4D3A] shrink-0" />
          <span className="font-headline text-[19px] font-bold text-[#1C241F] truncate">
            Garden <span className="italic font-medium text-[#3F704D]">of Alliance</span>
          </span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <LanguageSwitcher />
          <CoachNotificationsBell />
          <Link href="/coach/profile" aria-label={t("coachNav.profile")}
            className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 focus-visible:ring-offset-2">
            <CoachAvatar url={coach.avatarUrl} name={coach.name || initial} className="ring-1 ring-[#E6EAE5]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
