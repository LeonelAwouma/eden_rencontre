import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { verifySelfieServer } from "@/lib/face-verification-server";

export async function POST(request: NextRequest) {
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
      selfieImage,
      livenessFrames,
      profilePhotos,
      avatarUrl,
    } = body;

    // Selfie verification is recomputed here from the actual images — the client's
    // own score/verified claim is never trusted, since it's just JSON an attacker
    // could forge without ever taking a real selfie.
    let selfieVerified = false;
    let selfieVerificationScore = 0;
    let selfieDetails: Record<string, unknown> | null = null;
    if (typeof selfieImage === "string" && selfieImage.startsWith("data:")) {
      // Rafale de la preuve de présence : 10 petites images au plus. Absente ⇒ contrôle échoué.
      const frames = Array.isArray(livenessFrames)
        ? livenessFrames.filter((f: unknown): f is string => typeof f === "string" && f.startsWith("data:image/") && f.length < 400_000).slice(0, 10)
        : [];
      const result = await verifySelfieServer(selfieImage, (profilePhotos || []).filter(Boolean), frames);
      selfieDetails = { photos: result.photos, liveness: result.liveness, reason: result.reason, checked_at: new Date().toISOString() };
      selfieVerified = result.verified;
      selfieVerificationScore = result.score;
    }

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
        avatar_url: avatarUrl || null,
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
        selfie_verified: selfieVerified,
        selfie_verification_score: selfieVerificationScore,
        selfie_url: selfieImage || null,
        profile_photos: profilePhotos || [],
        avatar_url: avatarUrl || null,
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
          selfie_verified: selfieVerified,
          selfie_verification_score: selfieVerificationScore,
          selfie_url: selfieImage || null,
          profile_photos: profilePhotos || [],
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    // Détail de la vérification du selfie pour l'admin (photo par photo, présence).
    // Colonne ajoutée par 20261002_selfie_verification.sql : sans elle, on continue.
    if (selfieDetails) {
      const { error: detailsError } = await db.from("profiles").update({ selfie_verification_details: selfieDetails }).eq("id", userId);
      if (detailsError) console.warn("[selfie] détail non enregistré:", detailsError.message);
    }

    // 4. Send confirmation email
    await sendRegistrationReceivedEmail(cleanEmail, name);

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