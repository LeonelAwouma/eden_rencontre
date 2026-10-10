/**
 * Texture unique des boutons pleins des pages publiques : celle de
 * « Commencer gratuitement » (PromoBanner). Pilule vert foncé, texte blanc
 * semi-gras, ombre douce teintée, simple fondu au survol.
 *
 * Toujours l'ajouter EN DERNIER dans cn(…) : tailwind-merge écarte alors les
 * classes en conflit (rounded-xl, font-black, shadow-xl, bg-primary du
 * <Button> shadcn…). Une classe CSS de @layer components ne suffirait pas :
 * les utilitaires du <Button> passent après et l'emportent.
 * Seules la taille et la largeur restent propres à chaque bouton.
 */
export const EDEN_SOLID_BUTTON =
  "rounded-full bg-deep-eden text-white font-semibold shadow-lg shadow-deep-eden/20 transition-colors hover:bg-deep-eden/90";
