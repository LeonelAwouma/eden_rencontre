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

// ── Chargement rapide des photos de profil ───────────────────────
// Les photos téléversées sont servies par Supabase Storage, parfois en pleine
// résolution (plusieurs Mo). On les fait passer par l'optimiseur d'images de
// Next.js : redimensionnées à la taille affichée, en WebP, mises en cache.
// Les avatars DiceBear (SVG vectoriels, déjà légers) restent tels quels.

const SUPABASE_PUBLIC_IMAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/.+\.(jpe?g|png|webp|avif|heic)(\?.*)?$/i;

/** Vrai pour une photo Supabase que Next.js peut redimensionner (pas les SVG DiceBear). */
export function canOptimizeImage(url?: string | null): boolean {
  return !!url && SUPABASE_PUBLIC_IMAGE.test(url);
}

/**
 * URL optimisée pour une photo affichée par un <img> simple (avatar, prévisualisation).
 * `width` doit faire partie des tailles de Next.js (imageSizes / deviceSizes) :
 * 64, 128, 256 pour les petits avatars ; 1080 pour la prévisualisation agrandie.
 */
export function avatarSrc(url?: string | null, width: 64 | 128 | 256 | 1080 = 128): string | undefined {
  if (!url) return undefined;
  return canOptimizeImage(url) ? `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75` : url;
}
