"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";

export interface LightboxPhoto {
  url: string;
  name: string;
}

/**
 * Prévisualisation agrandie d'une photo de profil.
 * Fond assombri, photo centrée à ses proportions d'origine (jamais déformée),
 * fermeture par le bouton, un clic hors de la photo ou la touche Échap,
 * ouverture et fermeture en fondu discret.
 */
export function PhotoLightbox({ photo, onClose, closeLabel = "Fermer" }: {
  photo: LightboxPhoto | null;
  onClose: () => void;
  closeLabel?: string;
}) {
  const reduced = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Pas de défilement de la page derrière la prévisualisation.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.(); // retour sur la petite photo cliquée
    };
  }, [photo, onClose]);

  const fade = { duration: reduced ? 0 : 0.2 };

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          key="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={photo.name}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm"
          style={{ background: "rgba(22, 28, 24, 0.72)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          onClick={onClose}
        >
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.figure
            className="flex flex-col items-center m-0"
            initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc(photo.url, 1080)}
              alt={photo.name}
              className="block w-auto h-auto max-w-[min(92vw,720px)] max-h-[78vh] object-contain rounded-2xl shadow-2xl bg-white/5"
            />
            <figcaption className="mt-3 font-headline text-lg font-bold text-white text-center">{photo.name}</figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
