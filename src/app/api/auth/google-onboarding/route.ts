import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
        { error: "Vous devez avoir au moins 18 ans pour rejoindre Eden." },
        { status: 400 }
      );
    }

    // Get the authenticated user from the Authorization header or cookie
    const db = getSupabaseAdmin();

    // Extract the access token from the request cookies
    const accessToken = request.cookies.get("sb-access-token")?.value
      || request.cookies.get("supabase-auth-token")?.value;

    // Try to get user from various Supabase cookie formats
    let userId: string | null = null;

    // Try standard Supabase cookie format
    const allCookies = request.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
        try {
          const parsed = JSON.parse(cookie.value);
          if (parsed.access_token) {
            const { data: { user } } = await db.auth.getUser(parsed.access_token);
            if (user) {
              userId = user.id;
              break;
            }
          }
        } catch {
          // Try next cookie
        }
      }
    }

    // Fallback: try to get from Authorization header
    if (!userId) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const { data: { user } } = await db.auth.getUser(token);
        if (user) userId = user.id;
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

    // Update the profile with the collected information
    const { error: profileError } = await db
      .from("profiles")
      .update({
        gender: gender,
        birth_date: birthDate,
        discovery_source: discoverySource || null,
        civil_status: civilStatus,
        region: region,
        country: country,
        city: city,
        marriage_vision: marriageVision || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[Google Onboarding] Profile update error:", profileError.message);
      // Try upsert in case profile doesn't exist yet
      const { error: upsertError } = await db.from("profiles").upsert(
        {
          id: userId,
          gender: gender,
          birth_date: birthDate,
          discovery_source: discoverySource || null,
          civil_status: civilStatus,
          region: region,
          country: country,
          city: city,
          marriage_vision: marriageVision || [],
          status: "pending",
          onboarding_completed: false,
          updated_at: new Date().toISOString(),
        },
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

    // Also update user metadata in Supabase Auth so mapSupabaseUser works correctly
    const { error: metaError } = await db.auth.admin.updateUserById(userId, {
      user_metadata: {
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

    return NextResponse.json({
      ok: true,
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