/**
 * GET /api/admin/photos — membres dont le parcours d'inscription est incomplet.
 *
 * Rubrique Admin → Import de fichiers : procédure exceptionnelle pour les membres
 * qui n'ont pas réussi à terminer leur inscription (issue de secours « Je n'arrive
 * pas à importer mes photos », fiche d'inscription Word envoyée sur WhatsApp).
 * Elle ne remplace pas l'inscription normale. Ce qui manque se déduit du profil
 * (moins de 3 photos, genre, date de naissance, pays ou ville vides) : aucune
 * colonne dédiée.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { ADMIN_SYSTEM_EMAIL } from "@/lib/admin-system-shared";
import { MAX_PROFILE_PHOTOS } from "@/lib/registration-media";
import { PROFILE_FORM_KEYS, normalizeFormField, regionOfCountry, type FormValue } from "@/lib/registration-form";

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id, name, pseudo, email, status, created_at, profile_photos, gender, birth_date, country, city")
    .neq("email", ADMIN_SYSTEM_EMAIL)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[admin/photos]", error.message);
    return NextResponse.json({ error: "Lecture des membres impossible." }, { status: 500 });
  }

  const members = (data || [])
    .map((p) => {
      const photoCount = Array.isArray(p.profile_photos) ? p.profile_photos.filter(Boolean).length : 0;
      const missing = [
        photoCount < MAX_PROFILE_PHOTOS && "photos",
        !p.gender && "genre",
        !p.birth_date && "date de naissance",
        !p.country && "pays",
        !p.city && "ville",
      ].filter((m): m is string => !!m);
      return {
        id: p.id as string,
        name: p.name as string | null,
        pseudo: p.pseudo as string | null,
        email: p.email as string | null,
        status: p.status as string | null,
        created_at: p.created_at as string | null,
        photoCount,
        missing,
      };
    })
    .filter((m) => m.missing.length > 0 && m.status !== "rejected");

  return NextResponse.json({ members });
}

/**
 * POST /api/admin/photos — { fields, password } : crée le compte d'un membre à partir
 * de sa fiche d'inscription Word (il n'a pas pu s'inscrire en ligne). Même résultat
 * que /api/auth/register : compte « en attente », profil renseigné. Le mot de passe
 * est choisi par l'admin, qui le remet au membre sur WhatsApp : avec son adresse
 * e-mail, le membre peut se connecter. Selfie et charte restent à faire par lui.
 */
export async function POST(req: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const input = body.fields && typeof body.fields === "object" ? body.fields as Record<string, unknown> : {};
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Le mot de passe doit contenir entre 8 et 72 caractères." }, { status: 400 });
  }

  const country = normalizeFormField("country", input.country);
  const ctx = { country: country.ok ? country.value as string : null };
  const values: Record<string, FormValue> = {};
  for (const key of ["email", ...PROFILE_FORM_KEYS] as const) {
    const res = normalizeFormField(key, input[key], ctx);
    if (key === "discoverySource" && !res.ok) continue;
    if (!res.ok) return NextResponse.json({ error: `${key === "email" ? "E-mail" : key} : ${res.message}` }, { status: 400 });
    values[key] = res.value;
  }

  const db = getSupabaseAdmin();
  const email = values.email as string;
  const name = `${values.firstName} ${values.lastName}`.trim();
  const region = regionOfCountry(values.country as string);

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name, pseudo: values.pseudo, firstName: values.firstName, lastName: values.lastName, gender: values.gender,
      birthDate: values.birthDate, discoverySource: values.discoverySource, civilStatus: values.civilStatus,
      region, country: values.country, city: values.city, marriageVision: values.marriageVision,
    },
  });
  if (authError || !authData.user) {
    const msg = authError?.message || "";
    if (/already|exists/i.test(msg)) return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
    if (/password/i.test(msg)) return NextResponse.json({ error: "Mot de passe refusé : choisissez-en un plus long ou plus complexe." }, { status: 400 });
    console.error("[admin/photos] création du compte:", authError?.message);
    return NextResponse.json({ error: "Création du compte impossible. Réessayez." }, { status: 500 });
  }
  const userId = authData.user.id;

  const row = {
    id: userId, email, name, pseudo: values.pseudo, first_name: values.firstName, last_name: values.lastName,
    gender: values.gender, birth_date: values.birthDate, civil_status: values.civilStatus, region,
    country: values.country, city: values.city, marriage_vision: values.marriageVision,
    status: "pending", onboarding_completed: false, selfie_verified: false, selfie_verification_score: 0,
    profile_photos: [], updated_at: new Date().toISOString(),
  };
  const { error: profileError } = await db.from("profiles").upsert(row);
  if (profileError) {
    console.error("[admin/photos] profil non enregistré:", profileError.message);
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Profil non enregistré. Réessayez." }, { status: 500 });
  }
  // Colonnes facultatives (migrations pas forcément exécutées) : sans elles, la création aboutit quand même.
  for (const [col, value] of [["phone", values.phone], ["discovery_source", values.discoverySource]] as const) {
    if (!value) continue;
    const { error } = await db.from("profiles").update({ [col]: value }).eq("id", userId);
    if (error) console.warn(`[admin/photos] ${col} non enregistré:`, error.message);
  }

  try {
    await logAdminAction(admin.adminId, admin.email, "registration_account_created", "user", userId, { after: { email, country: values.country } });
  } catch { /* non bloquant */ }

  return NextResponse.json({ ok: true, id: userId, email, phone: values.phone });
}
