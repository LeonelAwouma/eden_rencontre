// Avatars illustrés servis par l'API DiceBear (style « adventurer »).
//
// Auparavant générés en local via @dicebear/* sous forme de data-URI : on stocke
// désormais une URL de quelques dizaines d'octets dans avatar_url, au lieu d'une
// data-URI de plusieurs kilo-octets répétée dans chaque ligne de profil.

const DICEBEAR_ENDPOINT = "https://api.dicebear.com/10.x/adventurer/svg";

// Fonds alignés sur la direction artistique Eden (crème / sauge).
// DiceBear en choisit un de façon déterministe à partir du seed.
const BACKGROUND_COLORS = ["f5f1e8", "eef5ec", "dce8d5", "ffffff"];

/**
 * URL de l'avatar pour un seed donné.
 *
 * Le seed est indispensable : sans lui l'API renvoie toujours le même visage,
 * ce qui viderait de son sens une grille de sélection. Il peut contenir un
 * pseudo ou un e-mail, d'où l'encodage.
 */
export function buildAvatarUrl(seed: string): string {
  return `${DICEBEAR_ENDPOINT}?seed=${encodeURIComponent(seed)}&backgroundColor=${BACKGROUND_COLORS.join(",")}`;
}

export function randomAvatarSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
