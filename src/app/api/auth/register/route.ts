import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

/** Inscriptions par adresse IP et par heure (anti-création de comptes en masse). */
const MAX_REGISTRATIONS_PER_IP = 5;
import { isValidE164 } from "@/lib/geo";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { verifySelfieServer } from "@/lib/face-verification-server";
import { readRegistrationSelfie, verifyAndSaveRegistrationSelfie, publishAvatarFromMedia, VERIFY_BUDGET_MS } from "@/lib/registration-media";

// Analyse du selfie, des photos et de la rafale (jusqu'à une quinzaine d'images),
// faite après la réponse : voir verifyAndSaveRegistrationSelfie.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const ipKey = `register-ip:${clientIp(request)}`;
  if (!(await checkRateLimit(ipKey, "register", MAX_REGISTRATIONS_PER_IP, 3600))) {
    return NextResponse.json({ error: "Trop d'inscriptions depuis cette connexion. Réessayez dans une heure." }, { status: 429 });
  }
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

    // Selfie verification is recomputed here from the actual images — the client's
    // own score/verified claim is never trusted, since it's just JSON an attacker
    // could forge without ever taking a real selfie.
    // Numéro de téléphone au format international (+237…), obligatoire.
    if (!isValidE164(phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
    }

    // Photos et selfie : déposés par le navigateur dans le stockage privé
    // (src/lib/registration-media.ts). Le compte est enregistré « non vérifié » ;
    // l'analyse des visages tourne après la réponse et met à jour le verdict.
    const registration = readRegistrationSelfie(body);

    const avatarIndex = typeof body.avatarPhotoIndex === "number" ? body.avatarPhotoIndex : -1;
    const avatarFromPhoto = registration.media && avatarIndex >= 0 ? registration.media.profilePhotoPaths[avatarIndex] : undefined;
    const finalAvatarUrl: string | null = avatarFromPhoto
      ? await publishAvatarFromMedia(getSupabaseAdmin(), avatarFromPhoto)
      : typeof avatarUrl === "string" && /^https?:\/\//.test(avatarUrl) ? avatarUrl
      : typeof avatarUrl === "string" && avatarUrl.startsWith("data:") && avatarUrl.length < 3_000_000 ? avatarUrl // ancien format
      : null;

    if (!email || !password || !name || !pseudo || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, mot de passe, pseudo, prénom et nom requis." },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Auto-confirm email since we manage approval manually
      user_metadata: {
        name,
        pseudo,
        firstName,
        lastName,
        avatar_url: finalAvatarUrl,
        gender,
        birthDate,
        discoverySource,
        civilStatus,
        region,
        country,
        city,
        marriageVision,
      },
    });

    if (authError) {
      const msg = authError.message || "";
      if (/already|exists/i.test(msg)) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet email." },
          { status: 409 }
        );
      }
      console.error("Auth creation error:", authError);
      return NextResponse.json(
        { error: "Erreur lors de la création du compte." },
        { status: 500 }
      );
    }

    await recordRateLimit(ipKey, "register");
    const userId = authData.user?.id;
    if (!userId) {
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
    const { error: profileError } = await db
      .from("profiles")
      .upsert({
        id: userId,
        email: cleanEmail,
        name,
        pseudo,
        first_name: firstName,
        last_name: lastName,
        gender: gender || null,
        birth_date: birthDate || null,
        discovery_source: discoverySource || null,
        civil_status: civilStatus || null,
        region: region || null,
        country: country || null,
        city: city || null,
        marriage_vision: marriageVision || [],
        status: "pending",
        onboarding_completed: false,
        selfie_verified: false,
        selfie_verification_score: 0,
        selfie_url: registration.selfieRef,
        profile_photos: registration.photoRefs,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Profile might already exist as a trigger created it, try updating
      await db
        .from("profiles")
        .update({
          name,
          pseudo,
          first_name: firstName,
          last_name: lastName,
          gender: gender || null,
          birth_date: birthDate || null,
          discovery_source: discoverySource || null,
          civil_status: civilStatus || null,
          region: region || null,
          country: country || null,
          city: city || null,
          marriage_vision: marriageVision || [],
          status: "pending",
          onboarding_completed: false,
          selfie_verified: false,
          selfie_verification_score: 0,
          selfie_url: registration.selfieRef,
          profile_photos: registration.photoRefs,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    // Téléphone : colonne profiles.phone (20261002_profiles_phone.sql). Sans elle, l'inscription continue.
    {
      const { error: phoneError } = await db.from("profiles").update({ phone }).eq("id", userId);
      if (phoneError) console.warn("[inscription] téléphone non enregistré:", phoneError.message);
    }

    // Analyse des visages après la réponse : le membre n'attend pas (elle a
    // fait dépasser les 60 s de la fonction). Verdict et détail pour l'admin
    // sont enregistrés à la fin ; une analyse trop longue reste « non vérifié ».
    const verifiedUserId = userId;
    after(() => verifyAndSaveRegistrationSelfie(
      db, verifiedUserId, body, registration, verifySelfieServer, startedAt + VERIFY_BUDGET_MS
    ));

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
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}