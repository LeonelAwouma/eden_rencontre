// Avatars illustrés servis par l'API DiceBear (style « adventurer »).
//
// Auparavant générés en local via @dicebear/* sous forme de data-URI : on stocke
// désormais une URL de quelques dizaines d'octets dans avatar_url, au lieu d'une
// data-URI de plusieurs kilo-octets répétée dans chaque ligne de profil.

import { SITE_URL } from "@/lib/site";
import { normalizeGender } from "@/lib/verses";

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

// ── Avatars Eden ─────────────────────────────────────────────────
// Portraits illustrés propres au site, servis depuis public/avatars (WebP 512 px).
// avatar_url reçoit l'adresse relative (« /avatars/femme-1.webp ») : elle suit
// le domaine du site, aperçus Vercel compris.

const EDEN_AVATAR_COUNT = 5;

export const EDEN_AVATARS: Record<"homme" | "femme", string[]> = {
  homme: Array.from({ length: EDEN_AVATAR_COUNT }, (_, i) => `/avatars/homme-${i + 1}.webp`),
  femme: Array.from({ length: EDEN_AVATAR_COUNT }, (_, i) => `/avatars/femme-${i + 1}.webp`),
};

/** Avatars Eden proposés à un membre : ceux de son genre, ou tous si le genre est inconnu. */
export function edenAvatarsFor(gender?: string | null): string[] {
  const g = normalizeGender(gender);
  return g ? EDEN_AVATARS[g] : [...EDEN_AVATARS.femme, ...EDEN_AVATARS.homme];
}

/** Adresse absolue d'un avatar, pour les services externes (visioconférence…). */
export function absoluteAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("https://") || url.startsWith("http://")) return url;
  return url.startsWith("/") ? `${SITE_URL}${url}` : null;
}

// ── Chargement rapide des photos de profil ───────────────────────
// Les photos téléversées sont servies par Supabase Storage, parfois en pleine
// résolution (plusieurs Mo). On les fait passer par l'optimiseur d'images de
// Next.js : redimensionnées à la taille affichée, en WebP, mises en cache.
// Les avatars DiceBear (SVG vectoriels, déjà légers) restent tels quels.

const SUPABASE_PUBLIC_IMAGE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/.+\.(jpe?g|png|webp|avif|heic)(\?.*)?$/i;

const EDEN_AVATAR_IMAGE = /^\/avatars\/[a-z0-9-]+\.webp$/;

/** Vrai pour une photo Supabase ou un avatar Eden que Next.js peut redimensionner (pas les SVG DiceBear). */
export function canOptimizeImage(url?: string | null): boolean {
  return !!url && (SUPABASE_PUBLIC_IMAGE.test(url) || EDEN_AVATAR_IMAGE.test(url));
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
