import { createAvatar } from "@dicebear/core";
import * as personas from "@dicebear/personas";
import * as notionistsNeutral from "@dicebear/notionists-neutral";

// Génération locale d'avatars illustrés (aucun appel réseau) — utilisée comme
// alternative à une vraie photo pour l'image publique du profil (avatar_url).

export type AvatarStyle = "personas" | "notionists-neutral";

export const AVATAR_STYLES: { id: AvatarStyle; label: string }[] = [
  { id: "personas", label: "Personas" },
  { id: "notionists-neutral", label: "Notionists" },
];

const STYLE_MODULES: Record<AvatarStyle, any> = {
  personas,
  "notionists-neutral": notionistsNeutral,
};

// Palette de fond alignée sur la direction artistique Eden (crème / sauge)
const BACKGROUND_COLORS = ["f5f1e8", "eef5ec", "dce8d5", "ffffff"];

export function generateAvatarDataUri(style: AvatarStyle, seed: string): string {
  return createAvatar(STYLE_MODULES[style], {
    seed,
    backgroundColor: BACKGROUND_COLORS,
  }).toDataUri();
}

export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
