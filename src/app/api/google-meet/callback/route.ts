/**
 * GET /api/google-meet/callback
 *
 * Handles the Google OAuth callback after the user grants Meet permission.
 * Exchanges the authorization code for tokens and stores them.
 * Then redirects to the dashboard with a success/error indicator.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeCredentials,
  parseOAuthState,
  GOOGLE_MEET_SCOPE,
} from "@/lib/google-meet";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Build the base redirect URL for the frontend
    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const dashboardUrl = `${origin}/dashboard`;

    // 1. Handle OAuth errors
    if (error) {
      console.warn("[GoogleMeet Callback] OAuth error from Google:", error);
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          error === "access_denied"
            ? "L'accès a été refusé. Veuillez autoriser l'application pour activer Google Meet."
            : `Erreur OAuth: ${error}`
        )}`
      );
    }

    // 2. Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "Code d'autorisation manquant."
        )}`
      );
    }

    if (!state) {
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "Paramètre de sécurité manquant. Veuillez réessayer."
        )}`
      );
    }

    // 3. Validate state (CSRF protection)
    const userId = parseOAuthState(state);
    if (!userId) {
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "Session expirée ou invalide. Veuillez réessayer."
        )}`
      );
    }

    // 4. Exchange authorization code for tokens
    const redirectUri = `${origin}/api/google-meet/callback`;
    const tokenResult = await exchangeCodeForTokens(code, redirectUri);

    if (!tokenResult.success || !tokenResult.accessToken) {
      console.error(
        "[GoogleMeet Callback] Token exchange failed:",
        tokenResult.error
      );
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "Échec de l'obtention des jetons Google. Veuillez réessayer."
        )}`
      );
    }

    // 5. Verify the Meet scope was granted
    const scopeString = tokenResult.scope || "";
    if (!scopeString.includes(GOOGLE_MEET_SCOPE)) {
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "L'autorisation Google Meet n'a pas été accordée. Veuillez réessayer et cocher la case Google Meet."
        )}`
      );
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
      return NextResponse.redirect(
        `${dashboardUrl}?google_meet_error=${encodeURIComponent(
          "Erreur lors de l'enregistrement des identifiants. Veuillez réessayer."
        )}`
      );
    }

    // 7. Success — redirect to dashboard with success indicator
    return NextResponse.redirect(
      `${dashboardUrl}?google_meet_success=1`
    );
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