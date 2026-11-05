"use client";

import { useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { localize, type AnnouncementView } from "@/lib/whats-new";
import { NewBadge } from "./new-badge";
import type { AnnouncementsApi } from "./use-announcements";

/**
 * La carte « Nouveauté » — UN seul composant pour toutes les annonces. Il ne connaît
 * que `AnnouncementView` : annoncer une fonctionnalité ne demande jamais d'en écrire
 * un autre, seulement d'ajouter une entrée au registre (src/lib/whats-new.ts).
 *
 *  - `card`  : accueil membre / administrateur. Compacte sur mobile (texte limité à
 *    deux lignes, bouton sous le texte), en rangée dès `sm`.
 *  - `strip` : bandeau fin des visiteurs, une seule ligne.
 *
 * Toujours dans le flux de la page (jamais `position: fixed`) : elle ne peut donc
 * recouvrir ni la barre inférieure ni un champ de saisie.
 */

export type AnnouncementVariant = "card" | "strip";

interface CardProps {
  announcement: AnnouncementView;
  variant?: AnnouncementVariant;
  onDiscover?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onDismiss: () => void;
  /** Appelé une fois que la carte est réellement montée (comptage d'un affichage). */
  onShown?: () => void;
}

export function AnnouncementCard({ announcement, variant = "card", onDiscover, onDismiss, onShown }: CardProps) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const copy = localize(announcement, locale);
  const cta = copy.cta || t("whatsNew.discover");

  // Un affichage compté une fois par annonce montée (et par session, garde dans trackView).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onShown?.(); }, [announcement.id]);

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.2 },
      };

  const closeButton = (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={t("whatsNew.close")}
      className={cn(
        "absolute top-0 right-0 w-11 h-11 flex items-center justify-center rounded-full text-[#6B746E]",
        "hover:text-[#1C241F] hover:bg-black/5 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45",
      )}
    >
      <X className="w-4 h-4" aria-hidden="true" />
    </button>
  );

  if (variant === "strip") {
    return (
      <motion.section
        {...motionProps}
        role="region"
        aria-label={t("whatsNew.regionLabel")}
        className="relative w-full border-b border-[#C6D4C0] bg-[#EEF5EC] pr-12"
      >
        <div className="mx-auto flex min-h-[44px] max-w-7xl items-center gap-2.5 px-4 py-1.5 sm:px-6">
          <Sparkles className="hidden w-4 h-4 shrink-0 text-[#C6A15B] min-[360px]:block" aria-hidden="true" />
          <NewBadge />
          <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#1C241F] sm:text-[13px]">
            {copy.title}
            <span className="ml-2 hidden font-normal text-[#4A564F] lg:inline">{copy.description}</span>
          </p>
          <Link
            href={announcement.href}
            onClick={onDiscover}
            className="shrink-0 text-[12.5px] font-bold text-[#28543C] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 rounded"
          >
            {cta}
          </Link>
        </div>
        {closeButton}
      </motion.section>
    );
  }

  return (
    <motion.section
      {...motionProps}
      role="region"
      aria-label={t("whatsNew.regionLabel")}
      className="relative overflow-hidden rounded-2xl border border-[#C6D4C0] bg-gradient-to-br from-[#EEF5EC] to-[#FAF9F6] p-3.5 pr-12 sm:p-4 sm:pr-12"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#28543C] text-white" aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <NewBadge />
              <h3 className="font-headline text-[16px] font-bold leading-tight text-[#1C241F] sm:text-[17px]">{copy.title}</h3>
            </div>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[#4A564F] sm:text-[13px]">{copy.description}</p>
          </div>

          <Link
            href={announcement.href}
            onClick={onDiscover}
            className={cn(
              "mt-2.5 inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#28543C] px-5 text-[13px] font-bold text-white sm:mt-0",
              "transition-colors hover:bg-[#1F4430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3F704D]/45 focus-visible:ring-offset-2",
            )}
          >
            {cta}
          </Link>
        </div>
      </div>
      {closeButton}
    </motion.section>
  );
}

/**
 * Affiche la carte courante d'un jeu d'annonces. `suppressed` la retire sans la
 * « consommer » (écran immersif, bandeau concurrent) : elle réapparaît ensuite.
 */
export function AnnouncementSlot({
  api, variant = "card", suppressed = false, onDiscover, className,
}: {
  api: AnnouncementsApi;
  variant?: AnnouncementVariant;
  suppressed?: boolean;
  onDiscover?: (announcement: AnnouncementView, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  const { card, dismiss, discover, trackView } = api;
  const shown = suppressed ? null : card;

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {shown && (
          <AnnouncementCard
            key={shown.id}
            announcement={shown}
            variant={variant}
            onShown={() => trackView(shown.id)}
            onDismiss={() => dismiss(shown.id)}
            onDiscover={(event) => {
              discover(shown.id, true);
              onDiscover?.(shown, event);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
