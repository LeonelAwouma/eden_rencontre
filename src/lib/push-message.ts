// Texte des notifications push de messages privés (fonctions pures, testables).

import { findSticker } from "@/lib/forum-shared";

export interface MessageLike {
  content?: string | null;
  image_url?: string | null;
  sticker?: string | null;
}

/** Corps de la notification : texte, sinon sticker, sinon photo. */
export function messagePreview(m: MessageLike, locale: "fr" | "en"): string {
  const text = (m.content || "").trim();
  if (text) return text;
  const sticker = findSticker(m.sticker);
  if (sticker) return `${sticker.char} Sticker`;
  if (m.sticker) return "Sticker";
  if (m.image_url) return "📷 Photo";
  return locale === "en" ? "New message" : "Nouveau message";
}

/** Version affichée quand le membre a masqué l'aperçu sur cet appareil : ni nom, ni contenu. */
export function genericMessageNotice(locale: "fr" | "en"): { title: string; body: string } {
  return {
    title: "Garden of Alliance",
    body: locale === "en" ? "You have received a new message." : "Vous avez reçu un nouveau message.",
  };
}
