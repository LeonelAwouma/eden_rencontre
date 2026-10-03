/**
 * GET /api/google-meet/callback
 *
 * Handles the Google OAuth callback after the user grants Meet permission.
 * Exchanges the authorization code for tokens and stores them.
 * Then redirects to the appropriate page (dashboard or admin meets).
 *
 * Supports both user and admin flows via the `returnTo` field in the OAuth state.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeCredentials,
  parseOAuthState,
  OAUTH_STATE_COOKIE,
  GOOGLE_MEET_SCOPE,
} from "@/lib/google-meet";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Build the base redirect URL — default to dashboard
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    let redirectBase = `${origin}/dashboard`;

    // Helper to build redirect URL with query params
    const redirectTo = (params: Record<string, string>) => {
      const url = new URL(redirectBase);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = NextResponse.redirect(url.toString());
      // Usage unique : le state ne peut pas être rejoué.
      res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/api/google-meet/callback", maxAge: 0 });
      return res;
    };

    // 1. Handle OAuth errors
    if (error) {
      console.warn("[GoogleMeet Callback] OAuth error from Google:", error);
      return redirectTo({
        google_meet_error:
          error === "access_denied"
            ? "L'accès a été refusé. Veuillez autoriser l'application pour activer Google Meet."
            : `Erreur OAuth: ${error}`,
      });
    }

    // 2. Validate required parameters
    if (!code) {
      return redirectTo({
        google_meet_error: "Code d'autorisation manquant.",
      });
    }

    if (!state) {
      return redirectTo({
        google_meet_error: "Paramètre de sécurité manquant. Veuillez réessayer.",
      });
    }

    // 3. Validate state (signature + cookie du navigateur qui a lancé la connexion)
    const parsed = parseOAuthState(state, request.cookies.get(OAUTH_STATE_COOKIE)?.value);
    if (!parsed) {
      return redirectTo({
        google_meet_error: "Session expirée ou invalide. Veuillez réessayer.",
      });
    }

    const { userId, returnTo } = parsed;

    // Override redirect base if returnTo is specified (admin flow)
    if (returnTo) {
      redirectBase = `${origin}${returnTo}`;
    }

    // 4. Exchange authorization code for tokens
    const redirectUri = `${origin}/api/google-meet/callback`;
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error(
        "[GoogleMeet Callback] Token exchange failed:",
        tokenResult.error
      );
      return redirectTo({
        google_meet_error:
          "Échec de l'obtention des jetons Google. Veuillez réessayer.",
      });
    }

    // 5. Verify the Meet scope was granted
    const scopeString = tokenResult.scope || "";
    if (!scopeString.includes(GOOGLE_MEET_SCOPE)) {
      return redirectTo({
        google_meet_error:
          "L'autorisation Google Meet n'a pas été accordée. Veuillez réessayer et cocher la case Google Meet.",
      });
    }

    // 6. Store credentials for the user
    const storeResult = await storeCredentials(
      userId,
      tokenResult.accessToken,
      tokenResult.refreshToken,
      tokenResult.expiresIn || 3600,
      scopeString,
      tokenResult.email
    );

    if (!storeResult.success) {
      console.error(
        "[GoogleMeet Callback] Failed to store credentials:",
        storeResult.error
      );
      return redirectTo({
        google_meet_error:
          "Erreur lors de l'enregistrement des identifiants. Veuillez réessayer.",
      });
    }

    // 7. Success — redirect with success indicator
    return redirectTo({ google_meet_success: "1" });
  } catch (err: any) {
    console.error("[GoogleMeet Callback] Unexpected error:", err);
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    return NextResponse.redirect(
      `${origin}/dashboard?google_meet_error=${encodeURIComponent(
        "Erreur interne lors de la connexion à Google Meet."
      )}`
    );
  }
}