import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionSecret } from "@/lib/session-secret";

const ADMIN_SESSION_COOKIE = "eden_admin_session";
const ADMIN_LOGIN_PATH = "/admin/login";

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Durées identiques à src/lib/admin-auth.ts.
const SESSION_MAX_AGE = 8 * 60 * 60; // secondes
/** Une session active est prolongée, mais jamais au-delà de 7 jours après la connexion. */
const SESSION_ABSOLUTE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

interface AdminSessionPayload {
  iat?: number;
  exp: number;
  [key: string]: unknown;
}

async function hmacKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

/**
 * Vérifie *réellement* la signature HMAC-SHA256 du cookie (Web Crypto, Edge).
 * HttpOnly n'empêche pas un attaquant d'envoyer un cookie forgé : sans ce
 * contrôle de signature, n'importe quel cookie structurellement valide passait.
 * Renvoie la session si le jeton est valide et non expiré, sinon null.
 */
async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const decoded = JSON.parse(atob(token));
    const { payload, signature } = decoded;
    if (typeof payload !== "string" || typeof signature !== "string") {
      return null;
    }

    const sigBytes = hexToBytes(signature);
    if (!sigBytes) return null;

    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey("verify"),
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;

    const session = JSON.parse(payload) as AdminSessionPayload;
    if (typeof session.exp !== "number" || session.exp < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Même format que createSessionToken (admin-auth.ts) : base64(JSON { payload, signature hex }). */
async function signAdminToken(session: AdminSessionPayload): Promise<string> {
  const payload = JSON.stringify(session);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey("sign"), new TextEncoder().encode(payload)));
  const signature = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  const bytes = new TextEncoder().encode(JSON.stringify({ payload, signature }));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Session glissante : tant que l'admin travaille, sa session est prolongée de
 * 8 h dès qu'il a consommé la moitié de sa durée. Sans cela, la session expirait
 * 8 h après la connexion même en pleine activité, et toutes les API admin
 * répondaient 401 (pages vides, notifications en échec).
 */
async function renewIfNeeded(response: NextResponse, session: AdminSessionPayload): Promise<NextResponse> {
  const now = Date.now();
  if (session.exp - now > (SESSION_MAX_AGE * 1000) / 2) return response;
  const iat = typeof session.iat === "number" ? session.iat : now;
  const exp = Math.min(now + SESSION_MAX_AGE * 1000, iat + SESSION_ABSOLUTE_MAX_MS);
  if (exp <= session.exp) return response;
  try {
    const token = await signAdminToken({ ...session, exp });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor((exp - now) / 1000),
      path: "/",
    });
  } catch {
    // Renouvellement impossible : la session actuelle reste valable jusqu'à son terme.
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = adminToken ? await verifyAdminToken(adminToken) : null;
  const isAuthenticated = !!session;

  // Allow the login page for unauthenticated users
  if (pathname === ADMIN_LOGIN_PATH || pathname === "/admin/login/") {
    if (isAuthenticated) {
      // Redirect authenticated admins to dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Routes publiques de l'authentification admin : connexion et changement du
  // mot de passe depuis la page de connexion (le mot de passe actuel fait foi).
  if (pathname === "/api/admin/auth/login" || pathname === "/api/admin/auth/change-password") {
    return NextResponse.next();
  }

  // Protect all other admin routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    // On revient sur la page demandée après la connexion.
    const login = new URL(ADMIN_LOGIN_PATH, request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  // Jamais de renouvellement pendant la déconnexion : le cookie doit disparaître.
  if (pathname === "/api/admin/auth/logout") return NextResponse.next();

  return renewIfNeeded(NextResponse.next(), session!);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};