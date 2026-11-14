import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseAuthClient } from "@/lib/supabase-auth-server";
import { checkRateLimit, recordRateLimit } from "@/lib/otp";
import { clientIp } from "@/lib/api-auth";
import { isSyntheticEmail, loginIdentifierToEmail, normalizePhone, realEmailOrNull } from "@/lib/phone-identity";
import { resolveAuthEmailForPhone } from "@/lib/coach/auth-email";

// Échecs tolérés sur 15 minutes avant blocage temporaire : par compte visé
// (essais de mots de passe sur une adresse) et par adresse IP (essais en masse).
const MAX_FAILURES_PER_EMAIL = 8;
const MAX_FAILURES_PER_IP = 30;
const WINDOW_SECONDS = 15 * 60;
const TOO_MANY = "Trop de tentatives de connexion. Patientez 15 minutes avant de réessayer.";

type Db = ReturnType<typeof getSupabaseAdmin>;

/** Une panne de lecture de l'état du compte ne doit jamais être confondue avec un compte en attente/incohérent. */
async function accountLookupUnavailable(
  db: Db,
  accessToken: string | undefined,
  scope: string,
  error: { code?: string } | null | undefined
) {
  console.error(`[login] vérification ${scope} impossible`, { code: error?.code ?? "unknown" });
  if (accessToken) {
    try { await db.auth.admin.signOut(accessToken); } catch { /* best effort : ne jamais masquer la panne initiale */ }
  }
  return NextResponse.json(
    {
      error: "account_status_unavailable",
      message: "La vérification de votre compte est temporairement indisponible. Réessayez plus tard.",
    },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    // « email » peut être une adresse e-mail OU un numéro international (+237…) : les comptes
    // « téléphone seul » se connectent avec leur numéro (adresse technique, lib/phone-identity.ts).
    const cleanEmail = loginIdentifierToEmail(email);
    if (!cleanEmail) {
      return NextResponse.json(
        { error: "Adresse e-mail ou numéro de téléphone invalide (avec l'indicatif, ex. +237…)." },
        { status: 400 }
      );
    }
    const phoneLogin = isSyntheticEmail(cleanEmail);
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

    // Authentification sur un client public dédié : signInWithPassword y installe le JWT utilisateur.
    // Les lectures/écritures administratives utilisent un AUTRE client service_role, jamais contaminé.
    const authClient = getSupabaseAuthClient();
    const db = getSupabaseAdmin();

    // Connexion par numéro : le compte est résolu en base AVANT l'authentification (anciens coachs = adresse Auth
    // réelle ; nouveaux coachs et membres « téléphone seul » = adresse technique). Échec de lecture : refus 503.
    let authEmail = cleanEmail;
    let expectedCoachId: string | null = null;
    if (phoneLogin) {
      const resolved = await resolveAuthEmailForPhone(db, normalizePhone(email) ?? "");
      if (!resolved.ok) return accountLookupUnavailable(db, undefined, "du numéro de téléphone", null);
      authEmail = resolved.authEmail;
      expectedCoachId = resolved.coachUserId;
    }

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    if (authError) {
      if (/Invalid login credentials/i.test(authError.message)) {
        await Promise.all([recordRateLimit(emailKey, "login_failure"), recordRateLimit(ipKey, "login_failure")]);
        return NextResponse.json(
          {
            error: phoneLogin ? "Numéro ou mot de passe incorrect." : "Email ou mot de passe incorrect.",
            // Indice générique (identique pour toute adresse : ne révèle l'existence d'aucun compte).
            ...(phoneLogin ? {} : { hint: "shared_email_use_phone" }),
          },
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

    const accessToken = authData.session?.access_token;

    // Le compte authentifié doit être exactement celui que le numéro désigne (aucun accès croisé entre coachs).
    if (expectedCoachId && userId !== expectedCoachId) {
      console.error("[login] identité Auth différente du coach résolu par téléphone");
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json({ error: "Numéro ou mot de passe incorrect." }, { status: 401 });
    }

    // Lecture du profil via service_role : le client Auth public porte désormais le JWT du coach.
    let { data: profile, error: profileError } = await db
      .from("profiles")
      .select("status, name, email, account_type")
      .eq("id", userId)
      .maybeSingle();

    if (profileError && (profileError as { code?: string }).code === "42703") {
      // Colonne account_type absente (migration coachs non exécutée) : seuls des membres peuvent être reconnus.
      const legacy = await db.from("profiles").select("status, name, email").eq("id", userId).maybeSingle();
      if (legacy.error) return accountLookupUnavailable(db, accessToken, "du profil (schéma historique)", legacy.error);
      profile = legacy.data ? { ...legacy.data, account_type: "member" } : null;
    } else if (profileError) {
      return accountLookupUnavailable(db, accessToken, "du profil", profileError);
    }

    // Lecture de coach_accounts également via service_role. Ne jamais transformer une erreur SQL en « coach absent ».
    const { data: coachAccount, error: coachError } = await db.from("coach_accounts")
      .select("user_id, active").eq("user_id", userId).maybeSingle();
    if (coachError) {
      return accountLookupUnavailable(db, accessToken, "du compte Coach", coachError);
    }

    // Compte Coach = ligne coach_accounts OU profil marqué coach. Les deux doivent exister et concorder :
    // un coach incohérent est REFUSÉ, jamais rétrogradé en membre ni promu approuvé.
    const isCoachAccount = !!coachAccount || profile?.account_type === "coach";
    if (isCoachAccount && !(coachAccount && profile && profile.account_type === "coach")) {
      console.info(`[login] compte Coach incohérent (profil/coach_accounts) pour le compte ${userId}`);
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json(
        { error: "coach_inconsistent", message: "Accès Coach indisponible. Contactez l'administration." },
        { status: 403 }
      );
    }

    // Un coach désactivé est suspendu, même si son profil indiquait encore « approuvé ».
    const status = isCoachAccount && coachAccount?.active !== true ? "suspended" : profile?.status || "pending";

    if (status !== "approved") {
      console.info(`[login] accès refusé (${profile ? status : "profil introuvable"}) pour le compte ${userId}`);
    }

    if (status === "pending") {
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json(
        {
          error: "pending",
          message: phoneLogin
            ? "Votre compte est en cours de validation par l'administration. Revenez vous connecter un peu plus tard."
            : "Votre compte est en cours de validation. Vous recevrez un email une fois approuvé.",
        },
        { status: 403 }
      );
    }

    if (status === "rejected") {
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json(
        {
          error: "rejected",
          message: "Votre demande d'inscription n'a pas été approuvée.",
        },
        { status: 403 }
      );
    }

    if (status === "suspended") {
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json(
        {
          error: "suspended",
          message: "Votre compte a été suspendu. Contactez le support pour plus d'informations.",
        },
        { status: 403 }
      );
    }

    // Garde finale : tout statut inattendu est refusé (aucune connexion « par défaut »).
    if (status !== "approved") {
      if (accessToken) {
        try { await db.auth.admin.signOut(accessToken); } catch { /* best effort */ }
      }
      return NextResponse.json({ error: "forbidden", message: "Accès refusé." }, { status: 403 });
    }

    // Dernière connexion d'un Coach (échec non bloquant si la colonne n'existe pas encore).
    if (isCoachAccount) {
      try {
        await db.from("coach_accounts").update({ last_login_at: new Date().toISOString() }).eq("user_id", userId);
      } catch { /* non bloquant */ }
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: userId,
        name: profile?.name,
        email: realEmailOrNull(profile?.email) ?? realEmailOrNull(cleanEmail),
        status,
        role: isCoachAccount ? "coach" : "member",
      },
      // Réservé à la synchronisation de la session Supabase du navigateur (adresse Auth de CE compte,
      // jamais une coordonnée de contact).
      sessionEmail: authEmail,
    });

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
