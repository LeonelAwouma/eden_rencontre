"use client";

// Photos d'inscription — côté navigateur : chaque image part directement dans
// le bucket privé « registration-media » (adresse d'envoi signée), puis seuls
// les chemins sont envoyés à la route d'inscription. Voir src/lib/registration-media.ts.

import { supabase } from "@/lib/supabase";

const BUCKET = "registration-media";

interface Slot { path: string; token: string }

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

export interface UploadedRegistrationMedia {
  selfiePath: string | null;
  profilePhotoPaths: string[];
  livenessFramePaths: string[];
}

/**
 * Dépose photos, selfie et rafale. Les images sont déjà réduites (image-compress.ts).
 * Lance une erreur lisible si l'envoi échoue.
 */
export async function uploadRegistrationMedia(input: {
  photos: string[];
  selfie: string | null;
  frames: string[];
}): Promise<UploadedRegistrationMedia> {
  if (!supabase) throw new Error("Stockage indisponible.");
  const res = await fetch("/api/registration/media", { method: "POST" });
  const slots = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(slots.error || "Envoi des photos indisponible. Réessayez.");

  const upload = async (slot: Slot, dataUrl: string) => {
    const blob = await dataUrlToBlob(dataUrl);
    const { error } = await supabase!.storage.from(BUCKET).uploadToSignedUrl(slot.path, slot.token, blob, { contentType: "image/jpeg" });
    if (error) throw new Error(`Envoi d'une photo impossible : ${error.message}`);
    return slot.path;
  };

  const photos = input.photos.filter(Boolean).slice(0, (slots.photos as Slot[]).length);
  const frames = input.frames.filter(Boolean).slice(0, (slots.frames as Slot[]).length);
  const [profilePhotoPaths, selfiePath, livenessFramePaths] = await Promise.all([
    Promise.all(photos.map((p, i) => upload(slots.photos[i], p))),
    input.selfie ? upload(slots.selfie, input.selfie) : Promise.resolve(null),
    Promise.all(frames.map((f, i) => upload(slots.frames[i], f))),
  ]);
  return { selfiePath, profilePhotoPaths, livenessFramePaths };
}
