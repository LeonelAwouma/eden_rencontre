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

/**
 * Vérifie *réellement* la signature HMAC-SHA256 du cookie (Web Crypto, Edge).
 * HttpOnly n'empêche pas un attaquant d'envoyer un cookie forgé : sans ce
 * contrôle de signature, n'importe quel cookie structurellement valide passait.
 */
async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const secret = getSessionSecret();
    const decoded = JSON.parse(atob(token));
    const { payload, signature } = decoded;
    if (typeof payload !== "string" || typeof signature !== "string") {
      return false;
    }

    const sigBytes = hexToBytes(signature);
    if (!sigBytes) return false;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload)
    );
    if (!valid) return false;

    const session = JSON.parse(payload);
    if (typeof session.exp !== "number" || session.exp < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = adminToken ? await verifyAdminToken(adminToken) : false;

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
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};