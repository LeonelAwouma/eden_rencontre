import type { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Photo de profil d'un coach : validation serveur (type réel par signature binaire, taille) et stockage.
 * On réutilise le bucket public `chat-images`, dossier `avatars/` (déjà utilisé pour les avatars des membres,
 * déjà autorisé par `profiles_avatar_url_not_encoded`). Jamais de Base64 en base : seule une URL est enregistrée.
 */

type Db = ReturnType<typeof getSupabaseAdmin>;

export const COACH_AVATAR_BUCKET = "chat-images";
export const COACH_AVATAR_MAX_BYTES = 3 * 1024 * 1024; // aligné sur registration-media (3 Mo)

export type AvatarType = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

/** Détecte le type RÉEL de l'image d'après ses premiers octets (l'en-tête MIME du client n'est jamais cru). */
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { mime: "image/png", ext: "png" };
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { mime: "image/webp", ext: "webp" };
  return null;
}

export type AvatarCheck =
  | { ok: true; type: AvatarType; bytes: Buffer }
  | { ok: false; code: "avatar_missing" | "avatar_too_large" | "avatar_invalid_type"; message: string };

export async function checkAvatarFile(file: unknown): Promise<AvatarCheck> {
  if (!file || typeof file !== "object" || typeof (file as Blob).arrayBuffer !== "function") {
    return { ok: false, code: "avatar_missing", message: "Aucune image reçue." };
  }
  const blob = file as Blob;
  if (blob.size === 0) return { ok: false, code: "avatar_missing", message: "Le fichier est vide." };
  if (blob.size > COACH_AVATAR_MAX_BYTES) {
    return { ok: false, code: "avatar_too_large", message: "Image trop lourde (3 Mo maximum)." };
  }
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (bytes.length > COACH_AVATAR_MAX_BYTES) {
    return { ok: false, code: "avatar_too_large", message: "Image trop lourde (3 Mo maximum)." };
  }
  const type = sniffImageType(bytes);
  if (!type) return { ok: false, code: "avatar_invalid_type", message: "Format refusé : utilisez une image JPEG, PNG ou WebP." };
  return { ok: true, type, bytes };
}

/** Chemin de stockage d'une URL publique du bucket des avatars, ou null si l'URL n'en vient pas. */
export function avatarStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${COACH_AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return /^avatars\/coach-[0-9a-f-]{36}-\d+\.(jpg|png|webp)$/i.test(path) ? path : null;
}

/** Dépose le fichier et renvoie son chemin et son URL publique. Rien n'est conservé si l'envoi échoue. */
export async function uploadCoachAvatar(db: Db, coachId: string, check: Extract<AvatarCheck, { ok: true }>) {
  const path = `avatars/coach-${coachId}-${Date.now()}.${check.type.ext}`;
  const { error } = await db.storage.from(COACH_AVATAR_BUCKET).upload(path, check.bytes, {
    contentType: check.type.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return null;
  const url = db.storage.from(COACH_AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, url };
}

/** Supprime un fichier de photo du bucket (best effort ; jamais d'erreur remontée). */
export async function removeAvatarFile(db: Db, path: string | null) {
  if (!path) return;
  try { await db.storage.from(COACH_AVATAR_BUCKET).remove([path]); } catch { /* best effort */ }
}

export type ReplaceAvatarResult =
  | { ok: true; url: string }
  | { ok: false; code: "avatar_upload_failed" | "avatar_save_failed"; message: string };

/**
 * Remplace la photo d'un coach (routes administrateur ET coach : une seule séquence, un seul champ `profiles.avatar_url`).
 *   1. dépôt du nouveau fichier ;
 *   2. enregistrement de sa URL sur le profil — en cas d'échec, le nouveau fichier est retiré et l'ancienne photo
 *      reste en place (base et stockage inchangés) ;
 *   3. seulement ensuite, suppression de l'ancien fichier (uniquement s'il vient du dossier des photos de coach).
 * `coachId` doit venir d'une identité vérifiée par l'appelant (session serveur), jamais du navigateur.
 */
export async function replaceCoachAvatar(
  db: Db,
  coachId: string,
  check: Extract<AvatarCheck, { ok: true }>,
  previousUrl: string | null | undefined
): Promise<ReplaceAvatarResult> {
  const up = await uploadCoachAvatar(db, coachId, check);
  if (!up) return { ok: false, code: "avatar_upload_failed", message: "Envoi de la photo impossible." };

  const { error } = await db.from("profiles").update({ avatar_url: up.url }).eq("id", coachId);
  if (error) {
    await removeAvatarFile(db, up.path); // pas de fichier orphelin
    return { ok: false, code: "avatar_save_failed", message: "Enregistrement de la photo impossible." };
  }
  await removeAvatarFile(db, avatarStoragePath(previousUrl));
  return { ok: true, url: up.url };
}
