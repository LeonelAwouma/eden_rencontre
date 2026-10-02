import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidE164 } from "@/lib/geo";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { verifySelfieServer } from "@/lib/face-verification-server";
import { readRegistrationSelfie, verifyAndSaveRegistrationSelfie, publishAvatarFromMedia, VERIFY_BUDGET_MS } from "@/lib/registration-media";

// Analyse du selfie, des photos et de la rafale (jusqu'à une quinzaine d'images),
// faite après la réponse : voir verifyAndSaveRegistrationSelfie.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await request.json();
    const {
      pseudo,
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
    } = body;

    // Selfie verification is recomputed here from the actual uploaded photos — the
    // client's own score/verified claim is never trusted, since it's just JSON an
    // attacker could forge without ever taking a real selfie. The Google account
    // avatar is deliberately never used as a reference photo.
    // Numéro de téléphone au format international (+237…), obligatoire.
    if (!isValidE164(phone)) {
      return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
    }

    // Photos et selfie : déposés par le navigateur dans le stockage privé
    // (src/lib/registration-media.ts). Le compte est enregistré « non vérifié » ;
    // l'analyse des visages tourne après la réponse et met à jour le verdict.
    const registration = readRegistrationSelfie(body);

    // Pseudonyme public (le vrai nom Google reste réservé à l'admin)
    const cleanPseudo = typeof pseudo === "string" ? pseudo.trim() : "";
    if (cleanPseudo.length < 2 || cleanPseudo.length > 30 || /[<>"]/.test(cleanPseudo)) {
      return NextResponse.json(
        { error: "Le pseudonyme doit contenir entre 2 et 30 caractères." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!gender || !birthDate || !civilStatus || !region || !country || !city) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs obligatoires." },
        { status: 400 }
      );
    }

    // Validate age (minimum 18)
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    if (age < 18) {
      return NextResponse.json(
        { error: "Vous devez avoir au moins 18 ans pour rejoindre Garden of Alliance." },
        { status: 400 }
      );
    }

    // Get the authenticated user from the Authorization header or cookie
    const db = getSupabaseAdmin();

    let userId: string | null = null;

    // Priority 1: Authorization header (Bearer token)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: { user } } = await db.auth.getUser(token);
      if (user) userId = user.id;
    }

    // Priority 2: Extract from Supabase cookies
    if (!userId) {
      const allCookies = request.cookies.getAll();

      // Strategy A: Look for Supabase v2 SSR split cookies (sb-<ref>-auth-token.0 / .1)
      const authCookiePrefix = allCookies.find((c) =>
        c.name.startsWith("sb-") && c.name.includes("-auth-token")
      );

      if (authCookiePrefix) {
        // Get the base name (without .0 or .1 suffix)
        const baseName = authCookiePrefix.name.replace(/\.\d+$/, "");
        const part0 = request.cookies.get(`${baseName}.0`)?.value;
        const part1 = request.cookies.get(`${baseName}.1`)?.value;
        const baseValue = request.cookies.get(baseName)?.value;

        // Try to reconstruct the full cookie value
        const fullValue = [part0, part1].filter(Boolean).join("") || baseValue || "";

        if (fullValue) {
          try {
            const parsed = JSON.parse(fullValue);
            if (parsed.access_token) {
              const { data: { user } } = await db.auth.getUser(parsed.access_token);
              if (user) userId = user.id;
            }
          } catch {
            // If not valid JSON, try the raw value as a token itself
            try {
              const { data: { user } } = await db.auth.getUser(fullValue);
              if (user) userId = user.id;
            } catch {
              // Not a valid token
            }
          }
        }
      }

      // Strategy B: Look for simple sb-access-token / supabase-auth-token cookies
      if (!userId) {
        const simpleToken = request.cookies.get("sb-access-token")?.value
          || request.cookies.get("supabase-auth-token")?.value;
        if (simpleToken) {
          try {
            const { data: { user } } = await db.auth.getUser(simpleToken);
            if (user) userId = user.id;
          } catch {
            // Not a valid token
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Session expirée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // Save charter acceptance if all accepted
    if (charterAuthorizeVerification && charterCommitRespectful && charterAcceptFull) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
      const ua = request.headers.get("user-agent") || null;
      await db.from("charter_acceptances").upsert(
        {
          user_id: userId,
          authorize_verification: true,
          commit_respectful_conversations: true,
          accept_full_charter: true,
          accepted_at: new Date().toISOString(),
          ip_address: ip,
          user_agent: ua,
          charter_version: "v1.0",
        },
        { onConflict: "user_id" }
      );
    }

    // Un compte déjà traité par l'admin (approuvé, refusé, suspendu) garde son
    // statut : compléter son profil ne doit ni le rétrograder, ni le rouvrir.
    const { data: existingProfile } = await db.from("profiles").select("status").eq("id", userId).maybeSingle();
    const currentStatus = existingProfile?.status as string | undefined;
    const status = currentStatus && currentStatus !== "pending" ? currentStatus : "pending";

    // Update the profile with the collected information
    // Note: discovery_source is stored in auth metadata only (column may not exist in profiles table)
    // onboarding_completed n'est PAS touché : il concerne le questionnaire, rempli ensuite.
    const profileData: Record<string, any> = {
      pseudo: cleanPseudo,
      gender: gender,
      birth_date: birthDate,
      civil_status: civilStatus,
      region: region,
      country: country,
      city: city,
      marriage_vision: marriageVision || [],
      status,
      selfie_verified: false,
      selfie_verification_score: 0,
      selfie_url: registration.selfieRef,
      profile_photos: registration.photoRefs,
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await db
      .from("profiles")
      .update(profileData)
      .eq("id", userId);

    if (profileError) {
      console.error("[Google Onboarding] Profile update error:", profileError.message);
      // Try upsert in case profile doesn't exist yet
      const upsertData: Record<string, any> = {
        id: userId,
        pseudo: cleanPseudo,
        gender: gender,
        birth_date: birthDate,
        civil_status: civilStatus,
        region: region,
        country: country,
        city: city,
        marriage_vision: marriageVision || [],
        status: "pending",
        onboarding_completed: false,
        selfie_verified: false,
        selfie_verification_score: 0,
        selfie_url: registration.selfieRef,
        profile_photos: registration.photoRefs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await db.from("profiles").upsert(
        upsertData,
        { onConflict: "id" }
      );

      if (upsertError) {
        console.error("[Google Onboarding] Profile upsert error:", upsertError.message);
        return NextResponse.json(
          { error: "Erreur lors de la mise à jour du profil." },
          { status: 500 }
        );
      }
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

    // Also update user metadata in Supabase Auth so mapSupabaseUser works correctly
    const { error: metaError } = await db.auth.admin.updateUserById(userId, {
      user_metadata: {
        pseudo: cleanPseudo,
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

    if (metaError) {
      console.warn("[Google Onboarding] Could not update auth metadata:", metaError.message);
      // Non-critical: profile is already saved in the profiles table
    }

    // Send confirmation email (« inscription reçue ») — seulement pour un compte en attente de validation.
    // Après la réponse : le membre n'attend pas le serveur d'e-mail.
    if (status === "pending") after(async () => {
      try {
        const { data: { user: authUser } } = await db.auth.admin.getUserById(verifiedUserId);
        const userEmail = authUser?.email || "";
        const userName = authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || userEmail.split("@")[0];
        if (userEmail) {
          await sendRegistrationReceivedEmail(userEmail, userName);
        }
      } catch (emailErr) {
        console.warn("[Google Onboarding] Could not send confirmation email:", emailErr);
        // Non-critical: profile is already saved
      }
    });

    return NextResponse.json({
      ok: true,
      status,
      message: "Profil complété avec succès.",
    });
  } catch (error) {
    console.error("[Google Onboarding] API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}