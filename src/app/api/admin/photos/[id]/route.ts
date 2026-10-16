/**
 * Admin → Import de photos, pour un membre.
 *
 * GET /api/admin/photos/:id — le membre et ses photos de profil actuelles (liens signés).
 * PUT /api/admin/photos/:id — { paths } : enregistre les photos que l'admin vient
 *     de déposer (1 à 3 chemins du bucket privé, tous dans le même dossier).
 *
 * Procédure exceptionnelle (le membre n'a pas réussi à importer ses photos) :
 * elle ne remplace pas l'inscription normale. Seules les photos de profil sont
 * concernées — ni le selfie, ni la photo publique (avatar_url), que le membre
 * choisit lui-même à sa connexion.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { REGISTRATION_BUCKET, MAX_PROFILE_PHOTOS, isMediaPath, resolveMediaUrls, deleteMedia } from "@/lib/registration-media";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const db = getSupabaseAdmin();
  const { data: profile, error } = await db.from("profiles")
    .select("id, name, pseudo, email, status, created_at, profile_photos")
    .eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const photos = await resolveMediaUrls(db, profile.profile_photos);
  const { profile_photos: _raw, ...member } = profile;
  return NextResponse.json({ member: { ...member, photoCount: photos.length }, photos });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const paths: string[] = Array.isArray(body.paths) ? body.paths.filter(isMediaPath) : [];
  if (paths.length === 0 || paths.length > MAX_PROFILE_PHOTOS || paths.length !== (body.paths as unknown[]).length) {
    return NextResponse.json({ error: `Entre 1 et ${MAX_PROFILE_PHOTOS} photos valides sont attendues.` }, { status: 400 });
  }
  // Même règle qu'à l'inscription : un seul dossier (celui ouvert pour cet import),
  // et uniquement des photos (jamais un selfie ou un fichier d'une autre inscription).
  const folder = paths[0].split("/")[0];
  if (!paths.every((p) => p.startsWith(`${folder}/photo-`))) {
    return NextResponse.json({ error: "Photos invalides." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { data: profile, error } = await db.from("profiles").select("id, profile_photos").eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  // Les fichiers doivent réellement avoir été déposés.
  const { data: files, error: listError } = await db.storage.from(REGISTRATION_BUCKET).list(folder, { limit: 50 });
  if (listError) return NextResponse.json({ error: "Vérification des photos impossible. Réessayez." }, { status: 503 });
  const present = new Set((files || []).map((f) => `${folder}/${f.name}`));
  if (!paths.every((p) => present.has(p))) {
    return NextResponse.json({ error: "Une photo n'a pas été reçue. Réessayez l'import." }, { status: 400 });
  }

  const previous: string[] = Array.isArray(profile.profile_photos) ? profile.profile_photos.filter((p: unknown): p is string => typeof p === "string") : [];
  const { error: saveError } = await db.from("profiles")
    .update({ profile_photos: paths, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (saveError) {
    console.error("[admin/photos] enregistrement impossible:", saveError.message);
    return NextResponse.json({ error: "Photos non enregistrées. Réessayez." }, { status: 500 });
  }

  // Anciennes photos privées remplacées : plus référencées nulle part.
  await deleteMedia(db, previous.filter((p) => isMediaPath(p) && !paths.includes(p)));

  try {
    await logAdminAction(admin.adminId, admin.email, "registration_photos_imported", "user", id, {
      before: { photos: previous.length },
      after: { photos: paths.length },
    });
  } catch { /* non bloquant */ }

  const photos = await resolveMediaUrls(db, paths);
  return NextResponse.json({ ok: true, photos });
}
