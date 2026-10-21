/**
 * Admin → Import de fichiers, pour un membre.
 *
 * GET   /api/admin/photos/:id — le membre, ses photos de profil actuelles (liens
 *       signés) et les réponses de son parcours d'inscription déjà enregistrées.
 * PUT   /api/admin/photos/:id — { paths } : enregistre les photos que l'admin vient
 *       de déposer (1 à 3 chemins du bucket privé, tous dans le même dossier).
 * PATCH /api/admin/photos/:id — { fields } : complète le parcours d'inscription avec
 *       les réponses de la fiche Word (src/lib/registration-form.ts).
 *
 * Procédure exceptionnelle (le membre n'a pas réussi à terminer son inscription) :
 * elle ne remplace pas l'inscription normale. Ni le selfie, ni la photo publique
 * (avatar_url), ni le mot de passe, ni la charte : le membre les fait lui-même.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { REGISTRATION_BUCKET, MAX_PROFILE_PHOTOS, isMediaPath, resolveMediaUrls, deleteMedia } from "@/lib/registration-media";
import { PROFILE_FORM_KEYS, normalizeFormField, regionOfCountry, type FormValue } from "@/lib/registration-form";

/** Champ de la fiche → colonne de profiles (et clé des métadonnées d'inscription). */
const COLUMNS = {
  pseudo: "pseudo",
  firstName: "first_name",
  lastName: "last_name",
  gender: "gender",
  birthDate: "birth_date",
  phone: "phone",
  discoverySource: "discovery_source",
  civilStatus: "civil_status",
  country: "country",
  city: "city",
  marriageVision: "marriage_vision",
} as const;

/** Colonnes facultatives (migrations pas forcément exécutées) : enregistrées à part. */
const OPTIONAL_COLUMNS = new Set(["phone", "discovery_source"]);

function registrationAnswers(profile: Record<string, unknown>) {
  return Object.fromEntries(PROFILE_FORM_KEYS.map((k) => [k, profile[COLUMNS[k]] ?? null]));
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const db = getSupabaseAdmin();
  // « * » : phone et discovery_source n'existent pas forcément.
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const photos = await resolveMediaUrls(db, profile.profile_photos);
  const { name, pseudo, email, status, created_at } = profile;
  return NextResponse.json({
    member: { id, name, pseudo, email, status, created_at, photoCount: photos.length },
    photos,
    answers: registrationAnswers(profile),
  });
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const input = body.fields && typeof body.fields === "object" ? body.fields as Record<string, unknown> : {};

  const db = getSupabaseAdmin();
  const { data: profile, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !profile) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  // Même normalisation que la lecture de la fiche : rien n'est enregistré sans être valide.
  const country = typeof input.country === "string" ? normalizeFormField("country", input.country) : null;
  const ctx = { country: country?.ok ? country.value as string : (profile.country as string | null) };
  const values: Partial<Record<keyof typeof COLUMNS, FormValue>> = {};
  for (const key of PROFILE_FORM_KEYS) {
    if (input[key] === undefined) continue;
    const res = normalizeFormField(key, input[key], ctx);
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: 400 });
    values[key] = res.value;
  }
  if (Object.keys(values).length === 0) return NextResponse.json({ error: "Aucune information à enregistrer." }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) update[COLUMNS[key as keyof typeof COLUMNS]] = value;
  if (values.country) update.region = regionOfCountry(values.country as string);
  if (values.firstName || values.lastName) {
    const first = (values.firstName ?? profile.first_name ?? "") as string;
    const last = (values.lastName ?? profile.last_name ?? "") as string;
    update.name = `${first} ${last}`.trim();
  }

  const optional = Object.fromEntries(Object.entries(update).filter(([col]) => OPTIONAL_COLUMNS.has(col)));
  const main = Object.fromEntries(Object.entries(update).filter(([col]) => !OPTIONAL_COLUMNS.has(col)));
  const { error: saveError } = await db.from("profiles").update({ ...main, updated_at: new Date().toISOString() }).eq("id", id);
  if (saveError) {
    console.error("[admin/photos] parcours non enregistré:", saveError.message);
    return NextResponse.json({ error: "Informations non enregistrées. Réessayez." }, { status: 500 });
  }
  const skipped: string[] = [];
  for (const [col, value] of Object.entries(optional)) {
    const { error: optError } = await db.from("profiles").update({ [col]: value }).eq("id", id);
    if (optError) { console.warn(`[admin/photos] ${col} non enregistré:`, optError.message); skipped.push(col); }
  }

  // Mêmes métadonnées qu'à l'inscription (lues par mapSupabaseUser).
  const metadata: Record<string, unknown> = { ...values };
  delete metadata.phone;
  if (update.region) metadata.region = update.region;
  if (update.name) metadata.name = update.name;
  const { error: metaError } = await db.auth.admin.updateUserById(id, { user_metadata: metadata });
  if (metaError) console.warn("[admin/photos] métadonnées non mises à jour:", metaError.message);

  try {
    await logAdminAction(admin.adminId, admin.email, "registration_form_imported", "user", id, {
      before: Object.fromEntries(Object.keys(update).map((col) => [col, profile[col] ?? null])),
      after: update,
    });
  } catch { /* non bloquant */ }

  const { data: fresh } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  return NextResponse.json({ ok: true, answers: registrationAnswers(fresh ?? { ...profile, ...update }), skipped });
}
