import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendRegistrationReceivedEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
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
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, mot de passe et nom requis." },
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
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Profile might already exist as a trigger created it, try updating
      await db
        .from("profiles")
        .update({
          name,
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    // 4. Send confirmation email
    await sendRegistrationReceivedEmail(cleanEmail, name);

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