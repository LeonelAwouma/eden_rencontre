/**
 * Ajout d'une photo de profil supplémentaire après l'inscription (jusqu'à 3 au
 * total — 1 fournie à l'inscription, 2 facultatives ajoutables ici depuis
 * /dashboard/profile). Nouvelle fonctionnalité : aucune route équivalente
 * n'existait avant cette refonte (seules les routes d'inscription et l'admin
 * écrivaient profile_photos).
 *
 * Sécurité :
 * - Identité uniquement depuis la session authentifiée (requireApprovedMember),
 *   jamais un identifiant fourni par le client.
 * - Les chemins doivent respecter le même motif que registration-media.ts et
 *   appartenir au dossier déjà associé au membre (ou, si aucune photo
 *   conforme n'existe encore — compte ancien, photos en data: URI ou importées
 *   par l'admin —, un nouveau dossier est créé au premier ajout et réutilisé
 *   pour les suivants).
 * - Le dépôt (PUT) vérifie que le fichier a réellement été envoyé avant
 *   d'accepter son chemin.
 * - Le plafond de 3 photos est garanti de façon atomique par la fonction
 *   PostgreSQL add_profile_photo (supabase/migrations/20261102_simplified_registration.sql),
 *   jamais par un « lire puis écrire » côté application.
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireApprovedMember } from "@/lib/api-auth";
import { REGISTRATION_BUCKET, isMediaPath, resolveMediaUrls } from "@/lib/registration-media";

/** Dossier déjà utilisé par ce membre (une de ses photos existantes), ou un nouveau si aucune n'est conforme. */
export function folderOf(existingPhotos: unknown): string {
  if (Array.isArray(existingPhotos)) {
    const match = existingPhotos.find((p): p is string => isMediaPath(p));
    if (match) return match.split("/")[0];
  }
  return randomUUID();
}

/** Adresses signées des photos déjà enregistrées (bucket privé) — pour les afficher au membre lui-même. */
export async function GET(request: NextRequest) {
  const user = await requireApprovedMember(request);
  if (!user) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data: profile } = await db.from("profiles").select("profile_photos").eq("id", user.id).maybeSingle();
  const urls = await resolveMediaUrls(db, profile?.profile_photos ?? []);
  const count = Array.isArray(profile?.profile_photos) ? profile!.profile_photos.filter(Boolean).length : 0;
  return NextResponse.json({ urls, count });
}

export async function POST(request: NextRequest) {
  const user = await requireApprovedMember(request);
  if (!user) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: profile, error: fetchError } = await db.from("profiles").select("profile_photos").eq("id", user.id).maybeSingle();
  if (fetchError) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  const current = Array.isArray(profile?.profile_photos) ? profile!.profile_photos.filter(Boolean) : [];
  if (current.length >= 3) {
    return NextResponse.json({ error: "Vous avez déjà 3 photos de profil." }, { status: 409 });
  }

  const folder = folderOf(profile?.profile_photos);
  const path = `${folder}/photo-${randomUUID()}.jpg`;
  const { data, error } = await db.storage.from(REGISTRATION_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: "Adresse d'envoi indisponible." }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token });
}

export async function PUT(request: NextRequest) {
  const user = await requireApprovedMember(request);
  if (!user) return NextResponse.json({ error: "Session expirée. Veuillez vous reconnecter." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const path = body.path;
  if (!isMediaPath(path)) {
    return NextResponse.json({ error: "Chemin de photo invalide." }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Appartenance : le chemin doit se trouver dans le dossier déjà associé au
  // membre (une de ses photos existantes), ou — s'il n'en a encore aucune de
  // conforme — un dossier que lui seul a pu obtenir via le POST ci-dessus
  // (retourné uniquement à l'appelant authentifié, jamais prévisible).
  const { data: profile } = await db.from("profiles").select("profile_photos").eq("id", user.id).maybeSingle();
  const existing = Array.isArray(profile?.profile_photos) ? profile!.profile_photos.filter(Boolean) : [];
  const knownFolder = existing.find((p): p is string => isMediaPath(p))?.split("/")[0];
  if (knownFolder && path.split("/")[0] !== knownFolder) {
    return NextResponse.json({ error: "Cette photo n'appartient pas à votre compte." }, { status: 403 });
  }

  // Le fichier a-t-il réellement été envoyé ? Un chemin jamais utilisé ne doit
  // jamais être accepté, même s'il est bien formé et appartient au bon dossier.
  const [folder, filename] = path.split("/");
  const { data: listing, error: listError } = await db.storage.from(REGISTRATION_BUCKET).list(folder, { search: filename });
  if (listError || !listing?.some((f) => f.name === filename)) {
    return NextResponse.json({ error: "Fichier introuvable — réessayez l'envoi." }, { status: 400 });
  }

  const { data: updated, error: rpcError } = await db.rpc("add_profile_photo", { p_user_id: user.id, p_path: path });
  if (rpcError) {
    console.error("[profile/photos] add_profile_photo:", rpcError.message);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }
  if (!updated) {
    // Plafond déjà atteint par une requête concurrente, ou chemin déjà présent :
    // le fichier vient d'être déposé pour rien, on le supprime pour ne pas le laisser orphelin.
    await db.storage.from(REGISTRATION_BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ error: "Vous avez déjà 3 photos de profil." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, profilePhotos: updated });
}
