import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

/**
 * Inscriptions réussies par adresse IP et par heure (anti-création de comptes en
 * masse). Large à dessein : derrière un opérateur mobile ou le Wi-Fi d'un
 * événement, beaucoup de membres partagent la même adresse IP.
 */
const MAX_REGISTRATIONS_PER_IP = 20;
import { isValidE164 } from "@/lib/geo";
import { normalizeGender } from "@/lib/verses";
import { isAdultBirthDate } from "@/lib/registration-rules";
import { reportRegistrationFailure } from "@/lib/registration-incident";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { readRegistrationSelfie, discardLivenessFrames, resolveRegistrationAvatar } from "@/lib/registration-media";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ipKey = `register-ip:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "register", MAX_REGISTRATIONS_PER_IP, 3600))) {
    return NextResponse.json({ error: "Trop d'inscriptions depuis cette connexion. Réessayez dans une heure." }, { status: 429 });
  }
  let reportEmail: string | null = null;
  try {
    const body = await request.json();
    const {
      name,
      pseudo,
      firstName,
      lastName,
      email,
      password,
      gender,
      birthDate,
      discoverySource,
      civilStatus,
      region,
      country,
      city,
      marriageVision,
      charterAuthorizeVerification,
      charterCommitRespectful,
      charterAcceptFull,
      phone,
      avatarUrl,
    } = body;

    // Numéro de téléphone au format international (+237…), obligatoire.
    if (!isValidE164(phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
    }

    // Photos et selfie : déposés par le navigateur dans le stockage privé
    // (src/lib/registration-media.ts). Aucune comparaison automatique :
    // le compte est enregistré « selfie à comparer » et l'admin compare lui-même
    // le selfie aux photos depuis la fiche du membre (SelfieCheckPanel).
    const registration = readRegistrationSelfie(body);

    if (!email || !password || !name || !pseudo || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, mot de passe, pseudo, prénom et nom requis." },
        { status: 400 }
      );
    }
    // Vérifiés ici aussi : une date vide ou mal formée faisait échouer la
    // création du compte dans la base, avec un simple « Erreur lors de la création du compte ».
    if (!isAdultBirthDate(birthDate)) {
      return NextResponse.json({ error: "Date de naissance invalide (18 ans minimum)." }, { status: 400 });
    }
    const cleanGender = normalizeGender(gender);
    if (!cleanGender) {
      return NextResponse.json({ error: "Veuillez indiquer si vous êtes un homme ou une femme." }, { status: 400 });
    }
    const cleanMarriageVision = Array.isArray(marriageVision) ? marriageVision.filter((v) => typeof v === "string") : [];

    const db = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();
    reportEmail = cleanEmail;

    const finalAvatarUrl = await resolveRegistrationAvatar(db, body, registration.media);

    // 1. Create auth user via Supabase Admin API
    // Métadonnées sans valeur vide : la base ne reçoit que des champs renseignés.
    const metadata = Object.fromEntries(Object.entries({
      name,
      pseudo,
      firstName,
      lastName,
      avatar_url: finalAvatarUrl,
      gender: cleanGender,
      birthDate,
      discoverySource,
      civilStatus,
      region,
      country,
      city,
      marriageVision: cleanMarriageVision,
    }).filter(([, v]) => v !== undefined && v !== null && v !== ""));
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Auto-confirm email since we manage approval manually
      user_metadata: metadata,
    });

    if (authError) {
      const msg = authError.message || "";
      if (/already|exists/i.test(msg)) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet email." },
          { status: 409 }
        );
      }
      if (/password/i.test(msg)) {
        return NextResponse.json({ error: "Mot de passe refusé : choisissez-en un plus long ou plus complexe." }, { status: 400 });
      }
      await reportRegistrationFailure("account_creation", msg, { email: cleanEmail, flow: "classique" });
      return NextResponse.json(
        { error: "Erreur lors de la création du compte. L'équipe a été prévenue ; réessayez dans quelques minutes." },
        { status: 500 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      await reportRegistrationFailure("account_creation", "Compte créé sans identifiant renvoyé.", { email: cleanEmail, flow: "classique" });
      return NextResponse.json(
        { error: "Erreur lors de la création du compte." },
        { status: 500 }
      );
    }

    // 2. Save charter acceptance
    if (charterAuthorizeVerification && charterCommitRespectful && charterAcceptFull) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
      const ua = request.headers.get("user-agent") || null;
      await db.from("charter_acceptances").upsert({
        user_id: userId,
        authorize_verification: true,
        commit_respectful_conversations: true,
        accept_full_charter: true,
        accepted_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: ua,
        charter_version: "v1.0",
      }, { onConflict: "user_id" });
    }

    // 3. Upsert profile with "pending" status
    const profileRow = {
      id: userId,
      email: cleanEmail,
      name,
      pseudo,
      first_name: firstName,
      last_name: lastName,
      gender: cleanGender,
      birth_date: birthDate,
      discovery_source: discoverySource || null,
      civil_status: civilStatus || null,
      region: region || null,
      country: country || null,
      city: city || null,
      marriage_vision: cleanMarriageVision,
      status: "pending",
      onboarding_completed: false,
      selfie_verified: false,
      selfie_verification_score: 0,
      selfie_url: registration.selfieRef,
      profile_photos: registration.photoRefs,
      avatar_url: finalAvatarUrl,
      updated_at: new Date().toISOString(),
    };
    let { error: profileError } = await db.from("profiles").upsert(profileRow);

    if (profileError) {
      // Seconde chance sans la colonne facultative discovery_source (absente si
      // sa migration n'a pas été exécutée ; la valeur reste dans les métadonnées).
      console.error("[inscription] enregistrement du profil:", profileError.message);
      const { discovery_source: _optional, ...withoutOptional } = profileRow;
      ({ error: profileError } = await db.from("profiles").upsert(withoutOptional));
    }

    if (profileError) {
      // Avant, la route répondait « Inscription réussie » malgré tout : le compte
      // existait sans photos ni selfie, et personne ne savait pourquoi. On annule
      // le compte pour que le membre puisse réessayer avec la même adresse, et
      // l'admin reçoit la cause exacte.
      await reportRegistrationFailure("profile_save", profileError.message, { email: cleanEmail, userId, flow: "classique" });
      const { error: rollbackError } = await db.auth.admin.deleteUser(userId);
      if (rollbackError) console.error("[inscription] annulation du compte impossible:", rollbackError.message);
      return NextResponse.json(
        { error: "Votre profil n'a pas pu être enregistré. L'équipe a été prévenue ; réessayez dans quelques minutes." },
        { status: 500 }
      );
    }

    // Comptée seulement pour une inscription réellement aboutie.
    await recordRateLimit(ipKey, "register");

    // Téléphone : colonne profiles.phone (20261002_profiles_phone.sql). Sans elle, l'inscription continue.
    {
      const { error: phoneError } = await db.from("profiles").update({ phone }).eq("id", userId);
      if (phoneError) console.warn("[inscription] téléphone non enregistré:", phoneError.message);
    }

    // Rafale de l'ancien formulaire (preuve de présence automatique, abandonnée) : non conservée.
    const verifiedUserId = userId;
    after(() => discardLivenessFrames(db, registration));

    // 4. Send confirmation email — après la réponse, le membre n'attend pas le serveur d'e-mail.
    after(() => sendRegistrationReceivedEmail(cleanEmail, name).then(() => undefined));

    // 5. Create admin notification for new registration
    try {
      await db.from("admin_notifications").insert({
        type: "user",
        title: "Nouvelle inscription",
        message: `${name} (${cleanEmail}) s'est inscrit et attend votre validation.`,
        link: `/admin/users/${userId}`,
        metadata: { user_id: userId, name, email: cleanEmail, city, country },
      });
    } catch (notifErr) {
      console.error("Failed to create registration notification:", notifErr);
    }

    return NextResponse.json({
      ok: true,
      message: "Inscription réussie. Votre compte est en attente de validation.",
    });
  } catch (error) {
    console.error("Registration API error:", error);
    await reportRegistrationFailure("unexpected", error instanceof Error ? error.message : String(error), { email: reportEmail, flow: "classique" });
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}