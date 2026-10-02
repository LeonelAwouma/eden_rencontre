// Photos d'inscription — côté serveur uniquement.
//
// Le navigateur dépose les images directement dans le bucket privé
// « registration-media » (adresses d'envoi signées délivrées par
// /api/registration/media). Les routes d'inscription ne reçoivent que les
// chemins : plus aucune image dans le JSON (limite Vercel 4,5 Mo), plus de
// base64 dans la table profiles. Voir supabase/migrations/20261002_registration_media.sql.

import { randomUUID } from "crypto";
import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Db = ReturnType<typeof getSupabaseAdmin>;

export const REGISTRATION_BUCKET = "registration-media";
/** Bucket public déjà utilisé pour les avatars (src/lib/chat.ts). */
const AVATAR_BUCKET = "chat-images";

export const MAX_PROFILE_PHOTOS = 3;
export const MAX_LIVENESS_FRAMES = 10;
/**
 * Temps accordé à l'analyse des visages, compté depuis le début de la requête.
 * La fonction est coupée à 60 s (maxDuration) : on garde de la marge pour
 * enregistrer le verdict. Au-delà, le compte reste « non vérifié ».
 */
export const VERIFY_BUDGET_MS = 50_000;

/** Chemin d'un fichier d'inscription : <dossier>/<type>-<uuid>.jpg (noms aléatoires, jamais le nom d'origine). */
const MEDIA_PATH = /^[0-9a-f-]{36}\/(photo|selfie|frame)-[0-9a-f-]{36}\.jpg$/;

export const isMediaPath = (s: unknown): s is string => typeof s === "string" && MEDIA_PATH.test(s);

export interface UploadSlot { path: string; token: string }

/** Adresses d'envoi signées pour une inscription (un dossier aléatoire par inscription). */
export async function createUploadSlots(db: Db): Promise<{ folder: string; photos: UploadSlot[]; selfie: UploadSlot; frames: UploadSlot[] }> {
  const folder = randomUUID();
  const make = async (kind: "photo" | "selfie" | "frame"): Promise<UploadSlot> => {
    const path = `${folder}/${kind}-${randomUUID()}.jpg`;
    const { data, error } = await db.storage.from(REGISTRATION_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw new Error(error?.message || "Adresse d'envoi indisponible.");
    return { path, token: data.token };
  };
  const [photos, selfie, frames] = await Promise.all([
    Promise.all(Array.from({ length: MAX_PROFILE_PHOTOS }, () => make("photo"))),
    make("selfie"),
    Promise.all(Array.from({ length: MAX_LIVENESS_FRAMES }, () => make("frame"))),
  ]);
  return { folder, photos, selfie, frames };
}

export interface RegistrationMedia {
  selfiePath: string | null;
  profilePhotoPaths: string[];
  livenessFramePaths: string[];
}

/**
 * Lit et valide les chemins envoyés par le formulaire : bon format, et tous
 * dans le même dossier (celui de cette inscription).
 */
export function parseRegistrationMedia(body: Record<string, unknown>): RegistrationMedia | null {
  const selfiePath = isMediaPath(body.selfiePath) ? body.selfiePath : null;
  const photos = Array.isArray(body.profilePhotoPaths) ? body.profilePhotoPaths.filter(isMediaPath).slice(0, MAX_PROFILE_PHOTOS) : [];
  const frames = Array.isArray(body.livenessFramePaths) ? body.livenessFramePaths.filter(isMediaPath).slice(0, MAX_LIVENESS_FRAMES) : [];
  if (!selfiePath && photos.length === 0) return null;
  const folder = (selfiePath || photos[0]).split("/")[0];
  const same = (p: string) => p.startsWith(`${folder}/`);
  if (![...photos, ...frames].every(same)) return null;
  return { selfiePath, profilePhotoPaths: photos, livenessFramePaths: frames };
}

/** Lien signé temporaire vers un fichier privé (vérification serveur, affichage admin). */
export async function signedMediaUrl(db: Db, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await db.storage.from(REGISTRATION_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/**
 * Valeur enregistrée dans profiles (selfie_url, profile_photos) → adresse affichable.
 * Les anciennes valeurs (data URI, URL publique) passent telles quelles ;
 * un chemin du bucket privé devient un lien signé.
 */
export async function resolveMediaUrl(db: Db, ref: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!ref) return null;
  if (!isMediaPath(ref)) return ref;
  return signedMediaUrl(db, ref, expiresIn);
}

export async function resolveMediaUrls(db: Db, refs: unknown, expiresIn = 3600): Promise<string[]> {
  if (!Array.isArray(refs)) return [];
  const urls = await Promise.all(refs.filter((r): r is string => typeof r === "string" && !!r).map((r) => resolveMediaUrl(db, r, expiresIn)));
  return urls.filter((u): u is string => !!u);
}

/** Supprime des fichiers du bucket (ex. la rafale, inutile après la vérification). */
export async function deleteMedia(db: Db, paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await db.storage.from(REGISTRATION_BUCKET).remove(paths);
  if (error) console.warn("[registration-media] suppression impossible:", error.message);
}

/**
 * Avatar choisi parmi les photos d'inscription : copié dans le bucket public
 * des avatars (les photos d'inscription, elles, restent privées).
 */
export async function publishAvatarFromMedia(db: Db, path: string): Promise<string | null> {
  const { data: file, error } = await db.storage.from(REGISTRATION_BUCKET).download(path);
  if (error || !file) return null;
  const target = `avatars/reg-${randomUUID()}.jpg`;
  const { error: upErr } = await db.storage.from(AVATAR_BUCKET).upload(target, file, {
    contentType: "image/jpeg", cacheControl: "31536000", upsert: false,
  });
  if (upErr) return null;
  return db.storage.from(AVATAR_BUCKET).getPublicUrl(target).data.publicUrl;
}

export interface RegistrationSelfie {
  /** À enregistrer dans profiles.selfie_url / profile_photos (chemins, ou data URI de l'ancien format). */
  selfieRef: string | null;
  photoRefs: string[];
  media: RegistrationMedia | null;
}

/** Lecture des photos d'inscription envoyées par le formulaire, sans analyse (instantané). */
export function readRegistrationSelfie(body: Record<string, unknown>): RegistrationSelfie {
  const media = parseRegistrationMedia(body);
  if (media) return { selfieRef: media.selfiePath, photoRefs: media.profilePhotoPaths, media };
  // Ancien format (base64 dans le JSON), pour un formulaire encore ouvert avec l'ancienne version.
  const selfieRef = legacyImage(body.selfieImage, 4_000_000) ? (body.selfieImage as string) : null;
  const photoRefs = Array.isArray(body.profilePhotos)
    ? body.profilePhotos.filter((p): p is string => legacyImage(p, 4_000_000)).slice(0, MAX_PROFILE_PHOTOS)
    : [];
  return { selfieRef, photoRefs, media: null };
}

const legacyImage = (v: unknown, max: number) => typeof v === "string" && v.startsWith("data:image/") && v.length < max;

/**
 * Vérification du selfie à l'inscription, à partir des fichiers stockés, puis
 * enregistrement du verdict dans profiles. Appelée APRÈS la réponse (`after`
 * dans les routes) : l'analyse d'une quinzaine d'images peut prendre de
 * longues secondes, le membre n'a pas à l'attendre. La rafale de présence est
 * supprimée une fois analysée. Le score n'est jamais pris du client.
 */
export async function verifyAndSaveRegistrationSelfie(
  db: Db,
  userId: string,
  body: Record<string, unknown>,
  registration: RegistrationSelfie,
  verify: (selfie: string, photos: string[], frames: string[], deadline: number) => Promise<{
    verified: boolean; score: number; photos: unknown; liveness: unknown; reason: string; timedOut?: boolean;
  }>,
  deadline: number
): Promise<void> {
  const { media } = registration;
  try {
    let selfieSrc: string | null;
    let photoSrcs: string[];
    let frameSrcs: string[];
    if (media) {
      // Liens signés de courte durée : le serveur télécharge les images pour les analyser.
      [selfieSrc, photoSrcs, frameSrcs] = await Promise.all([
        media.selfiePath ? signedMediaUrl(db, media.selfiePath, 300) : Promise.resolve(null),
        Promise.all(media.profilePhotoPaths.map((p) => signedMediaUrl(db, p, 300))).then((u) => u.filter((x): x is string => !!x)),
        Promise.all(media.livenessFramePaths.map((p) => signedMediaUrl(db, p, 300))).then((u) => u.filter((x): x is string => !!x)),
      ]);
    } else {
      selfieSrc = registration.selfieRef;
      photoSrcs = registration.photoRefs;
      frameSrcs = Array.isArray(body.livenessFrames)
        ? body.livenessFrames.filter((f): f is string => legacyImage(f, 400_000)).slice(0, MAX_LIVENESS_FRAMES)
        : [];
    }
    if (!selfieSrc) return;

    const result = await verify(selfieSrc, photoSrcs, frameSrcs, deadline);
    const verdict = { selfie_verified: result.verified, selfie_verification_score: result.score };
    const details = {
      photos: result.photos, liveness: result.liveness, reason: result.reason, checked_at: new Date().toISOString(),
      ...(result.timedOut ? { timed_out: true } : {}),
    };
    // Colonne de détail ajoutée par 20261002_selfie_verification.sql : sans elle, on enregistre au moins le verdict.
    const { error } = await db.from("profiles").update({ ...verdict, selfie_verification_details: details }).eq("id", userId);
    if (error) {
      console.warn("[selfie] détail non enregistré:", error.message);
      await db.from("profiles").update(verdict).eq("id", userId);
    }
    if (result.timedOut) console.warn(`[selfie] analyse interrompue (trop longue) pour ${userId} : à revérifier depuis l'admin.`);
  } catch (err) {
    console.error("[selfie] vérification impossible:", err);
  } finally {
    // La rafale ne sert qu'à la preuve de présence : on ne la conserve pas.
    if (media?.livenessFramePaths.length) await deleteMedia(db, media.livenessFramePaths);
  }
}
