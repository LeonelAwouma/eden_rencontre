import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();

    // Authenticate with Supabase
    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      if (/Invalid login credentials/i.test(authError.message)) {
        return NextResponse.json(
          { error: "Email ou mot de passe incorrect." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Erreur de connexion." },
        { status: 401 }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Erreur de connexion." },
        { status: 401 }
      );
    }

    // Check profile status
    const { data: profile } = await db
      .from("profiles")
      .select("status, name, email")
      .eq("id", userId)
      .single();

    const status = profile?.status || "pending";

    if (status === "pending") {
      // Sign out immediately
      await db.auth.admin.signOut(authData.session?.access_token || "");
      return NextResponse.json(
        {
          error: "pending",
          message: "Votre compte est en cours de validation. Vous recevrez un email une fois approuvé.",
        },
        { status: 403 }
      );
    }

    if (status === "rejected") {
      await db.auth.admin.signOut(authData.session?.access_token || "");
      return NextResponse.json(
        {
          error: "rejected",
          message: "Votre demande d'inscription n'a pas été approuvée.",
        },
        { status: 403 }
      );
    }

    if (status === "suspended") {
      await db.auth.admin.signOut(authData.session?.access_token || "");
      return NextResponse.json(
        {
          error: "suspended",
          message: "Votre compte a été suspendu. Contactez le support pour plus d'informations.",
        },
        { status: 403 }
      );
    }

    // User is approved — return session info
    // Set the session cookie
    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        name: profile?.name,
        email: profile?.email || cleanEmail,
        status,
      },
    });

    // Set auth tokens in cookies for the session
    if (authData.session) {
      response.cookies.set("sb-access-token", authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: authData.session.expires_in,
        path: "/",
      });
      response.cookies.set("sb-refresh-token", authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}