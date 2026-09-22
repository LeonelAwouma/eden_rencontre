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
 * ce qui viderait de son sens une grille de sélection.
 *
 * Il doit être OPAQUE (voir randomAvatarSeed) : il est envoyé à DiceBear et
 * reste lisible dans l'URL de l'avatar, affichée publiquement aux autres
 * membres. Ne jamais y mettre un pseudo, un nom ou un e-mail.
 */
export function buildAvatarUrl(seed: string): string {
  return `${DICEBEAR_ENDPOINT}?seed=${encodeURIComponent(seed)}&backgroundColor=${BACKGROUND_COLORS.join(",")}`;
}

/** Graine aléatoire de 10 caractères, sans lien avec l'identité du membre. */
export function randomAvatarSeed(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
}
