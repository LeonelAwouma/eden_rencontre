import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";

// Échecs tolérés sur 15 minutes avant blocage temporaire : par compte visé
// (essais de mots de passe sur une adresse) et par adresse IP (essais en masse).
// Toutes ces connexions partent du serveur : sans limite ici, les limites de
// Supabase (par IP) finiraient par bloquer tous les membres à la fois.
const MAX_FAILURES_PER_EMAIL = 8;
const MAX_FAILURES_PER_IP = 30;
const WINDOW_SECONDS = 15 * 60;
const TOO_MANY = "Trop de tentatives de connexion. Patientez 15 minutes avant de réessayer.";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();
    const cleanEmail = email.trim().toLowerCase();
    const ip = clientIp(request);
    const emailKey = `login:${cleanEmail}`;
    const ipKey = `login-ip:${ip}`;

    const [emailOk, ipOk] = await Promise.all([
      checkRateLimit(emailKey, "login_failure", MAX_FAILURES_PER_EMAIL, WINDOW_SECONDS),
      checkRateLimit(ipKey, "login_failure", MAX_FAILURES_PER_IP, WINDOW_SECONDS),
    ]);
    if (!emailOk || !ipOk) {
      return NextResponse.json({ error: TOO_MANY }, { status: 429 });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await db.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      if (/Invalid login credentials/i.test(authError.message)) {
        await Promise.all([recordRateLimit(emailKey, "login_failure"), recordRateLimit(ipKey, "login_failure")]);
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

    // Connexion refusée (403) : le motif apparaît dans les logs Vercel, pour savoir
    // tout de suite s'il s'agit d'un compte en attente, refusé ou suspendu.
    if (status !== "approved") {
      console.info(`[login] accès refusé (${profile ? status : "profil introuvable"}) pour le compte ${userId}`);
    }

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