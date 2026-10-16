"use client";

/**
 * Photos d'inscription : réduites dans le navigateur avant l'envoi.
 *
 * Les formulaires d'inscription envoient les photos de profil et le selfie en
 * data URI dans le JSON. Une photo de téléphone pèse 3 à 8 Mo (un tiers de plus
 * en base64) : trois photos + un selfie dépassaient la limite de 4,5 Mo des
 * fonctions Vercel (erreur 413 FUNCTION_PAYLOAD_TOO_LARGE). Ramenées à 1280 px
 * de côté en JPEG, elles pèsent ~150–300 Ko chacune, largement assez pour un
 * profil et pour la vérification faciale.
 */

export const PHOTO_MAX_SIDE = 1280;
const JPEG_QUALITY = 0.82;

/** Limite Vercel 4,5 Mo, avec une marge pour le reste du formulaire. */
export const MAX_UPLOAD_PAYLOAD = 4_000_000;

/** Taille maximale acceptée par le bucket registration-media (3 Mo), avec une marge. */
const ORIGINAL_MAX_BYTES = 2_900_000;

async function decode(file: Blob, maxSide: number): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Respecte l'orientation EXIF (photos de téléphone prises en portrait).
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch { /* mémoire insuffisante ou format inconnu : essais suivants */ }
    try {
      // Décodage directement réduit : une photo de 48 Mpx décodée en entier
      // sature la mémoire des téléphones d'entrée de gamme.
      return await createImageBitmap(file, { imageOrientation: "from-image", resizeWidth: maxSide, resizeQuality: "high" });
    } catch { /* repli sur <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Dessine une image réduite (côté max `maxSide`) et la renvoie en data URI JPEG. */
function drawToJpeg(source: CanvasImageSource, width: number, height: number, maxSide: number): string {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  // Fond blanc : un PNG transparent ne devient pas noir en JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export type PhotoFailure = "heic" | "unreadable";

export type PreparedPhoto =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: PhotoFailure; detail: string };

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

const readOriginal = (file: File) => new Promise<string | null>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
  reader.onerror = () => resolve(null);
  reader.readAsDataURL(file);
});

/** Description courte d'un fichier, pour le signalement à l'admin (jamais le nom du fichier). */
export function describePhotoFile(file: File): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return `type=${file.type || "inconnu"} taille=${Math.round(file.size / 1024)}Ko ua=${ua.slice(0, 220)}`;
}

/**
 * Fichier image choisi par le membre → data URI JPEG réduite, ou la cause de l'échec.
 * Si le navigateur ne sait pas décoder l'image, un JPEG/PNG/WebP est gardé tel
 * quel tant qu'il tient dans le bucket (3 Mo) ; un HEIC est signalé à part.
 */
export async function preparePhoto(file: File, maxSide = PHOTO_MAX_SIDE): Promise<PreparedPhoto> {
  try {
    const img = await decode(file, maxSide);
    const width = "naturalWidth" in img ? img.naturalWidth : img.width;
    const height = "naturalHeight" in img ? img.naturalHeight : img.height;
    const out = drawToJpeg(img, width, height, maxSide);
    if ("close" in img) img.close();
    return { ok: true, dataUrl: out };
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    if (/^image\/(jpeg|png|webp)$/i.test(file.type) && file.size <= ORIGINAL_MAX_BYTES) {
      const original = await readOriginal(file);
      if (original) return { ok: true, dataUrl: original };
    }
    return { ok: false, reason: isHeic(file) ? "heic" : "unreadable", detail: `${why.slice(0, 120)} ${describePhotoFile(file)}` };
  }
}

/** Ancienne signature : data URI, ou `null` si la photo n'a pas pu être préparée. */
export async function fileToCompressedDataUrl(file: File, maxSide = PHOTO_MAX_SIDE): Promise<string | null> {
  const res = await preparePhoto(file, maxSide);
  return res.ok ? res.dataUrl : null;
}

/** Image de la caméra (selfie) → data URI JPEG réduite, miroir appliqué. */
export function videoFrameToDataUrl(video: HTMLVideoElement, maxSide = PHOTO_MAX_SIDE): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const w = Math.round(vw * scale);
  const h = Math.round(vh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
