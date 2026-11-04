"use client";

import Link from "next/link";
import { ArrowLeft, Bell, LifeBuoy, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Monogram } from "@/components/ornaments";
import { avatarSrc } from "@/lib/avatar";
import { SUPPORT_WHATSAPP_URL } from "@/lib/contact";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMemberChrome } from "./member-chrome";

const iconButton = cn(
  "relative w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
);

/**
 * En-tête compact unique de l'espace membre (remplace cinq variantes : h-16/z-30,
 * h-16/z-40, h-20/z-50, py-4/z-30 et l'absence d'en-tête).
 *
 * Aucun hamburger ici : sur mobile le Menu est dans la barre inférieure, et en
 * lg+ la sidebar est toujours visible. C'est ce qui supprime le doublon d'accès
 * au tiroir.
 */
export function MemberHeader() {
  const { t } = useI18n();
  const { header, immersive, displayInitial, avatarUrl, badges, activeTab, goToTab } = useMemberChrome();

  if (immersive || header.hidden) return null;

  const { notifCount } = badges;
  const notificationsActive = activeTab === "Notifications";
  const notifLabel = notifCount > 0
    ? `${t("dashboardTabs.notifications")} (${notifCount})`
    : t("dashboardTabs.notifications");

  return (
    <header
      className="sticky top-0 z-30 border-b border-[#E6EAE5] bg-[#FAF9F6]/90 backdrop-blur-xl"
      style={{ height: "var(--member-header-h)" }}
    >
      <div className="h-full max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {header.backHref && (
            <Link
              href={header.backHref}
              aria-label={t("memberNav.back")}
              className={cn(iconButton, "-ml-2 shrink-0 text-[#1C241F] hover:bg-[#F0F4EF]")}
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
          )}

          {/* Mobile, sans titre de sous-page : marque. Desktop : titre de la page. */}
          {header.title ? (
            <h1 className="font-headline text-[20px] lg:text-[26px] font-bold leading-none text-[#1C241F] truncate">
              {header.title}
            </h1>
          ) : (
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0 lg:hidden">
              <Monogram className="w-8 h-7 text-[#1F4D3A] shrink-0" />
              <span className="font-headline text-[19px] font-bold text-[#1C241F] truncate">
                Garden <span className="italic font-medium text-[#3F704D]">of Alliance</span>
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {activeTab !== "Premium" && (
            <button
              type="button"
              onClick={() => goToTab("Premium")}
              className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[13px] font-semibold text-[#3F704D] hover:bg-[#F0F4EF] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45"
            >
              <Zap className="w-4 h-4 text-[#C6A15B]" aria-hidden="true" /> {t("dashboard.boost")}
            </button>
          )}

          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("dashboard.support")}
            title={t("dashboard.support")}
            className={cn(iconButton, "hidden sm:flex text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]")}
          >
            <LifeBuoy className="w-5 h-5" aria-hidden="true" />
          </a>

          <button
            type="button"
            onClick={() => goToTab("Notifications")}
            aria-label={notifLabel}
            className={cn(
              iconButton,
              notificationsActive ? "bg-[#EEF5EE] text-[#28543C]" : "text-[#4A564F] hover:bg-[#F0F4EF] hover:text-[#1C241F]"
            )}
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {notifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center bg-[#28543C] text-white ring-2 ring-[#FAF9F6] tabular-nums">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </button>

          {/* « Profil » n'a qu'une cible : le profil complet (parcours de foi inclus). */}
          <Link
            href="/dashboard/profile"
            aria-label={t("dashboard.myAccount")}
            className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 focus-visible:ring-offset-2"
          >
            <Avatar className="w-9 h-9 ring-1 ring-[#E6EAE5]">
              <AvatarImage src={avatarSrc(avatarUrl)} alt="" />
              <AvatarFallback className="bg-[#EEF5EE] text-[#28543C] font-semibold">{displayInitial}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
